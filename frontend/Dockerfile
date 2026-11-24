FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN corepack enable \
    && corepack prepare pnpm@12.21.0 --activate

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_BASE_URL=http://localhost:3000
ARG VITE_API_URL=http://localhost:3000

ENV VITE_BASE_URL=${VITE_BASE_URL} \
    VITE_API_URL=${VITE_API_URL}

RUN pnpm build

FROM nginx:alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
