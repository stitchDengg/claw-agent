export interface AgentConfig {
  apiKey: string;
  baseUrl: string;
  modelName?: string;
  maxTokens?: number;
  systemPrompt?: string;
  thinking?: {
    enabled: boolean;
    budgetTokens?: number;
  };
}

export interface ThinkingBlock {
  type: 'thinking';
  thinking: string;
}

export interface TextBlock {
  type: 'text';
  text: string;
}

export type ContentBlock = ThinkingBlock | TextBlock;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;
}
