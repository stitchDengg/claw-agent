"use client";

import { memo } from "react";
import { Plus, Trash2, LogOut, Settings, Terminal } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { Conversation } from "@/types";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

interface SidebarProps {
  conversations: Conversation[];
  activeId?: string;
  onSelect?: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  isCollapsed: boolean;
  username?: string;
  onLogout?: () => void;
}

function Sidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  isCollapsed,
  username,
  onLogout,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Determine active conversation from props or from URL
  const currentActiveId = activeId ?? pathname?.match(/^\/chat\/(.+)/)?.[1] ?? "";

  const handleSelect = (id: string) => {
    if (onSelect) {
      onSelect(id);
    } else {
      router.push(`/chat/${id}`);
    }
  };

  const firstChar = username ? username.charAt(0).toUpperCase() : "U";

  return (
    <aside
      className={cn(
        "h-full flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out overflow-hidden",
        isCollapsed ? "w-0 border-r-0" : "w-[260px]"
      )}
    >
      {/* Brand Header */}
      <div className="p-6 space-y-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary flex items-center justify-center rounded-sm shrink-0">
            <Terminal size={16} className="text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-[0.05em] uppercase text-sidebar-foreground">
              Claw Agent
            </h1>
            <p className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground">
              AI Assistant
            </p>
          </div>
        </div>

        {/* New Chat Button */}
        <button
          onClick={onCreate}
          className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 transition-colors text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 rounded-sm"
        >
          <Plus size={14} />
          新建对话
        </button>
      </div>

      {/* Conversation List */}
      <nav className="flex-1 overflow-y-auto px-2 custom-scrollbar">
        <div className="mb-2 px-2 text-[11px] font-bold text-weak-foreground uppercase tracking-[0.1em]">
          最近对话
        </div>
        <div className="space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => handleSelect(conv.id)}
              className={cn(
                "group flex items-center justify-between px-3 py-2 rounded-sm cursor-pointer transition-colors text-sm",
                currentActiveId === conv.id
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <span className="truncate flex-1 min-w-0">{conv.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-red-400 transition-all cursor-pointer shrink-0 ml-2"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[12px] font-medium text-muted-foreground shrink-0">
              {firstChar}
            </div>
            {username && (
              <span className="text-sm font-medium text-sidebar-foreground truncate">
                {username}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 text-muted-foreground hover:text-sidebar-foreground transition-colors cursor-pointer"
                title="退出登录"
              >
                <LogOut size={16} />
              </button>
            )}
            <button className="p-1.5 text-muted-foreground hover:text-sidebar-foreground transition-colors">
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default memo(Sidebar);
