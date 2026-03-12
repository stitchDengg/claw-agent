## ADDED Requirements

### Requirement: Sidebar drawer on mobile using Sheet
在移动端（< 768px），Sidebar SHALL 使用 shadcn/ui Sheet 组件（side="left"）以抽屉形式展示，内置遮罩层、ESC 关闭和焦点锁定。

#### Scenario: Open sidebar on mobile
- **WHEN** 用户在移动端点击 header 中的侧边栏切换按钮
- **THEN** Sheet 组件从左侧滑入显示 Sidebar 内容，背景出现半透明遮罩

#### Scenario: Close sidebar by tapping overlay
- **WHEN** Sidebar Sheet 在移动端已打开，用户点击遮罩区域或按 ESC
- **THEN** Sheet 滑出关闭，遮罩消失

#### Scenario: Sidebar on desktop remains inline
- **WHEN** 视口宽度 >= 768px
- **THEN** Sidebar 以内联方式展示在页面左侧，无遮罩层，可通过按钮折叠/展开

### Requirement: Responsive breakpoint system
应用 SHALL 采用三级响应式断点：mobile（< 640px）、tablet（640px-1024px）、desktop（> 1024px），所有组件 SHALL 在各断点下有合理的布局适配。

#### Scenario: Mobile layout
- **WHEN** 视口宽度 < 640px
- **THEN** 消息区域占满全宽，WelcomeScreen 卡片单列排列，ChatInput 输入区域的内边距缩小

#### Scenario: Tablet layout
- **WHEN** 视口宽度在 640px 到 1024px 之间
- **THEN** WelcomeScreen 卡片两列排列，消息区域有适度的水平边距

#### Scenario: Desktop layout
- **WHEN** 视口宽度 > 1024px
- **THEN** Sidebar 内联展示，消息区域最大宽度 768px 居中，WelcomeScreen 卡片两列排列

### Requirement: Touch-friendly interaction targets
所有可交互元素 SHALL 在移动端具备至少 44x44px 的触控目标尺寸。

#### Scenario: Chat input buttons on mobile
- **WHEN** 用户在移动端使用 ChatInput
- **THEN** 发送按钮和附件按钮的点击区域不小于 44x44px

#### Scenario: Sidebar conversation items on mobile
- **WHEN** 用户在移动端浏览 Sidebar 会话列表
- **THEN** 每个会话条目的高度和点击区域不小于 44px

### Requirement: Safe area handling
在有刘海屏或底部手势条的设备上，ChatInput SHALL 使用 `env(safe-area-inset-bottom)` 确保输入区域不被遮挡。

#### Scenario: Device with bottom gesture bar
- **WHEN** 用户在有底部手势条的 iOS 设备上使用应用
- **THEN** ChatInput 底部有额外的安全区域内边距，输入框不会被手势条遮挡
