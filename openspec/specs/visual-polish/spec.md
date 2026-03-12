## ADDED Requirements

### Requirement: shadcn/ui theme system integration
应用 SHALL 采用 shadcn/ui 的 CSS Variables 主题方案，在 globals.css 中配置深色主题的标准变量（--background, --foreground, --primary, --card, --muted, --accent, --destructive, --border, --ring 等），替换现有自定义变量。

#### Scenario: Theme variables applied
- **WHEN** 应用加载
- **THEN** 所有 shadcn/ui 组件自动使用深色主题配色，与整体 UI 风格一致

#### Scenario: Custom CSS variables removed
- **WHEN** 迁移完成
- **THEN** globals.css 中不再包含旧的自定义变量命名（如 --card-hover, --user-bubble 等），统一使用 shadcn/ui 标准命名

### Requirement: Refined message bubble with shadcn components
ChatMessage 组件 SHALL 使用 shadcn/ui Avatar 组件显示头像，消息气泡样式基于 Tailwind 工具类构建，具有更精细的视觉层次。

#### Scenario: Assistant message styling
- **WHEN** 渲染助手消息
- **THEN** 使用 Avatar 组件展示 Bot 头像，消息气泡具有统一的 border/background 样式

#### Scenario: User message styling
- **WHEN** 渲染用户消息
- **THEN** 使用 Avatar 组件展示用户头像，消息气泡使用 primary 色系背景，与助手消息有明显的视觉差异

### Requirement: ChatInput with shadcn Button
ChatInput SHALL 使用 shadcn/ui Button 组件替换手写按钮，在 focus 状态下有 ring 样式反馈。

#### Scenario: Input focus state
- **WHEN** 用户聚焦到输入框
- **THEN** 输入区域显示 shadcn/ui 标准的 ring 样式（--ring 变量定义的颜色）

#### Scenario: Send button states
- **WHEN** 输入框有内容时
- **THEN** 发送按钮使用 shadcn/ui Button variant="default" 样式，禁用时使用 variant="ghost"

### Requirement: Modern WelcomeScreen with Card components
WelcomeScreen SHALL 使用 shadcn/ui Card 组件构建建议卡片，具有统一的圆角、边框和 hover 效果。

#### Scenario: Suggestion card hover effect
- **WHEN** 用户将鼠标悬停在建议卡片上
- **THEN** Card 组件展示轻微的上浮效果和边框色变化

#### Scenario: Welcome screen responsive layout
- **WHEN** 在不同设备上查看 WelcomeScreen
- **THEN** 卡片在移动端单列排列，平板及以上两列排列

### Requirement: Smooth transition animations
所有组件状态变化 SHALL 具有平滑的过渡动画，shadcn/ui 组件（Sheet、Button 等）使用其内置动画，自定义组件使用 Tailwind transition 类。

#### Scenario: Sidebar collapse transition on desktop
- **WHEN** 用户在桌面端点击折叠 Sidebar
- **THEN** Sidebar 以平滑的宽度动画过渡折叠，而非瞬间消失

#### Scenario: New message appear animation
- **WHEN** 新消息被添加到对话中
- **THEN** 消息以渐入 + 轻微上移的动画出现
