"use client";

import { MessageSquarePlus, Trash2, Bot } from "lucide-react";
import { Conversation } from "@/types";
import { cn, formatDate } from "@/lib/utils";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  isCollapsed: boolean;
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  isCollapsed,
}: SidebarProps) {
  if (isCollapsed) return null;

  return (
    <aside className="w-[280px] h-full flex flex-col border-r border-[var(--border)] bg-[var(--card)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">Claw Agent</h1>
            <p className="text-[11px] text-[var(--muted)]">AI 智能助手</p>
          </div>
        </div>
        <button
          onClick={onCreate}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg
                     bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm
                     font-medium transition-colors cursor-pointer"
        >
          <MessageSquarePlus size={16} />
          新建对话
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all",
                activeId === conv.id
                  ? "bg-[var(--primary-light)] text-[var(--primary-hover)]"
                  : "hover:bg-[var(--card-hover)] text-[var(--muted-foreground)]"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate font-medium">{conv.title}</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">
                  {formatDate(conv.updatedAt)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--border)]
                           text-[var(--muted)] hover:text-[var(--danger)] transition-all cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
          <span className="text-[11px] text-[var(--muted)]">
            Powered by LangGraph.js
          </span>
        </div>
      </div>
    </aside>
  );
}
