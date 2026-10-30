# Imagen de producción de ROAST (Next.js en modo standalone).
#   docker build --target runner -t roast-menu .
# scripts/desplegar-servidor.sh la construye en este equipo y la sube al servidor ya lista.

FROM node:24.18.0-alpine AS base
WORKDIR /app
# openssl: Prisma lo necesita en Alpine.
RUN apk add --no-cache libc6-compat openssl
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
# prisma.config.ts pide DATABASE_URL incluso para `prisma generate` (postinstall): al
# construir basta un valor de relleno, la imagen no guarda ninguna conexión.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npm ci --no-audit --no-fund

FROM base AS build
ENV BUILD_STANDALONE=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build sh -c "npx prisma generate && npm run build"

FROM node:24.18.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/salud || exit 1
CMD ["node", "server.js"]
