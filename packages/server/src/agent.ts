/**
 * Claw Agent — 基于 LangGraph.js 的 ReAct Agent
 *
 * 架构：StateGraph 有向图
 *   __start__ → agent ⇄ tools → __end__
 *
 * 使用 @langchain/anthropic 的 ChatAnthropic 连接 MiniMax Anthropic 兼容 API
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { allTools } from "./tools.js";

// ========== System Prompt ==========

export const SYSTEM_PROMPT = `你是 Claw Agent，一个专业的 AI 智能助手，由 LangGraph.js 驱动。

你的能力：
1. 回答各种技术问题，提供详细的解释和代码示例
2. 帮助设计系统架构和技术方案
3. 编写、审查和优化代码
4. 使用工具完成任务：
   - 🌤️ 查询天气（get_weather）
   - 🧮 数学计算（calculate）
   - 📚 知识库搜索（search_knowledge）

回答规则：
- 使用中文回答
- 代码示例要完整可运行
- 使用 Markdown 格式化输出
- 对复杂问题分步骤解释
- 必要时主动使用可用的工具来辅助回答
- 在回答末尾简要说明你使用了哪些工具（如果使用了的话）`;

// ========== Agent State ==========

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
});

// ========== 创建 Agent ==========

let agentInstance: ReturnType<typeof StateGraph.prototype.compile> | null = null;

export function createAgent() {
  const apiKey = process.env.MINIMAX_API_KEY || "";
  const baseURL = process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com/anthropic";

  // 使用 ChatAnthropic 连接 MiniMax (Anthropic 兼容 API)
  const llm = new ChatAnthropic({
    anthropicApiKey: apiKey,
    anthropicApiUrl: baseURL,
    modelName: "MiniMax-M2.5",
    maxTokens: 4096,
  });

  // 绑定工具
  const llmWithTools = llm.bindTools(allTools);

  // Agent 节点：调用 LLM
  async function agentNode(state: typeof AgentState.State) {
    const messages = [...state.messages];

    // 确保第一条是 system 消息
    if (messages.length === 0 || !(messages[0] instanceof SystemMessage)) {
      messages.unshift(new SystemMessage(SYSTEM_PROMPT));
    }

    const response = await llmWithTools.invoke(messages);

    // MiniMax 返回的 content 可能是数组（包含 thinking 块），需要过滤
    if (Array.isArray(response.content)) {
      const textParts: string[] = [];
      const filteredContent: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }> = [];
      
      for (const block of response.content) {
        if (typeof block === "object" && block !== null) {
          const b = block as Record<string, unknown>;
          if (b.type === "text") {
            textParts.push(b.text as string);
            filteredContent.push(block as { type: string; text: string });
          } else if (b.type === "tool_use") {
            filteredContent.push(block as { type: string; id: string; name: string; input: Record<string, unknown> });
          }
          // 忽略 thinking 块
        }
      }

      // 如果有工具调用，保留数组格式（LangChain 需要）
      // 否则转为纯文本字符串
      if (response.tool_calls && response.tool_calls.length > 0) {
        response.content = filteredContent;
      } else {
        response.content = textParts.join("\n");
      }
    }

    return { messages: [response] };
  }

  // 条件路由：判断是否需要调用工具
  function shouldContinue(state: typeof AgentState.State): "tools" | typeof END {
    const lastMessage = state.messages[state.messages.length - 1];
    if (
      lastMessage instanceof AIMessage &&
      lastMessage.tool_calls &&
      lastMessage.tool_calls.length > 0
    ) {
      return "tools";
    }
    return END;
  }

  // 构建状态图
  const workflow = new StateGraph(AgentState)
    .addNode("agent", agentNode)
    .addNode("tools", new ToolNode(allTools))
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");

  // 编译图
  const graph = workflow.compile();

  return graph;
}

// ========== 获取 Agent 单例 ==========

export function getAgent() {
  if (!agentInstance) {
    agentInstance = createAgent();
  }
  return agentInstance;
}

// ========== 消息格式转换 ==========

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export function convertToLangChainMessages(messages: ChatMessage[]): BaseMessage[] {
  const lcMessages: BaseMessage[] = [new SystemMessage(SYSTEM_PROMPT)];

  for (const msg of messages) {
    if (msg.role === "user") {
      lcMessages.push(new HumanMessage(msg.content));
    } else if (msg.role === "assistant") {
      lcMessages.push(new AIMessage(msg.content));
    }
    // system 消息已在开头添加
  }

  return lcMessages;
}
