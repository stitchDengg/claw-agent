"use client";

import { useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PanelLeft } from "lucide-react";
import Sidebar from "./sidebar/Sidebar";
import { useConversationsContext } from "@/contexts/ConversationsContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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
  } = useConversationsContext();

  const handleNewConversation = useCallback(async () => {
    const id = await createConversation();
    if (id) {
      router.push(`/chat/${id}`);
    }
    setSheetOpen(false);
  }, [createConversation, router]);

  const handleSelectConversation = useCallback((id: string) => {
    router.push(`/chat/${id}`);
    setSheetOpen(false);
  }, [router]);

  const handleDeleteConversation = useCallback(async (id: string) => {
    await deleteConversation(id);
    // If we deleted the active conversation, go home
    if (id === activeSessionId) {
      router.push("/");
    }
  }, [deleteConversation, activeSessionId, router]);

  const handleToggleSidebar = useCallback(() => {
    if (isDesktop) {
      setSidebarCollapsed((prev) => !prev);
    } else {
      setSheetOpen(true);
    }
  }, [isDesktop]);

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
          <SheetContent side="left" className="w-[280px] p-0 bg-sidebar border-r border-sidebar-border">
            <SheetTitle className="sr-only">导航菜单</SheetTitle>
            {sidebarContent}
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 min-h-0 overflow-hidden bg-background relative">
        {/* Mobile top bar */}
        {!isDesktop && (
          <header className="h-12 flex items-center justify-between px-4 bg-sidebar border-b border-sidebar-border shrink-0 md:hidden">
            <button
              onClick={handleToggleSidebar}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <PanelLeft size={20} />
            </button>
            <span className="text-sm font-bold tracking-widest uppercase text-foreground">
              Claw Agent
            </span>
            <div className="w-8" />
          </header>
        )}

        {/* Chat header for active conversation (desktop) */}
        {isDesktop && activeSessionId && (
          <header className="h-12 w-full sticky top-0 z-10 flex justify-between items-center px-6 bg-background">
            <div className="flex items-center gap-3">
              {sidebarCollapsed && (
                <button
                  onClick={handleToggleSidebar}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors mr-2"
                >
                  <PanelLeft size={18} />
                </button>
              )}
              <span className="text-foreground text-sm font-medium tracking-[0.02em]">
                {conversations.find((c) => c.id === activeSessionId)?.title || "对话"}
              </span>
            </div>
          </header>
        )}

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
