# PM Spec Agent Memory

## Project: claw-agent

### Architecture
- pnpm monorepo with `packages/web` (Next.js 15, React 19) and `packages/server` (Express 4)
- Server uses ESM (`"type": "module"` in package.json), imports use `.js` extensions
- LLM: MiniMax via @langchain/anthropic compatible API (not Anthropic directly)
- Agent: LangGraph.js StateGraph with ReAct pattern
- Frontend uses `@ai-sdk/react` useChat hook with Vercel AI SDK data stream protocol
- Auth: bcryptjs + jsonwebtoken, users in JSON file, JWT payload: `{ userId, username }`
- Frontend auth: AuthContext talks to backend at NEXT_PUBLIC_AUTH_API_URL (default localhost:8001)
- Conversations/messages stored in localStorage via `packages/web/src/lib/storage.ts`

### Key File Paths
- Server entry: `packages/server/src/index.ts`
- Agent logic: `packages/server/src/agent.ts` (createAgent, getAgent, convertToLangChainMessages)
- Tools: `packages/server/src/tools.ts` (get_weather, calculate, search_knowledge)
- Auth: `packages/server/src/auth.ts` + `packages/server/src/routes/auth.ts`
- Frontend main: `packages/web/src/app/page.tsx`
- Chat proxy: `packages/web/src/app/api/chat/route.ts`
- Conversations hook: `packages/web/src/hooks/useConversations.ts`
- Storage utils: `packages/web/src/lib/storage.ts`
- Types: `packages/web/src/types/index.ts`

### Existing Spec Patterns
- Specs stored in `.claude/plans/` as markdown files
- Previous specs: `chat-history-storage.md`, `dark-mode-toggle.md`, `login-registration.md`

### Conventions
- Chinese language for UI text, comments, and error messages
- Root package.json: pnpm filter scripts like `dev:web`, `dev:server`
- Server default port: 8001 (env PORT, but code defaults to 8000 -- note inconsistency)
- Web dev port: 3000
