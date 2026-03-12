## 1. shadcn/ui 初始化与基础配置

- [x] 1.1 初始化 shadcn/ui：运行 `npx shadcn@latest init`，配置 Tailwind CSS 集成和 components.json
- [x] 1.2 迁移 globals.css：将现有自定义 CSS Variables 替换为 shadcn/ui 主题变量（--background, --foreground, --primary, --card, --muted, --accent, --destructive, --border, --ring 等），配置深色主题
- [x] 1.3 安装所需 shadcn/ui 组件：Button, Sheet, ScrollArea, Avatar, Card, Tooltip

## 2. 响应式 Sidebar 改造

- [x] 2.1 重构 Sidebar 组件：桌面端（>= 768px）保持内联布局，增加宽度过渡动画（折叠时不再 return null）
- [x] 2.2 实现移动端 Sidebar：使用 shadcn/ui Sheet（side="left"）包裹 Sidebar 内容，自动获得遮罩、ESC 关闭、焦点锁定
- [x] 2.3 在 page.tsx 中添加移动端检测逻辑（useMediaQuery 或 Tailwind md: 断点），Sidebar 状态管理适配 Sheet 模式
- [x] 2.4 使用 shadcn/ui ScrollArea 替换 Sidebar 会话列表的原生滚动
- [x] 2.5 优化 Sidebar 会话列表项的触控目标尺寸（移动端至少 44px 高度）

## 3. Header 响应式优化

- [x] 3.1 移动端 Header 精简布局：缩小间距，优化标题截断
- [x] 3.2 使用 shadcn/ui Button（variant="ghost"）替换 Header 中的 sidebar 切换按钮

## 4. 消息气泡视觉优化

- [x] 4.1 使用 shadcn/ui Avatar 组件重构 ChatMessage 中的头像显示
- [x] 4.2 优化助手消息气泡样式：基于 shadcn/ui 主题变量设置 border/background
- [x] 4.3 优化用户消息气泡样式：使用 primary 色系，更圆润的圆角
- [x] 4.4 消息区域响应式适配：移动端减少水平内边距，使用 shadcn/ui ScrollArea 优化滚动体验

## 5. ChatInput 优化

- [x] 5.1 使用 shadcn/ui Button 替换发送按钮和附件按钮，利用 variant 和 size 属性管理状态
- [x] 5.2 增强输入框 focus 状态：使用 shadcn/ui 标准的 ring 样式
- [x] 5.3 添加 safe-area-inset-bottom 内边距，防止底部手势条遮挡
- [x] 5.4 移动端触控优化：按钮触控目标至少 44x44px

## 6. WelcomeScreen 改造

- [x] 6.1 使用 shadcn/ui Card 组件重构建议卡片
- [x] 6.2 添加 hover 动效：Card 上浮（translateY）和边框色变化
- [x] 6.3 响应式适配：移动端单列、平板及以上两列卡片布局

## 7. LoadingIndicator 优化

- [x] 7.1 优化 LoadingIndicator 样式，使用 shadcn/ui Avatar 和主题变量保持一致

## 8. 清理与验证

- [x] 8.1 移除 globals.css 中不再使用的旧自定义 CSS Variables 和手写动画
- [x] 8.2 在 Chrome DevTools 模拟移动端（iPhone SE, iPhone 14, iPad）验证所有响应式布局
- [x] 8.3 验证 Sheet 抽屉的打开/关闭/遮罩/ESC 交互在移动端正常工作
- [x] 8.4 验证所有过渡动画流畅无闪烁
