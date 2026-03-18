"use client";

import { Bot, User, Copy, Check } from "lucide-react";
import { useState, useCallback, memo, useMemo, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Components } from "react-markdown";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
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
// CodeBlock (unchanged)
// ---------------------------------------------------------------------------
function CodeBlock({
  language,
  code,
  isDark,
}: {
  language: string;
  code: string;
  isDark: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-block-lang">{language || "text"}</span>
        <button
          onClick={handleCopy}
          className="code-copy-btn"
          aria-label="Copy code"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <SyntaxHighlighter
        style={isDark ? oneDark : oneLight}
        language={language || "text"}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: "0 0 8px 8px",
          fontSize: "0.85em",
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
}

// ---------------------------------------------------------------------------
// Markdown components — module-level, cached per isDark
// ---------------------------------------------------------------------------
function createMarkdownComponents(isDark: boolean): Components {
  return {
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      const codeString = String(children).replace(/\n$/, "");

      if (match) {
        return (
          <CodeBlock language={match[1]} code={codeString} isDark={isDark} />
        );
      }

      return (
        <code className={cn("inline-code", className)} {...props}>
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
          className="markdown-link"
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
          className="markdown-img"
          loading="lazy"
          {...props}
        />
      );
    },
    table({ children, ...props }) {
      return (
        <div className="table-wrapper">
          <table className="markdown-table" {...props}>
            {children}
          </table>
        </div>
      );
    },
    th({ children, ...props }) {
      return (
        <th className="markdown-th" {...props}>
          {children}
        </th>
      );
    },
    td({ children, ...props }) {
      return (
        <td className="markdown-td" {...props}>
          {children}
        </td>
      );
    },
  };
}

// Cache markdown components per theme
const componentsCache = new Map<boolean, Components>();
function getMarkdownComponents(isDark: boolean): Components {
  if (!componentsCache.has(isDark)) {
    componentsCache.set(isDark, createMarkdownComponents(isDark));
  }
  return componentsCache.get(isDark)!;
}

const remarkPlugins = [remarkGfm];

// ---------------------------------------------------------------------------
// ChatMessage
// ---------------------------------------------------------------------------
function ChatMessageInner({
  role,
  content,
  isStreaming,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isUser = role === "user";

  // Throttle content updates during streaming to reduce Markdown re-parses
  const displayContent = useThrottledValue(content, !!isStreaming);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  // Stable markdown components per theme (same for streaming and finished)
  const markdownComponents = useMemo(
    () => getMarkdownComponents(isDark),
    [isDark]
  );

  return (
    <div
      className={cn(
        "animate-fade-in flex gap-3 px-2 md:px-4 py-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Assistant avatar */}
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            <Bot size={16} />
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message bubble */}
      <div
        className={cn(
          "relative group max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card border border-border rounded-bl-sm"
        )}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        ) : (
          <div
            className={cn(
              "markdown-body text-sm leading-relaxed",
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
        )}

        {/* Copy button */}
        {!isUser && content && !isStreaming && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 h-7 px-2 gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-all"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </Button>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
            <User size={16} />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

// React.memo: only re-render when props actually change
// Historical messages won't re-render during streaming
const ChatMessage = memo(ChatMessageInner);
export default ChatMessage;
