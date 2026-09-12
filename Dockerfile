# ============================================================
# ADZKIA SMART — citra produksi Next.js
#
# Tiga tahap, dan pemisahannya bukan gaya-gayaan: hanya tahap terakhir yang
# ikut ke citra jadi, sehingga node_modules pembangun (ratusan megabita, berisi
# TypeScript, ESLint, dan seluruh kakas build) tidak pernah sampai ke server.
#
# Membangun:  docker compose build app
# ============================================================

# Node 22 LTS. Versinya dikunci sampai angka minor — "22" saja berarti citra
# bisa berganti diam-diam di antara dua kali build, dan build yang tidak bisa
# diulang persis adalah build yang tidak bisa dipercaya.
ARG NODE_VERSI=22.11-alpine

# ------------------------------------------------------------
# 1. Ketergantungan
# ------------------------------------------------------------
FROM node:${NODE_VERSI} AS deps
WORKDIR /app

# Hanya berkas kunci yang disalin, supaya lapisan ini dipakai ulang selama
# daftar pustakanya tidak berubah — bagian paling lambat dari seluruh build.
COPY package.json package-lock.json ./

# `npm ci` menghormati package-lock apa adanya; `npm install` boleh
# memperbaruinya sendiri, dan itu tidak boleh terjadi saat membangun citra.
RUN npm ci

# ------------------------------------------------------------
# 2. Membangun
# ------------------------------------------------------------
FROM node:${NODE_VERSI} AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Basis data TIDAK dihubungi saat membangun. Halaman ADZKIA SMART seluruhnya
# `force-dynamic`, dan sambungan PostgreSQL dibuka saat permintaan pertama
# datang — bukan saat modulnya dimuat. Kalau suatu saat build gagal menuntut
# DATABASE_URL, itu tanda ada modul yang menyambung terlalu awal; perbaiki di
# sana, jangan menyalakan basis data saat build.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

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

# Berjalan sebagai pengguna biasa, bukan root. Kalau suatu hari ada celah pada
# aplikasinya, yang didapat penyerang adalah akun tanpa hak apa pun.
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

# `output: "standalone"` di next.config.ts membuat Next menyalin sendiri
# node_modules yang BENAR-BENAR dipakai saat jalan — biasanya sepersepuluh
# dari node_modules utuh.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Folder tempat berkas unggahan mendarat. Dibuat lebih dulu berikut pemiliknya,
# karena volume Docker mewarisi kepemilikan folder yang ditimpanya — kalau
# folder ini belum ada, volume-nya jadi milik root dan aplikasi tidak bisa
# menulis rekaman Listening ke sana.
RUN mkdir -p data/ielts-audio public/soal public/peserta public/warung \
    && chown -R nextjs:nodejs data public

USER nextjs
EXPOSE 3000

# server.js adalah pelayan mandiri yang ditulis Next sendiri pada mode
# standalone. Tidak ada `npm start`, jadi tidak ada proses npm yang menganggur
# sebagai induk dan menelan sinyal berhenti dari Docker.
CMD ["node", "server.js"]
