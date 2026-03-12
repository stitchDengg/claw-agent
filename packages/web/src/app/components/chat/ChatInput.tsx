"use client";

import { Send, Square, Paperclip } from "lucide-react";
import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

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

  // Auto resize textarea
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
    <div className="border-t border-[var(--border)] bg-[var(--background)] p-4">
      <form onSubmit={onSubmit} className="max-w-3xl mx-auto">
        <div
          className="flex items-end gap-2 bg-[var(--card)] border border-[var(--border)]
                      rounded-2xl px-4 py-3 focus-within:border-[var(--primary)]
                      transition-colors"
        >
          {/* Attach button */}
          <button
            type="button"
            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)]
                       hover:bg-[var(--border)] transition-colors cursor-pointer shrink-0 mb-0.5"
          >
            <Paperclip size={18} />
          </button>

          {/* Input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            rows={1}
            className="flex-1 bg-transparent text-sm text-[var(--foreground)] resize-none
                       outline-none placeholder:text-[var(--muted)] max-h-[200px] leading-relaxed"
          />

          {/* Send / Stop button */}
          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              className="p-2 rounded-lg bg-[var(--danger)] text-white
                         hover:opacity-90 transition-opacity cursor-pointer shrink-0"
            >
              <Square size={16} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className={cn(
                "p-2 rounded-lg transition-all cursor-pointer shrink-0",
                input.trim()
                  ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
                  : "bg-[var(--border)] text-[var(--muted)] cursor-not-allowed"
              )}
            >
              <Send size={16} />
            </button>
          )}
        </div>

        <p className="text-center text-[11px] text-[var(--muted)] mt-2">
          Claw Agent 可能会犯错，请核实重要信息。
        </p>
      </form>
    </div>
  );
}
