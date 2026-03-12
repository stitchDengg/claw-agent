import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
