"use client";

import { Send, Square, Paperclip } from "lucide-react";
import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  input: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStop: () => void;
  isLoading: boolean;
}

export default function ChatInput({
  input,
  onChange,
  onSubmit,
  onStop,
  isLoading,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        onSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur-sm p-3 md:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shrink-0">
      <form onSubmit={onSubmit} className="max-w-3xl mx-auto">
        <div
          className={cn(
            "flex items-end gap-2 bg-card border border-border rounded-2xl px-3 md:px-4 py-2.5 md:py-3 transition-all",
            "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20"
          )}
        >
          {/* Attach button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 md:h-9 md:w-9 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Paperclip size={18} />
          </Button>

          {/* Input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            rows={1}
            className="flex-1 bg-transparent text-sm text-foreground resize-none
                       outline-none placeholder:text-muted-foreground max-h-[200px] leading-relaxed"
          />

          {/* Send / Stop button */}
          {isLoading ? (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={onStop}
              className="h-10 w-10 md:h-9 md:w-9 shrink-0"
            >
              <Square size={16} />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim()}
              className="h-10 w-10 md:h-9 md:w-9 shrink-0"
            >
              <Send size={16} />
            </Button>
          )}
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-2">
          Claw Agent 可能会犯错，请核实重要信息。
        </p>
      </form>
    </div>
  );
}
