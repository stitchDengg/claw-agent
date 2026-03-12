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

export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
        // 用第一条消息更新会话标题
        if (messages.length === 0 && message.role === "assistant") {
          const title = message.content.substring(0, 30).replace(/\n/g, " ");
          updateTitle(activeId, title || "新对话");
        }
      },
    });

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle new conversation
  const handleNewConversation = () => {
    const newId = createConversation();
    setMessages([]);
    setInput("");
    void newId;
  };

  // Handle conversation switch
  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    setMessages([]); // 简化处理，切换时清空（实际项目中应从存储加载）
    setInput("");
  };

  // Handle suggestion click
  const handleSuggestionClick = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelectConversation}
        onCreate={handleNewConversation}
        onDelete={deleteConversation}
        isCollapsed={sidebarCollapsed}
      />

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-[var(--card)] text-[var(--muted-foreground)]
                       hover:text-[var(--foreground)] transition-colors cursor-pointer"
          >
            {sidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <div>
            <h2 className="text-sm font-medium">
              {conversations.find((c) => c.id === activeId)?.title || "新对话"}
            </h2>
            <p className="text-[11px] text-[var(--muted)]">
              {messages.length > 0
                ? `${messages.length} 条消息`
                : "开始新的对话"}
            </p>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
          ) : (
            <div className="max-w-3xl mx-auto py-4 space-y-2">
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
        </div>

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
