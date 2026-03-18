"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useConversations } from "@/hooks/useConversations";

type ConversationsContextType = ReturnType<typeof useConversations>;

const ConversationsContext = createContext<ConversationsContextType | null>(null);

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const value = useConversations();
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
