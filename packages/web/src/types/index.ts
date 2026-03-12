export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tool {
  name: string;
  description: string;
  icon: string;
}

export type MessageRole = "user" | "assistant" | "system";
