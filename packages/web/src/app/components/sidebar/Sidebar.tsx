"use client";

import { MessageSquarePlus, Trash2, Bot } from "lucide-react";
import { Conversation } from "@/types";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  return (
    <aside
      className={cn(
        "h-full flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out overflow-hidden",
        isCollapsed ? "w-0 border-r-0" : "w-[280px]"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5 mb-4">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              <Bot size={18} />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold tracking-tight truncate">Claw Agent</h1>
            <p className="text-[11px] text-muted-foreground">AI 智能助手</p>
          </div>
        </div>
        <Button onClick={onCreate} className="w-full gap-2" size="sm">
          <MessageSquarePlus size={16} />
          新建对话
        </Button>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "group flex items-center justify-between px-3 py-3 rounded-lg cursor-pointer transition-colors min-h-[44px]",
                activeId === conv.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-accent text-muted-foreground hover:text-accent-foreground"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate font-medium">{conv.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatDate(conv.updatedAt)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10
                           text-muted-foreground hover:text-destructive transition-all cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[11px] text-muted-foreground">
            Powered by LangGraph.js
          </span>
        </div>
      </div>
    </aside>
  );
}
