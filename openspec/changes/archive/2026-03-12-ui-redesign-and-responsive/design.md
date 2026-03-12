## Context

Claw Agent 是一个基于 Next.js 15 + React 19 的 AI 对话助手 Web 应用，采用 Tailwind CSS 4 + CSS 自定义属性的混合样式方案。当前 UI 仅有基本的深色主题和有限的响应式处理（仅在 WelcomeScreen 使用了 `sm:` 断点），Sidebar 在折叠时直接 `return null` 完全消失，移动设备上缺乏合理的导航交互方式。

现有组件结构：page.tsx（主布局）、Sidebar、ChatMessage、ChatInput、WelcomeScreen、LoadingIndicator，全部位于 `packages/web/src/app/` 下。

## Goals / Non-Goals

**Goals:**
- 引入 shadcn/ui 组件库，基于 Radix UI 原语构建高质量、可访问的 UI 组件
- 全面使用 Tailwind CSS 进行样式管理，替换现有的手写 CSS Variables 方案
- 建立统一的三级响应式断点体系（mobile/tablet/desktop），覆盖所有组件
- 移动端 Sidebar 改为 shadcn/ui Sheet 组件实现抽屉式交互
- 利用 shadcn/ui 的主题系统统一配色、阴影、圆角等设计 token
- 改善触控体验：更大的点击目标、合理的间距

**Non-Goals:**
- 不做亮色主题/主题切换功能（保持深色主题）
- 不改动业务逻辑和 API 调用层
- 不做国际化处理

## Decisions

### 1. 引入 shadcn/ui 作为组件基础
**选择**: 使用 shadcn/ui（基于 Radix UI + Tailwind CSS），按需引入 Button、Sheet、ScrollArea、Avatar、Card、Tooltip 等组件
**替代方案**: 继续手写所有组件 / 使用 Ant Design / Material UI
**理由**: shadcn/ui 不是黑盒依赖，代码直接拷贝到项目中可完全定制；基于 Radix UI 提供开箱即用的无障碍支持；与 Tailwind CSS 深度集成，风格统一；是 Next.js 生态中最主流的 UI 方案

### 2. 移动端 Sidebar 使用 shadcn/ui Sheet 组件
**选择**: 移动端用 Sheet（side="left"）替代自定义 drawer 实现
**替代方案**: 手写 CSS transform + overlay
**理由**: Sheet 组件内置了遮罩层、ESC 关闭、焦点锁定、动画过渡等完整交互逻辑，无需重复造轮子

### 3. 响应式断点使用 Tailwind 默认体系
**选择**: 使用 Tailwind 内置断点 `sm:640px`, `md:768px`, `lg:1024px`
**替代方案**: 自定义断点
**理由**: Tailwind 默认断点已覆盖主流设备，无需额外配置，团队熟悉度高

### 4. 使用 shadcn/ui 主题系统替换手写 CSS Variables
**选择**: 采用 shadcn/ui 的 CSS Variables 主题方案（--background, --foreground, --primary, --card 等标准命名），在 globals.css 中配置深色主题
**替代方案**: 保留现有自定义变量命名
**理由**: shadcn/ui 组件依赖标准命名的 CSS Variables，统一后所有组件开箱即用无需额外适配；社区生态兼容性好

### 5. 动效使用 CSS transition + Radix 内置动画
**选择**: 简单过渡用 Tailwind transition 类，Sheet/Dialog 等复杂交互用 Radix 内置动画
**替代方案**: 引入 Framer Motion
**理由**: shadcn/ui 组件已内置流畅动画，简单场景用 Tailwind 的 transition/animate 工具类足够，无需额外依赖

## Risks / Trade-offs

- **[依赖增加]** → shadcn/ui 会引入 Radix UI 系列包和 tailwind-merge、class-variance-authority 等工具包。这些包体积较小且 tree-shakable，对打包体积影响可控
- **[迁移工作量]** → 需要将现有组件逐个替换为 shadcn/ui 组件，globals.css 变量命名也需迁移。采用渐进式替换策略，按组件逐个迁移
- **[移动端键盘弹出]** → 移动端虚拟键盘弹出时可能导致 ChatInput 被遮挡。需要使用 CSS `env(safe-area-inset-bottom)` 处理
