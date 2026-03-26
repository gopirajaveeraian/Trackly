FROM node:18-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.6.0 --activate

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml* package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared-types/package.json packages/shared-types/

RUN pnpm install --frozen-lockfile

COPY packages/shared-types packages/shared-types
COPY apps/api apps/api

RUN pnpm --filter api prisma generate
RUN pnpm --filter api build

EXPOSE 5000
CMD ["pnpm", "--filter", "api", "start"]
