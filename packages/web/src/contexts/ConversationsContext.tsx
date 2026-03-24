"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useConversations } from "@/hooks/useConversations";

type ConversationsContextType = ReturnType<typeof useConversations>;

const ConversationsContext = createContext<ConversationsContextType | null>(null);

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const {
    conversations,
    createConversation,
    deleteConversation,
    updateTitle,
    loadMessagesForConversation,
    refreshConversations,
    isLoading,
  } = useConversations();

  const value = useMemo<ConversationsContextType>(
    () => ({
      conversations,
      createConversation,
      deleteConversation,
      updateTitle,
      loadMessagesForConversation,
      refreshConversations,
      isLoading,
    }),
    [
      conversations,
      createConversation,
      deleteConversation,
      updateTitle,
      loadMessagesForConversation,
      refreshConversations,
      isLoading,
    ]
  );

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversationsContext() {
  const ctx = useContext(ConversationsContext);
  if (!ctx)
    throw new Error(
      "useConversationsContext must be used within ConversationsProvider"
    );
  return ctx;
}
