import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // CORS
  const corsOrigin = configService.get<string>('CORS_ORIGIN') || 'http://localhost:3000';
  app.enableCors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = configService.get<number>('PORT') || 8001;
  const host = configService.get<string>('HOST') || '0.0.0.0';

  await app.listen(port, host);

  console.log(`\n🚀 Claw Agent Server (NestJS + LangGraph.js) 启动成功！`);
  console.log(`   地址: http://${host}:${port}`);
  console.log(`   健康检查: http://localhost:${port}/health`);
  console.log(`   聊天 API: POST http://localhost:${port}/api/chat`);
  console.log(`   图结构: GET http://localhost:${port}/api/graph\n`);
}

bootstrap();
