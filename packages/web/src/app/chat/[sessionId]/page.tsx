"use client";

import { useParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { useRef, useEffect, useCallback, useState } from "react";
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
  // When the user sends a new message: scroll so the user message sits at the top of the viewport.
  // During streaming: only start following the bottom once the reply grows past one viewport height.
  // After completion: smooth scroll to bottom.
  const rafRef = useRef<number | null>(null);
  const prevMessagesLenRef = useRef(messages.length);
  // When the user sends a message, we pin the scroll so the user message is at
  // the viewport top. We store the scrollHeight at the time of pinning so we can
  // detect when enough NEW content has been added to justify auto-following.
  // -1 = "pending pin" (RAF scheduled), null = no pin, >0 = pinned scrollHeight.
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
      // User just sent a message — mark as "pending pin" immediately
      pinnedScrollHeightRef.current = -1;
      // Wait a frame so the DOM has the new message rendered
      requestAnimationFrame(() => {
        const el = lastUserMsgRef.current;
        if (el && scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const offset = elRect.top - containerRect.top + scrollContainer.scrollTop;
          scrollContainer.scrollTo({ top: offset });
          // Record the scrollHeight at pin time — we only auto-follow once
          // new content has grown by more than one viewport height from here.
          pinnedScrollHeightRef.current = scrollContainer.scrollHeight;
        }
      });
    } else if (isLoading) {
      const pinValue = pinnedScrollHeightRef.current;
      // -1 means RAF hasn't fired yet — don't scroll
      // > 0 means pinned — only follow once new content exceeds one viewport
      const shouldFollow =
        pinValue === null ||
        (pinValue > 0 &&
          scrollContainer.scrollHeight - pinValue > scrollContainer.clientHeight);

      if (shouldFollow) {
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            scrollContainer.scrollTo({
              top: scrollContainer.scrollHeight,
            });
          });
        }
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

  const handleSuggestionClick = (prompt: string) => {
    setInput(prompt);
  };

  const currentConv = conversations.find((c) => c.id === sessionId);

  // Pre-compute last user message index for ref attachment
  let lastUserMsgIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      lastUserMsgIndex = i;
      break;
    }
  }

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
          <div className="max-w-3xl mx-auto py-4 px-2 md:px-4 space-y-2">
            {messages.map((message, index) => (
              <div
                key={message.id}
                ref={index === lastUserMsgIndex ? lastUserMsgRef : undefined}
              >
                <ChatMessage
                  role={message.role as "user" | "assistant"}
                  content={message.content}
                  isStreaming={
                    isLoading &&
                    message.id === messages[messages.length - 1]?.id &&
                    message.role === "assistant"
                  }
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
