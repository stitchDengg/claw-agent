"use client";

import { Terminal, Lightbulb, FileText, Zap } from "lucide-react";

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void;
}

const suggestions = [
  {
    icon: <Terminal size={24} className="text-foreground" />,
    title: "编写代码",
    desc: "帮你编写高质量的代码",
    prompt: "帮我写一个用于管理表单状态的 React Hook，支持校验和提交",
  },
  {
    icon: <Lightbulb size={24} className="text-foreground" />,
    title: "技术方案",
    desc: "设计完善的技术架构方案",
    prompt: "帮我设计一个高并发的消息推送系统架构方案",
  },
  {
    icon: <FileText size={24} className="text-foreground" />,
    title: "文档生成",
    desc: "自动生成项目文档",
    prompt: "帮我为一个用户管理模块生成 RESTful API 接口文档",
  },
  {
    icon: <Zap size={24} className="text-foreground" />,
    title: "代码优化",
    desc: "优化代码性能和质量",
    prompt: "帮我分析以下代码的性能瓶颈并提供优化建议",
  },
];

export default function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 pb-28 animate-fade-in">
      <div className="w-full max-w-[640px] space-y-10">
        {/* Greeting */}
        <div className="space-y-4 text-center md:text-left">
          <h1 className="text-[32px] font-semibold text-foreground leading-tight tracking-tight">
            你好，有什么我可以帮你的？
          </h1>
          <p className="text-[15px] text-muted-foreground font-light">
            选择下方话题开始，或直接输入你的问题。
          </p>
        </div>

        {/* Bento Grid Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suggestions.map((item, index) => (
            <button
              key={item.title}
              onClick={() => onSuggestionClick(item.prompt)}
              className="group flex flex-col p-6 bg-card rounded-xl text-left border border-transparent hover:bg-accent hover:border-border transition-all duration-300"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="mb-4">
                {item.icon}
              </div>
              <h3 className="text-[14px] font-semibold text-foreground mb-1">
                {item.title}
              </h3>
              <p className="text-[13px] text-muted-foreground">
                {item.desc}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
