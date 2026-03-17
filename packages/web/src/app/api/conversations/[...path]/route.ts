/**
 * Next.js API Route — 代理 /api/conversations/* 请求到后端
 */

import { NextRequest } from "next/server";

const BACKEND_URL =
  process.env.LANGGRAPH_BACKEND_URL || "http://localhost:8001";

async function proxyRequest(req: NextRequest) {
  const url = new URL(req.url);
  // 保留 /api/conversations/... 路径和查询参数
  const target = `${BACKEND_URL}${url.pathname}${url.search}`;

  const headers: Record<string, string> = {};
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }
  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  const res = await fetch(target, init);

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "application/json",
    },
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
