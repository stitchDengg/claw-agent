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

export function useConversations() {
  const { token } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");
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

        if (list.length > 0) {
          setConversations(list.map(toConversation));
          setActiveId((prev) => {
            // Keep current activeId if it still exists in the list
            if (prev && list.some((c) => c.id === prev)) return prev;
            return list[0].id;
          });
        } else {
          // Auto-create a default conversation
          const created = await apiFetch<ApiConversation>("/api/conversations", {
            method: "POST",
            body: JSON.stringify({ title: "新对话" }),
          });
          if (cancelled) return;
          setConversations([toConversation(created)]);
          setActiveId(created.id);
        }
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  const createConversation = useCallback(async () => {
    try {
      const created = await apiFetch<ApiConversation>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ title: "新对话" }),
      });
      const conv = toConversation(created);
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
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
        setConversations((prev) => {
          const filtered = prev.filter((c) => c.id !== id);
          if (filtered.length === 0) {
            // Will trigger a re-create on next render via the effect
            return filtered;
          }
          return filtered;
        });
        setActiveId((prev) => {
          if (prev === id) {
            // Switch to first remaining, or empty
            const remaining = conversations.filter((c) => c.id !== id);
            return remaining.length > 0 ? remaining[0].id : "";
          }
          return prev;
        });
      } catch (err) {
        console.error("Failed to delete conversation:", err);
      }
    },
    [conversations]
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
    async (conversationId: string): Promise<Message[]> => {
      if (!conversationId) return [];
      try {
        const detail = await apiFetch<ApiConversationDetail>(
          `/api/conversations/${conversationId}`
        );
        return detail.messages.map((m) => ({
          id: m.id,
          role: m.role as Message["role"],
          content: m.content,
          createdAt: new Date(m.createdAt),
        }));
      } catch (err) {
        console.error("Failed to load messages:", err);
        return [];
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
    activeId,
    setActiveId,
    createConversation,
    deleteConversation,
    updateTitle,
    loadMessagesForConversation,
    refreshConversations,
    isLoading,
  };
}
