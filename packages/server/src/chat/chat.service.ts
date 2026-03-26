import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgentService, ChatMessage } from './agent/agent.service';
import { Response } from 'express';

const STREAM_TIMEOUT_MS = 60_000; // 60s total stream timeout

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private agentService: AgentService,
  ) {}

  /**
   * Write a text token directly to the SSE response.
   */
  private writeToken(res: Response, token: string): void {
    res.write(`0:${JSON.stringify(token)}\n`);
  }

  /**
   * Write a thinking token as a data annotation (prefix 2:).
   */
  private writeThinkingToken(res: Response, token: string): void {
    const annotation = [{ type: 'thinking_delta', content: token }];
    res.write(`2:${JSON.stringify(annotation)}\n`);
  }

  /**
   * Write a thinking-complete annotation (prefix 2:).
   */
  private writeThinkingEnd(res: Response): void {
    const annotation = [{ type: 'thinking_complete' }];
    res.write(`2:${JSON.stringify(annotation)}\n`);
  }

  /**
   * Extract thinking token from a stream chunk's content.
   * Returns thinking text from blocks with type:'thinking'.
   */
  private extractThinkingToken(content: unknown): string {
    if (Array.isArray(content)) {
      const parts: string[] = [];
      for (const block of content) {
        if (typeof block === 'object' && block !== null) {
          const b = block as Record<string, unknown>;
          if (b.type === 'thinking' && typeof b.thinking === 'string') {
            parts.push(b.thinking);
          }
        }
      }
      return parts.join('');
    }
    return '';
  }

  /**
   * Extract text token from a stream chunk's content.
   * Content can be a plain string or an array of blocks.
   */
  private extractToken(content: unknown): string {
    if (typeof content === 'string') {
      return content;
    }
    if (Array.isArray(content)) {
      const texts: string[] = [];
      for (const block of content) {
        if (typeof block === 'object' && block !== null) {
          const b = block as Record<string, unknown>;
          if (b.type === 'text' && typeof b.text === 'string') {
            texts.push(b.text);
          }
        }
      }
      return texts.join('');
    }
    return '';
  }

  async chat(
    conversationId: string,
    message: string,
    userId: string,
    res: Response,
  ) {
    // 验证对话属于当前用户
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!conversation) {
      throw new NotFoundException('对话不存在');
    }

    // 持久化用户消息
    await this.prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content: message,
      },
    });

    // 构建历史消息上下文（包含 thinking）
    const historyMessages: ChatMessage[] = conversation.messages.map((m) => ({
      role: m.role as ChatMessage['role'],
      content: m.content,
      thinking: m.thinking || undefined,
    }));
    historyMessages.push({ role: 'user', content: message });

    const lcMessages = this.agentService.convertToLangChainMessages(historyMessages);

    // 设置流式响应头
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('X-Vercel-AI-Data-Stream', 'v1');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let streamEnded = false;
    const endStream = () => {
      if (!streamEnded) {
        streamEnded = true;
        res.end();
      }
    };

    // Guard against client disconnect
    res.on('close', () => {
      this.logger.log(`[Chat] Client disconnected for conversation ${conversationId}`);
      streamEnded = true;
    });

    try {
      const agent = this.agentService.getAgent();

      this.logger.log(`[Chat] Starting stream for conversation ${conversationId}`);

      // 使用 streamEvents 实现真正的流式输出（带超时）
      let fullText = '';
      let fullThinking = '';
      let isInThinkingPhase = true;

      const eventStream = agent.streamEvents(
        { messages: lcMessages },
        { version: 'v2' },
      );

      // Wrap the stream iteration with a timeout
      const streamPromise = (async () => {
        for await (const event of eventStream) {
          if (streamEnded) break;

          // 监听 LLM 的流式 token 输出
          if (
            event.event === 'on_chat_model_stream' &&
            event.data?.chunk
          ) {
            const chunk = event.data.chunk;

            // Extract thinking tokens
            const thinkingToken = this.extractThinkingToken(chunk.content);
            if (thinkingToken) {
              fullThinking += thinkingToken;
              this.writeThinkingToken(res, thinkingToken);
              continue;
            }

            // Extract text tokens
            const token = this.extractToken(chunk.content);
            if (token) {
              // Transition from thinking to text phase
              if (isInThinkingPhase && fullThinking) {
                this.writeThinkingEnd(res);
                isInThinkingPhase = false;
              }
              fullText += token;
              this.writeToken(res, token);
            }
          }
        }
      })();

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Stream timeout: no response within 60s')), STREAM_TIMEOUT_MS);
      });

      await Promise.race([streamPromise, timeoutPromise]);

      this.logger.log(`[Chat] Stream completed, fullText length: ${fullText.length}, fullThinking length: ${fullThinking.length}`);

      // 流式输出完成后，持久化 assistant 消息
      if (fullText) {
        await this.prisma.message.create({
          data: {
            conversationId,
            role: 'assistant',
            content: fullText,
            thinking: fullThinking || null,
          },
        });

        // 如果是第一条消息，自动设置对话标题
        if (conversation.messages.length === 0) {
          const title = fullText.replace(/\n/g, ' ').slice(0, 30);
          await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { title },
          });
        }
      }

      // 更新对话时间
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      // 发送结束信号
      if (!streamEnded) {
        const finishData = {
          finishReason: 'stop',
          usage: { promptTokens: 0, completionTokens: 0 },
        };
        res.write(`d:${JSON.stringify(finishData)}\n`);
      }
      endStream();
    } catch (err) {
      this.logger.error(`[Chat] Agent error: ${err instanceof Error ? err.message : String(err)}`);
      if (!streamEnded) {
        const errorMsg = `❌ Agent 执行出错: ${err instanceof Error ? err.message : String(err)}`;
        res.write(`0:${JSON.stringify(errorMsg)}\n`);
        const finishData = {
          finishReason: 'error',
          usage: { promptTokens: 0, completionTokens: 0 },
        };
        res.write(`d:${JSON.stringify(finishData)}\n`);
      }
      endStream();
    }
  }

  async getGraph() {
    try {
      const agent = this.agentService.getAgent();
      const mermaid = agent.getGraph().drawMermaid();
      return { mermaid };
    } catch {
      return {
        nodes: ['agent', 'tools'],
        edges: [
          { from: '__start__', to: 'agent' },
          { from: 'agent', to: 'tools', condition: 'has_tool_calls' },
          { from: 'agent', to: '__end__', condition: 'no_tool_calls' },
          { from: 'tools', to: 'agent' },
        ],
      };
    }
  }
}
