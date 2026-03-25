import { ChatAnthropic } from '@langchain/anthropic';
import { AIMessage, BaseMessage, SystemMessage } from '@langchain/core/messages';
import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { allTools } from './tools.js';
import { AgentConfig } from './types.js';
import { SYSTEM_PROMPT } from './prompts.js';

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
});

export function createAgent(config: AgentConfig) {
  const effectiveSystemPrompt = config.systemPrompt ?? SYSTEM_PROMPT;

  const llm = new ChatAnthropic({
    anthropicApiKey: config.apiKey,
    anthropicApiUrl: config.baseUrl,
    modelName: config.modelName || 'MiniMax-M2.7',
    maxTokens: config.maxTokens || 4096,
    streaming: true,
    clientOptions: {
      timeout: 60_000, // 60s timeout for API calls
    },
  });

  const llmWithTools = llm.bindTools(allTools);

  async function agentNode(state: typeof AgentState.State) {
    const messages = [...state.messages];

    if (messages.length === 0 || !(messages[0] instanceof SystemMessage)) {
      messages.unshift(new SystemMessage(effectiveSystemPrompt));
    }

    const response = await llmWithTools.invoke(messages);

    if (Array.isArray(response.content)) {
      const textParts: string[] = [];
      const filteredContent: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }> = [];

      for (const block of response.content) {
        if (typeof block === 'object' && block !== null) {
          const b = block as Record<string, unknown>;
          if (b.type === 'text') {
            textParts.push(b.text as string);
            filteredContent.push(block as { type: string; text: string });
          } else if (b.type === 'tool_use') {
            filteredContent.push(block as { type: string; id: string; name: string; input: Record<string, unknown> });
          }
        }
      }

      if (response.tool_calls && response.tool_calls.length > 0) {
        response.content = filteredContent;
      } else {
        response.content = textParts.join('\n');
      }
    }

    return { messages: [response] };
  }

  function shouldContinue(state: typeof AgentState.State): 'tools' | typeof END {
    const lastMessage = state.messages[state.messages.length - 1];
    if (
      lastMessage instanceof AIMessage &&
      lastMessage.tool_calls &&
      lastMessage.tool_calls.length > 0
    ) {
      return 'tools';
    }
    return END;
  }

  const workflow = new StateGraph(AgentState)
    .addNode('agent', agentNode)
    .addNode('tools', new ToolNode(allTools))
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', shouldContinue)
    .addEdge('tools', 'agent');

  return workflow.compile();
}
