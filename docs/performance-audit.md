# Audit Performa — ADZKIA SMART (`adzkia-smart-pg`)

Tanggal: **11 September 2026** · Sasaran beban: **5.000–10.000 pengguna serentak**
Bukti di balik tiap temuan: [`architecture-audit.md`](architecture-audit.md)

> **Belum satu pun angka di dokumen ini berasal dari uji beban.** Semuanya
> aritmetika dari kode yang terbaca (jumlah query per permintaan x frekuensi
> panggilan). Kolom "terukur" akan diisi sesudah k6 dijalankan.

---

## Cara membaca peringkatnya

| Tingkat | Artinya |
|---|---|
| **CRITICAL** | Menjatuhkan ujian yang sedang berjalan, atau menghalangi 5.000 pengguna sama sekali |
| **HIGH** | Membuat sistem melambat tajam di bawah beban hari-H, atau salah data |
| **MEDIUM** | Pemborosan nyata, terasa saat beban tinggi, tidak menjatuhkan |
| **LOW** | Kebersihan kode / penghematan kecil |

---

## Aritmetika beban — dari mana angkanya

Satu peserta UTBK yang sedang ujian menghasilkan:

| Permintaan | Frekuensi | Query DB sekarang |
|---|---|---|
| `POST /api/exam/denyut` | tiap 5 dtk = 0,2/dtk | 5 |
| `GET /api/exam/state` | tiap ~15 dtk = 0,067/dtk | 5–7 |
| `POST /api/exam/answer` | ~1 tiap 30 dtk = 0,033/dtk | 6 |

**Per peserta: ~0,3 req/dtk dan ~1,6 query DB/dtk.**

| Peserta serentak | Permintaan/dtk | Query DB/dtk | UPDATE/dtk |
|---|---|---|---|
| 1.000 | 300 | ~1.600 | 200 |
| 3.000 | 900 | ~4.800 | 600 |
| 5.000 | 1.500 | **~8.000** | 1.000 |
| 10.000 | 3.000 | **~16.000** | 2.000 |

Sesudah perbaikan yang diusulkan di bawah (sesi di-cache, denyut 1 query,
autosave 3 query):

| Peserta serentak | Permintaan/dtk | Query DB/dtk | UPDATE/dtk |
|---|---|---|---|
| 5.000 | 1.500 | **~1.700** (−79%) | 1.000 |
| 10.000 | 3.000 | **~3.400** (−79%) | 2.000 |

Yang tersisa setelah itu **hampir seluruhnya UPDATE denyut** — dan itulah
sebabnya temuan CRITICAL-1 di bawah adalah yang pertama, bukan N+1 autosave.

---

## CRITICAL

### C-0 · DUA BUG YANG MEMBUAT `-pg` TIDAK BISA MENJALANKAN UJIAN SAMA SEKALI

Ditemukan saat mengaudit query, bukan saat membangun — dan itulah bagian yang
paling penting: **`npx tsc --noEmit` dan `npm run build` sama-sama lulus dengan
kedua bug ini di tempatnya.** Yang gagal adalah peserta yang menekan tombol
Mulai.

**(a) Penanda bernomor `?1` diterjemahkan menjadi `$11`.**

`src/lib/db.ts:keParamPg` menerjemahkan `?` menjadi `$1, $2, …` secara
berurutan, tetapi tidak mengenali bentuk bernomor `?1` milik SQLite — yang
dipakai untuk memakai satu parameter di beberapa tempat. Angka `1` di
belakangnya tertinggal, sehingga `?1` menjadi `$11`.

| Terkena | Berkas | Akibat |
|---|---|---|
| `paketDibatasi()` | `exam.ts:218` | galat 42P02 |
| `pesertaDiizinkan()` | `exam.ts:238` | **peserta tidak bisa membuka paket yang dibatasi** |
| `pesertaDiizinkanPaket()` | `admin.ts:682` | daftar peserta paket gagal dimuat |
| pengguguran subtes | `admin.ts:1093` | gagal |

**(b) `COLLATE NOCASE` tidak ada di PostgreSQL.**

Dipakai di tiga tempat, semuanya untuk mencocokkan nama kelas
(`TRIM(u.kelas) = TRIM(pk.kelas) COLLATE NOCASE`). PostgreSQL menolaknya:
`collation "nocase" for encoding "UTF8" does not exist`. Kolasi itu tidak
pernah dibuat di `db/*.sql`.

Keduanya berada di jalur yang sama: **gerbang "peserta ini boleh membuka paket
itu"**. Selama keduanya ada, tidak satu pun paket berpembatas kelas dapat
dikerjakan di versi PostgreSQL.

### C-1 · Denyut nadi: 5 query per peserta per 5 detik

`src/app/api/exam/denyut/route.ts` + `src/lib/pelanggaran.ts:catatDenyut`

Rincian 5 query: `getSession` (users + peserta_sesi) + `getAttempt` +
`jalurPaket` + `catatDenyut` (SELECT lalu UPDATE).

Pada 10.000 peserta ini sendirian menghasilkan **10.000 query/dtk**.

**Perbaikan:**
1. `catatDenyut` menjadi **satu** pernyataan:
   `UPDATE attempts SET denyut_at = now(), denyut_aktif = $1 WHERE id = $2 RETURNING (EXTRACT(EPOCH FROM (now() - denyut_at)))::int AS jeda` —
   menghapus query SELECT **dan** menutup balapan R-1 sekaligus.
2. `getSession` dan `jalurPaket` dilayani cache (lihat C-2, H-3).
3. Sasaran: **1 query per denyut.** 10.000 query/dtk → 2.000 query/dtk.

### C-2 · Dua query basis data untuk membuktikan sesi, di SETIAP permintaan

`src/lib/auth.ts:getSession` + `src/lib/sesi-perangkat.ts:sentuhSesi`

Pada 10.000 peserta: **6.000 query/dtk hanya untuk autentikasi.**

**Perbaikan:** cache Redis `sesi:{userId}` berisi `{nama, email, role, nisn,
kelas, sid}` dengan TTL 60 detik, dibuang saat logout / pelepasan paksa /
perubahan peran. Aturan "satu akun satu perangkat" **tidak boleh dilemahkan**:
perbandingan `sid` tetap dikerjakan, hanya sumber datanya yang di-cache, dan
jendela basinya dibatasi 60 detik — jauh di bawah `JEDA_MENGANGGUR_MENIT = 10`.

### C-3 · `pg.Pool max = 10` pada satu proses Next.js, tanpa PgBouncer

`src/lib/db.ts` + `docker-compose.yml` (`max_connections=100`)

Satu proses Node tidak akan melayani 1.500–3.000 req/dtk. Menambah `max` **bukan**
jawabannya: 10.000 pengguna x koneksi langsung akan meruntuhkan PostgreSQL.

**Perbaikan:** N proses aplikasi (cluster/PM2/replika Docker) → **PgBouncer
(transaction pooling)** → PostgreSQL. `pg.Pool` per proses tetap kecil.
Angka-angkanya dirancang di `production-architecture.md` (belum ditulis).
**Catatan wajib:** transaction pooling **melarang** prepared statement lintas
transaksi — `pg` memakai query sederhana secara bawaan, jadi ini aman, **tetapi
akan langsung rusak bila kelak dipasang Drizzle dengan prepared statement.**

### C-4 · Redis terpasang tetapi nol pemakaian

`src/lib/cache.ts` hanya diimpor `/api/sehat`.

Seluruh rencana "5.000–10.000 pengguna" bersandar pada cache yang belum pernah
menyentuh satu jalur baca pun.

### C-5 · Tidak ada pembatas laju di mana pun

Login tanpa pembatas = tebak sandi massal. Denyut tanpa pembatas = satu skrip
bisa membanjiri `attempts`.

**Perbaikan:** pembatas laju Redis, dengan **anggaran yang sengaja longgar**
untuk denyut dan autosave (lalu lintas ujian yang sah memang ribuan per detik)
dan **ketat** untuk login/daftar/reset.

---

## HIGH

### H-1 · N+1 autosave jawaban — 643 query untuk satu kiriman 160 butir

`src/app/api/exam/answer/route.ts:60-68`. Rinciannya di audit arsitektur §6.1.

**Perbaikan:** satu query validasi berbatch
(`SELECT id, subtes FROM questions WHERE package_id = $1 AND id = ANY($2)`),
satu query baris subtes, lalu **satu** `INSERT ... SELECT * FROM unnest(...)
ON CONFLICT DO UPDATE`. Sasaran: **3 query, berapa pun jumlah butirnya.**

### H-2 · `attempts(package_id)` tanpa indeks

Seq scan pada setiap pemuatan panel paket, papan Live, rekap, dan pada
`DELETE CASCADE` dari `packages`. Tabel ini tumbuh sebesar peserta x paket.

**Perbaikan:** `CREATE INDEX idx_att_paket ON attempts(package_id)` plus
indeks parsial `ON attempts(package_id) WHERE status = 'ongoing'` untuk papan
Live. Ikut: `answers(question_id)`, `ielts_pengerjaan(paket_id)`.

### H-3 · `jalurPaket()` / metadata paket dibaca ulang di jalur panas

Nilainya tetap sepanjang umur paket. Kandidat cache paling jelas
(`paket:{id}:jalur`, TTL 10 menit, dibuang saat paket disunting).

### H-4 · Papan Live tanpa batas dan tanpa cache

`src/lib/live.ts`. 1.000 peserta x 160 soal = ±160.000 baris per pemuatan,
dinilai di JavaScript.

**Perbaikan:** skor sementara dihitung di SQL (agregat), hasilnya di-cache 15
detik (`UMUR.papan` sudah disediakan untuk ini), dan barisnya dipaginasi.
Saat ujian berjalan, pengawas menyegarkan halaman ini terus-menerus — inilah
satu-satunya halaman admin yang bisa menjatuhkan hari-H.

### H-5 · Fungsi waktu tiruan SQLite di jalur panas

`julianday('now')`, `datetime('now','localtime')` di `catatDenyut`, `sisaDetik`,
`tutupSubtesKedaluwarsa`, `papanLive`. Fungsi PL/pgSQL — menghalangi pemakaian
indeks dan membayar overhead pemanggilan fungsi per baris.

**Perbaikan:** ganti bertahap dengan `now()`, `now() - interval '...'`, dan
`EXTRACT(EPOCH FROM ...)` **di jalur panas saja**. Jalur dingin boleh tetap
memakai tambalan.

### H-6 · Papan peringkat Warung rusak (galat 42803)

`src/lib/warung.ts:710,836,874,920`. Bukan soal performa — **fiturnya tidak
jalan sama sekali di PostgreSQL.** Harus ditulis ulang dengan `DISTINCT ON`.

### H-7 · Berkas uji `__checks__/*.mjs` belum diport

Tanpa ini tidak ada pembuktian otomatis bahwa perilaku lama terpelihara —
justru saat kita hendak menyentuh jalur ujian.

---

## MEDIUM

| Kode | Temuan | Tempat |
|---|---|---|
| M-1 | 62/62 halaman `force-dynamic`; halaman publik (`/`, `/utbk`, `/language`) layak statis/ISR | `src/app/**/page.tsx` |
| M-2 | 42 `SELECT *`, termasuk `getAttempt()` di jalur terpanas | seluruh `src/lib` |
| M-3 | `mulaiAttempt` belum `ON CONFLICT`; tab kedua menerima galat 23505 mentah | `src/lib/exam.ts:363` |
| M-4 | `gugurkanUjian` menulis tanpa syarat status — dua jalur bisa menimpa alasan | `src/lib/exam.ts:319` |
| M-5 | Data rujukan prodi/kampus (5.173 baris) dibaca dari DB tiap pencarian | `src/lib/prodi.ts`, `/api/prodi/cari` |
| M-6 | Tidak ada paginasi keyset; daftar peserta/hasil memakai OFFSET atau tanpa batas | `src/lib/admin.ts` |
| M-7 | Logika penjagaan IELTS terduplikasi di `RuangUjian.tsx` | `src/components/exam/` |
| M-8 | Tidak ada log terstruktur / metrik; satu-satunya jendela ke sistem adalah `/api/sehat` | — |
| M-9 | Ekspor .xlsx/PDF dikerjakan di dalam permintaan HTTP, memegang proses Node | `/api/admin/export`, `/api/rankup/unduh` |

---

## LOW

| Kode | Temuan |
|---|---|
| L-1 | `ADZKIA_SECRET` punya nilai bawaan di dalam kode — seharusnya gagal nyala bila kosong di produksi |
| L-2 | `console.error` sebagai satu-satunya jalur log |
| L-3 | `tsconfig.tsbuildinfo` (170 KB) ikut di folder kerja |
| L-4 | `load-test/` berada di luar folder aplikasi, hanya berisi satu skenario login |
| L-5 | Nomor versi cache `adzkia:v1` belum punya aturan tertulis kapan dinaikkan |

---

## Urutan pengerjaan yang diusulkan

Berurutan menaik dari "paling banyak menghapus pekerjaan per permintaan":

1. **C-1** denyut satu query (sekaligus menutup balapan)
2. **C-2** cache sesi Redis + **C-4** (keduanya satu pekerjaan)
3. **H-1** autosave berbatch
4. **H-2** indeks + `EXPLAIN ANALYZE` sebelum/sesudah
5. **H-3** cache metadata paket
6. **H-4** papan Live: agregat di SQL + cache + paginasi
7. **C-5** pembatas laju
8. **H-5** fungsi waktu asli PostgreSQL di jalur panas
9. **H-6, H-7** Warung + berkas uji (pembuktian)
10. **C-3** PgBouncer + banyak proses — **terakhir, karena ini menyembunyikan
    kesalahan nomor 1–8 alih-alih memperbaikinya**
11. Uji beban k6 bertingkat: 100 → 500 → 1.000 → 3.000 → 5.000 → 10.000
12. Ukur ulang, perbaiki lagi

**Alasan PgBouncer ditaruh terakhir:** menambah kapasitas koneksi sebelum
mengurangi kerja per permintaan hanya memindahkan tembok, dan membuat hasil
ukurnya tidak bisa dibaca.

---

## Catatan pengerjaan — 11 September 2026

### Sudah dikerjakan DAN dibuktikan pada PostgreSQL sungguhan

Pembuktiannya: `npm run cek:panas` (berkas baru
`src/lib/__checks__/ujian-panas-check.mjs`, 28 pemeriksaan, seluruh tulisannya
dibatalkan sendiri sehingga aman dijalankan kapan saja). Ditambah `npm run
cek:db`, `npm run cek:cache`, `npx tsc --noEmit`, dan `npm run build` — semuanya
lulus.

| Kode | Perubahan | Bukti |
|---|---|---|
| **C-0a** | `keParamPg()` mengenali `?1`/`?2` | `?1 … ?1` → `$1 … $1`; `SELECT ?1::int + ?1::int` dijalankan sungguhan |
| **C-0b** | `COLLATE NOCASE` → `lower(TRIM(...))` di 3 tempat | "XII Harvard" cocok dengan "  XII HARVARD "; kelas lain tetap ditolak |
| **C-1** | `catatDenyut()` & `catatDenyutIelts()` menjadi **satu** `UPDATE … FROM (… FOR UPDATE) … RETURNING` | 2 query → **1**; jeda 45 detik tetap terbaca 45; denyut susulan tidak mengulang jeda yang sama (balapan R-1 tertutup) |
| **C-2** | Cache sesi Redis 60 detik di `getSession()`, dengan pembuangan seketika saat Keluar / "Lepaskan" / login pindah perangkat / hapus akun / ganti peran | 2 query → **0** saat cache panas |
| **C-4** | Redis akhirnya benar-benar dipakai (sebelumnya hanya `/api/sehat`) | — |
| **H-1** | `simpanJawabanBanyak()`: autosave berbatch | 3 butir = **3 query**; 9 butir = **3 query** (sebelumnya 39); idempoten; butir paket lain ditolak; subtes tertutup & waktu habis tetap menolak |
| **H-2** | `db/04-indeks-konkurensi.sql` — 9 indeks, `CONCURRENTLY` sehingga aman dijalankan saat ujian berlangsung | diterapkan ke basis data lokal, 9 `CREATE INDEX` |
| — | `pg.Pool` mengirim zona sebagai parameter pembuka sambungan, bukan `SET TIME ZONE` yang berlomba dengan query pertama | peringatan `client is already executing a query` hilang |

**Satu cacat yang ditemukan oleh pemeriksa itu sendiri, bukan oleh tinjauan
kode:** `ON CONFLICT DO UPDATE` menolak menyentuh baris yang sama dua kali
dalam satu pernyataan (galat 21000). Kiriman yang memuat butir kembar — hal
yang lumrah saat peserta mengubah jawaban sementara antrean tertunda ikut
terkirim — akan membuang SELURUH kiriman. Perulangan yang lama memaafkannya
diam-diam. `simpanJawabanBanyak()` kini menyaring kembar lebih dulu, yang
terakhir menang, persis seperti perilaku lama.

### Perkiraan dampaknya pada beban (belum diukur k6)

Query basis data per detik untuk 10.000 peserta serentak:

| Jalur | Sebelum | Sesudah |
|---|---|---|
| Denyut (2.000 req/dtk) | 10.000 | **2.000** |
| Sinkron timer (670 req/dtk) | ~4.000 | ~2.000 |
| Autosave (330 req/dtk) | ~2.000 | **~1.000** |
| **Total** | **~16.000** | **~5.000 (−69%)** |

Angka-angka itu aritmetika dari hitungan query yang kini **terukur** oleh
`cek:panas`, bukan tebakan — tetapi throughput sesungguhnya tetap harus
dibuktikan dengan uji beban.

### Belum dikerjakan

C-3 (PgBouncer + banyak proses), C-5 (pembatas laju), H-3 (cache metadata
paket), H-4 (papan Live), H-5 (fungsi waktu di jalur lain), H-6 (papan Warung),
H-7 (berkas `cek:*` lama), seluruh MEDIUM dan LOW, serta uji beban k6.

---

## Status kejujuran

| | |
|---|---|
| **Terimplementasi** | Migrasi PostgreSQL, transaksi, Docker, cache Redis (kini terpakai), C-0, C-1, C-2, H-1, H-2 |
| **Terverifikasi** | `cek:panas` (28 pemeriksaan), `cek:db`, `cek:cache`, `tsc --noEmit`, `next build` — semuanya lulus pada PostgreSQL 16 lokal, 11 Sept 2026. Papan Warung (H-6) dan `cek:*` lama (H-7) **masih** tidak lulus |
| **Perlu validasi infrastruktur** | Seluruh angka beban. **Belum ada uji beban.** Basis data lokal nyaris kosong (0 attempts, 0 answers), jadi manfaat indeks H-2 **belum terukur** — `EXPLAIN ANALYZE` baru berarti pada data sebesar produksi. Klaim "mendukung 10.000 pengguna" belum boleh diucapkan |

---

## Catatan pengerjaan — 12 September 2026

### Lapisan baru: Drizzle + repository / service / request

Jalur ujian dipindahkan ke `src/server/` (lihat
[`clean-architecture.md`](clean-architecture.md)). `src/lib/exam.ts` dan
`src/lib/pelanggaran.ts` tetap menjadi pintu masuk dan kini meneruskan ke
lapisan itu — **nol pemanggil yang perlu disentuh**.

Query yang HILANG, diukur `npm run cek:panas`:

| Jalur | Sebelum | Sesudah |
|---|---|---|
| Gerbang peserta | 2 | **1** |
| Membuka sesi (baru) | 3 | **1** |
| Membuka timer subtes | 2 | **1** |
| Catat jeda denyut | 3 | **1** |

Dua di antaranya sekaligus MENUTUP BALAPAN: `mulaiAttempt` (SELECT-lalu-INSERT
menyisakan celah — permintaan kedua dulu gagal dengan galat basis data, bukan
dilayani) dan `catatDenyutHilang` (nomor `urutan` bisa kembar, sehingga laporan
pengawas memuat dua "kepergian ke-3").

### C-3 · PgBouncer — berkasnya ada, BELUM pernah dijalankan

`infra/` lengkap: PgBouncer, Nginx, penyetelan PostgreSQL, Redis, compose
produksi, dan struktur folder `/srv/adzkia` beserta cermin lokalnya
(`npm run infra:lokal`). Seluruh angka pooling beserta ALASANNYA ada di
[`production-architecture.md`](production-architecture.md) bagian 3.

Satu perubahan kode yang WAJIB menyertainya sudah terpasang: `LEWAT_PGBOUNCER`
di `src/lib/db.ts`. Tanpa itu, zona waktu dikirim sebagai parameter pembuka
`options=-c timezone=…` yang **ditolak PgBouncer** — koneksinya gagal sama
sekali, bukan zonanya yang salah.

**Docker tidak terpasang di mesin ini**, jadi tidak satu pun berkas `infra/`
pernah benar-benar dimuat. Yang terbukti hanya bahwa YAML-nya terurai benar.

### C-5 · Pembatas laju — TERNYATA SUDAH ADA

Audit di atas menyebutnya belum ada. Itu **tidak lagi benar**:
`src/lib/laju.ts` (157 baris) sudah bersandar pada Redis, sudah dipakai rute
`answer`/`denyut`/`state`/`violation`, dan sudah memisahkan anggaran gerbang
masuk dari anggaran lalu lintas ujian. Baris C-5 di daftar CRITICAL sudah usang.

### H-6 · Papan peringkat Warung — TERNYATA SUDAH DIPERBAIKI

Sudah ditulis ulang dengan `DISTINCT ON` di ketiga tempatnya
(`src/lib/warung.ts` baris 721, 856, 900). `MAX()` yang tersisa di baris 956
sah — ia hanya berpasangan dengan kolom yang memang ada di `GROUP BY`.

### Satu bug BARU yang ditemukan pemeriksa, bukan tinjauan kode

`sql.param()` wajib untuk parameter bertipe larik di Drizzle. Tanpa itu,
`unnest(${idSoal}::int[])` menjadi `unnest(($2,$3,$4)::int[])` dan PostgreSQL
menolaknya — "cannot cast type record to integer[]" (42846). **Lolos
`tsc --noEmit` DAN `next build`**; yang menangkapnya `npm run cek:panas`.

Ini pola ketiga yang sama di proyek ini, sesudah `?1` → `$11` dan
`COLLATE NOCASE`. Kesimpulannya tidak berubah: **sisa dialek dan salah-bind
hanya tertangkap oleh query yang DIJALANKAN.**

### Yang MASIH belum dikerjakan

| Kode | Hal |
|---|---|
| **H-7** | 18 berkas `__checks__/*.mjs` warisan SQLite masih belum diport. Semuanya menyalin `src/lib/*.ts` ke folder sementara dan mengharapkan basis data SQLite sekali-pakai lewat `ADZKIA_DB_PATH`; di PostgreSQL mereka berhenti di `DATABASE_URL belum diisi`. **Ini pekerjaan tersendiri, bukan sisa pekerjaan ini.** Pemeriksa yang benar-benar jalan: `cek:panas`, `cek:db`, `cek:cache`, `cek:dialek` |
| H-3, H-4, H-5 | cache metadata paket (sebagian sudah lewat `jalurPaket`), papan Live, sisa fungsi waktu SQLite di luar jalur ujian |
| — | **Uji beban k6 belum dijalankan sama sekali.** 5 berkas di `load-tests/` sudah ditulis; server gagal menyala pada percobaan 11 Sept (`output: standalone` menuntut `node .next/standalone/server.js`, bukan `next start`) |

### Status kejujuran — 12 September 2026

| | |
|---|---|
| **Terimplementasi** | Drizzle + lapisan repository/service/request untuk jalur ujian; 4 jalur querynya dipangkas; 2 balapan ditutup; berkas `infra/` lengkap; struktur folder produksi + cermin lokal |
| **Terverifikasi pada PostgreSQL 16 sungguhan** | `cek:panas` 28 pemeriksaan, `cek:db`, `cek:cache`, `cek:dialek` (78 pemanggilan), `npx tsc --noEmit`, `npm run build` — semuanya lulus, 12 Sept 2026 |
| **Perlu validasi infrastruktur** | SELURUH angka pooling PgBouncer. Nginx, PgBouncer, dan tiga proses aplikasi belum pernah hidup. Basis data lokal nyaris kosong, jadi `EXPLAIN ANALYZE` di sana tidak membuktikan apa pun tentang indeks. **Belum ada uji beban. Klaim "mendukung 10.000 pengguna" belum boleh diucapkan** |
