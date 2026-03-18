"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import AppShell from "./components/AppShell";
import ChatInput from "./components/chat/ChatInput";
import WelcomeScreen from "./components/chat/WelcomeScreen";
import { apiFetch } from "@/lib/api";

export default function Home() {
  return (
    <AppShell headerTitle="新对话" headerSubtitle="开始新的对话">
      {({ token }) => <HomeContent token={token} />}
    </AppShell>
  );
}

function HomeContent({ token }: { token: string | null }) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const { input, setInput, handleSubmit, isLoading, stop } = useChat({
    api: "/api/chat",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  const handleSuggestionClick = (prompt: string) => {
    setInput(prompt);
  };

  const handleSubmitWithCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isCreating) return;

      setIsCreating(true);
      try {
        // Create a new conversation first
        const created = await apiFetch<{ id: string }>("/api/conversations", {
          method: "POST",
          body: JSON.stringify({ title: "新对话" }),
        });

        if (created.id) {
          // Store the pending message in sessionStorage so the chat page can pick it up
          sessionStorage.setItem(
            `pending-message-${created.id}`,
            input.trim()
          );
          router.push(`/chat/${created.id}`);
        }
      } catch (err) {
        console.error("Failed to create conversation:", err);
      } finally {
        setIsCreating(false);
      }
    },
    [input, isCreating, router]
  );

  return (
    <>
      {/* Welcome */}
      <div className="flex-1 overflow-auto">
        <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
      </div>

      {/* Input */}
      <ChatInput
        input={input}
        onChange={setInput}
        onSubmit={handleSubmitWithCreate}
        onStop={stop}
        isLoading={isLoading || isCreating}
      />
    </>
  );
}
