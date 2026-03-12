"use client";

import { useChat } from "@ai-sdk/react";
import { useRef, useEffect, useState } from "react";
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

export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    activeId,
    setActiveId,
    createConversation,
    deleteConversation,
    updateTitle,
  } = useConversations();

  const { messages, input, setInput, handleSubmit, isLoading, stop, setMessages } =
    useChat({
      api: "/api/chat",
      id: activeId,
      onFinish: (message) => {
        if (messages.length === 0 && message.role === "assistant") {
          const title = message.content.substring(0, 30).replace(/\n/g, " ");
          updateTitle(activeId, title || "新对话");
        }
      },
    });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewConversation = () => {
    const newId = createConversation();
    setMessages([]);
    setInput("");
    setSheetOpen(false);
    void newId;
  };

  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    setMessages([]);
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
          <div className="min-w-0">
            <h2 className="text-sm font-medium truncate">
              {conversations.find((c) => c.id === activeId)?.title || "新对话"}
            </h2>
            <p className="text-[11px] text-muted-foreground truncate">
              {messages.length > 0
                ? `${messages.length} 条消息`
                : "开始新的对话"}
            </p>
          </div>
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
          onSubmit={handleSubmit}
          onStop={stop}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}
