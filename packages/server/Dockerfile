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

RUN pnpm build:agent
RUN cd packages/server && npx prisma generate
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

# Install prod deps for both server and agent
# Remove workspace reference, then install server deps + agent deps together
RUN sed -i '/"@claw-agent\/agent"/d' package.json
COPY --from=builder /app/packages/agent/package.json ./packages-agent-package.json
RUN node -e " \
  const server = JSON.parse(require('fs').readFileSync('package.json','utf8')); \
  const agent = JSON.parse(require('fs').readFileSync('packages-agent-package.json','utf8')); \
  Object.assign(server.dependencies, agent.dependencies || {}); \
  require('fs').writeFileSync('package.json', JSON.stringify(server, null, 2)); \
" && rm packages-agent-package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store NODE_ENV= pnpm install --ignore-scripts

# Generate Prisma client (prisma CLI kept for runtime migrations)
RUN pnpm exec prisma generate --schema=./prisma/schema.prisma

EXPOSE 8001
CMD ["node", "dist/main.js"]
