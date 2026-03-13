import { Injectable, NotFoundException } from '@nestjs/common';
import { AIMessage, BaseMessage } from '@claw-agent/agent';
import { PrismaService } from '../prisma/prisma.service';
import { AgentService, ChatMessage } from './agent/agent.service';
import { Response } from 'express';

function splitIntoChunks(text: string, chunkSize = 20): string[] {
  const chunks: string[] = [];
  let i = 0;

  while (i < text.length) {
    let end = Math.min(i + chunkSize, text.length);

    if (end < text.length) {
      for (let j = end; j > i; j--) {
        if ('。，！？；：\n,.!?;: '.includes(text[j - 1])) {
          end = j;
          break;
        }
      }
    }

    chunks.push(text.slice(i, end));
    i = end;
  }

  return chunks;
}

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private agentService: AgentService,
  ) {}

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

    // 构建历史消息上下文
    const historyMessages: ChatMessage[] = conversation.messages.map((m) => ({
      role: m.role as ChatMessage['role'],
      content: m.content,
    }));
    historyMessages.push({ role: 'user', content: message });

    const lcMessages = this.agentService.convertToLangChainMessages(historyMessages);

    // 设置流式响应头
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('X-Vercel-AI-Data-Stream', 'v1');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const agent = this.agentService.getAgent();
      const result = await agent.invoke({ messages: lcMessages });
      const finalMessages: BaseMessage[] = result.messages;

      // 提取最后一条 AI 消息
      let aiResponse = '';
      for (let i = finalMessages.length - 1; i >= 0; i--) {
        const msg = finalMessages[i];
        if (msg instanceof AIMessage && msg.content) {
          aiResponse = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
          break;
        }
      }

      if (aiResponse) {
        // 分块输出
        const chunks = splitIntoChunks(aiResponse);
        for (const chunk of chunks) {
          res.write(`0:${JSON.stringify(chunk)}\n`);
        }

        // 持久化 AI 响应
        await this.prisma.message.create({
          data: {
            conversationId,
            role: 'assistant',
            content: aiResponse,
          },
        });

        // 如果是第一条消息，自动设置对话标题
        if (conversation.messages.length === 0) {
          const title = aiResponse.replace(/\n/g, ' ').slice(0, 30);
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
      const finishData = {
        finishReason: 'stop',
        usage: { promptTokens: 0, completionTokens: 0 },
      };
      res.write(`d:${JSON.stringify(finishData)}\n`);
      res.end();
    } catch (err) {
      const errorMsg = `❌ Agent 执行出错: ${err instanceof Error ? err.message : String(err)}`;
      res.write(`0:${JSON.stringify(errorMsg)}\n`);
      const finishData = {
        finishReason: 'error',
        usage: { promptTokens: 0, completionTokens: 0 },
      };
      res.write(`d:${JSON.stringify(finishData)}\n`);
      res.end();
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
