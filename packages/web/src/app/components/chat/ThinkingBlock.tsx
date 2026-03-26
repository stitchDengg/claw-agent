"use client";

import { Brain, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { useState, useEffect, useRef, memo } from "react";
import { cn } from "@/lib/utils";

interface ThinkingBlockProps {
  content: string;
  isStreaming: boolean;
  isComplete: boolean;
  durationSeconds?: number;
}

function ThinkingBlockInner({ content, isStreaming, isComplete, durationSeconds }: ThinkingBlockProps) {
  const [collapsed, setCollapsed] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const hasAutoCollapsedRef = useRef(false);

  // Auto-collapse when thinking completes and answer starts streaming
  useEffect(() => {
    if (isComplete && !isStreaming && !hasAutoCollapsedRef.current) {
      hasAutoCollapsedRef.current = true;
      const timer = setTimeout(() => {
        setCollapsed(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isComplete, isStreaming]);

  if (!content) return null;

  const durationLabel = durationSeconds !== undefined ? `${durationSeconds} 秒` : null;

  // ---------- State 1: Streaming ----------
  if (isStreaming) {
    return (
      <div
        className={cn(
          "mb-3 border-l-4 rounded-lg transition-colors duration-200",
          "border-indigo-500 bg-[#F4F2FE]",
          "dark:border-indigo-400/50 dark:bg-indigo-950/20"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3">
          <Brain size={16} className="shrink-0 text-indigo-500 dark:text-indigo-400 thinking-pulse" />
          <span className="thinking-dot shrink-0" />
          <span className="text-xs font-medium text-muted-foreground">正在深度思考...</span>
        </div>

        {/* Streaming content with blinking cursor */}
        <div className="px-4 pb-3">
          <div className="text-[13px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
            {content}
            <span className="thinking-cursor" />
          </div>
        </div>
      </div>
    );
  }

  // ---------- State 3: Collapsed (default after complete) ----------
  if (collapsed) {
    return (
      <div
        className={cn(
          "mb-3 border-l-4 rounded-lg transition-colors duration-200",
          "border-indigo-500 bg-[#F4F2FE]",
          "dark:border-indigo-400/50 dark:bg-indigo-950/20"
        )}
      >
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-2 w-full px-4 h-9 text-left group"
        >
          <ChevronRight size={14} className="shrink-0 text-gray-400 dark:text-gray-500" />
          <Sparkles size={14} className="shrink-0 text-indigo-400 dark:text-indigo-500" />
          <span className="text-xs text-gray-400 dark:text-gray-500">
            已思考{durationLabel ? ` ${durationLabel}` : ""}
          </span>
          <span className="text-xs text-indigo-500 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
            展开
          </span>
        </button>
      </div>
    );
  }

  // ---------- State 2: Expanded ----------
  return (
    <div
      className={cn(
        "mb-3 border-l-4 rounded-lg transition-colors duration-200",
        "border-indigo-500 bg-[#F4F2FE]",
        "dark:border-indigo-400/50 dark:bg-indigo-950/20"
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        className="flex items-center gap-2 w-full px-4 py-3 text-left group"
      >
        <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
        <Brain size={16} className="shrink-0 text-indigo-500 dark:text-indigo-400" />
        <span className="text-xs font-medium text-muted-foreground">
          已思考{durationLabel ? ` ${durationLabel}` : ""}
        </span>
        <span className="text-xs text-indigo-500 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
          收起
        </span>
      </button>

      {/* Content with max height and fade-out */}
      <div className="relative px-4 pb-3">
        <div
          ref={contentRef}
          className="max-h-[180px] overflow-y-auto text-[13px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-words thinking-content-scroll"
        >
          {content}
        </div>
        {/* Bottom fade-out shadow when content overflows */}
        <div
          className="pointer-events-none absolute bottom-3 left-4 right-4 h-8 bg-gradient-to-t from-[#F4F2FE] to-transparent dark:from-[rgba(30,27,75,0.2)] dark:to-transparent thinking-fade-overlay"
        />
      </div>
    </div>
  );
}

const ThinkingBlock = memo(ThinkingBlockInner);
export default ThinkingBlock;
