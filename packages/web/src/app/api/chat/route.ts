/**
 * Next.js API Route — 代理请求到 LangGraph.js 后端
 */

// 允许最长流式响应时间
export const maxDuration = 60;

const BACKEND_URL = process.env.LANGGRAPH_BACKEND_URL || "http://localhost:8001";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 转发到 LangGraph.js 后端
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: body.messages,
        stream: true,
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
