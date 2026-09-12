# ============================================================
# ADZKIA SMART — citra produksi Next.js
# ============================================================

ARG NODE_VERSI=22.11-alpine

# ------------------------------------------------------------
# 1. Ketergantungan
# ------------------------------------------------------------
FROM node:${NODE_VERSI} AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ------------------------------------------------------------
# 2. Membangun
# ------------------------------------------------------------
FROM node:${NODE_VERSI} AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Mem-bypass pengecekan db.ts saat build
ENV DATABASE_URL="postgres://dummy:dummy@localhost:5432/dummy"

RUN npm run build

# ------------------------------------------------------------
# 3. Menjalankan
# ------------------------------------------------------------
FROM node:${NODE_VERSI} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

RUN mkdir -p data/ielts-audio public/soal public/peserta public/warung \
    && chown -R nextjs:nodejs data public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]