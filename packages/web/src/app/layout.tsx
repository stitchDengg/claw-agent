import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ConversationsProvider } from "@/contexts/ConversationsContext";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Claw Agent - AI 智能助手",
  description: "基于 Next.js + LangGraph.js 构建的 AI Agent 应用",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={cn("font-sans h-full", geist.variable)} suppressHydrationWarning>
      <body className="m-0 p-0 h-full overflow-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <ConversationsProvider>
              {children}
            </ConversationsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
