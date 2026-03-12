"use client";

import { Bot, User, Copy, Check } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

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
    <div className={cn("animate-fade-in flex gap-3 px-2 md:px-4 py-3", isUser ? "justify-end" : "justify-start")}>
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
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        ) : (
          <div className={cn("markdown-body text-sm leading-relaxed", isStreaming && "typing-cursor")}>
            <ReactMarkdown>{content}</ReactMarkdown>
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
            {copied ? "已复制" : "复制"}
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
