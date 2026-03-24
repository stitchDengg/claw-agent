"use client";

import { ArrowUp, Square, Paperclip } from "lucide-react";
import { useRef, useEffect } from "react";

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
    <div className="w-full flex flex-col items-center pb-6 px-6 shrink-0">
      <form onSubmit={onSubmit} className="w-full max-w-[720px]">
        <div className="relative group">
          <div className="bg-card rounded-2xl border border-border hover:border-muted-foreground/30 transition-colors flex items-center p-1.5 pl-5 focus-within:border-muted-foreground/50">
            {/* Input */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息..."
              rows={1}
              className="flex-1 bg-transparent border-none text-[14px] text-foreground placeholder-weak-foreground focus:ring-0 outline-none resize-none max-h-[200px] leading-relaxed"
            />

            <div className="flex items-center gap-2 pr-1">
              {/* Attach button */}
              <button
                type="button"
                className="p-2 text-weak-foreground hover:text-muted-foreground transition-colors"
              >
                <Paperclip size={20} />
              </button>

              {/* Send / Stop button */}
              {isLoading ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="w-9 h-9 flex items-center justify-center bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/30 transition-all active:scale-95"
                >
                  <Square size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="w-9 h-9 flex items-center justify-center bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowUp size={18} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] text-weak-foreground tracking-wide">
          Claw Agent 可能会犯错，请核实重要信息。
        </p>
      </form>
    </div>
  );
}
