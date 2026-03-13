STATUS: READY_FOR_BUILD

# NestJS + Prisma + PostgreSQL 迁移 -- Open Spec

## 背景与目标 (Background & Goals)

当前 `packages/server` 基于 Express 4 构建，用户数据存储在 JSON 文件中，对话和消息存储在前端 localStorage 中。这种架构存在以下问题：

1. **数据持久化缺失** -- 对话历史仅存在于浏览器 localStorage，更换设备或清除缓存即丢失
2. **JSON 文件存储不可靠** -- 用户数据存在并发写入风险，无事务保障
3. **缺乏结构化数据层** -- 无 ORM、无 migration 机制，难以维护和演进 schema
4. **Express 缺乏模块化** -- 路由、中间件、依赖注入均需手动管理，不利于扩展

目标：将后端从 Express 迁移至 NestJS，引入 Prisma ORM + PostgreSQL，实现对话和消息的服务端持久化，同时保留现有的 LangGraph.js Agent 逻辑不变。

---

## 架构概览 (Architecture Overview)

```
┌─────────────────────────────────────────────────────────┐
│                    pnpm monorepo                        │
├──────────────────────┬──────────────────────────────────┤
│  packages/web        │  packages/server                 │
│  (Next.js 15)        │  (NestJS + Prisma + PostgreSQL)  │
│                      │                                  │
│  AuthContext ───────>│  AuthModule                      │
│  useConversations ──>│    ├─ AuthController              │
│  /api/chat proxy ───>│    ├─ AuthService                 │
│                      │    ├─ JwtStrategy                 │
│                      │    └─ JwtAuthGuard                │
│                      │                                  │
│                      │  ChatModule                      │
│                      │    ├─ ChatController               │
│                      │    ├─ ChatService                  │
│                      │    └─ AgentService (LangGraph.js) │
│                      │                                  │
│                      │  ConversationModule              │
│                      │    ├─ ConversationController       │
│                      │    └─ ConversationService          │
│                      │                                  │
│                      │  PrismaModule                    │
│                      │    └─ PrismaService                │
│                      │                                  │
│                      │  HealthModule                    │
│                      │    └─ HealthController             │
└──────────────────────┴──────────────────────────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │   PostgreSQL     │
                     │   (云服务器)      │
                     └─────────────────┘
```

---

## 数据库 Schema (Prisma Model Definitions)

```prisma
// packages/server/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String         @id @default(uuid())
  username      String         @unique @db.VarChar(20)
  passwordHash  String         @db.VarChar(255)
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")
  conversations Conversation[]

  @@map("users")
}

model Conversation {
  id        String    @id @default(uuid())
  title     String    @db.VarChar(200) @default("新对话")
  userId    String    @map("user_id")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  Message[]

  @@index([userId])
  @@map("conversations")
}

model Message {
  id             String       @id @default(uuid())
  conversationId String       @map("conversation_id")
  role           MessageRole
  content        String       @db.Text
  createdAt      DateTime     @default(now()) @map("created_at")
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@map("messages")
}

enum MessageRole {
  user
  assistant
  system
}
```

**设计说明：**
- 所有主键使用 UUID，与现有前端 `generateId()` 兼容
- `User` 删除时级联删除其所有 `Conversation`，`Conversation` 删除时级联删除其所有 `Message`
- `username` 加 `@unique` 约束，在数据库层面保证唯一性
- `userId` 和 `conversationId` 加索引，优化查询性能
- 表名使用 snake_case（`@@map`），字段名使用 camelCase（Prisma 约定）

---

## NestJS 模块/控制器/服务结构

### 目录结构

```
packages/server/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── main.ts                          # NestJS 启动入口
│   ├── app.module.ts                    # 根模块
│   ├── common/
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts        # JWT 认证守卫
│   │   └── decorators/
│   │       └── current-user.decorator.ts # 获取当前用户的参数装饰器
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts            # PrismaClient 封装，处理连接生命周期
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts           # POST /api/auth/register, /login, GET /me
│   │   ├── auth.service.ts              # 注册/登录/验证逻辑
│   │   ├── jwt.strategy.ts              # Passport JWT 策略
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── register.dto.ts
│   ├── chat/
│   │   ├── chat.module.ts
│   │   ├── chat.controller.ts           # POST /api/chat（流式响应）
│   │   ├── chat.service.ts              # 调用 AgentService，持久化消息
│   │   └── agent/
│   │       ├── agent.service.ts         # LangGraph.js Agent 单例封装
│   │       └── tools.ts                 # 工具定义（从现有 tools.ts 迁移）
│   ├── conversation/
│   │   ├── conversation.module.ts
│   │   ├── conversation.controller.ts   # CRUD 端点
│   │   ├── conversation.service.ts
│   │   └── dto/
│   │       ├── create-conversation.dto.ts
│   │       └── update-conversation.dto.ts
│   └── health/
│       ├── health.module.ts
│       └── health.controller.ts         # GET /health
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── nest-cli.json
└── .env.example
```

### 模块依赖关系

| 模块 | 导入 | 提供 |
|------|------|------|
| `AppModule` | 所有子模块, `ConfigModule.forRoot()` | -- |
| `PrismaModule` (Global) | -- | `PrismaService` |
| `AuthModule` | `PrismaModule`, `JwtModule`, `PassportModule` | `AuthService`, `JwtStrategy` |
| `ChatModule` | `PrismaModule`, `AuthModule` | `ChatService`, `AgentService` |
| `ConversationModule` | `PrismaModule`, `AuthModule` | `ConversationService` |
| `HealthModule` | -- | `HealthController` |

---

## API 端点规范 (API Endpoint Specifications)

### 1. 认证 -- AuthController

#### POST /api/auth/register

注册新用户。

**Request Body:**
```json
{
  "username": "string (3-20字符, 必填)",
  "password": "string (>=6字符, 必填)"
}
```

**Response 200:**
```json
{
  "token": "string (JWT)",
  "user": {
    "id": "uuid",
    "username": "string"
  }
}
```

**Error Responses:**
- `400` -- `{ "message": "用户名长度应为 3-20 个字符" }` 或 `{ "message": "密码长度至少为 6 个字符" }`
- `409` -- `{ "message": "用户名已存在" }`

#### POST /api/auth/login

用户登录。

**Request Body:**
```json
{
  "username": "string (必填)",
  "password": "string (必填)"
}
```

**Response 200:**
```json
{
  "token": "string (JWT)",
  "user": {
    "id": "uuid",
    "username": "string"
  }
}
```

**Error Responses:**
- `400` -- `{ "message": "用户名和密码不能为空" }`
- `401` -- `{ "message": "用户名或密码错误" }`

#### GET /api/auth/me

获取当前登录用户信息。需要 JWT 认证。

**Request Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "user": {
    "id": "uuid",
    "username": "string"
  }
}
```

**Error Responses:**
- `401` -- `{ "message": "Unauthorized" }` (由 JwtAuthGuard 自动返回)

---

### 2. 对话 -- ConversationController

所有端点均需 JWT 认证（`@UseGuards(JwtAuthGuard)`）。用户只能访问自己的对话。

#### GET /api/conversations

获取当前用户的所有对话列表，按 `updatedAt` 降序排列。

**Response 200:**
```json
[
  {
    "id": "uuid",
    "title": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601",
    "messageCount": 5
  }
]
```

#### POST /api/conversations

创建新对话。

**Request Body:**
```json
{
  "title": "string (可选, 默认'新对话', 最长200字符)"
}
```

**Response 201:**
```json
{
  "id": "uuid",
  "title": "新对话",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

#### GET /api/conversations/:id

获取单个对话详情，含所有消息。

**Response 200:**
```json
{
  "id": "uuid",
  "title": "string",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "messages": [
    {
      "id": "uuid",
      "role": "user | assistant | system",
      "content": "string",
      "createdAt": "ISO8601"
    }
  ]
}
```

**Error Responses:**
- `404` -- `{ "message": "对话不存在" }`

#### PATCH /api/conversations/:id

更新对话标题。

**Request Body:**
```json
{
  "title": "string (必填, 最长200字符)"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "title": "string",
  "updatedAt": "ISO8601"
}
```

**Error Responses:**
- `404` -- `{ "message": "对话不存在" }`

#### DELETE /api/conversations/:id

删除对话及其所有消息（级联删除）。

**Response 204:** 无响应体

**Error Responses:**
- `404` -- `{ "message": "对话不存在" }`

---

### 3. 聊天 -- ChatController

#### POST /api/chat

发送消息并获取 AI 流式响应。需要 JWT 认证。

**Request Body:**
```json
{
  "conversationId": "uuid (必填)",
  "message": "string (用户消息内容, 必填)"
}
```

**处理流程：**
1. 验证 `conversationId` 属于当前用户
2. 将用户消息持久化到 `Message` 表 (role: `user`)
3. 从数据库加载该对话的历史消息
4. 调用 `AgentService`（LangGraph.js）获取 AI 响应
5. 将 AI 响应持久化到 `Message` 表 (role: `assistant`)
6. 更新 `Conversation.updatedAt`
7. 如果是对话中的第一条用户消息，自动根据 AI 响应内容设置对话标题（取前 30 个字符）

**Response (streaming):**

Content-Type: `text/plain; charset=utf-8`
Header: `X-Vercel-AI-Data-Stream: v1`

流式数据格式与当前一致（Vercel AI SDK data stream 协议）：
```
0:"chunk text"\n
0:"chunk text"\n
d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n
```

**Error Responses:**
- `400` -- `{ "message": "conversationId 和 message 不能为空" }`
- `404` -- `{ "message": "对话不存在" }`
- `500` -- 流式输出错误信息后正常结束（与现有行为一致）

---

### 4. 健康检查 -- HealthController

#### GET /health

**Response 200:**
```json
{
  "status": "ok",
  "service": "claw-agent",
  "engine": "langgraph.js"
}
```

---

### 5. 图结构 -- ChatController (附属端点)

#### GET /api/graph

返回 Agent 图结构的 Mermaid 描述。无需认证。

**Response 200:**
```json
{
  "mermaid": "string"
}
```

---

## 关键实现细节

### PrismaService

```typescript
// 继承 PrismaClient，实现 OnModuleInit 和 OnModuleDestroy
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

`PrismaModule` 标记为 `@Global()`，使 `PrismaService` 在所有模块中可用。

### JwtStrategy

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  // validate 方法返回的对象会被附加到 request.user
  async validate(payload: { userId: string; username: string }) {
    return { userId: payload.userId, username: payload.username };
  }
}
```

### CurrentUser 装饰器

```typescript
// 从 request 中提取已验证的用户信息
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // { userId: string, username: string }
  },
);
```

### AgentService

封装现有 `agent.ts` 中的 `createAgent()`、`getAgent()`、`convertToLangChainMessages()` 逻辑为 NestJS Injectable Service。`tools.ts` 原封不动迁移到 `src/chat/agent/tools.ts`。

```typescript
@Injectable()
export class AgentService implements OnModuleInit {
  private agent: CompiledStateGraph;

  onModuleInit() {
    this.agent = createAgent(); // 复用现有 createAgent 逻辑
  }

  getAgent() { return this.agent; }
  convertToLangChainMessages(messages: ChatMessage[]) { /* 复用现有逻辑 */ }
}
```

### ChatService 流式响应

NestJS 中通过 `@Res()` 装饰器直接操作 Express Response 对象实现流式写入，与当前 Express 实现方式相同：

```typescript
@Post('chat')
@UseGuards(JwtAuthGuard)
async chat(
  @Body() dto: ChatDto,
  @CurrentUser() user: JwtPayload,
  @Res() res: Response,
) {
  // 设置流式响应头
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('X-Vercel-AI-Data-Stream', 'v1');
  // ... 调用 AgentService，分块写入，最终 res.end()
}
```

### CORS 配置

```typescript
// main.ts
app.enableCors({
  origin: configService.get<string>('CORS_ORIGIN')?.split(',') || ['http://localhost:3000'],
  credentials: true,
});
```

### 全局路由前缀

不设置全局前缀。各 Controller 自行定义路由前缀，保持与现有 API 路径完全一致：
- `AuthController`: `@Controller('api/auth')`
- `ChatController`: `@Controller('api')`
- `ConversationController`: `@Controller('api/conversations')`
- `HealthController`: `@Controller()`

---

## 前端重构计划 (Frontend Refactoring Plan)

### 需要修改的文件

| 文件 | 变更内容 |
|------|----------|
| `packages/web/src/lib/storage.ts` | **删除** -- 不再使用 localStorage 存储对话/消息 |
| `packages/web/src/hooks/useConversations.ts` | **重写** -- 改为调用后端 API |
| `packages/web/src/contexts/AuthContext.tsx` | **微调** -- API base URL 配置无需改变（仍指向同一后端），接口路径不变 |
| `packages/web/src/app/page.tsx` | **调整** -- 适配新的 useConversations API |
| `packages/web/src/app/api/chat/route.ts` | **调整** -- 转发时改为传递 `conversationId` + `message` |
| `packages/web/src/types/index.ts` | **更新** -- 添加 API 响应类型 |

### 新增文件

| 文件 | 说明 |
|------|------|
| `packages/web/src/lib/api.ts` | API 客户端封装，统一处理认证头、错误处理、base URL |

### useConversations 重写方案

```typescript
// 新的 useConversations hook -- 所有数据来自后端 API
export function useConversations() {
  const { token } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化时从 API 加载对话列表
  useEffect(() => {
    fetchConversations();
  }, [token]);

  const fetchConversations = async () => { /* GET /api/conversations */ };
  const createConversation = async () => { /* POST /api/conversations */ };
  const deleteConversation = async (id: string) => { /* DELETE /api/conversations/:id */ };
  const updateTitle = async (id: string, title: string) => { /* PATCH /api/conversations/:id */ };
  const loadMessagesForConversation = async (id: string) => { /* GET /api/conversations/:id -> messages */ };

  // saveMessagesForConversation 不再需要 -- 消息由后端在 /api/chat 中自动持久化

  return { conversations, activeId, setActiveId, createConversation, deleteConversation, updateTitle, loadMessagesForConversation, isLoading };
}
```

**关键变化：**
1. `saveMessagesForConversation` 移除 -- 消息由 `POST /api/chat` 自动持久化
2. `loadMessagesForConversation` 改为异步 -- 从 API 加载
3. 新增 `isLoading` 状态 -- 列表加载中显示 loading
4. 删除 `storageWarning` 相关逻辑 -- 不再受 localStorage 配额限制

### page.tsx 适配变化

1. `useChat` 的 `onFinish` 回调中不再手动调用 `updateTitle`，标题由后端自动设置
2. 移除 `saveMessagesForConversation` 的所有调用
3. `handleSelectConversation` 改为异步加载消息
4. `handleNewConversation` 调用后端 API 创建对话
5. `/api/chat` proxy route 改为传递 `{ conversationId, message }` 而非 `{ messages }`

### chat/route.ts 代理调整

```typescript
// 改为传递 conversationId + message，而非完整 messages 数组
const response = await fetch(`${BACKEND_URL}/api/chat`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    conversationId: body.conversationId,
    message: body.message,
  }),
});
```

注意：由于 `useChat`（`@ai-sdk/react`）默认发送 `{ messages }` 数组，前端需要在 `route.ts` 代理层中提取最后一条用户消息，并附上 `conversationId`：

```typescript
const { messages, conversationId } = body;
const lastUserMessage = messages.filter(m => m.role === 'user').pop();
const response = await fetch(`${BACKEND_URL}/api/chat`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    conversationId,
    message: lastUserMessage.content,
  }),
});
```

`useChat` 调用时需要通过 `body` 参数附加 `conversationId`：

```typescript
const { ... } = useChat({
  api: "/api/chat",
  id: activeId,
  body: { conversationId: activeId },
  // ...
});
```

---

## 环境配置 (Environment Configuration)

### packages/server/.env.example

```env
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/claw_agent?schema=public"

# JWT
JWT_SECRET="your-secure-jwt-secret-here"

# CORS (逗号分隔多个 origin)
CORS_ORIGIN="http://localhost:3000"

# 服务端口
PORT=8001

# LLM API (保留现有配置)
MINIMAX_API_KEY="your-minimax-api-key"
MINIMAX_BASE_URL="https://api.minimaxi.com/anthropic"
```

### packages/server 使用 @nestjs/config

```typescript
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // ...其他模块
  ],
})
export class AppModule {}
```

通过 `ConfigService` 注入读取配置，不直接使用 `process.env`。

---

## 迁移步骤 (Ordered Migration Steps)

### 阶段 1: 后端基础设施（无前端变更）

1. **初始化 NestJS 项目**
   - 在 `packages/server/` 下安装 NestJS 依赖：`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `@nestjs/config`, `@nestjs/passport`, `@nestjs/jwt`, `passport`, `passport-jwt`, `class-validator`, `class-transformer`
   - 安装 Prisma 依赖：`prisma` (devDep), `@prisma/client`
   - 安装类型：`@types/passport-jwt`
   - 移除 Express 直接依赖：`express`, `cors`, `@types/express`, `@types/cors`, `jsonwebtoken`, `@types/jsonwebtoken`（NestJS 内置 Express，JWT 由 `@nestjs/jwt` 管理）
   - 保留：`bcryptjs`, `@types/bcryptjs`, `dotenv`, `zod`, LangChain 系列包
   - 创建 `nest-cli.json`, 更新 `tsconfig.json` 适配 NestJS（启用 `emitDecoratorMetadata`, `experimentalDecorators`）

2. **配置 Prisma**
   - 运行 `npx prisma init` 生成 `prisma/` 目录和 `.env`
   - 编写 `schema.prisma`（如上定义）
   - 运行 `npx prisma migrate dev --name init` 创建初始迁移
   - 运行 `npx prisma generate` 生成客户端

3. **实现 PrismaModule**
   - 创建 `PrismaService`（继承 PrismaClient）
   - 注册为 Global Module

4. **实现 AuthModule**
   - 创建 `AuthService` -- 使用 `PrismaService` 替代 JSON 文件读写
   - 创建 `JwtStrategy` -- 使用 `@nestjs/passport`
   - 创建 `JwtAuthGuard`
   - 创建 `CurrentUser` 装饰器
   - 创建 `AuthController` -- 保持路径 `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
   - DTO 验证使用 `class-validator`

5. **实现 HealthModule**
   - 创建 `HealthController` -- `GET /health`

6. **实现 ChatModule**
   - 创建 `AgentService` -- 封装现有 `agent.ts` 和 `tools.ts`
   - 创建 `ChatController` -- `POST /api/chat` 流式响应
   - 创建 `ChatService` -- 消息持久化逻辑

7. **实现 ConversationModule**
   - 创建 `ConversationController` -- CRUD 端点
   - 创建 `ConversationService`

8. **配置 main.ts**
   - CORS 配置
   - 全局 ValidationPipe
   - 端口绑定

9. **更新 package.json scripts**
   - `dev`: `nest start --watch`
   - `build`: `nest build`
   - `start`: `node dist/main.js`
   - 新增 `prisma:migrate`: `prisma migrate deploy`
   - 新增 `prisma:generate`: `prisma generate`
   - 新增 `prisma:studio`: `prisma studio`

10. **验证后端** -- 使用 curl/Postman 测试所有端点，确保与现有前端的 auth 接口兼容

### 阶段 2: 前端适配

11. **创建 API 客户端**
    - 新建 `packages/web/src/lib/api.ts`，封装 `fetch` 调用，自动附加 JWT Authorization header

12. **重写 useConversations hook**
    - 改为调用后端 API
    - 移除 localStorage 相关逻辑

13. **调整 page.tsx**
    - 适配异步加载消息
    - 移除 `saveMessagesForConversation` 调用
    - `useChat` 调用增加 `body: { conversationId }` 参数

14. **调整 chat/route.ts proxy**
    - 提取最后一条用户消息 + conversationId 转发到后端

15. **删除 storage.ts**
    - 移除不再使用的 localStorage 工具函数

16. **更新类型定义**
    - `types/index.ts` 中添加 API 响应类型

### 阶段 3: 清理与验证

17. **端到端测试**
    - 注册新用户
    - 登录
    - 创建对话
    - 发送消息并收到流式响应
    - 刷新页面后对话历史从 API 加载
    - 删除对话
    - 退出登录后无法访问对话

18. **移除遗留代码**
    - 删除 `packages/server/data/` 目录（JSON 用户文件）
    - 确认无残留的 localStorage 读写

19. **更新 Docker 配置**（如有）
    - 添加 PostgreSQL 服务
    - 更新 server Dockerfile 增加 `prisma generate` 步骤

---

## 技术约束与关注点 (Technical Constraints & Considerations)

1. **TypeScript 配置变更** -- NestJS 要求 `emitDecoratorMetadata: true` 和 `experimentalDecorators: true`。当前 `tsconfig.json` 未启用这两项。需要同时将 `module` 改为 `commonjs`（NestJS 默认），或使用 SWC 编译器保持 ESM（推荐使用 NestJS 默认的 CommonJS 模式以避免 ESM/CJS 互操作问题）。

2. **ESM 到 CJS 迁移** -- 当前 server 的 `package.json` 设置 `"type": "module"`，所有 import 使用 `.js` 扩展名。迁移到 NestJS 后需移除 `"type": "module"`，去掉 import 中的 `.js` 后缀。LangChain 包同时支持 ESM 和 CJS，不受影响。

3. **LangGraph.js 兼容性** -- `@langchain/anthropic`, `@langchain/core`, `@langchain/langgraph` 均为现有依赖。Agent 逻辑仅需从文件级单例改为 NestJS Service 单例，逻辑不变。

4. **流式响应** -- NestJS 中使用 `@Res()` 注入 Express Response 对象可实现与当前完全相同的流式输出。注意：使用 `@Res()` 后 NestJS 不会自动发送响应，需要手动 `res.end()`。

5. **密码哈希兼容** -- 新系统使用相同的 `bcryptjs` + salt rounds=10，确保现有 JSON 文件中的用户（如有手动迁移需求）密码哈希可直接复用。

6. **JWT Token 兼容** -- JWT payload 结构保持 `{ userId, username }` 不变，`JWT_SECRET` 环境变量名不变。如果迁移期间使用相同的 secret，已颁发的 token 可继续使用。

7. **数据库连接池** -- Prisma 默认连接池大小为 `num_cpus * 2 + 1`。对于单实例部署足够。如需调整可在 `DATABASE_URL` 中添加 `?connection_limit=N`。

8. **pnpm monorepo 兼容** -- NestJS 项目仍在 `packages/server/` 下，包名保持 `@claw-agent/server`。pnpm workspace 配置无需修改。根 `package.json` 中的 scripts 无需修改。

9. **前端 `@ai-sdk/react` useChat 适配** -- `useChat` hook 默认发送完整 messages 数组。通过 `body` 参数附加 `conversationId`，在 Next.js API route 代理层中提取最后一条消息和 conversationId 转发到后端。这样前端 `useChat` 的行为变化最小。

---

## 范围说明 (Scope)

### In Scope
- NestJS 项目搭建与模块实现
- Prisma schema 设计与初始 migration
- User/Conversation/Message 三个模型的 CRUD
- JWT 认证（注册/登录/守卫）
- 聊天流式响应端点（复用 LangGraph.js）
- 消息服务端持久化
- 前端从 localStorage 迁移到 API 调用
- 环境变量配置
- CORS 配置

### Out of Scope
- 用户数据从 JSON 文件批量迁移到 PostgreSQL（用户量极小，可手动重新注册）
- WebSocket 实时通信（保持现有 HTTP 流式响应方式）
- 分页查询（对话列表和消息列表暂不分页，后续根据数据量决定）
- Rate limiting / throttling（后续迭代添加）
- 单元测试和 E2E 测试（后续迭代添加）
- Docker Compose 配置更新（视部署环境单独处理）
- CI/CD pipeline 更新

### Future Considerations
- 消息列表分页（当单个对话消息数 > 100 时考虑）
- 对话列表分页（当用户对话数 > 50 时考虑）
- Rate limiting -- 使用 `@nestjs/throttler` 限制 `/api/chat` 请求频率
- Redis 缓存 -- 缓存对话列表，减少数据库查询
- 文件上传 -- 支持多模态对话中的图片上传
- 多模型切换 -- 支持在对话中选择不同的 LLM 模型

---

## 用户故事 (User Stories)

1. 作为用户，我希望在不同设备上登录后都能看到我的对话历史，以便我可以随时继续之前的对话。
2. 作为用户，我希望对话历史不会因为清除浏览器缓存而丢失，以便我的重要对话内容得到持久保存。
3. 作为用户，我希望能够创建、查看和删除我的对话，以便管理我的聊天记录。
4. 作为用户，我希望发送消息后能看到流式输出的 AI 响应，以便获得实时的交互体验。
5. 作为用户，我希望其他人无法看到我的对话内容，以便我的隐私得到保护。

---

## 验收标准 (Acceptance Criteria)

### 认证

**AC-001**: GIVEN 一个未注册的用户名 WHEN 调用 `POST /api/auth/register` 传入合法用户名(3-20字符)和密码(>=6字符) THEN 返回 200，响应体包含 `token`(非空字符串) 和 `user`(含 `id`, `username`)，数据库 `users` 表新增一行记录。

**AC-002**: GIVEN 一个已存在的用户名 WHEN 调用 `POST /api/auth/register` THEN 返回 409，响应体 `message` 为 `"用户名已存在"`。

**AC-003**: GIVEN 用户名长度 < 3 或 > 20 WHEN 调用 `POST /api/auth/register` THEN 返回 400。

**AC-004**: GIVEN 密码长度 < 6 WHEN 调用 `POST /api/auth/register` THEN 返回 400。

**AC-005**: GIVEN 一个已注册的用户 WHEN 调用 `POST /api/auth/login` 传入正确的用户名和密码 THEN 返回 200，包含有效的 JWT token。

**AC-006**: GIVEN 错误的密码 WHEN 调用 `POST /api/auth/login` THEN 返回 401，`message` 为 `"用户名或密码错误"`。

**AC-007**: GIVEN 一个有效的 JWT token WHEN 调用 `GET /api/auth/me` 携带 `Authorization: Bearer <token>` THEN 返回 200，包含用户的 `id` 和 `username`。

**AC-008**: GIVEN 无 token 或无效/过期 token WHEN 调用 `GET /api/auth/me` THEN 返回 401。

### 对话管理

**AC-009**: GIVEN 已认证用户 WHEN 调用 `POST /api/conversations` THEN 返回 201，数据库新增一条 `conversations` 记录，`userId` 为当前用户 ID，默认 `title` 为 `"新对话"`。

**AC-010**: GIVEN 已认证用户有 3 个对话 WHEN 调用 `GET /api/conversations` THEN 返回 200，响应体为包含 3 个对话对象的数组，按 `updatedAt` 降序排列，每个对象包含 `messageCount`。

**AC-011**: GIVEN 已认证用户 WHEN 调用 `GET /api/conversations/:id` 使用自己的对话 ID THEN 返回 200，响应体包含对话详情和 `messages` 数组（按 `createdAt` 升序）。

**AC-012**: GIVEN 已认证用户 WHEN 调用 `GET /api/conversations/:id` 使用其他用户的对话 ID THEN 返回 404。

**AC-013**: GIVEN 已认证用户 WHEN 调用 `PATCH /api/conversations/:id` 更新自己对话的 title THEN 返回 200，数据库中该对话的 `title` 和 `updatedAt` 已更新。

**AC-014**: GIVEN 已认证用户 WHEN 调用 `DELETE /api/conversations/:id` 删除自己的对话 THEN 返回 204，数据库中该对话和其所有关联消息均被删除。

### 聊天与消息持久化

**AC-015**: GIVEN 已认证用户和一个空对话 WHEN 调用 `POST /api/chat` 传入 `conversationId` 和 `message` THEN 响应为流式输出（Content-Type: `text/plain; charset=utf-8`，Header: `X-Vercel-AI-Data-Stream: v1`），且数据库中新增 2 条 `messages` 记录（1 条 role=`user`，1 条 role=`assistant`）。

**AC-016**: GIVEN 对话中已有 4 条历史消息 WHEN 调用 `POST /api/chat` THEN Agent 接收到包含历史上下文的消息列表（System prompt + 4 条历史 + 新用户消息），AI 响应考虑了上下文。

**AC-017**: GIVEN 对话中的第一条用户消息 WHEN AI 响应生成后 THEN 对话的 `title` 自动更新为 AI 响应前 30 个字符（去除换行符）。

**AC-018**: GIVEN 用户 A 的对话 ID WHEN 用户 B 调用 `POST /api/chat` 传入该 ID THEN 返回 404。

### 流式响应格式

**AC-019**: GIVEN 调用 `POST /api/chat` WHEN Agent 正常返回 THEN 流式输出符合 Vercel AI SDK data stream v1 协议：文本块格式为 `0:"text"\n`，结束信号为 `d:{"finishReason":"stop",...}\n`。

**AC-020**: GIVEN 调用 `POST /api/chat` WHEN Agent 执行出错 THEN 流中输出错误信息文本块，结束信号 `finishReason` 为 `"error"`，HTTP 状态码仍为 200（流已开始）。

### 健康检查

**AC-021**: GIVEN 服务已启动 WHEN 调用 `GET /health` THEN 返回 200，响应体为 `{ "status": "ok", "service": "claw-agent", "engine": "langgraph.js" }`。

### 前端集成

**AC-022**: GIVEN 用户在浏览器中登录 WHEN 页面加载 THEN 侧边栏显示从 API 加载的对话列表（非 localStorage），显示 loading 状态直到加载完成。

**AC-023**: GIVEN 用户点击侧边栏中的对话 WHEN 对话切换 THEN 聊天区域显示从 API 加载的该对话的历史消息。

**AC-024**: GIVEN 用户发送消息 WHEN 收到完整的 AI 流式响应后 THEN 刷新页面后该对话的消息仍然存在（来自 API 而非 localStorage）。

**AC-025**: GIVEN 用户点击"新对话"按钮 WHEN 按钮被点击 THEN 后端创建新的对话记录，前端切换到新对话，聊天区域清空。

**AC-026**: GIVEN 用户删除一个对话 WHEN 删除操作完成 THEN 该对话及其消息从数据库中永久删除，侧边栏列表更新。

### 环境配置

**AC-027**: GIVEN `packages/server/.env` 中配置了 `DATABASE_URL` WHEN 服务启动 THEN Prisma 成功连接到 PostgreSQL 数据库。

**AC-028**: GIVEN `.env` 中 `CORS_ORIGIN` 设为 `"http://localhost:3000,http://example.com"` WHEN 从这两个 origin 发起请求 THEN 请求不被 CORS 阻止。

**AC-029**: GIVEN `.env` 中 `PORT` 设为 `8001` WHEN 服务启动 THEN 服务监听在 8001 端口。
