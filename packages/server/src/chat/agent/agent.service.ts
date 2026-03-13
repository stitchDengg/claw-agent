import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAgent, convertToLangChainMessages, ChatMessage, SYSTEM_PROMPT, BaseMessage } from '@claw-agent/agent';

@Injectable()
export class AgentService implements OnModuleInit {
  private agent!: ReturnType<typeof createAgent>;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.agent = createAgent({
      apiKey: this.configService.get<string>('MINIMAX_API_KEY') || '',
      baseUrl: this.configService.get<string>('MINIMAX_BASE_URL') || 'https://api.minimaxi.com/anthropic',
    });
  }

  getAgent() {
    return this.agent;
  }

  convertToLangChainMessages(messages: ChatMessage[]): BaseMessage[] {
    return convertToLangChainMessages(messages);
  }
}

export { ChatMessage, SYSTEM_PROMPT };
