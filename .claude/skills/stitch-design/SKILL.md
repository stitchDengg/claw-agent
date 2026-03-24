---
name: stitch-design
description: "使用 Google Stitch MCP 工具进行 UI 设计。提供项目管理、页面生成、编辑迭代和变体探索的完整工作流。当用户需要设计 UI 界面、生成页面原型、编辑现有设计或探索设计变体时使用此 Skill。"
---

# Stitch Design Skill — Google Stitch MCP 使用指南

## 概述

Google Stitch 是一个 AI 驱动的 UI/UX 设计平台，通过 MCP (Model Context Protocol) 提供以下能力：
- 从文本描述生成高保真 UI 页面
- 编辑和迭代已有设计
- 生成设计变体进行 A/B 比较
- 管理设计项目和屏幕

---

## 可用 MCP 工具一览

| 工具名 | 用途 | 核心参数 |
|--------|------|----------|
| `mcp__stitch__create_project` | 创建新设计项目 | `title` (可选) |
| `mcp__stitch__get_project` | 获取项目详情 | `name` (格式: `projects/{id}`) |
| `mcp__stitch__list_projects` | 列出所有项目 | `filter` (可选: `view=owned` / `view=shared`) |
| `mcp__stitch__list_screens` | 列出项目下所有屏幕 | `projectId` (必填) |
| `mcp__stitch__get_screen` | 获取屏幕详情 | `name`, `projectId`, `screenId` (均必填) |
| `mcp__stitch__generate_screen_from_text` | 从文本生成页面 | `projectId`, `prompt` (必填), `deviceType`, `modelId` (可选) |
| `mcp__stitch__edit_screens` | 编辑已有页面 | `projectId`, `selectedScreenIds`, `prompt` (必填) |
| `mcp__stitch__generate_variants` | 生成设计变体 | `projectId`, `selectedScreenIds`, `prompt`, `variantOptions` (必填) |

---

## 工作流程

### Step 1: 项目准备

**查看已有项目：**
```
调用 mcp__stitch__list_projects
- 无参数：列出自己拥有的项目
- filter: "view=shared"：列出共享给我的项目
```

**创建新项目：**
```
调用 mcp__stitch__create_project
- title: "项目标题" (可选，建议提供有意义的名称)
```

**获取项目详情：**
```
调用 mcp__stitch__get_project
- name: "projects/{projectId}"
```

### Step 2: 生成页面设计

**从文本描述生成页面：**
```
调用 mcp__stitch__generate_screen_from_text
- projectId: "项目ID" (必填，从创建或列表获取)
- prompt: "详细的页面描述" (必填)
- deviceType: 设备类型 (可选)
  - "DESKTOP" — 桌面端
  - "MOBILE" — 移动端
  - "TABLET" — 平板
  - "AGNOSTIC" — 设备无关
- modelId: AI 模型 (可选)
  - "GEMINI_3_FLASH" — 速度快 (推荐日常使用)
  - "GEMINI_3_1_PRO" — 质量高 (推荐精细设计)
```

**重要提示：**
- 生成过程可能需要 1-3 分钟，请耐心等待
- **绝对不要重试**，即使看起来超时，后台可能仍在处理
- 如果连接错误，稍后用 `get_screen` 检查是否生成成功
- 如果返回 `output_components` 中有建议文本，展示给用户
- 如果返回建议选项（如 "Yes, make them all"），让用户选择后再次调用

### Step 3: 查看设计结果

**列出项目下所有屏幕：**
```
调用 mcp__stitch__list_screens
- projectId: "项目ID"
```

**获取单个屏幕详情：**
```
调用 mcp__stitch__get_screen
- name: "projects/{projectId}/screens/{screenId}"
- projectId: "项目ID"
- screenId: "屏幕ID"
```

### Step 4: 编辑迭代

**修改已有页面：**
```
调用 mcp__stitch__edit_screens
- projectId: "项目ID" (必填)
- selectedScreenIds: ["屏幕ID1", "屏幕ID2"] (必填，数组)
- prompt: "修改描述" (必填)
- deviceType: 设备类型 (可选)
- modelId: AI 模型 (可选)
```

**编辑提示词示例：**
- "将按钮颜色改为蓝色，并增大标题字号"
- "添加一个底部导航栏，包含首页、搜索、消息、我的四个标签"
- "将列表布局改为卡片式网格布局"
- "使整体配色偏向暗色主题"

### Step 5: 探索变体

**生成设计变体：**
```
调用 mcp__stitch__generate_variants
- projectId: "项目ID" (必填)
- selectedScreenIds: ["屏幕ID"] (必填)
- prompt: "变体说明" (必填)
- variantOptions: (必填)
  - variantCount: 1-5 (默认 3，生成几个变体)
  - creativeRange: 创意范围
    - "REFINE" — 微调，保持原有风格
    - "EXPLORE" — 平衡探索 (默认)
    - "REIMAGINE" — 大胆重构
  - aspects: 聚焦维度 (数组，可多选)
    - "LAYOUT" — 布局排列
    - "COLOR_SCHEME" — 配色方案
    - "IMAGES" — 图片素材
    - "TEXT_FONT" — 字体选择
    - "TEXT_CONTENT" — 文案内容
```

**变体使用场景：**
- 配色方案对比：`aspects: ["COLOR_SCHEME"]`, `creativeRange: "EXPLORE"`
- 布局微调：`aspects: ["LAYOUT"]`, `creativeRange: "REFINE"`
- 全面重新设计：`creativeRange: "REIMAGINE"`, `aspects` 留空

---

## Prompt 编写最佳实践

### 生成页面的 Prompt 结构

一个好的生成 prompt 应包含以下要素：

1. **页面类型**：这是什么页面（登录页、Dashboard、列表页等）
2. **布局结构**：整体布局描述（如：顶部导航 + 左侧边栏 + 主内容区）
3. **核心元素**：需要包含的关键组件和内容
4. **视觉风格**：配色、字体、风格偏好
5. **交互提示**：关键交互状态（hover、active、disabled 等）

**示例 Prompt：**

```
设计一个现代化的 AI 聊天助手界面：
- 布局：左侧是对话历史列表（可折叠），右侧是主聊天区域
- 顶部：应用名称 + 用户头像 + 设置按钮
- 聊天区域：消息气泡式布局，用户消息靠右（蓝色），AI 消息靠左（灰色）
- 底部：输入框 + 发送按钮 + 附件按钮
- 风格：简洁现代，浅色主题，圆角卡片设计
- 字体：使用 Inter 或类似的无衬线字体
- 配色：主色调 #2563EB（蓝色），背景 #F8FAFC
```

### 编辑页面的 Prompt 技巧

- 具体说明要修改什么，不要笼统
- 用对比描述："将 X 改为 Y"
- 可以引用页面中的具体元素

---

## 设备类型选择指南

| 场景 | 推荐 deviceType |
|------|-----------------|
| 后台管理系统 | `DESKTOP` |
| 移动端 App | `MOBILE` |
| 响应式网页 | `DESKTOP`（先做桌面端） |
| 通用组件库 | `AGNOSTIC` |
| iPad 应用 | `TABLET` |

---

## 常见问题

**Q: 生成超时怎么办？**
A: 不要重试。等待 1-2 分钟后用 `list_screens` 查看是否已生成。

**Q: 如何在已有设计上做微调？**
A: 使用 `edit_screens`，在 prompt 中精确描述要修改的部分。

**Q: 如何比较多种设计方案？**
A: 使用 `generate_variants`，设置 `variantCount: 3` 和合适的 `creativeRange`。

**Q: 模型怎么选？**
A: 日常快速迭代用 `GEMINI_3_FLASH`，最终定稿用 `GEMINI_3_1_PRO`。
