import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

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
    <html lang="zh-CN" className={cn("dark font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}
