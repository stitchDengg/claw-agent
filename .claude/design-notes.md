# Claw Agent UI/UX 设计方案

> 设计师：ui-designer | 日期：2026-03-18
> 基于当前代码审查 (`packages/web/`) 产出

---

## 一、布局修复方案

### 1.1 页面下移问题诊断

**根因：** `layout.tsx` 中 `<body>` 没有添加 `h-screen overflow-hidden` 等约束，默认 body 可以被内容撑开。虽然 `page.tsx` 根 div 设置了 `h-screen`，但 body 本身没有限制，可能导致浏览器默认 margin（`8px`）或 ThemeProvider/AuthProvider wrapper 引入额外空间。

**修复建议：**

```tsx
// layout.tsx - <body> 增加样式
<body className="h-screen overflow-hidden m-0 p-0">
```

同时在 `globals.css` 的 `@layer base` 中补充：

```css
@layer base {
  html, body {
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
}
```

### 1.2 侧边栏不可用问题诊断

**根因：** 侧边栏折叠使用 `w-0 border-r-0` 实现，但 `overflow-hidden` 使得内容在 `w-0` 时完全不可见 — 这本身是正确的。真正的问题可能在于：

1. **桌面端：** `isCollapsed` 默认值为 `false`，侧边栏初始应该可见。但如果 `useMediaQuery` 在 SSR 阶段返回 `false`（服务端无 window），首次渲染时走 mobile 分支不渲染桌面侧边栏，而 Sheet 又未打开 → 侧边栏完全不可见。
2. **Mobile Sheet：** 工作正常，但 `sidebarContent` 变量和 `isDesktop` 分支中各自创建了一个 `<Sidebar>` 实例，造成冗余。

**修复建议：**

```tsx
// useMediaQuery hook 需要处理 SSR hydration：
// 初始值应与服务端一致（false），hydration 后再更新
// 确保桌面端首次渲染后能正确显示

// page.tsx: 统一 sidebar 渲染逻辑
{isDesktop ? (
  <Sidebar ... isCollapsed={sidebarCollapsed} />
) : (
  <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
    <SheetContent side="left" className="w-[280px] p-0">
      <SheetTitle className="sr-only">导航菜单</SheetTitle>
      <Sidebar ... isCollapsed={false} />
    </SheetContent>
  </Sheet>
)}
```

关键：去掉多余的 `sidebarContent` 变量（第 108-119 行），它和第 125-135 行是重复创建。

### 1.3 输入框对齐问题

**根因：** `ChatInput` 内部 `max-w-3xl mx-auto` 与消息区域的 `max-w-3xl mx-auto` 使用了相同的容器宽度约束，理论上应该对齐。但输入框外层 `<div>` 有 `p-3 md:p-4` 的 padding，而消息区域有 `px-2 md:px-4`，再加上消息气泡本身有 `px-2 md:px-4` 的额外 padding。

**修复建议：**

统一消息区和输入区的水平 padding：

```tsx
// 消息区域（page.tsx 第183行）
<div className="max-w-3xl mx-auto py-4 px-3 md:px-4 space-y-2">

// 输入区域（ChatInput.tsx 第43行）
<div className="border-t border-border bg-background/80 backdrop-blur-sm px-3 md:px-4 py-3 shrink-0">
  <form onSubmit={onSubmit} className="max-w-3xl mx-auto">
```

确保两个 `max-w-3xl` 容器的外层 padding 完全一致（都用 `px-3 md:px-4`）。

---

## 二、Session 路由 UX 设计

### 2.1 URL 结构

```
/                     → 重定向到最新会话 或 显示欢迎页（无历史时）
/chat/:sessionId      → 具体会话
/login                → 登录页（已存在）
/register             → 注册页（已存在）
```

**实现方式（Next.js App Router）：**

```
packages/web/src/app/
├── page.tsx                  → 根页面，重定向到 /chat/[最新sessionId]
├── chat/
│   ├── layout.tsx            → Chat 布局（sidebar + main），提取自当前 page.tsx
│   ├── page.tsx              → /chat → 空状态欢迎页
│   └── [sessionId]/
│       └── page.tsx          → 具体会话页面
├── login/page.tsx            → 已存在
└── register/page.tsx         → 已存在
```

### 2.2 页面切换逻辑

- **根路由 `/`：** `AuthGuard` 通过后，检查 conversations 列表：
  - 有历史 → `router.push(\`/chat/${conversations[0].id}\`)`
  - 无历史 → `router.push('/chat')` 显示欢迎页
- **选择会话：** `onSelect(id)` → `router.push(\`/chat/${id}\`)` 替代 `setActiveId(id)`
- **新建会话：** `onCreate()` → API 创建后 `router.push(\`/chat/${newId}\`)`
- **删除会话：** 删除后跳转到下一个会话或 `/chat`

### 2.3 页面切换动效

```tsx
// chat/layout.tsx - 使用 CSS transition 实现
<main className="flex-1 flex flex-col h-full min-w-0">
  {/* header 固定 */}
  <header>...</header>
  {/* 内容区使用 key 触发动画 */}
  <div key={sessionId} className="flex-1 animate-fade-in">
    {children}
  </div>
  {/* 输入框固定 */}
  <ChatInput ... />
</main>
```

建议动效：简单的 `opacity 0→1 + translateY 4px→0`，持续 200ms，体感流畅不突兀。

### 2.4 空状态设计

当 `/chat` 无 sessionId 时，显示现有的 `WelcomeScreen` 组件。点击建议卡片 → 自动创建新会话 → 跳转 + 发送消息。

---

## 三、流式输出 UI 设计

### 3.1 打字效果

当前实现：`isStreaming` 状态 + `typing-cursor` CSS class（使用 `::after` 伪元素添加闪烁光标）。

**增强建议：**

```css
/* 当前光标是菱形(◊)，改为更标准的竖线光标 */
.typing-cursor::after {
  content: "▊";          /* 使用 block cursor 更有辨识度 */
  animation: blink 0.8s step-end infinite;  /* step-end 更像真实光标 */
  color: var(--primary);
  margin-left: 1px;
  font-size: 0.85em;
  vertical-align: baseline;
}
```

### 3.2 流式渲染策略

- **逐 token 追加**：后端通过 SSE 发送 token，前端使用 `useChat` 的内置流式处理（Vercel AI SDK 已支持）
- **Markdown 增量渲染**：`react-markdown` 每次 re-render 整段 content 即可，性能可接受（<100KB 文本）。若后续有性能问题，可考虑虚拟化
- **代码块未闭合处理**：流式中代码块可能未闭合，`react-markdown` 会 graceful fallback

### 3.3 中断交互

当前已实现停止按钮（`ChatInput` 中的红色 `Square` 按钮），调用 `stop()` 方法。

**增强建议：**

1. **停止按钮位置**：保持在输入框内（当前方案好）
2. **停止后状态**：
   - 立即移除 `typing-cursor`
   - 已接收的内容保留显示
   - 在消息底部显示灰色小字 `"已停止生成"` 标识
3. **键盘快捷键**：`Escape` 键也能触发停止

```tsx
// ChatInput.tsx 中补充
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isLoading) onStop();
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [isLoading, onStop]);
```

### 3.4 Loading 指示器

当前 `LoadingIndicator` 使用三点跳动动画，效果良好。建议保持不变。

---

## 四、Markdown 渲染增强

### 4.1 当前状态

- 使用 `react-markdown@10.1.0` 做基础渲染
- `globals.css` 中 `.markdown-body` 类提供了基础样式
- **缺失**：代码语法高亮、表格样式、任务列表、数学公式

### 4.2 推荐组件库方案

#### 语法高亮（最高优先级）

```bash
pnpm add react-syntax-highlighter @types/react-syntax-highlighter
# 或更轻量的替代：
pnpm add shiki                # 更现代，支持 VS Code 主题
```

**推荐方案：`react-syntax-highlighter` + `oneDark` 主题**（生态成熟、体积可控）

```tsx
// components/chat/CodeBlock.tsx
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  language: string;
  children: string;
}

export function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="relative group rounded-lg overflow-hidden my-3">
      {/* 语言标签 + 复制按钮 */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#282c34] text-xs text-gray-400">
        <span>{language || 'text'}</span>
        <button onClick={handleCopy} className="hover:text-white transition-colors">
          {copied ? '已复制 ✓' : '复制'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{ margin: 0, borderRadius: 0 }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}
```

#### 在 ReactMarkdown 中集成

```tsx
<ReactMarkdown
  components={{
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const isInline = !match;
      return isInline ? (
        <code className={className} {...props}>{children}</code>
      ) : (
        <CodeBlock language={match[1]}>
          {String(children).replace(/\n$/, '')}
        </CodeBlock>
      );
    },
    // 表格增强
    table({ children }) {
      return (
        <div className="overflow-x-auto my-3">
          <table className="min-w-full border-collapse text-sm">{children}</table>
        </div>
      );
    },
    th({ children }) {
      return <th className="border border-border px-3 py-2 bg-muted font-medium text-left">{children}</th>;
    },
    td({ children }) {
      return <td className="border border-border px-3 py-2">{children}</td>;
    },
  }}
>
  {content}
</ReactMarkdown>
```

### 4.3 表格样式

在 `globals.css` 中添加：

```css
.markdown-body table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0.75em;
  font-size: 0.9em;
}

.markdown-body th {
  background: var(--muted);
  font-weight: 600;
  text-align: left;
  padding: 0.5em 0.75em;
  border: 1px solid var(--border);
}

.markdown-body td {
  padding: 0.5em 0.75em;
  border: 1px solid var(--border);
}

.markdown-body tr:nth-child(even) {
  background: var(--muted);
}
```

### 4.4 可选增强（后续迭代）

| 功能 | 推荐库 | 优先级 |
|------|--------|--------|
| 数学公式 | `remark-math` + `rehype-katex` | 中 |
| GFM（删除线/任务列表） | `remark-gfm`（react-markdown 内置支持） | 高 |
| Mermaid 图表 | `mermaid` + 动态 import | 低 |
| 链接预览 | 自定义 `<a>` 组件 | 低 |

**GFM 支持**：

```bash
pnpm add remark-gfm
```

```tsx
import remarkGfm from 'remark-gfm';

<ReactMarkdown remarkPlugins={[remarkGfm]} components={...}>
  {content}
</ReactMarkdown>
```

---

## 五、实施优先级建议

| 顺序 | 任务 | 影响 | 工作量 |
|------|------|------|--------|
| 1 | 布局修复（body/sidebar/padding） | 🔴 高 - 基础可用性 | 小 |
| 2 | Session 路由系统 | 🔴 高 - 核心 UX | 中 |
| 3 | 流式输出 UI 对接 | 🔴 高 - 核心功能 | 中（依赖后端） |
| 4 | 代码语法高亮 | 🟡 中 - 体验提升 | 小 |
| 5 | GFM + 表格样式 | 🟡 中 - 体验提升 | 小 |
| 6 | 数学公式/Mermaid | 🟢 低 - 锦上添花 | 中 |

---

## 六、关键设计决策总结

1. **路由方案**：使用 Next.js App Router 的 `chat/[sessionId]` 动态路由，将当前 `page.tsx` 的布局逻辑提取到 `chat/layout.tsx`
2. **状态管理**：`activeId` 由 URL param 驱动（`useParams`），不再用 `useState` 管理
3. **侧边栏**：修复 SSR hydration 问题，统一桌面/移动端渲染逻辑
4. **Markdown**：`react-markdown` + `remark-gfm` + `react-syntax-highlighter`，自定义 `CodeBlock` 组件含复制功能
5. **流式输出**：依赖 Vercel AI SDK 的 `useChat` 内置流式支持，UI 层只需处理 `isStreaming` 状态和光标动画
