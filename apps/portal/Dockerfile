# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/portal/package.json ./apps/portal/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/database ./packages/database
COPY packages/shared-types ./packages/shared-types
COPY packages/tsconfig ./packages/tsconfig
COPY apps/portal ./apps/portal

# Build arguments for Next.js public env vars
ARG NEXT_PUBLIC_DOCUMENTS_SERVICE_URL

ENV NEXT_PUBLIC_DOCUMENTS_SERVICE_URL=$NEXT_PUBLIC_DOCUMENTS_SERVICE_URL

# Build the app
WORKDIR /app/apps/portal
RUN pnpm build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3100

# Copy necessary files from builder
COPY --from=builder /app/apps/portal/public ./public
COPY --from=builder /app/apps/portal/.next/standalone ./
COPY --from=builder /app/apps/portal/.next/static ./apps/portal/.next/static

EXPOSE 3100

CMD ["node", "apps/portal/server.js"]
