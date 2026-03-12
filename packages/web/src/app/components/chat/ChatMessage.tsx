"use client";

import { Bot, User, Copy, Check } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export default function ChatMessage({
  role,
  content,
  isStreaming,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("animate-fade-in flex gap-3 px-4 py-3", isUser ? "justify-end" : "justify-start")}>
      {/* Assistant avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center shrink-0 mt-1">
          <Bot size={16} className="text-white" />
        </div>
      )}

      {/* Message bubble */}
      <div
        className={cn(
          "relative group max-w-[75%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-[var(--primary)] text-white rounded-br-md"
            : "bg-[var(--assistant-bubble)] border border-[var(--border)] rounded-bl-md"
        )}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        ) : (
          <div className={cn("markdown-body text-sm leading-relaxed", isStreaming && "typing-cursor")}>
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}

        {/* Copy button */}
        {!isUser && content && !isStreaming && (
          <button
            onClick={handleCopy}
            className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100
                       flex items-center gap-1 text-[11px] text-[var(--muted)]
                       hover:text-[var(--foreground)] transition-all cursor-pointer"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "已复制" : "复制"}
          </button>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-[var(--user-bubble)] border border-[var(--border-light)] flex items-center justify-center shrink-0 mt-1">
          <User size={16} className="text-[var(--foreground)]" />
        </div>
      )}
    </div>
  );
}
