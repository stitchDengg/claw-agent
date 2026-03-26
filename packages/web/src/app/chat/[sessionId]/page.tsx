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

// Type guard for thinking annotation objects from the stream
interface ThinkingDelta {
  type: "thinking_delta";
  content: string;
}

interface ThinkingComplete {
  type: "thinking_complete";
}

type ThinkingAnnotation = ThinkingDelta | ThinkingComplete;

function isThinkingAnnotation(val: unknown): val is ThinkingAnnotation {
  if (typeof val !== "object" || val === null) return false;
  const obj = val as Record<string, unknown>;
  return obj.type === "thinking_delta" || obj.type === "thinking_complete";
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

  // Thinking state: maps messageId -> accumulated thinking content
  const [thinkingMap, setThinkingMap] = useState<Record<string, string>>({});
  const [thinkingCompleteSet, setThinkingCompleteSet] = useState<Set<string>>(new Set());
  const [thinkingDurationMap, setThinkingDurationMap] = useState<Record<string, number>>({});
  // Track thinking start times (ref since we don't need re-renders)
  const thinkingStartTimeRef = useRef<Record<string, number>>({});
  // Track processed data length to avoid reprocessing
  const processedDataLenRef = useRef(0);

  const { messages, input, setInput, handleSubmit, isLoading, stop, setMessages, append, data } =
    useChat({
      api: "/api/chat",
      id: sessionId,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: { conversationId: sessionId },
      onFinish: () => {
        refreshConversations();
      },
    });

  // Process streaming annotations (prefix 2:) to build thinking content
  useEffect(() => {
    if (!data || data.length === 0) return;

    // Only process new data items since last check
    const startIdx = processedDataLenRef.current;
    if (startIdx >= data.length) return;

    const newItems = data.slice(startIdx);
    processedDataLenRef.current = data.length;

    // Find current assistant message id (last assistant message while streaming)
    const lastMsg = messages[messages.length - 1];
    const currentAssistantId =
      lastMsg?.role === "assistant" ? lastMsg.id : null;
    if (!currentAssistantId) return;

    let thinkingDelta = "";
    let thinkingDone = false;

    for (const item of newItems) {
      // Each data item from prefix 2: is an element of the array
      // e.g., data receives: {"type":"thinking_delta","content":"..."} or {"type":"thinking_complete"}
      if (isThinkingAnnotation(item)) {
        if (item.type === "thinking_delta") {
          thinkingDelta += item.content;
        } else if (item.type === "thinking_complete") {
          thinkingDone = true;
        }
      }
    }

    if (thinkingDelta) {
      // Record start time on first thinking delta for this message
      if (!thinkingStartTimeRef.current[currentAssistantId]) {
        thinkingStartTimeRef.current[currentAssistantId] = Date.now();
      }
      setThinkingMap((prev) => ({
        ...prev,
        [currentAssistantId]: (prev[currentAssistantId] ?? "") + thinkingDelta,
      }));
    }

    if (thinkingDone) {
      // Calculate duration
      const startTime = thinkingStartTimeRef.current[currentAssistantId];
      if (startTime) {
        const durationSec = Math.round((Date.now() - startTime) / 1000);
        setThinkingDurationMap((prev) => ({
          ...prev,
          [currentAssistantId]: durationSec,
        }));
      }
      setThinkingCompleteSet((prev) => {
        const next = new Set(prev);
        next.add(currentAssistantId);
        return next;
      });
    }
  }, [data, messages]);

  // Reset thinking data processing counter when data is cleared (new message)
  useEffect(() => {
    if (!data || data.length === 0) {
      processedDataLenRef.current = 0;
    }
  }, [data]);

  // Load existing messages when sessionId changes
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    setMessagesLoaded(false);
    // Reset thinking state for new session
    setThinkingMap({});
    setThinkingCompleteSet(new Set());
    setThinkingDurationMap({});
    thinkingStartTimeRef.current = {};
    processedDataLenRef.current = 0;

    (async () => {
      const result = await loadMessagesForConversation(sessionId);
      if (!cancelled) {
        // result may contain thinking data via extra fields
        // Extract thinking map from loaded messages
        const historyThinkingMap: Record<string, string> = {};
        for (const msg of result.messages) {
          if (msg.thinking) {
            historyThinkingMap[msg.id] = msg.thinking;
          }
        }
        setThinkingMap(historyThinkingMap);
        // All historical messages have completed thinking
        setThinkingCompleteSet(new Set(Object.keys(historyThinkingMap)));
        setMessages(result.messages);
        setMessagesLoaded(true);
      }

      // Check for pending message from home page
      if (!cancelled) {
        const pendingKey = `pending-message-${sessionId}`;
        const pendingMessage = sessionStorage.getItem(pendingKey);
        if (pendingMessage) {
          sessionStorage.removeItem(pendingKey);
          // Only send if no existing messages (fresh conversation)
          if (result.messages.length === 0) {
            append({ role: "user", content: pendingMessage });
          }
        }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Intentionally only trigger on sessionId change: loadMessagesForConversation, setMessages,
    // append are stable callbacks; including them would cause spurious re-runs. The `cancelled`
    // flag ensures safety against async races.
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
            {messages.map((message, index) => {
              const thinking = thinkingMap[message.id];
              const isThinkingComplete = thinkingCompleteSet.has(message.id);
              const isCurrentlyStreaming = message.id === streamingMessageId;
              // Thinking is still streaming if: message is streaming, has thinking content, and thinking not complete
              const isThinkingStreaming = isCurrentlyStreaming && !!thinking && !isThinkingComplete;
              const thinkingDuration = thinkingDurationMap[message.id];

              return (
                <div
                  key={message.id}
                  ref={index === lastUserMsgIndex ? lastUserMsgRef : undefined}
                >
                  <ChatMessage
                    role={message.role as "user" | "assistant"}
                    content={message.content}
                    isStreaming={isCurrentlyStreaming}
                    thinking={thinking}
                    isThinkingStreaming={isThinkingStreaming}
                    thinkingDurationSeconds={thinkingDuration}
                  />
                </div>
              );
            })}
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
