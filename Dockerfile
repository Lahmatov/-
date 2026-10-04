# Образ сервера: Next.js; база — PostgreSQL (DATABASE_URL), счётчики попыток — Redis (REDIS_URL).
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npx next build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    AUTH_TRUST_HOST=true \
    PORT=3000
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/prisma ./prisma
# prisma/seed.ts (запускается при старте) импортирует код из lib/
COPY --from=build /app/lib ./lib
COPY --from=build /app/assets ./assets
EXPOSE 3000
# При старте приводим схему базы к актуальной (новые таблицы/колонки), затем запускаем сервер.
CMD ["npm", "run", "start:prod"]
