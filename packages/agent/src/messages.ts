import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatMessage } from './types.js';
import { SYSTEM_PROMPT } from './prompts.js';

export function convertToLangChainMessages(messages: ChatMessage[], systemPrompt: string = SYSTEM_PROMPT): BaseMessage[] {
  const lcMessages: BaseMessage[] = [new SystemMessage(systemPrompt)];

  for (const msg of messages) {
    if (msg.role === 'user') {
      lcMessages.push(new HumanMessage(msg.content));
    } else if (msg.role === 'assistant') {
      if (msg.thinking) {
        // Reconstruct content blocks with thinking for multi-turn fidelity
        lcMessages.push(new AIMessage({
          content: [
            { type: 'thinking', thinking: msg.thinking },
            { type: 'text', text: msg.content },
          ],
        }));
      } else {
        lcMessages.push(new AIMessage(msg.content));
      }
    }
  }

  return lcMessages;
}
