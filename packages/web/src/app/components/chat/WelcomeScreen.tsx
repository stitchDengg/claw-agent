"use client";

import { Bot, Code, FileText, Lightbulb, Zap } from "lucide-react";

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void;
}

const suggestions = [
  {
    icon: <Code size={18} />,
    title: "编写代码",
    desc: "帮我写一个 React Hook",
    prompt: "帮我写一个用于管理表单状态的 React Hook，支持校验和提交",
  },
  {
    icon: <Lightbulb size={18} />,
    title: "技术方案",
    desc: "设计一个系统架构",
    prompt: "帮我设计一个高并发的消息推送系统架构方案",
  },
  {
    icon: <FileText size={18} />,
    title: "文档生成",
    desc: "生成 API 文档",
    prompt: "帮我为一个用户管理模块生成 RESTful API 接口文档",
  },
  {
    icon: <Zap size={18} />,
    title: "代码优化",
    desc: "分析并优化代码性能",
    prompt: "帮我分析以下代码的性能瓶颈并提供优化建议",
  },
];

export default function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 animate-fade-in">
      {/* Logo */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center mb-6 shadow-lg shadow-[var(--primary)]/20">
        <Bot size={32} className="text-white" />
      </div>

      <h2 className="text-2xl font-bold mb-2">你好，我是 Claw Agent 🤖</h2>
      <p className="text-[var(--muted-foreground)] text-sm mb-8 text-center max-w-md">
        我是你的 AI 智能助手，可以帮你编写代码、解答问题、设计方案。
        <br />
        试试下面的快捷操作，或直接输入你的问题。
      </p>

      {/* Suggestions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full">
        {suggestions.map((item) => (
          <button
            key={item.title}
            onClick={() => onSuggestionClick(item.prompt)}
            className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border)]
                       bg-[var(--card)] hover:bg-[var(--card-hover)] hover:border-[var(--border-light)]
                       transition-all text-left cursor-pointer group"
          >
            <div className="p-2 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-white transition-colors shrink-0">
              {item.icon}
            </div>
            <div>
              <p className="text-sm font-medium mb-0.5">{item.title}</p>
              <p className="text-xs text-[var(--muted)]">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
