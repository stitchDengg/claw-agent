# Reviewer-Tester Memory

## Critical Lessons Learned

### @base-ui/react Button defaults to type="button"
- **Date**: 2026-03-13
- **Impact**: Login/Register forms completely broken — clicking submit button did nothing
- **Root cause**: `@base-ui/react/button` renders `<button type="button">` by default, NOT `type="submit"`. When used inside a `<form>`, it does not trigger form submission.
- **Rule**: ANY button inside a `<form onSubmit>` that should trigger submission MUST have explicit `type="submit"`. Always check third-party Button component defaults.
- See [component-pitfalls.md](./component-pitfalls.md) for details.

## Project-Specific Notes

### Monorepo Structure (Updated 2026-03-13 after agent-layer-separation)
- `packages/agent` (`@claw-agent/agent`) — pure LangGraph.js library, `module: node16`
- `packages/server` (`@claw-agent/server`) — NestJS + Prisma application, `module: commonjs`
- `packages/web` (`@claw-agent/web`) — Next.js frontend
- Workspace: `pnpm-workspace.yaml` uses `packages/*` glob (covers all packages automatically)

### UI Component Library
- Project uses **shadcn/ui v4** with **@base-ui/react** primitives (NOT Radix)
- Button component: `packages/web/src/components/ui/button.tsx` wraps `@base-ui/react/button`
- Tooltip component: `packages/web/src/components/ui/tooltip.tsx` wraps `@base-ui/react/tooltip` — does NOT support `asChild` prop

### Tech Stack
- Frontend: Next.js 15, React 19, Tailwind CSS 4
- Backend: NestJS + Prisma + `@claw-agent/agent` (LangGraph.js)
- Monorepo: pnpm workspace

### TypeScript Configuration Patterns
- `packages/server/tsconfig.json`: Do NOT set `declaration: true` — server is a binary, not a library.
  Setting it causes TS2742 when return types infer into transitive deps (e.g., LangGraph types via `@claw-agent/agent`).
- `packages/agent/tsconfig.json`: Needs `module: node16` for LangChain package resolution.
- `packages/server/tsconfig.json`: Uses `module: commonjs` for NestJS ecosystem compatibility.

### pnpm Strict Mode & Transitive Dep Pattern
- Server MUST NOT import from `@langchain/*` directly — those are transitive via `@claw-agent/agent`.
- `packages/agent/src/index.ts` re-exports `AIMessage` and `BaseMessage` from `@langchain/core/messages` so server can use `import { AIMessage } from '@claw-agent/agent'`.
- Quick check for stale LangChain imports in server: `grep -r "@langchain" packages/server/src/`

### Build Order
- `packages/agent` must build before `packages/server` (server consumes `agent/dist/`).
- `pnpm -r build` handles topological order automatically.
- Root `package.json` has `build:agent` and `dev:agent` scripts for targeted builds.
