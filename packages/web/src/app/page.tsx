"use client";

import { useChat } from "@ai-sdk/react";
import { useRef, useEffect, useState, useCallback } from "react";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import Sidebar from "./components/sidebar/Sidebar";
import ChatMessage from "./components/chat/ChatMessage";
import ChatInput from "./components/chat/ChatInput";
import WelcomeScreen from "./components/chat/WelcomeScreen";
import LoadingIndicator from "./components/chat/LoadingIndicator";
import { useConversations } from "@/hooks/useConversations";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  return (
    <AuthGuard>
      <HomeContent />
    </AuthGuard>
  );
}

function HomeContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, logout, token } = useAuth();

  const {
    conversations,
    activeId,
    setActiveId,
    createConversation,
    deleteConversation,
    loadMessagesForConversation,
    refreshConversations,
    isLoading: conversationsLoading,
  } = useConversations();

  const { messages, input, setInput, handleSubmit, isLoading, stop, setMessages } =
    useChat({
      api: "/api/chat",
      id: activeId,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: { conversationId: activeId },
      onFinish: () => {
        // Backend auto-sets title on first message; refresh sidebar
        refreshConversations();
      },
    });

  // Load messages when activeId changes
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    (async () => {
      const msgs = await loadMessagesForConversation(activeId);
      if (!cancelled) {
        setMessages(msgs);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const handleSubmitWithSave = useCallback(
    (e: React.FormEvent) => {
      handleSubmit(e as React.FormEvent<HTMLFormElement>);
    },
    [handleSubmit]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewConversation = async () => {
    await createConversation();
    setMessages([]);
    setInput("");
    setSheetOpen(false);
  };

  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    setInput("");
    setSheetOpen(false);
  };

  const handleSuggestionClick = (prompt: string) => {
    setInput(prompt);
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
      activeId={activeId}
      onSelect={handleSelectConversation}
      onCreate={handleNewConversation}
      onDelete={deleteConversation}
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
          activeId={activeId}
          onSelect={handleSelectConversation}
          onCreate={handleNewConversation}
          onDelete={deleteConversation}
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

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full min-w-0">
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
              {conversations.find((c) => c.id === activeId)?.title || "新对话"}
            </h2>
            <p className="text-[11px] text-muted-foreground truncate">
              {conversationsLoading
                ? "加载中..."
                : messages.length > 0
                  ? `${messages.length} 条消息`
                  : "开始新的对话"}
            </p>
          </div>
          <ThemeToggle />
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1">
          {messages.length === 0 ? (
            <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
          ) : (
            <div className="max-w-3xl mx-auto py-4 px-2 md:px-4 space-y-2">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  role={message.role as "user" | "assistant"}
                  content={message.content}
                  isStreaming={
                    isLoading &&
                    message.id === messages[messages.length - 1]?.id &&
                    message.role === "assistant"
                  }
                />
              ))}
              {isLoading &&
                messages[messages.length - 1]?.role === "user" && (
                  <LoadingIndicator />
                )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <ChatInput
          input={input}
          onChange={setInput}
          onSubmit={handleSubmitWithSave}
          onStop={stop}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}
