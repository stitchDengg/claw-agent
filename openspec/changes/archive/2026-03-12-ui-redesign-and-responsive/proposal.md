## Why

当前 Claw Agent 的 Web UI 存在视觉粗糙、布局单调、响应式适配不足的问题。Sidebar 在移动端直接隐藏而非提供抽屉式交互，消息气泡和输入区域缺乏精细的视觉层次，整体配色和间距不够统一，在不同设备（手机、平板、桌面）上的体验差距明显。优化 UI 能提升产品专业感和用户留存。

## What Changes

- 引入 shadcn/ui 组件库，基于 Radix UI 原语重构 UI 组件，获得专业级视觉和无障碍支持
- 采用 shadcn/ui 主题系统统一配色、阴影、圆角等设计 token，替换现有手写 CSS Variables
- 优化 Sidebar 组件：移动端使用 shadcn/ui Sheet 实现抽屉式交互，桌面端保持折叠/展开
- 使用 shadcn/ui Button、Card、Avatar、ScrollArea 等组件重构消息气泡、输入框、欢迎页
- 重做 WelcomeScreen：使用 Card 组件构建更现代的卡片布局，适配不同屏幕尺寸
- 建立完整的响应式断点体系（mobile < 640px, tablet 640-1024px, desktop > 1024px）
- 优化 Header 区域：移动端精简显示，桌面端展示更多信息

## Capabilities

### New Capabilities
- `responsive-layout`: 全局响应式布局体系，包含移动端 Sidebar 抽屉、断点系统、触控适配
- `visual-polish`: 视觉体系升级，包含配色优化、阴影层次、动效增强、组件样式精细化

### Modified Capabilities

## Impact

- **代码影响**: `packages/web/src/app/` 下的所有 UI 组件（page.tsx, Sidebar, ChatMessage, ChatInput, WelcomeScreen, LoadingIndicator）及 globals.css
- **依赖**: 新增 shadcn/ui（Radix UI 系列包、tailwind-merge、class-variance-authority、clsx）
- **兼容性**: 需确保 Chrome/Safari/Firefox 最新两个版本及 iOS Safari/Android Chrome 的兼容
