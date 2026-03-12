/**
 * Claw Agent 工具定义
 * 使用 @langchain/core 的 tool() 函数定义 Agent 可调用的工具
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";

// ========== 天气查询工具 ==========

export const getWeather = tool(
  async ({ city }: { city: string }) => {
    const weatherData: Record<string, { temp: number; condition: string; humidity: number; wind: string }> = {
      北京: { temp: 15, condition: "晴", humidity: 35, wind: "北风3级" },
      上海: { temp: 18, condition: "多云", humidity: 65, wind: "东风2级" },
      深圳: { temp: 25, condition: "阴", humidity: 80, wind: "南风2级" },
      广州: { temp: 26, condition: "小雨", humidity: 85, wind: "东南风3级" },
      杭州: { temp: 17, condition: "晴", humidity: 55, wind: "西风1级" },
      成都: { temp: 16, condition: "多云", humidity: 70, wind: "微风" },
      武汉: { temp: 19, condition: "阴", humidity: 60, wind: "北风2级" },
    };

    const weather = weatherData[city] || { temp: 20, condition: "晴", humidity: 50, wind: "微风" };

    return JSON.stringify({
      city,
      temperature: `${weather.temp}°C`,
      condition: weather.condition,
      humidity: `${weather.humidity}%`,
      wind: weather.wind,
      updatedAt: new Date().toLocaleString("zh-CN"),
    });
  },
  {
    name: "get_weather",
    description: "获取指定城市的天气信息",
    schema: z.object({
      city: z.string().describe("城市名称，如：北京、上海、深圳"),
    }),
  }
);

// ========== 数学计算工具 ==========

export const calculate = tool(
  async ({ expression }: { expression: string }) => {
    try {
      // 安全过滤：只允许数字和基本运算符
      if (!/^[\d\s+\-*/().%]+$/.test(expression)) {
        return JSON.stringify({
          expression,
          result: "不支持的表达式，只允许数字和基本运算符",
        });
      }
      // 使用 Function 构造器执行计算（比 eval 稍安全）
      const result = new Function(`return (${expression})`)();
      return JSON.stringify({ expression, result: String(result) });
    } catch (e) {
      return JSON.stringify({
        expression,
        result: `计算出错: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  },
  {
    name: "calculate",
    description: "执行数学计算",
    schema: z.object({
      expression: z.string().describe("数学表达式，如：2+3*4、(10+5)*2、100/3"),
    }),
  }
);

// ========== 知识库搜索工具 ==========

export const searchKnowledge = tool(
  async ({ query }: { query: string }) => {
    // 模拟知识库数据
    const knowledgeBase: Record<string, string> = {
      python:
        "Python 是一种高级编程语言，以简洁易读著称。最新稳定版本是 3.12。常用于 Web 开发、数据科学、AI/ML、自动化脚本等领域。",
      langgraph:
        "LangGraph 是 LangChain 团队开发的 Agent 编排框架，基于有向图实现状态管理和工作流控制。支持循环、条件分支、多 Agent 协作。同时提供 Python 和 TypeScript 两个版本。",
      react:
        "React 是 Meta 开发的 JavaScript UI 库，使用虚拟 DOM 和组件化架构。最新版本 React 19 引入了 Server Components 和 Actions。",
      nextjs:
        "Next.js 是基于 React 的全栈框架，支持 SSR、SSG、API Routes、App Router 等特性。由 Vercel 团队开发维护。",
      typescript:
        "TypeScript 是 JavaScript 的超集，添加了静态类型系统。由 Microsoft 开发，广泛用于大型项目开发，提供更好的代码提示和错误检查。",
    };

    const results: Array<{ topic: string; content: string }> = [];
    const queryLower = query.toLowerCase();

    for (const [key, value] of Object.entries(knowledgeBase)) {
      if (key.includes(queryLower) || queryLower.includes(key)) {
        results.push({ topic: key, content: value });
      }
    }

    if (results.length === 0) {
      return JSON.stringify({
        query,
        results: "未找到相关信息，建议使用更具体的关键词搜索。",
      });
    }

    return JSON.stringify({ query, results });
  },
  {
    name: "search_knowledge",
    description: "搜索知识库获取相关信息。这是一个模拟的知识库搜索工具。",
    schema: z.object({
      query: z.string().describe("搜索查询关键词"),
    }),
  }
);

// ========== 导出所有工具 ==========

export const allTools = [getWeather, calculate, searchKnowledge];
