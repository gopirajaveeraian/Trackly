# Build stage
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.6.0 --activate
WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* turbo.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared-types ./packages/shared-types
COPY apps/api ./apps/api

# Generate Prisma client and build
RUN pnpm --filter api prisma generate
RUN pnpm --filter api build

# Production stage
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.6.0 --activate
WORKDIR /app

ENV NODE_ENV=production

# Copy only what's needed for production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages ./packages

# Create uploads directory
RUN mkdir -p /app/apps/api/uploads

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && node dist/app.js"]
