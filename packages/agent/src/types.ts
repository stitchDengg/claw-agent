export interface AgentConfig {
  apiKey: string;
  baseUrl: string;
  modelName?: string;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
