"use client";

import { useState, useCallback } from "react";
import { Conversation } from "@/types";
import { generateId } from "@/lib/utils";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "default",
      title: "新对话",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const [activeId, setActiveId] = useState("default");

  const createConversation = useCallback(() => {
    const newConv: Conversation = {
      id: generateId(),
      title: "新对话",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
    return newConv.id;
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== id);
        if (filtered.length === 0) {
          const newConv: Conversation = {
            id: generateId(),
            title: "新对话",
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          setActiveId(newConv.id);
          return [newConv];
        }
        if (activeId === id) {
          setActiveId(filtered[0].id);
        }
        return filtered;
      });
    },
    [activeId]
  );

  const updateTitle = useCallback((id: string, title: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title, updatedAt: new Date() } : c))
    );
  }, []);

  return {
    conversations,
    activeId,
    setActiveId,
    createConversation,
    deleteConversation,
    updateTitle,
  };
}
