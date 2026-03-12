"use client";

import { Bot } from "lucide-react";

export default function LoadingIndicator() {
  return (
    <div className="flex gap-3 px-4 py-3 animate-fade-in">
      <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center shrink-0">
        <Bot size={16} className="text-white" />
      </div>
      <div className="bg-[var(--assistant-bubble)] border border-[var(--border)] rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
        </div>
      </div>
    </div>
  );
}
