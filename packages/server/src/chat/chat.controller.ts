import { Controller, Post, Get, Body, UseGuards, Res, HttpCode, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('chat')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async chat(
    @Body() body: { conversationId: string; message: string },
    @CurrentUser() user: { userId: string; username: string },
    @Res() res: Response,
  ) {
    if (!body.conversationId || !body.message) {
      throw new BadRequestException('conversationId 和 message 不能为空');
    }

    await this.chatService.chat(body.conversationId, body.message, user.userId, res);
  }

  @Get('graph')
  async graph() {
    return this.chatService.getGraph();
  }
}
