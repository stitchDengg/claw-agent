"use client";

import { useState, useCallback, useEffect } from "react";
import { Conversation } from "@/types";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Message } from "@ai-sdk/react";

interface ApiConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

interface ApiConversationDetail extends ApiConversation {
  messages: Array<{
    id: string;
    role: string;
    content: string;
    thinking?: string;
    createdAt: string;
  }>;
}

function toConversation(api: ApiConversation): Conversation {
  return {
    id: api.id,
    title: api.title,
    createdAt: new Date(api.createdAt),
    updatedAt: new Date(api.updatedAt),
  };
}

export interface MessageWithThinking extends Message {
  thinking?: string;
}

export interface LoadMessagesResult {
  messages: MessageWithThinking[];
}

export function useConversations() {
  const { token } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch conversations from API on mount / token change
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const list = await apiFetch<ApiConversation[]>("/api/conversations");
        if (cancelled) return;
        setConversations(list.map(toConversation));
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  const createConversation = useCallback(async (): Promise<string> => {
    try {
      const created = await apiFetch<ApiConversation>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ title: "新对话" }),
      });
      const conv = toConversation(created);
      setConversations((prev) => [conv, ...prev]);
      return conv.id;
    } catch (err) {
      console.error("Failed to create conversation:", err);
      return "";
    }
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await apiFetch<void>(`/api/conversations/${id}`, { method: "DELETE" });
        setConversations((prev) => prev.filter((c) => c.id !== id));
      } catch (err) {
        console.error("Failed to delete conversation:", err);
      }
    },
    []
  );

  const updateTitle = useCallback(async (id: string, title: string) => {
    try {
      await apiFetch<{ id: string; title: string; updatedAt: string }>(
        `/api/conversations/${id}`,
        { method: "PATCH", body: JSON.stringify({ title }) }
      );
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title, updatedAt: new Date() } : c))
      );
    } catch (err) {
      console.error("Failed to update title:", err);
    }
  }, []);

  const loadMessagesForConversation = useCallback(
    async (conversationId: string): Promise<LoadMessagesResult> => {
      if (!conversationId) return { messages: [] };
      try {
        const detail = await apiFetch<ApiConversationDetail>(
          `/api/conversations/${conversationId}`
        );
        const messages: MessageWithThinking[] = detail.messages.map((m) => ({
          id: m.id,
          role: m.role as Message["role"],
          content: m.content,
          thinking: m.thinking,
          createdAt: new Date(m.createdAt),
        }));
        return { messages };
      } catch (err) {
        console.error("Failed to load messages:", err);
        return { messages: [] };
      }
    },
    []
  );

  // Re-fetch conversations list (e.g., after chat creates auto-title)
  const refreshConversations = useCallback(async () => {
    try {
      const list = await apiFetch<ApiConversation[]>("/api/conversations");
      setConversations(list.map(toConversation));
    } catch (err) {
      console.error("Failed to refresh conversations:", err);
    }
  }, []);

  return {
    conversations,
    createConversation,
    deleteConversation,
    updateTitle,
    loadMessagesForConversation,
    refreshConversations,
    isLoading,
  };
}
