STATUS: READY_FOR_BUILD

# Chat History Persistent Storage — Open Spec

## 背景与目标 (Background & Goals)

当前 claw-agent 的对话数据完全存储在 React useState 中（useConversations hook 管理对话列表，useChat hook 管理消息）。用户刷新页面后所有对话历史丢失，无 localStorage、IndexedDB 或后端持久化机制。

本特性目标：使用 localStorage 实现前端本地持久化，使对话列表和消息内容在页面刷新后可恢复，提升用户体验。

不涉及后端改动，仅修改 packages/web 前端代码。

## 数据模型 (Data Schema)

### localStorage Key 设计

| Key                              | 类型                  | 描述                                     |
|----------------------------------|----------------------|------------------------------------------|
| claw-conversations               | StoredConversation[] | 对话列表元数据                            |
| claw-messages-{conversationId}   | StoredMessage[]      | 每个对话的消息列表（按对话ID分开存储）      |

### StoredConversation

```typescript
interface StoredConversation {
  id: string;
  title: string;
  createdAt: string;   // ISO 8601 字符串
  updatedAt: string;   // ISO 8601 字符串
}
```

### StoredMessage

```typescript
// 与 Vercel AI SDK 的 Message 类型对齐
interface StoredMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;  // ISO 8601 字符串
}
```

## 技术方案 (Technical Approach)

### 1. 新增 localStorage 工具模块

新建 `packages/web/src/lib/storage.ts`，封装所有 localStorage 读写逻辑：

```typescript
function loadConversations(): Conversation[]
function saveConversations(conversations: Conversation[]): void
function loadMessages(conversationId: string): Message[]
function saveMessages(conversationId: string, messages: Message[]): void
function deleteMessages(conversationId: string): void
function getStorageUsage(): { used: number; quota: number; percentage: number }
```

关键细节：
- 所有 localStorage.setItem 调用包裹在 try/catch 中，捕获 QuotaExceededError
- 读取时做 JSON.parse 异常保护，数据损坏则返回空数组并 console.warn
- Date 字段序列化用 toISOString()，反序列化用 new Date(str)

### 2. 重构 useConversations hook

修改 `packages/web/src/hooks/useConversations.ts`：

- 初始化：从 loadConversations() 读取，为空时创建默认对话
- 写入：每次 conversations 变化后通过 useEffect 同步写入 localStorage
- 删除：deleteConversation 同时调用 deleteMessages(id) 清理对应消息数据
- 新增导出：loadMessagesForConversation 方法

### 3. 修改 page.tsx 集成逻辑

修改 `packages/web/src/app/page.tsx`：

- 切换对话时：handleSelectConversation 中 setMessages(loadMessages(id)) 替代 setMessages([])
- 消息自动保存：useEffect 监听 messages 变化，!isLoading && messages.length > 0 时保存
- 存储空间警告：QuotaExceededError 时通过 toast 或内联提示通知用户

### 4. 存储容量管理

- localStorage 一般限制约 5MB
- QuotaExceededError 时显示提示，不自动删除数据
- 本次消息仍在内存中正常使用，仅持久化失败

## 变更文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `packages/web/src/lib/storage.ts` | 新增 | localStorage 读写工具模块 |
| `packages/web/src/hooks/useConversations.ts` | 修改 | 集成 localStorage 持久化 |
| `packages/web/src/app/page.tsx` | 修改 | 消息加载和自动保存 |
| `packages/web/src/types/index.ts` | 修改 | 新增 StoredConversation/StoredMessage 类型 |

## 验收标准 (Acceptance Criteria)

### 对话列表持久化
- AC-001: GIVEN 用户已有 3 个对话 WHEN 用户刷新页面 THEN 对话列表显示相同的 3 个对话
- AC-002: GIVEN 用户删除一个对话 WHEN 查看 localStorage THEN 对话记录和消息 key 均已移除
- AC-003: GIVEN 用户修改了对话标题 WHEN 刷新页面 THEN 标题仍为修改后的值

### 消息持久化
- AC-004: GIVEN 用户在对话中有 4 条消息 WHEN 刷新页面并选择该对话 THEN 显示完整的 4 条消息
- AC-005: GIVEN 用户切换对话 A->B->A THEN 对话 A 的历史消息完整显示
- AC-006: GIVEN AI 正在流式输出 WHEN 观察 localStorage THEN 不触发消息保存
- AC-007: GIVEN AI 完成回复 WHEN 检查 localStorage THEN 包含最新完整消息列表

### 存储容量管理
- AC-008: GIVEN 存储空间不足 WHEN 保存触发 QuotaExceededError THEN 显示提示，不自动删除数据

### 数据完整性
- AC-009: GIVEN localStorage 数据损坏 WHEN 页面加载 THEN 回退到默认状态，不抛异常
- AC-010: GIVEN 浏览器禁用 localStorage WHEN 页面加载 THEN 退化为纯内存模式

### 兼容性
- AC-011: GIVEN useChat hook 加载历史消息后 WHEN 发送新消息 THEN 消息正常追加
- AC-012: GIVEN 构建项目 WHEN 运行 pnpm build THEN 构建成功

## 技术约束

1. **SSR 兼容性**: 所有 localStorage 访问必须在客户端执行（useEffect 内或 typeof window !== 'undefined' 守卫）
2. **useChat 兼容性**: setMessages() 注入历史消息后，新消息正常追加
3. **序列化开销**: 全量 JSON.stringify，当前阶段可接受
4. **无迁移需求**: 当前无持久化数据
