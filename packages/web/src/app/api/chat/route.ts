/**
 * Next.js API Route — 代理请求到 LangGraph.js 后端
 */

// 允许最长流式响应时间
export const maxDuration = 60;

const BACKEND_URL = process.env.LANGGRAPH_BACKEND_URL || "http://localhost:8001";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const authHeader = req.headers.get("authorization");

    // 转发到 LangGraph.js 后端
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    // 从 messages 数组中提取最后一条用户消息
    const lastUserMessage = [...(body.messages || [])]
      .reverse()
      .find((m: { role: string; content: string }) => m.role === "user");

    if (!lastUserMessage) {
      throw new Error("No user message found");
    }

    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        conversationId: body.conversationId,
        message: lastUserMessage.content,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LangGraph backend error: ${response.status} - ${errorText}`);
    }

    // 直接透传后端的流式响应
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Vercel-AI-Data-Stream": "v1",
      },
    });
  } catch (error: unknown) {
    console.error("Chat API Proxy Error:", error);
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`0:${JSON.stringify(`❌ 错误: ${message}`)}\n`)
        );
        controller.enqueue(
          encoder.encode(
            `d:${JSON.stringify({ finishReason: "error", usage: { promptTokens: 0, completionTokens: 0 } })}\n`
          )
        );
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Vercel-AI-Data-Stream": "v1",
      },
    });
  }
}
