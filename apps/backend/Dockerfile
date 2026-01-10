# Stage 1: Dependencies and Build
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable pnpm

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/backend ./apps/backend
COPY packages ./packages

# Build TypeScript
WORKDIR /app/apps/backend
RUN pnpm build

# Create a standalone deployment
WORKDIR /app
RUN pnpm --filter @tenxdev/backend deploy --prod /deploy

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 api

# Copy the deployed standalone package
COPY --from=builder /deploy ./
COPY --from=builder /app/apps/backend/dist ./dist

USER api

EXPOSE 8080
ENV PORT=8080

CMD ["node", "dist/index.js"]
