"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import Sidebar from "./sidebar/Sidebar";
import { useConversationsContext } from "@/contexts/ConversationsContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";

interface AppShellProps {
  children: (props: AppShellChildProps) => ReactNode;
  /** Current active conversation ID (from route param) */
  activeSessionId?: string;
  /** Title to show in header */
  headerTitle?: string;
  /** Subtitle to show in header */
  headerSubtitle?: string;
}

export interface AppShellChildProps {
  conversations: ReturnType<typeof useConversationsContext>["conversations"];
  createConversation: ReturnType<typeof useConversationsContext>["createConversation"];
  loadMessagesForConversation: ReturnType<typeof useConversationsContext>["loadMessagesForConversation"];
  refreshConversations: ReturnType<typeof useConversationsContext>["refreshConversations"];
  token: string | null;
}

export default function AppShell({
  children,
  activeSessionId,
  headerTitle,
  headerSubtitle,
}: AppShellProps) {
  return (
    <AuthGuard>
      <AppShellContent
        activeSessionId={activeSessionId}
        headerTitle={headerTitle}
        headerSubtitle={headerSubtitle}
      >
        {children}
      </AppShellContent>
    </AuthGuard>
  );
}

function AppShellContent({
  children,
  activeSessionId,
  headerTitle,
  headerSubtitle,
}: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const router = useRouter();
  const { user, logout, token } = useAuth();

  // Use context instead of local hook — state persists across route changes
  const {
    conversations,
    createConversation,
    deleteConversation,
    loadMessagesForConversation,
    refreshConversations,
    isLoading: conversationsLoading,
  } = useConversationsContext();

  const handleNewConversation = async () => {
    const id = await createConversation();
    if (id) {
      router.push(`/chat/${id}`);
    }
    setSheetOpen(false);
  };

  const handleSelectConversation = (id: string) => {
    router.push(`/chat/${id}`);
    setSheetOpen(false);
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    // If we deleted the active conversation, go home
    if (id === activeSessionId) {
      router.push("/");
    }
  };

  const handleToggleSidebar = () => {
    if (isDesktop) {
      setSidebarCollapsed(!sidebarCollapsed);
    } else {
      setSheetOpen(true);
    }
  };

  const sidebarContent = (
    <Sidebar
      conversations={conversations}
      activeId={activeSessionId}
      onSelect={handleSelectConversation}
      onCreate={handleNewConversation}
      onDelete={handleDeleteConversation}
      isCollapsed={false}
      username={user?.username}
      onLogout={logout}
    />
  );

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      {isDesktop && (
        <Sidebar
          conversations={conversations}
          activeId={activeSessionId}
          onSelect={handleSelectConversation}
          onCreate={handleNewConversation}
          onDelete={handleDeleteConversation}
          isCollapsed={sidebarCollapsed}
          username={user?.username}
          onLogout={logout}
        />
      )}

      {/* Mobile Sidebar Sheet */}
      {!isDesktop && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetTitle className="sr-only">导航菜单</SheetTitle>
            {sidebarContent}
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 min-h-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleSidebar}
            className="h-9 w-9 shrink-0"
          >
            {isDesktop && !sidebarCollapsed ? (
              <PanelLeftClose size={18} />
            ) : (
              <PanelLeft size={18} />
            )}
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-medium truncate">
              {activeSessionId
                ? conversations.find((c) => c.id === activeSessionId)?.title || headerTitle || "对话"
                : headerTitle || "新对话"}
            </h2>
            <p className="text-[11px] text-muted-foreground truncate">
              {conversationsLoading
                ? "加载中..."
                : headerSubtitle || "开始新的对话"}
            </p>
          </div>
          <ThemeToggle />
        </header>

        {/* Page Content */}
        {children({
          conversations,
          createConversation,
          loadMessagesForConversation,
          refreshConversations,
          token,
        })}
      </main>
    </div>
  );
}
