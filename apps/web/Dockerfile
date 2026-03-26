FROM node:18-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.6.0 --activate

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml* package.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared-types/package.json packages/shared-types/

RUN pnpm install --frozen-lockfile

COPY packages/shared-types packages/shared-types
COPY apps/web apps/web

RUN pnpm --filter web build

FROM nginx:alpine
COPY --from=base /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
