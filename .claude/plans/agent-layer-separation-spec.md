STATUS: PASSED_REVIEW — 2026-03-13

# Agent 层独立拆包 -- Open Spec

## 背景与目标 (Background & Goals)

当前 `packages/server` 是一个 NestJS + Prisma + LangGraph.js 的后端服务。Agent 相关代码位于 `packages/server/src/chat/agent/` 下，包含 `agent.service.ts`（LangGraph StateGraph 编排、LLM 调用、消息转换）和 `tools.ts`（工具定义）。

存在以下问题：

1. **关注点耦合** -- Agent 层（LLM 调用、工具定义、状态图编排）与服务层（HTTP 路由、数据库持久化、认证）混在同一个包中，职责边界模糊。
2. **TypeScript 配置冲突潜力** -- LangChain 系列包依赖 `moduleResolution: node16` 来正确解析 package.json exports 字段，而 NestJS 生态更常见 commonjs 配置。虽然当前 server 已用 node16 且能编译通过，但将 agent 逻辑独立出来可以在未来需要调整时互不影响。
3. **复用性受限** -- 如果未来其他包（如 CLI 工具、测试脚手架）需要使用 Agent 能力，目前必须依赖整个 server 包。

目标：将 LangGraph.js Agent 层从 `packages/server` 中独立拆出，作为 `packages/agent`（`@claw-agent/agent`），使 Agent 逻辑成为一个纯粹的、无 NestJS 依赖的库包。Server 中的 `AgentService` 变成薄封装层，通过 workspace 依赖引用 agent 包。

---

## 用户故事 (User Stories)

1. 作为后端开发者，我希望 Agent 逻辑独立于 NestJS 框架存在，以便我可以在不启动完整服务的情况下单独测试和调试 Agent 行为。
2. 作为后端开发者，我希望 Agent 包有独立的 TypeScript 配置，以便 LangChain 包的 module resolution 需求不会约束 server 侧的编译选项。
3. 作为后端开发者，我希望 `packages/server` 中的 `AgentService` 是一个薄封装层，以便我能清晰地区分"Agent 编排逻辑"和"服务层集成逻辑"。
4. 作为项目维护者，我希望 Agent 包是一个纯函数式的库（无框架依赖、无环境变量读取），以便未来其他消费者（CLI、测试工具）可以直接引用。

---

## 验收标准 (Acceptance Criteria)

### 包结构与配置

**AC-001**: GIVEN monorepo 根目录 WHEN 查看目录结构 THEN 存在 `packages/agent/` 目录，包含 `package.json`、`tsconfig.json`、`src/` 目录。

**AC-002**: GIVEN `packages/agent/package.json` WHEN 检查其内容 THEN `name` 为 `"@claw-agent/agent"`，`private` 为 `true`，`main` 指向 `"dist/index.js"`，`types` 指向 `"dist/index.d.ts"`，不包含 `"type": "module"` 字段（输出 CJS）。

**AC-003**: GIVEN `packages/agent/tsconfig.json` WHEN 检查其内容 THEN `module` 为 `"node16"`，`moduleResolution` 为 `"node16"`，`outDir` 为 `"./dist"`，`rootDir` 为 `"./src"`，`declaration` 为 `true`，`strict` 为 `true`。不包含 `emitDecoratorMetadata` 和 `experimentalDecorators`（agent 包不使用装饰器）。

**AC-004**: GIVEN `packages/agent/package.json` 的 `dependencies` WHEN 检查 THEN 包含以下依赖（版本与当前 server 中一致）：
- `@langchain/anthropic: "^1.3.23"`
- `@langchain/core: "^1.1.32"`
- `@langchain/langgraph: "^1.2.2"`
- `zod: "^3.23.8"`

**AC-005**: GIVEN `packages/agent/package.json` 的 `scripts` WHEN 检查 THEN 包含 `"build": "tsc"` 和 `"clean": "rm -rf dist"`。

**AC-006**: GIVEN `pnpm-workspace.yaml` WHEN 检查 THEN 其 `packages` 配置（当前为 `"packages/*"`）天然覆盖 `packages/agent`，无需修改。

### 公开 API（packages/agent/src/index.ts 导出）

**AC-007**: GIVEN `packages/agent/src/index.ts` WHEN 检查其导出 THEN 导出以下内容：
- `createAgent` 函数
- `convertToLangChainMessages` 函数
- `SYSTEM_PROMPT` 字符串常量
- `allTools` 数组
- 各个独立 tool：`getWeather`、`calculate`、`searchKnowledge`
- `ChatMessage` 类型（interface）
- `AgentConfig` 类型（interface）

**AC-008**: GIVEN 调用 `createAgent(config: AgentConfig)` WHEN 传入 `{ apiKey: "xxx", baseUrl: "https://..." }` THEN 返回一个 LangGraph `CompiledStateGraph` 实例，该实例可调用 `.invoke({ messages })` 和 `.getGraph()`。

**AC-009**: GIVEN `AgentConfig` 类型 WHEN 检查其定义 THEN 包含以下字段：
- `apiKey: string`（必填）
- `baseUrl: string`（必填）
- `modelName?: string`（可选，默认值 `"MiniMax-M2.5"`）
- `maxTokens?: number`（可选，默认值 `4096`）
- `systemPrompt?: string`（可选，默认值为 `SYSTEM_PROMPT` 常量）

**AC-010**: GIVEN 调用 `createAgent({ apiKey: "xxx", baseUrl: "https://...", systemPrompt: "自定义提示词" })` WHEN Agent 处理消息 THEN Agent 使用传入的自定义 system prompt 而非默认的 `SYSTEM_PROMPT`。

**AC-011**: GIVEN 调用 `createAgent({ apiKey: "xxx", baseUrl: "https://..." })` 不传 `systemPrompt` WHEN Agent 处理消息 THEN Agent 使用默认的 `SYSTEM_PROMPT` 常量。

**AC-012**: GIVEN 调用 `convertToLangChainMessages(messages: ChatMessage[], systemPrompt?: string)` WHEN 传入 `[{ role: "user", content: "hello" }, { role: "assistant", content: "hi" }]` THEN 返回 `[SystemMessage(SYSTEM_PROMPT), HumanMessage("hello"), AIMessage("hi")]` 的 BaseMessage 数组。

**AC-013**: GIVEN 调用 `convertToLangChainMessages(messages, "自定义提示词")` WHEN 传入消息数组和自定义 systemPrompt THEN 返回的第一条消息为 `SystemMessage("自定义提示词")`。

### Agent 包内部结构

**AC-014**: GIVEN `packages/agent/src/` 目录 WHEN 查看文件结构 THEN 至少包含以下文件：
- `index.ts` -- 统一导出入口
- `agent.ts` -- `createAgent` 函数和 `AgentConfig` 接口定义
- `tools.ts` -- 工具定义（`getWeather`、`calculate`、`searchKnowledge`、`allTools`）
- `types.ts` -- `ChatMessage` 接口定义
- `prompts.ts` -- `SYSTEM_PROMPT` 常量
- `messages.ts` -- `convertToLangChainMessages` 函数

**AC-015**: GIVEN `packages/agent/` 的所有源文件 WHEN 检查其 import 语句 THEN 没有任何文件 import 来自 `@nestjs/*`、`@prisma/*`、或 `express` 的模块。agent 包是纯粹的 LangChain 库。

### Server 侧重构

**AC-016**: GIVEN `packages/server/package.json` 的 `dependencies` WHEN 检查 THEN 包含 `"@claw-agent/agent": "workspace:*"`，且不再直接包含 `@langchain/anthropic`、`@langchain/core`、`@langchain/langgraph` 这三个包（它们已迁移到 agent 包，server 通过传递依赖获取）。`zod` 保留在 server 中。

**AC-017**: GIVEN `packages/server/src/chat/agent/agent.service.ts` WHEN 检查其实现 THEN `AgentService` 仍为 `@Injectable()` 的 NestJS Provider，实现 `OnModuleInit`，但其内部逻辑简化为：
- 构造函数中通过 `ConfigService` 读取 `MINIMAX_API_KEY` 和 `MINIMAX_BASE_URL`
- `onModuleInit()` 中调用 `@claw-agent/agent` 的 `createAgent({ apiKey, baseUrl })` 创建 agent 实例
- `getAgent()` 返回 agent 实例
- `convertToLangChainMessages()` 代理调用 `@claw-agent/agent` 导出的同名函数
- 不再包含 `StateGraph`、`ToolNode`、`ChatAnthropic`、`agentNode`、`shouldContinue` 等内部实现

**AC-018**: GIVEN `packages/server/src/chat/agent/` 目录 WHEN 检查 THEN `tools.ts` 文件已删除（工具定义已迁移到 `packages/agent/src/tools.ts`）。

**AC-019**: GIVEN `packages/server/src/chat/chat.service.ts` WHEN 检查其 import 语句 THEN `ChatMessage` 类型从 `@claw-agent/agent` 导入（直接从 agent 包导入，或通过 `AgentService` re-export），`AIMessage` 和 `BaseMessage` 从 `@claw-agent/agent` 的 re-export 导入。

**AC-020**: GIVEN `packages/server/src/chat/chat.module.ts` WHEN 检查其内容 THEN 模块注册不变（`providers: [ChatService, AgentService]`），无需修改。

**AC-021**: GIVEN `packages/server/src/chat/chat.service.ts` 中对 `AgentService` 的调用 WHEN 检查 THEN `this.agentService.convertToLangChainMessages()`、`this.agentService.getAgent()`、`agent.invoke()` 调用方式不变，`ChatService` 的业务逻辑无需修改。

### 构建与依赖

**AC-022**: GIVEN 在 monorepo 根目录执行 `pnpm install` WHEN 安装完成 THEN `packages/server/node_modules/@claw-agent/agent` 正确链接到 `packages/agent`。

**AC-023**: GIVEN 在 `packages/agent/` 目录执行 `pnpm run build`（即 `tsc`）WHEN 编译完成 THEN `packages/agent/dist/` 目录中生成 `.js` 和 `.d.ts` 文件，无编译错误。

**AC-024**: GIVEN `packages/agent` 已构建 WHEN 在 `packages/server/` 目录执行 `pnpm run build`（即 `nest build`）THEN server 编译成功，无错误。

**AC-025**: GIVEN 根目录 `package.json` 的 scripts WHEN 检查 THEN 新增 `"build:agent": "pnpm --filter @claw-agent/agent build"` 和 `"dev:agent": "pnpm --filter @claw-agent/agent build --watch"`。

**AC-026**: GIVEN 在根目录执行 `pnpm run build` WHEN pnpm 按依赖拓扑排序执行 THEN agent 包先于 server 包构建完成。

### 功能回归

**AC-027**: GIVEN 拆分完成后启动 server WHEN 用户通过前端发送聊天消息 THEN 流式响应行为与拆分前完全一致（相同的流格式、相同的 tool 调用能力、相同的 system prompt）。

**AC-028**: GIVEN 拆分完成后 WHEN 调用 `GET /api/graph` THEN 返回的 mermaid 图结构与拆分前一致（包含 agent 节点、tools 节点、条件边）。

---

## 技术约束与关注点 (Technical Constraints & Considerations)

### 1. TypeScript 配置

当前 server 的 `tsconfig.json` 已经使用 `module: node16` / `moduleResolution: node16`，agent 包保持一致。两个包的关键差异：
- **server**: 需要 `emitDecoratorMetadata: true` 和 `experimentalDecorators: true`（NestJS 装饰器）
- **agent**: 不需要装饰器支持，是纯函数式库

Agent 包的 `tsconfig.json` 不应从 server 的配置继承，应完全独立定义。

### 2. 传递依赖（Transitive Dependencies）与 pnpm 严格模式

Server 中的 `chat.service.ts` 直接使用了 `@langchain/core/messages` 中的 `AIMessage`、`BaseMessage` 类型。从 server 的 `dependencies` 中移除 `@langchain/core` 后，server 通过 `@claw-agent/agent` 的传递依赖获取这些类型。

在 pnpm 严格模式下（默认行为），未在自身 `package.json` 中声明的包无法直接 import。解决方案：

**推荐**：agent 包在 `index.ts` 中 re-export server 需要的 LangChain 类型（`AIMessage`、`BaseMessage`、`BaseMessage` 所在的 messages 模块中 server 实际用到的类型），server 从 `@claw-agent/agent` 导入这些类型。

这样 server 完全不需要直接依赖任何 `@langchain/*` 包。

### 3. NestJS nest-cli.json 与构建顺序

当前 `nest-cli.json` 使用 `tsconfig.build.json`（继承自 `tsconfig.json`，仅额外设置 `deleteOutDir: true`）。`nest build` 只编译 server 自身的 `src/` 目录，不会编译 `packages/agent`。

因此 agent 包必须在 server 之前完成构建，输出 `.js` + `.d.ts` 到 `dist/`，server 才能正确引用。`pnpm -r build` 会自动根据 workspace 依赖拓扑排序处理。

开发模式下，可通过 `tsc --watch`（agent 包）配合 `nest start --watch`（server）实现联动热更新。

### 4. `createAgent` 内部闭包结构

当前 `agent.service.ts` 中的 `agentNode` 和 `shouldContinue` 是 `createAgent` 方法内的闭包函数，引用了 `llmWithTools` 和 `SYSTEM_PROMPT`。迁移到 agent 包后，闭包结构保持不变，只需将硬编码的 `SYSTEM_PROMPT` 引用改为使用 config 参数中的 `systemPrompt`（默认值为 `SYSTEM_PROMPT` 常量）。

### 5. ChatAnthropic 默认配置值

当前硬编码的 LLM 配置参数作为 `AgentConfig` 的可选字段默认值：
- `modelName` 默认 `"MiniMax-M2.5"`
- `maxTokens` 默认 `4096`

### 6. agent 包的 .gitignore

`packages/agent/` 需要一个 `.gitignore` 文件（或利用根目录 `.gitignore`），确保 `dist/` 目录不被提交到版本控制。

---

## 范围说明 (Scope)

### In Scope
- 新建 `packages/agent` 包，包含完整的 package.json、tsconfig.json、src/ 目录
- 将 `agent.service.ts` 中的 Agent 创建逻辑（StateGraph 编排、LLM 初始化、agentNode、shouldContinue）迁移到 agent 包
- 将 `tools.ts` 完整迁移到 agent 包
- 将 `ChatMessage` 接口和 `SYSTEM_PROMPT` 常量迁移到 agent 包
- 新增 `convertToLangChainMessages` 为独立函数（从 AgentService 方法中提取）
- 定义 `AgentConfig` 接口，支持显式传入 apiKey、baseUrl、modelName、maxTokens、systemPrompt
- 重构 server 侧的 `AgentService` 为薄封装层（保留 NestJS Provider 身份）
- 更新 server 的 `package.json` 依赖（添加 `@claw-agent/agent: workspace:*`，移除直接 LangChain 依赖）
- agent 包 re-export server 需要的 LangChain 类型（解决 pnpm 严格模式问题）
- 更新根目录 `package.json` 的 scripts（`build:agent`、`dev:agent`）
- 确保构建顺序正确、编译无错误

### Out of Scope
- 新的业务功能或 Agent 能力变更
- 修改 `ChatService`、`ChatController`、`ChatModule` 的公开接口或行为逻辑
- 修改前端代码
- 修改 Prisma schema 或数据库相关逻辑
- 发布 agent 包到 npm registry
- 添加单元测试
- Docker 配置更新

### Future Considerations
- 为 agent 包添加单元测试（可独立于 NestJS 测试 Agent 行为）
- 支持 tool 插件化注册（通过 `AgentConfig` 传入自定义 tools 数组，而非硬编码 `allTools`）
- 支持多 LLM provider（不仅限于 `ChatAnthropic`，可通过配置切换）
- 如果 server 未来需要改回 commonjs，agent 包的独立 tsconfig 可确保不受影响
- 考虑 `convertToLangChainMessages` 中对 `role: 'system'` 消息的处理（当前实现忽略了 input 中 role 为 system 的消息）
