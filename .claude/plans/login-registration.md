STATUS: READY_FOR_BUILD

# Login & Registration — Open Spec

## 背景与目标 (Background & Goals)

当前 claw-agent 没有任何认证功能，应用作为无状态公共服务运行。本特性添加简单的用户名/密码注册和登录系统，使用 JWT 进行会话管理。

## 技术方案 (Technical Approach)

### 架构概览

```
Frontend (Next.js)          Backend (Express)
┌──────────────┐           ┌──────────────────┐
│ Login Page   │──POST────→│ /api/auth/login   │
│ Register Page│──POST────→│ /api/auth/register│
│              │           │                    │
│ Auth Context │←─JWT─────│ JWT Generation     │
│ (localStorage)│          │ bcrypt hashing     │
│              │           │ JSON file storage  │
│ Protected    │──Bearer──→│ Auth Middleware    │
│ Routes       │           │                    │
└──────────────┘           └──────────────────┘
```

### 后端实现

#### 1. 用户数据存储

使用 JSON 文件存储（`packages/server/data/users.json`），轻量无需额外依赖：

```typescript
interface User {
  id: string;
  username: string;
  passwordHash: string;  // bcrypt hashed
  createdAt: string;     // ISO 8601
}
```

#### 2. API 端点

| 端点 | 方法 | 描述 | 请求体 | 响应 |
|------|------|------|--------|------|
| `/api/auth/register` | POST | 注册新用户 | `{ username, password }` | `{ token, user: { id, username } }` |
| `/api/auth/login` | POST | 用户登录 | `{ username, password }` | `{ token, user: { id, username } }` |
| `/api/auth/me` | GET | 获取当前用户 | - (Bearer token) | `{ user: { id, username } }` |

#### 3. JWT 配置

- Secret: 环境变量 `JWT_SECRET`，默认随机生成
- 过期时间: 7 天
- Payload: `{ userId, username }`

#### 4. Auth 中间件

Express 中间件验证 Bearer token，可选择性应用到需要保护的路由。

### 前端实现

#### 1. Auth Context

新建 `packages/web/src/contexts/AuthContext.tsx`：
- 管理 JWT token 和用户信息
- localStorage 持久化 token
- 提供 login/register/logout 方法
- 提供 isAuthenticated 状态

#### 2. 页面

**登录页** `packages/web/src/app/login/page.tsx`：
- 用户名/密码输入框（shadcn/ui Input）
- 登录按钮（shadcn/ui Button）
- "没有账号？去注册" 链接
- 表单验证（zod）
- 错误提示

**注册页** `packages/web/src/app/register/page.tsx`：
- 用户名/密码/确认密码输入框
- 注册按钮
- "已有账号？去登录" 链接
- 表单验证（zod：用户名 3-20 字符，密码 6+ 字符）

#### 3. 路由保护

新建 `packages/web/src/components/AuthGuard.tsx`：
- 检查 AuthContext 中的认证状态
- 未登录重定向到 /login
- 登录/注册页已登录重定向到 /

#### 4. 侧边栏用户信息

在 Sidebar 底部显示当前用户名和登出按钮。

## 变更文件清单

### 后端 (packages/server)

| 文件 | 操作 | 说明 |
|------|------|------|
| `package.json` | 修改 | 添加 bcryptjs, jsonwebtoken 依赖 |
| `src/auth.ts` | 新增 | 用户存储、JWT 生成/验证、密码哈希 |
| `src/routes/auth.ts` | 新增 | /api/auth/* 路由处理 |
| `src/middleware/auth.ts` | 新增 | JWT 验证中间件 |
| `src/index.ts` | 修改 | 注册 auth 路由 |
| `data/users.json` | 新增 | 用户数据文件（初始为空数组） |

### 前端 (packages/web)

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/contexts/AuthContext.tsx` | 新增 | Auth 状态管理 |
| `src/app/login/page.tsx` | 新增 | 登录页面 |
| `src/app/register/page.tsx` | 新增 | 注册页面 |
| `src/components/AuthGuard.tsx` | 新增 | 路由保护组件 |
| `src/app/layout.tsx` | 修改 | 包裹 AuthProvider |
| `src/app/page.tsx` | 修改 | 添加 AuthGuard |
| `src/components/Sidebar.tsx` | 修改 | 添加用户信息和登出按钮 |
| `src/app/api/chat/route.ts` | 修改 | 转发 Authorization header |

## 验收标准 (Acceptance Criteria)

### 注册
- AC-001: GIVEN 新用户 WHEN 填写合法用户名密码并提交 THEN 注册成功，自动登录并跳转首页
- AC-002: GIVEN 已存在的用户名 WHEN 注册 THEN 显示"用户名已存在"错误
- AC-003: GIVEN 密码少于 6 字符 WHEN 注册 THEN 表单验证提示密码过短
- AC-004: GIVEN 两次密码不一致 WHEN 注册 THEN 表单验证提示密码不匹配

### 登录
- AC-005: GIVEN 正确的用户名密码 WHEN 登录 THEN 成功登录并跳转首页
- AC-006: GIVEN 错误的密码 WHEN 登录 THEN 显示"用户名或密码错误"
- AC-007: GIVEN 不存在的用户名 WHEN 登录 THEN 显示"用户名或密码错误"（不泄露用户是否存在）

### 会话管理
- AC-008: GIVEN 已登录用户 WHEN 刷新页面 THEN 保持登录状态
- AC-009: GIVEN 已登录用户 WHEN 点击登出 THEN 清除 token 并跳转登录页
- AC-010: GIVEN JWT 过期 WHEN 请求 /api/auth/me THEN 返回 401，前端跳转登录页

### 路由保护
- AC-011: GIVEN 未登录用户 WHEN 访问首页 THEN 重定向到登录页
- AC-012: GIVEN 已登录用户 WHEN 访问登录页 THEN 重定向到首页

### UI
- AC-013: GIVEN 已登录用户 WHEN 查看侧边栏 THEN 底部显示用户名和登出按钮
- AC-014: GIVEN 构建项目 WHEN 运行 pnpm build THEN 构建成功

## 安全考虑

1. **密码哈希**: 使用 bcryptjs（salt rounds: 10），永不存储明文密码
2. **JWT Secret**: 从环境变量读取，不硬编码
3. **错误信息**: 登录失败统一返回"用户名或密码错误"，不区分用户是否存在
4. **输入验证**: 前后端双重验证，防止注入
5. **CORS**: 已有 cors 中间件，保持现有配置

## 技术约束

1. **JSON 文件存储**: 适合小规模使用，不支持高并发写入。未来可迁移到 SQLite 或数据库
2. **JWT 无状态**: 无法主动废除 token，依赖过期机制
3. **不含 OAuth**: 本期仅支持用户名密码，OAuth 留待未来
