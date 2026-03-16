# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# ---- Dependencies ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/agent/package.json packages/agent/
COPY packages/web/package.json packages/web/
COPY packages/server/package.json packages/server/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ---- Build ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/agent/node_modules ./packages/agent/node_modules
COPY --from=deps /app/packages/server/node_modules ./packages/server/node_modules
COPY package.json pnpm-workspace.yaml ./
COPY packages/agent/ packages/agent/
COPY packages/server/ packages/server/

# Build agent first (server depends on it)
RUN pnpm build:agent

# Generate Prisma client (output to packages/server/node_modules/.prisma/client per schema.prisma)
RUN cd packages/server && npx prisma generate

# Build server
RUN pnpm build:server

# ---- Production ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/packages/server/package.json ./package.json
COPY --from=builder /app/packages/server/prisma ./prisma
COPY .npmrc ./

# Copy agent dist (server runtime dependency)
COPY --from=builder /app/packages/agent/dist ./node_modules/@claw-agent/agent/dist
COPY --from=builder /app/packages/agent/package.json ./node_modules/@claw-agent/agent/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --ignore-scripts

# Install prisma CLI for migrations
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm add prisma --save-dev

# Copy generated Prisma client into node_modules
COPY --from=builder /app/packages/server/node_modules/.prisma ./node_modules/.prisma

EXPOSE 8001
CMD ["node", "dist/main.js"]
