"use client";

import { useParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import AppShell from "../../components/AppShell";
import ChatMessage from "../../components/chat/ChatMessage";
import ChatInput from "../../components/chat/ChatInput";
import LoadingIndicator from "../../components/chat/LoadingIndicator";
import WelcomeScreen from "../../components/chat/WelcomeScreen";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AppShellChildProps } from "../../components/AppShell";

export default function ChatSessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  return (
    <AppShell
      activeSessionId={sessionId}
      headerTitle="对话"
      headerSubtitle="加载中..."
    >
      {(shellProps) => (
        <ChatSessionContent sessionId={sessionId} {...shellProps} />
      )}
    </AppShell>
  );
}

function ChatSessionContent({
  sessionId,
  loadMessagesForConversation,
  refreshConversations,
  token,
  conversations,
}: { sessionId: string } & AppShellChildProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastUserMsgRef = useRef<HTMLDivElement>(null);
  const [messagesLoaded, setMessagesLoaded] = useState(false);

  const { messages, input, setInput, handleSubmit, isLoading, stop, setMessages, append } =
    useChat({
      api: "/api/chat",
      id: sessionId,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: { conversationId: sessionId },
      onFinish: () => {
        refreshConversations();
      },
    });

  // Load existing messages when sessionId changes
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    setMessagesLoaded(false);

    (async () => {
      const msgs = await loadMessagesForConversation(sessionId);
      if (!cancelled) {
        setMessages(msgs);
        setMessagesLoaded(true);
      }

      // Check for pending message from home page
      if (!cancelled) {
        const pendingKey = `pending-message-${sessionId}`;
        const pendingMessage = sessionStorage.getItem(pendingKey);
        if (pendingMessage) {
          sessionStorage.removeItem(pendingKey);
          // Only send if no existing messages (fresh conversation)
          if (msgs.length === 0) {
            append({ role: "user", content: pendingMessage });
          }
        }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleSubmitWithSave = useCallback(
    (e: React.FormEvent) => {
      handleSubmit(e as React.FormEvent<HTMLFormElement>);
    },
    [handleSubmit]
  );

  // ---- Auto-scroll logic ----
  // Batch all DOM reads, then write in a single RAF to avoid layout thrashing.
  const rafRef = useRef<number | null>(null);
  const prevMessagesLenRef = useRef(messages.length);
  const pinnedScrollHeightRef = useRef<number | null>(null);

  useEffect(() => {
    const scrollContainer =
      messagesEndRef.current?.closest("[data-radix-scroll-area-viewport]") ??
      messagesEndRef.current?.closest('[data-slot="scroll-area-viewport"]') ??
      messagesEndRef.current?.parentElement;
    if (!scrollContainer) return;

    const lastMsg = messages[messages.length - 1];
    const isNewUserMessage =
      messages.length > prevMessagesLenRef.current && lastMsg?.role === "user";

    if (isNewUserMessage) {
      pinnedScrollHeightRef.current = -1;
      // Single RAF: batch read then write
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const el = lastUserMsgRef.current;
        if (!el || !scrollContainer) return;
        // Batch reads
        const containerRect = scrollContainer.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const scrollTop = scrollContainer.scrollTop;
        const scrollHeight = scrollContainer.scrollHeight;
        // Single write
        const offset = elRect.top - containerRect.top + scrollTop;
        scrollContainer.scrollTo({ top: offset });
        pinnedScrollHeightRef.current = scrollHeight;
      });
    } else if (isLoading) {
      const pinValue = pinnedScrollHeightRef.current;
      // Batch reads outside RAF
      const scrollHeight = scrollContainer.scrollHeight;
      const clientHeight = scrollContainer.clientHeight;
      const shouldFollow =
        pinValue === null ||
        (pinValue > 0 && scrollHeight - pinValue > clientHeight);

      if (shouldFollow && rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          scrollContainer.scrollTo({ top: scrollContainer.scrollHeight });
        });
      }
    } else {
      // After completion: smooth scroll to bottom, reset pin
      pinnedScrollHeightRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: "smooth",
      });
    }

    prevMessagesLenRef.current = messages.length;
  }, [messages, isLoading]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleSuggestionClick = useCallback(
    (prompt: string) => {
      setInput(prompt);
    },
    [setInput]
  );

  const currentConv = conversations.find((c) => c.id === sessionId);

  // Pre-compute last user message index for ref attachment
  let lastUserMsgIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      lastUserMsgIndex = i;
      break;
    }
  }

  // Pre-compute streaming message id outside the map to avoid inline recalculation
  const streamingMessageId = useMemo(() => {
    if (!isLoading) return null;
    const lastMsg = messages[messages.length - 1];
    return lastMsg?.role === "assistant" ? lastMsg.id : null;
  }, [isLoading, messages]);

  return (
    <>
      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        {!messagesLoaded ? (
          /* Still loading history — render nothing to avoid WelcomeScreen flash */
          null
        ) : messages.length === 0 ? (
          <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
        ) : (
          <div className="max-w-[720px] mx-auto px-6 pt-10 pb-40 space-y-12">
            {messages.map((message, index) => (
              <div
                key={message.id}
                ref={index === lastUserMsgIndex ? lastUserMsgRef : undefined}
              >
                <ChatMessage
                  role={message.role as "user" | "assistant"}
                  content={message.content}
                  isStreaming={message.id === streamingMessageId}
                />
              </div>
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
    </>
  );
}
