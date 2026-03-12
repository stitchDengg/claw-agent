/**
 * Claw Agent Server — Express + LangGraph.js
 *
 * 提供 /api/chat 接口，输出兼容 Vercel AI SDK data stream 协议
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import { AIMessage, BaseMessage } from "@langchain/core/messages";
import { getAgent, convertToLangChainMessages, type ChatMessage } from "./agent.js";

const app = express();
const PORT = parseInt(process.env.PORT || "8000", 10);
const HOST = process.env.HOST || "0.0.0.0";

// ========== 中间件 ==========

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  })
);

// ========== 健康检查 ==========

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "claw-agent", engine: "langgraph.js" });
});

// ========== 聊天接口 ==========

interface ChatRequestBody {
  messages: ChatMessage[];
  stream?: boolean;
}

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, stream = true } = req.body as ChatRequestBody;

    if (!messages || messages.length === 0) {
      res.status(400).json({ error: "messages is required" });
      return;
    }

    const agent = getAgent();
    const lcMessages = convertToLangChainMessages(messages);

    if (stream) {
      // ======= 流式响应 =======
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("X-Vercel-AI-Data-Stream", "v1");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      try {
        // 调用 Agent（LangGraph invoke）
        const result = await agent!.invoke({ messages: lcMessages });
        const finalMessages: BaseMessage[] = result.messages;

        // 提取最后一条 AI 消息
        let aiResponse = "";
        for (let i = finalMessages.length - 1; i >= 0; i--) {
          const msg = finalMessages[i];
          if (msg instanceof AIMessage && msg.content) {
            aiResponse = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
            break;
          }
        }

        if (aiResponse) {
          // 分块输出，模拟流式效果
          const chunks = splitIntoChunks(aiResponse);
          for (const chunk of chunks) {
            res.write(`0:${JSON.stringify(chunk)}\n`);
          }
        }

        // 发送结束信号
        const finishData = {
          finishReason: "stop",
          usage: { promptTokens: 0, completionTokens: 0 },
        };
        res.write(`d:${JSON.stringify(finishData)}\n`);
        res.end();
      } catch (err) {
        const errorMsg = `❌ Agent 执行出错: ${err instanceof Error ? err.message : String(err)}`;
        res.write(`0:${JSON.stringify(errorMsg)}\n`);
        const finishData = {
          finishReason: "error",
          usage: { promptTokens: 0, completionTokens: 0 },
        };
        res.write(`d:${JSON.stringify(finishData)}\n`);
        res.end();
      }
    } else {
      // ======= 非流式响应 =======
      const result = await agent!.invoke({ messages: lcMessages });
      const finalMessages: BaseMessage[] = result.messages;

      let aiResponse = "";
      for (let i = finalMessages.length - 1; i >= 0; i--) {
        const msg = finalMessages[i];
        if (msg instanceof AIMessage && msg.content) {
          aiResponse = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
          break;
        }
      }

      res.json({ role: "assistant", content: aiResponse });
    }
  } catch (err) {
    console.error("Chat API Error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

// ========== 图结构信息 ==========

app.get("/api/graph", (_req, res) => {
  try {
    const agent = getAgent();
    const mermaid = agent!.getGraph().drawMermaid();
    res.json({ mermaid });
  } catch {
    res.json({
      nodes: ["agent", "tools"],
      edges: [
        { from: "__start__", to: "agent" },
        { from: "agent", to: "tools", condition: "has_tool_calls" },
        { from: "agent", to: "__end__", condition: "no_tool_calls" },
        { from: "tools", to: "agent" },
      ],
    });
  }
});

// ========== 工具函数 ==========

function splitIntoChunks(text: string, chunkSize = 20): string[] {
  const chunks: string[] = [];
  let i = 0;

  while (i < text.length) {
    let end = Math.min(i + chunkSize, text.length);

    if (end < text.length) {
      // 尝试在标点或空格处断开
      for (let j = end; j > i; j--) {
        if ("。，！？；：\n,.!?;: ".includes(text[j - 1])) {
          end = j;
          break;
        }
      }
    }

    chunks.push(text.slice(i, end));
    i = end;
  }

  return chunks;
}

// ========== 启动服务器 ==========

app.listen(PORT, HOST, () => {
  console.log(`\n🚀 Claw Agent Server (LangGraph.js) 启动成功！`);
  console.log(`   地址: http://${HOST}:${PORT}`);
  console.log(`   健康检查: http://localhost:${PORT}/health`);
  console.log(`   聊天 API: POST http://localhost:${PORT}/api/chat`);
  console.log(`   图结构: GET http://localhost:${PORT}/api/graph\n`);
});
