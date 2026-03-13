STATUS: READY_FOR_BUILD

# Dark/Light Mode Toggle — Open Spec

## 背景与目标 (Background & Goals)

Claw Agent 当前在 `layout.tsx` 中硬编码了 `className="dark font-sans"`，导致应用始终以深色模式呈现。`globals.css` 中已定义了完整的 `:root`（浅色）和 `.dark`（深色）CSS 变量集，但浅色主题从未被激活。

本特性的目标是：
- 允许用户在 system / light / dark 三种主题模式之间切换
- 将用户偏好持久化到 localStorage，页面刷新后保持选择
- 默认跟随系统偏好，系统无偏好时回退到深色模式
- 确保所有现有组件在两种主题下均正常显示

## 技术方案 (Technical Approach)

### 1. 安装 next-themes

在 `packages/web` 中安装 `next-themes` 依赖。next-themes 是 shadcn/ui 官方推荐的主题管理方案，与 Next.js App Router 兼容，原生支持 localStorage 持久化和 system preference 检测。

### 2. 修改 layout.tsx

**文件**: `packages/web/src/app/layout.tsx`

- 移除 `<html>` 标签上硬编码的 `"dark"` class
- 添加 `suppressHydrationWarning` 属性到 `<html>` 标签
- 用 `<ThemeProvider>` 包裹 `<body>` 的 children

### 3. 创建 ThemeProvider 组件

**新文件**: `packages/web/src/components/ThemeProvider.tsx`

一个 "use client" 的 wrapper 组件，re-export `next-themes` 的 `ThemeProvider`。这是 Next.js App Router 中使用 client-only provider 的标准模式。

### 4. 创建 ThemeToggle 组件

**新文件**: `packages/web/src/components/ThemeToggle.tsx`

使用 `useTheme()` hook 从 next-themes 获取当前主题并切换。点击按钮在 light -> dark -> system 三种模式间循环切换。使用 lucide-react 的 Sun/Moon/Monitor 图标，shadcn/ui 的 Button (variant="ghost", size="icon") 和 Tooltip。

### 5. 集成 ThemeToggle 到页面 header

**文件**: `packages/web/src/app/page.tsx`

在主聊天区域 `<header>` 右侧添加 ThemeToggle，与侧边栏折叠按钮对称。

### 6. CSS 修正：硬编码颜色值

`globals.css` 中存在以下硬编码的 oklch 颜色值需要改为 CSS 变量：

| 位置 | 当前值 | 问题 |
|------|--------|------|
| `::-webkit-scrollbar-thumb` | `oklch(1 0 0 / 15%)` (白色 15%) | 浅色模式下不可见 |
| `::-webkit-scrollbar-thumb:hover` | `oklch(1 0 0 / 25%)` (白色 25%) | 浅色模式下不可见 |
| `.markdown-body code` | `oklch(1 0 0 / 8%)` (白色 8%) | 浅色模式下不可见 |
| `.markdown-body pre` | `oklch(0 0 0 / 40%)` (黑色 40%) | 仅适配深色背景 |

推荐定义 `--scrollbar-thumb` / `--scrollbar-thumb-hover` / `--code-bg` / `--pre-bg` 变量，分别在 `:root` 和 `.dark` 中设置。

## 变更文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `packages/web/package.json` | 修改 | 添加 `next-themes` 依赖 |
| `packages/web/src/app/layout.tsx` | 修改 | 移除硬编码 dark class，添加 ThemeProvider |
| `packages/web/src/components/ThemeProvider.tsx` | 新增 | next-themes client wrapper |
| `packages/web/src/components/ThemeToggle.tsx` | 新增 | 主题切换按钮组件 |
| `packages/web/src/app/page.tsx` | 修改 | header 中集成 ThemeToggle |
| `packages/web/src/app/globals.css` | 修改 | 修复硬编码颜色值 |

## 验收标准 (Acceptance Criteria)

- AC-001: GIVEN 应用首次加载且用户未设置过主题 WHEN 操作系统为深色模式 THEN 应用以深色模式渲染
- AC-002: GIVEN 应用首次加载且用户未设置过主题 WHEN 操作系统为浅色模式 THEN 应用以浅色模式渲染
- AC-003: GIVEN 应用处于任意主题 WHEN 用户点击主题切换按钮 THEN 主题在 light -> dark -> system 之间循环切换，页面立即更新
- AC-004: GIVEN 用户已选择深色模式 WHEN 刷新页面 THEN 应用仍以深色模式渲染，无 FOUC 闪烁
- AC-005: GIVEN 用户已选择浅色模式 WHEN 刷新页面 THEN 应用仍以浅色模式渲染，无 FOUC 闪烁
- AC-006: GIVEN 用户选择了"跟随系统" WHEN 操作系统切换主题 THEN 应用实时跟随
- AC-007: GIVEN 浅色模式 WHEN 查看任意页面 THEN 所有文本可读，无文字与背景同色
- AC-008: GIVEN 浅色模式 WHEN 查看代码块 THEN 代码块有可辨识的背景色，代码文本可读
- AC-009: GIVEN 浅色模式 WHEN 查看 scrollbar THEN scrollbar thumb 可见
- AC-010: GIVEN 构建项目 WHEN 运行 `pnpm build` THEN 构建成功，无 TypeScript 错误
- AC-011: GIVEN layout.tsx WHEN 检查 `<html>` 标签 THEN 包含 `suppressHydrationWarning`，不再硬编码 `dark` class
- AC-012: GIVEN ThemeProvider WHEN 检查配置 THEN `attribute="class"`, `defaultTheme="system"`, `enableSystem={true}`

## 技术约束

1. **FOUC 防护**: next-themes 在 `<head>` 注入内联脚本在 HTML 解析阶段设置 class，避免闪烁。
2. **Tailwind CSS 4 兼容**: globals.css 已有 `@custom-variant dark (&:is(.dark *));`，与 next-themes `attribute="class"` 兼容。
3. **Server Component 限制**: layout.tsx 是 Server Component，ThemeProvider 必须是独立的 "use client" 组件。
4. **localStorage key**: next-themes 默认使用 `"theme"` key，无需自定义。
