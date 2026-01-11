# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/database/package.json ./packages/database/
COPY packages/service-utils/package.json ./packages/service-utils/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/services/documents/package.json ./apps/services/documents/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/database ./packages/database
COPY packages/service-utils ./packages/service-utils
COPY packages/tsconfig ./packages/tsconfig
COPY apps/services/documents ./apps/services/documents

# Build the service
WORKDIR /app/apps/services/documents
RUN pnpm build

# Production stage
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/packages/service-utils ./packages/service-utils
COPY --from=builder /app/packages/tsconfig ./packages/tsconfig
COPY --from=builder /app/apps/services/documents ./apps/services/documents

# Install production dependencies (keep tsx for runtime)
RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/services/documents

# Set environment
ENV NODE_ENV=production
ENV PORT=3005

EXPOSE 3005

CMD ["pnpm", "tsx", "src/index.ts"]
