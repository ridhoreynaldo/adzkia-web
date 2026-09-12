# Struktur Folder — ADZKIA SMART

Tanggal: **12 September 2026**

Dokumen ini menjelaskan **di mana sesuatu tinggal, dan mengapa di situ**. Kalau
sebuah berkas baru tidak jelas tempatnya, jawabannya ada di sini — bukan di
folder yang kebetulan paling dekat.

---

## 1. Akar proyek

```text
adzkia-smart-pg/
├── src/            kode aplikasi
├── tests/          pemeriksa (`npm run cek:*`)
├── scripts/        perkakas sekali-jalan: seed, impor, kodemod, rilis
├── db/             skema & migrasi SQL, dijalankan berurutan 01..05
├── infra/          berkas produksi: Nginx, PgBouncer, PostgreSQL, Redis, deploy
├── docs/           dokumen rancangan & audit
├── load-tests/     skenario k6
├── public/         berkas statis + unggahan pengguna saat berjalan
└── data/           basis data/berkas lokal saat pengembangan
```

**Yang TIDAK boleh ada di akar:** folder kerja perkakas. Sebelum 12 September
2026 ada **22 folder `.cek-*`** di sini — satu untuk tiap pemeriksa. Semuanya
kini di bawah `.tmp/cek/<nama>`.

`.tmp/` harus tetap **di dalam** proyek, bukan di folder sementara sistem
operasi: pemeriksa menyalin `src/lib` ke sana lalu mengimpornya, dan salinan di
luar proyek tidak bisa menemukan `node_modules`.

---

## 2. `src/` — tiga lapisan

```text
src/
├── app/        rute Next.js (App Router) — halaman, Server Action, route handler
├── components/ komponen React
├── server/     LAPISAN DATA BARU — Drizzle, repository, service, request
└── lib/        logika domain, dikelompokkan per DOMAIN
```

### `src/server/` — akses data & aturan

Lihat [`clean-architecture.md`](clean-architecture.md) untuk aturan lengkapnya.
Ringkasnya:

| Folder | Boleh | TIDAK boleh |
|---|---|---|
| `db/schema/` | potret tabel yang sudah ada | merancang tabel baru sendiri |
| `repositories/` | SQL & Drizzle | memutuskan wewenang, membuka transaksi |
| `services/` | aturan bisnis, transaksi, cache | menyusun SQL |
| `requests/` | memeriksa BENTUK masukan | menyentuh basis data |
| `http/` | galat aman-tampil | aturan bisnis |

### `src/lib/` — per domain, bukan per jenis

Sampai 12 September 2026 folder ini **datar: 57 berkas, 23.730 baris**. Tidak
ada cara melihat mana yang berubah bersama-sama, dan setiap berkas baru
menambah satu baris lagi ke daftar yang sudah terlalu panjang untuk dibaca.

Sekarang dikelompokkan menurut **apa yang berubah bersamaan** — bukan menurut
jenis berkasnya (`types/`, `utils/`, `helpers/`), yang justru memaksa satu
perubahan menyentuh tiga folder sekaligus:

| Domain | Isi | Berkas |
|---|---|---|
| `core/` | `db`, `cache`, `laju`, `tampilan` | 4 |
| `auth/` | identitas & sesi, termasuk "satu akun satu perangkat" | 5 |
| `tryout/` | mesin ujian UTBK-SNBT & SKD, penilaian IRT | 9 |
| `penjagaan/` | denyut nadi, pelanggaran, kunci peramban, foto peserta | 6 |
| `ielts/` | seluruh jalur IELTS + gerbang fitur `language` | 12 |
| `warung/` | Warung Soal | 3 |
| `admin/` | panel pengelola, portal, papan Live, impor peserta | 6 |
| `naskah/` | baca/tulis .docx & .pdf, gambar soal, impor bank soal | 6 |
| `laporan/` | rekap, unduhan, peringkat | 4 |
| `rujukan/` | data yang jarang berubah: kampus, prodi | 2 |

**Aturan `core/`:** hanya yang dipakai **hampir semua** domain lain. Kalau cuma
satu domain yang memakainya, tempatnya di domain itu. `core/` yang membengkak
adalah cara paling cepat membuat struktur ini kembali datar.

**Impornya memakai alias, bukan jalur relatif:**

```ts
// BENAR
import { all } from "@/lib/core/db";
import { SESI_SKD } from "@/lib/tryout/skd";

// SALAH — rantai ../../ berubah tiap berkas dipindah
import { all } from "../../core/db";
```

Itu disengaja. Sesudah berkasnya bersarang, bentuk relatif berbeda-beda
tergantung kedalaman pemanggilnya, dan itulah bentuk yang paling sering salah
saat berkas dipindah lagi kelak. Alias tidak bergantung pada posisi.

---

## 3. `tests/`

Dulu `src/lib/__checks__/`. Dipindah ke akar karena ia **bukan kode aplikasi**
dan tidak ikut dibundel.

**Empat yang benar-benar berjalan di PostgreSQL:**

```bash
npm run cek:panas    # 28 pemeriksaan jalur ujian, MENGHITUNG query sungguhan
npm run cek:db       # lapisan db.ts
npm run cek:cache    # Redis, termasuk saat Redis mati
npm run cek:dialek   # 78 pemanggilan lintas modul
```

Sisanya (±28 berkas) **warisan SQLite dan belum diport** — ia mengharapkan
basis data sekali-pakai lewat `ADZKIA_DB_PATH`. Penyalinnya sudah dibuat
menelusuri `src/lib` secara rekursif sehingga struktur domain bukan penghalang
tambahan, tetapi memportingnya tetap pekerjaan tersendiri.

---

## 4. `infra/`

```text
infra/
├── docker-compose.prod.yml   db → pgbouncer → app ×3 + cache
├── nginx/conf.d/             TLS, statis, penyebaran beban, pembatas laju
├── pgbouncer/                pooling, ukuran, batas waktu
├── postgres/                 memori, WAL, pencatatan
├── redis/                    cache murni, tanpa persistensi
└── deploy/                   pasang.sh, perbarui.sh, kirim-ke-server.ps1
```

`deploy/` dulu berdiri sendiri di akar. Isinya berkas produksi juga, jadi
tempatnya di sini — dua folder untuk satu urusan hanya membuat orang menebak.

Struktur folder DI SERVER dijelaskan di
[`production-architecture.md`](production-architecture.md) bagian 2, dan
dicerminkan di komputer sendiri dengan `npm run infra:lokal` (`.lokal/`).

---

## 5. Ke mana berkas baru?

| Berkas baru | Tempatnya |
|---|---|
| Query/tulis tabel jalur ujian | `src/server/repositories/` |
| Aturan "boleh/tidak" jalur ujian | `src/server/services/` |
| Logika domain lain | `src/lib/<domain>/` |
| Halaman atau Server Action | `src/app/` |
| Perkakas sekali-jalan | `scripts/` |
| Pemeriksa | `tests/` |
| Perubahan tabel | `db/0N-<nama>.sql` **baru**, jangan sunting yang lama |
| Setelan produksi | `infra/<layanan>/` |
