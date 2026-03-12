"use client";

import { Bot, Code, FileText, Lightbulb, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 animate-fade-in">
      {/* Logo */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
        <Bot size={32} className="text-primary-foreground" />
      </div>

      <h2 className="text-2xl font-bold mb-2 text-center">你好，我是 Claw Agent</h2>
      <p className="text-muted-foreground text-sm mb-8 text-center max-w-md">
        我是你的 AI 智能助手，可以帮你编写代码、解答问题、设计方案。
        <br />
        试试下面的快捷操作，或直接输入你的问题。
      </p>

      {/* Suggestions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full">
        {suggestions.map((item, index) => (
          <Card
            key={item.title}
            onClick={() => onSuggestionClick(item.prompt)}
            className="cursor-pointer hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 group"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                {item.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium mb-0.5">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
