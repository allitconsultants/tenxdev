# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable pnpm

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable pnpm

COPY --from=deps /app ./

# Copy source
COPY apps/frontend ./apps/frontend
COPY packages ./packages
COPY turbo.json ./

# Build - pass environment variables for build time
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/apps/frontend
RUN pnpm build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets to where the standalone server expects them
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

# Copy standalone output - this includes all necessary node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# The standalone server is at apps/frontend/server.js
CMD ["node", "apps/frontend/server.js"]
