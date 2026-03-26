"use client";

import { Copy, Check } from "lucide-react";
import { useState, useCallback, memo, useMemo, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import type { Components } from "react-markdown";
import ThinkingBlock from "./ThinkingBlock";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  thinking?: string;
  isThinkingStreaming?: boolean;
  thinkingDurationSeconds?: number;
}

// ---------------------------------------------------------------------------
// Throttle hook: during streaming, limit Markdown re-parses to once per interval
// ---------------------------------------------------------------------------
function useThrottledValue(value: string, isStreaming: boolean, intervalMs = 100): string {
  const [throttled, setThrottled] = useState(value);
  const lastUpdateRef = useRef(Date.now());
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isStreaming) {
      // Not streaming — always show latest immediately
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setThrottled(value);
      return;
    }

    const now = Date.now();
    const elapsed = now - lastUpdateRef.current;

    if (elapsed >= intervalMs) {
      // Enough time passed — update now
      lastUpdateRef.current = now;
      setThrottled(value);
    } else if (rafRef.current === null) {
      // Schedule an update for the remaining time
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        lastUpdateRef.current = Date.now();
        setThrottled(value);
      });
    }
  }, [value, isStreaming, intervalMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return throttled;
}

// ---------------------------------------------------------------------------
// CodeBlock — always uses dark theme regardless of app theme
// ---------------------------------------------------------------------------
const CodeBlock = memo(function CodeBlock({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="bg-code-block-bg rounded-lg overflow-hidden border border-border my-3">
      <div className="px-4 py-2 bg-code-block-header border-b border-border flex justify-between items-center">
        <span className="text-[11px] font-mono text-[#71717a] uppercase tracking-wider">
          {language || "text"}
        </span>
        <button
          onClick={handleCopy}
          className="text-[#71717a] hover:text-[#a1a1aa] transition-colors flex items-center gap-1.5 text-[11px]"
          aria-label="Copy code"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language || "text"}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: "0.85em",
          background: "var(--code-block-bg)",
          padding: "1em",
        }}
        codeTagProps={{
          style: {
            fontFamily: '"SF Mono", "Fira Code", "JetBrains Mono", monospace',
          },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Markdown components
// ---------------------------------------------------------------------------
function createMarkdownComponents(): Components {
  return {
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      const codeString = String(children).replace(/\n$/, "");

      if (match) {
        return (
          <CodeBlock language={match[1]} code={codeString} />
        );
      }

      return (
        <code className={cn("bg-muted px-1.5 py-0.5 rounded text-foreground text-[0.9em]", className)} {...props}>
          {children}
        </code>
      );
    },
    pre({ children }) {
      return <>{children}</>;
    },
    a({ href, children, ...props }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground underline underline-offset-2 hover:text-foreground/80"
          {...props}
        >
          {children}
        </a>
      );
    },
    img({ src, alt, ...props }) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt || ""}
          className="max-w-full h-auto rounded-md my-2"
          loading="lazy"
          {...props}
        />
      );
    },
    table({ children, ...props }) {
      return (
        <div className="overflow-x-auto my-3 rounded-md border border-border">
          <table className="w-full border-collapse text-[0.9em]" {...props}>
            {children}
          </table>
        </div>
      );
    },
    th({ children, ...props }) {
      return (
        <th className="bg-muted px-3 py-2 text-left font-semibold text-foreground border-b border-border" {...props}>
          {children}
        </th>
      );
    },
    td({ children, ...props }) {
      return (
        <td className="px-3 py-2 border-b border-border/50" {...props}>
          {children}
        </td>
      );
    },
  };
}

// Cache markdown components
let cachedComponents: Components | null = null;
function getMarkdownComponents(): Components {
  if (!cachedComponents) {
    cachedComponents = createMarkdownComponents();
  }
  return cachedComponents;
}

const remarkPlugins = [remarkGfm];

// ---------------------------------------------------------------------------
// ChatMessage
// ---------------------------------------------------------------------------
function ChatMessageInner({
  role,
  content,
  isStreaming,
  thinking,
  isThinkingStreaming,
  thinkingDurationSeconds,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = role === "user";

  // Throttle content updates during streaming to reduce Markdown re-parses
  const displayContent = useThrottledValue(content, !!isStreaming);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  // Stable markdown components
  const markdownComponents = useMemo(
    () => getMarkdownComponents(),
    []
  );

  if (isUser) {
    return (
      <div className="animate-fade-in flex flex-col items-end space-y-2">
        <div className="bg-user-bubble text-user-bubble-foreground px-[18px] py-[14px] rounded-2xl rounded-br-sm text-[14px] leading-relaxed max-w-[85%]">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col space-y-4">
      {/* Label */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-weak-foreground">
          CLAW AGENT
        </span>
      </div>

      {/* Thinking Block */}
      {thinking && (
        <ThinkingBlock
          content={thinking}
          isStreaming={!!isThinkingStreaming}
          isComplete={!isThinkingStreaming && !!thinking}
          durationSeconds={thinkingDurationSeconds}
        />
      )}

      {/* Content */}
      <div className="relative group">
        <div
          className={cn(
            "pl-0 text-chat-foreground text-[14px] leading-[1.7]",
            isStreaming && "typing-cursor"
          )}
        >
          <ReactMarkdown
            remarkPlugins={remarkPlugins}
            components={markdownComponents}
          >
            {displayContent}
          </ReactMarkdown>
        </div>

        {/* Copy button */}
        {content && !isStreaming && (
          <button
            onClick={handleCopy}
            className="mt-2 opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-[11px] text-weak-foreground hover:text-muted-foreground transition-all"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}

// React.memo: only re-render when props actually change
// Historical messages won't re-render during streaming
const ChatMessage = memo(ChatMessageInner);
export default ChatMessage;
