# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claw Agent is an AI chat assistant built as a pnpm monorepo with three packages:

- **`packages/server`** — NestJS backend (REST API, auth, DB, streaming)
- **`packages/web`** — Next.js 15 frontend (App Router, shadcn/ui, Vercel AI SDK)
- **`packages/agent`** — LangGraph.js agent (tool-calling AI with MiniMax via Anthropic-compatible API)

## Commands

```bash
# Development (all packages in parallel)
pnpm dev

# Individual packages
pnpm dev:server          # NestJS on :8001
pnpm dev:web             # Next.js on :3000
pnpm dev:agent           # Agent build --watch

# Build
pnpm build               # All packages
pnpm build:server
pnpm build:web
pnpm build:agent

# Lint
pnpm lint                # All packages

# Database
cd packages/server
pnpm exec prisma migrate dev      # Run migrations
pnpm exec prisma generate         # Regenerate client
pnpm exec prisma studio           # Visual DB browser

# Docker (production)
docker compose up --build
```

## Architecture

### Request Flow

```
Browser → Next.js (/api/* proxy routes) → NestJS backend → LangGraph agent → MiniMax LLM
```

The web package proxies all API calls through Next.js server routes (`/api/auth/[[...path]]`, `/api/conversations/[[...path]]`, `/api/chat`) to the NestJS backend. This avoids CORS issues in production where only the web container is exposed.

### Streaming Chat

Chat uses a custom Vercel AI Data Stream protocol (not standard SSE):

- Frontend uses `useChat` from `@ai-sdk/react` which expects `X-Vercel-AI-Data-Stream: v1` header
- Backend streams tokens as `0:JSON_STRING\n` lines, ends with `d:JSON_FINISH\n`
- `ChatService.chat()` uses `agent.streamEvents()` with `v2` API, splits large chunks for smooth rendering
- Stream has 60s timeout and handles client disconnect gracefully

### Agent (LangGraph)

`createAgent()` in `packages/agent/src/agent.ts` builds a LangGraph `StateGraph`:

- Nodes: `agent` (LLM call) → conditional edge → `tools` (tool execution) → back to `agent`
- Uses `ChatAnthropic` pointed at MiniMax's Anthropic-compatible endpoint
- Tools defined in `tools.ts` with Zod schemas (weather, math, knowledge base)
- The server imports agent as workspace dependency: `"@claw-agent/agent": "workspace:*"`

### Authentication

JWT-based auth with NestJS Passport:

- `JwtAuthGuard` protects endpoints, `@CurrentUser()` decorator extracts user
- Passwords hashed with bcryptjs
- NestJS `@Post()` returns **201** by default (not 200)

### Database

PostgreSQL with Prisma. Schema in `packages/server/prisma/schema.prisma`:

- `User` → has many `Conversation` → has many `Message`
- Messages have `MessageRole` enum: `user | assistant | system`
- All models use `@map()` for snake_case table/column names
- Cascade deletes on user→conversations→messages

## Environment Variables

Copy `.env.example` to `.env`. The server also needs (set in production secrets):

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing key
- `CORS_ORIGIN` — Allowed origin (default `http://localhost:3000`)
- `MINIMAX_API_KEY` / `MINIMAX_BASE_URL` — LLM API credentials

The web container uses `LANGGRAPH_BACKEND_URL` (default `http://server:8001` in Docker) to reach the backend.

## Deployment

GitHub Actions deploys to Tencent Cloud on push to `main`:

1. SSH into server, pull latest code
2. `docker compose up --build` (server on :8001, web on :3000)
3. Run Prisma migrations
4. Execute `scripts/smoke-test.sh` — tests health, auth, conversations, chat, cleanup

## Chrome MCP Login Credentials

When using Chrome DevTools MCP and the application requires login, use:

- **Username**: `stitichdeng`
- **Password**: `dh1051766345`

## Coding Standards

From `.cursor/rules/typescript-monorepo.mdc`:

- No `any` without justification; no `as any` or unexplained `@ts-ignore`
- External data boundaries must use Zod runtime validation
- Cross-package imports use workspace protocol only; no circular deps
- `useEffect` deps must be complete with cleanup; `useMemo`/`useCallback` need justification
- WebSocket/SSE streams must handle errors, reconnection, and component unmount cleanup
- Fetch chains must use `AbortController` with signal propagation
