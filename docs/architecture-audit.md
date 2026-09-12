# Audit Arsitektur — ADZKIA SMART (`adzkia-smart-pg`)

Tanggal audit: **11 September 2026**
Folder yang diaudit: `adzkia-smart-pg` (cabang PostgreSQL + Redis, **belum pernah terbit**)
Pembanding: `adzkia-smart` (SQLite, **yang berjalan di pintarbersamaadzkia.com**)

> Dokumen ini menggambarkan sistem SEBAGAIMANA ADANYA, bukan sebagaimana
> seharusnya. Penilaian dan urutan perbaikannya ada di
> [`performance-audit.md`](performance-audit.md).

---

## 0. Ringkasan satu halaman

| Hal | Keadaan |
|---|---|
| Framework | Next.js 16.3.3 (App Router), React 19.2.8 |
| Basis data | PostgreSQL 16 — sudah dipindahkan dari `node:sqlite` |
| Lapisan akses data | **`pg` (node-postgres) mentah**, dibungkus `src/lib/db.ts`. **Bukan** ORM, **bukan** Drizzle |
| Cache | Redis 7 (`ioredis`) — **terpasang tetapi belum dipakai satu pun halaman** |
| Pooling | `pg.Pool`, `max = 10`. **Tidak ada PgBouncer** |
| Halaman | 62 `page.tsx` |
| Rute API | 16 `route.ts` |
| Server Action | 7 berkas `"use server"` |
| Komponen klien | 36 berkas `"use client"` |
| Titik panggil basis data | 144 pemanggilan `all/one/run/sisip` |
| Tabel | 30 |
| Indeks | 27 (4 di antaranya UNIQUE parsial) |
| Strategi render | **62 dari 62 halaman `force-dynamic`** — tidak ada satu pun halaman statis/ISR |
| Docker | `Dockerfile` multi-tahap + `docker-compose.yml` (db, cache, app) sudah ada |
| Uji beban | 1 berkas k6 (`load-test/login-700.js`) di luar folder aplikasi |

**Tiga kalimat yang paling menentukan:**

1. Migrasi SQLite → PostgreSQL **sudah selesai secara mekanis** (tipe, transaksi,
   `?` → `$n`, `lastInsertRowid` → `RETURNING`), tetapi **belum dioptimalkan untuk
   konkurensi** — tidak ada satu pun query yang ditulis ulang dengan
   mempertimbangkan 5.000–10.000 pengguna.
2. **Redis ada, tetapi mati secara fungsional.** `src/lib/cache.ts` (226 baris,
   lengkap dengan TTL, SCAN, dan degradasi anggun) hanya diimpor oleh
   `/api/sehat`. Nol jalur baca yang benar-benar di-cache.
3. **Jalur terpanas aplikasi ini bukan menjawab soal, melainkan denyut nadi**
   (`POST /api/exam/denyut`, tiap **5 detik per peserta**). Itulah yang
   menentukan apakah 10.000 pengguna mungkin atau tidak.

---

## 1. Arsitektur saat ini

```text
Peramban peserta (iPad/Android/laptop)
   |  - denyut tiap 5 detik   (POST /api/exam/denyut)
   |  - autosave jawaban      (POST /api/exam/answer)
   |  - sinkron timer         (GET  /api/exam/state)
   |  - laporan pelanggaran   (POST /api/exam/violation)
   v
Nginx 1.24 (VPS 103.186.208.117)          <- hanya di produksi SQLite
   v
Next.js (systemd `adzkia`, port 3000, SATU proses)
   +-- Server Components  -> src/lib/*.ts -> pg.Pool(max=10) -> PostgreSQL 16
   +-- Server Actions     -> idem
   +-- Route Handlers     -> idem
   v
PostgreSQL 16 (docker, 127.0.0.1:5432, max_connections=100)

Redis 7 (docker, 127.0.0.1:6379) -- hanya tersambung ke /api/sehat
```

**Yang belum ada dibanding sasaran:** PgBouncer, Drizzle, CDN, observabilitas
terstruktur, banyak proses Next.js (`cluster`/PM2), dan pemakaian Redis yang
sebenarnya.

---

## 2. Alur permintaan

### 2.1 Halaman terlindungi (mayoritas)

```text
request -> middleware? (TIDAK ADA)
        -> page.tsx (Server Component, force-dynamic)
        -> requireUser()/getSession()
             |- jwtVerify(cookie)                       (CPU, tanpa DB)
             |- SELECT ... FROM users WHERE id = ?      <- 1 query DB
             +- sentuhSesi(peserta_sesi|admin_sesi)     <- 1 query DB (+1 UPDATE bila basi)
        -> fungsi domain di src/lib/*                   <- 1..N query DB
        -> render HTML -> klien
```

**Setiap permintaan terautentikasi membayar 2 query DB sebelum mengerjakan apa
pun.** Tidak ada cache sesi. Ini berlaku sama untuk halaman DAN rute API,
termasuk denyut 5 detik.

### 2.2 Jalur ujian UTBK (paling panas)

| Aksi | Rute | Query DB (hitungan saat ini) |
|---|---|---|
| Membuka ruang ujian | `/tryout/[id]/kerjakan` | ~8–12 (sesi 2, attempt, paket, urutan subtes, baris subtes, soal, jawaban, pelanggaran) |
| **Denyut (tiap 5 dtk)** | `POST /api/exam/denyut` | **5** — sesi 2 + `getAttempt` 1 + `jalurPaket` 1 + `catatDenyut` 2 (SELECT+UPDATE) |
| Autosave 1 butir | `POST /api/exam/answer` | **6** — sesi 2 + `getAttempt` 1 + `bolehMenjawab` 3 + upsert 1 |
| Autosave N butir | idem | **3 + 4N** (lihat §6.1) |
| Sinkron timer | `GET /api/exam/state` | ~5–7 |

### 2.3 Autentikasi

- Cookie `adzkia_session`, JWT HS256 (`jose`), umur 30 hari, `httpOnly`,
  `sameSite=lax`, `secure` mengikuti `x-forwarded-proto`.
- Muatan JWT: `{id, nama, email, role, nisn, kelas, sid}`.
- `sid` = penanda "satu akun satu perangkat". Diperiksa **di setiap
  permintaan** lewat tabel `peserta_sesi` / `admin_sesi`.
- Kata sandi: bcrypt cost 10.
- **Tidak ada middleware Next.js.** Otorisasi dikerjakan tiap halaman/rute
  sendiri lewat `requireUser()` / `requireAdmin()`.

### 2.4 Otorisasi

| Peran | Gerbang |
|---|---|
| `siswa` | `requireUser()` + `pesertaDiizinkan(userId, packageId)` (tabel `paket_peserta`/`paket_kelas`) |
| `admin` | `requireAdmin()` + `admin_sesi`; pintu masuk tersembunyi `/ADZ-ADM4S` dan `/IELTS-Globe-Adzkia` |
| lingkup `ielts` | akun berlingkup khusus, ditolak panel lain |

Semua diperiksa **di server**. Tidak ditemukan otorisasi yang hanya bersandar
pada tampilan klien.

---

## 3. Entitas utama & relasi

```text
users --+-< attempts --+-< answers        (UNIQUE attempt_id, question_id)
        |              |-< attempt_subtes (UNIQUE attempt_id, subtes)
        |              |-< results
        |              +-< violations     (UNIQUE parsial attempt_id, kejadian)
        |-< ielts_pengerjaan --+-< ielts_jawaban
        |                      |-< ielts_nilai_guru
        |                      +-< ielts_pelanggaran
        |-< warung_sesi -< warung_jawaban
        |-< peserta_sesi  (1:1, kunci perangkat)
        |-< pilihan_prodi
        +-< paket_peserta >- packages

packages --+-< questions -< item_params
           |-< attempts
           |-< paket_peserta / paket_kelas   (kosong = terbuka untuk semua)
           +-< susulan

ielts_paket --+-< ielts_soal
              |-< ielts_seksi
              +-< ielts_pengerjaan

warung_paket -< warung_soal -< warung_jawaban
prodi, campuses, pengaturan  (data rujukan, nyaris statis)
```

**Kunci unik yang menjaga konkurensi (sudah benar):**

| Tabel | Kendala | Yang dijaganya |
|---|---|---|
| `attempts` | `UNIQUE (user_id, package_id)` | dua tab tidak bisa membuat dua attempt |
| `answers` | `UNIQUE (attempt_id, question_id)` | autosave idempoten lewat `ON CONFLICT` |
| `attempt_subtes` | `UNIQUE (attempt_id, subtes)` | timer subtes tidak berganda |
| `violations` | `UNIQUE (attempt_id, kejadian) WHERE kejadian IS NOT NULL` | laporan pelanggaran yang diulang klien tidak berganda |
| `ielts_pengerjaan` | `UNIQUE (user_id, paket_id)` | idem untuk jalur IELTS |
| `users` | `UNIQUE (nisn) WHERE ...`, `UNIQUE (nama_login) WHERE ...` | akun ganda |

---

## 4. Rute API (16)

| Rute | Metode | Peran | Sifat |
|---|---|---|---|
| `/api/exam/denyut` | POST | siswa | **panas — 0,2 req/dtk/peserta** |
| `/api/exam/answer` | POST | siswa | panas, menulis |
| `/api/exam/state` | GET | siswa | panas, membaca |
| `/api/exam/violation` | POST | siswa | sedang |
| `/api/language/ielts/denyut` | POST | siswa | panas (jalur IELTS) |
| `/api/language/ielts/violation` | POST | siswa | sedang |
| `/api/peserta/foto` | POST | siswa | unggah berkas |
| `/api/prodi/cari` | GET | siswa | pencarian 5.173 baris rujukan |
| `/api/sehat` | GET | publik | kesehatan DB + Redis |
| `/api/admin/export/[id]` | GET | admin | berat (.xlsx) |
| `/api/admin/hasil/[id]` | GET | admin | berat |
| `/api/admin/pelanggaran/[id]` | GET | admin | berat |
| `/api/admin/template` | GET | admin | ringan |
| `/api/admin/warung-template` | GET | admin | ringan |
| `/api/admin/gambar-soal` | POST | admin | unggah berkas |
| `/api/rankup/unduh` | GET | siswa | berat (PDF/xlsx) |

Selebihnya memakai **Server Actions** (7 berkas), bukan rute API.

---

## 5. Strategi render & batas klien/server

- **62 dari 62 halaman memakai `export const dynamic = "force-dynamic"`.**
  Tidak ada ISR, tidak ada halaman statis — termasuk halaman depan publik
  `/`, `/utbk`, `/language`, dan `/terkunci` yang isinya tidak bergantung
  pengguna.
- 36 berkas `"use client"`. Komponen klien terbesar:
  `src/components/exam/RuangUjian.tsx` (ruang ujian UTBK) dan padanan IELTS-nya
  — keduanya memang WAJIB CSR (timer, penjagaan, autosave).
- Ruang ujian **sudah** menerima seluruh soal satu subtes dalam satu muatan
  awal, bukan satu per satu per soal. Ini keputusan yang benar dan harus
  dipertahankan.
- **Duplikasi yang tercatat:** logika penjagaan IELTS disalin di
  `RuangUjian.tsx` dan belum disatukan dengan `ielts-penjagaan.ts`.

---

## 6. Temuan kode

### 6.1 N+1 dalam autosave jawaban — satu-satunya N+1 di jalur panas

`src/app/api/exam/answer/route.ts:60-68`

```ts
for (const it of items) {
  if (!await bolehMenjawab(att, it.questionId)) { ... }   // 4 query
  await simpanJawaban(att.id, it.questionId, ...);        // 1 query
}
```

`bolehMenjawab()` (`src/lib/exam.ts:852`) sendiri menjalankan 3–4 query:
`SELECT subtes FROM questions`, `jalurPaket()`, `barisSubtes()`, `sisaDetik()`.

| | Sekarang | Sasaran |
|---|---|---|
| 1 butir | 6 query | 3 |
| 20 butir (simpan saat pindah subtes) | **83 query** | 3 |
| 160 butir (kiriman akhir) | **643 query** | 3 |

Seluruhnya **berurutan** (`await` di dalam `for`), jadi latensinya berlipat
penuh, bukan hanya bebannya.

### 6.2 Papan Live memuat seluruh jawaban satu paket ke memori

`src/lib/live.ts:100-180`. Query-nya **sudah batch** (tidak N+1), tetapi
untuk paket 1.000 peserta x 160 soal ia menarik **±160.000 baris** jawaban
lalu menilainya di JavaScript — pada setiap pemuatan halaman `/admin/live`,
tanpa cache, tanpa paginasi.

### 6.3 Query per permintaan yang tidak perlu

| Tempat | Masalah |
|---|---|
| `getSession()` | `SELECT ... FROM users` di **setiap** permintaan, termasuk denyut 5 detik |
| `sentuhSesi()` | `SELECT` di setiap permintaan (UPDATE-nya sudah dicekik `JEDA_SENTUH_DETIK` — itu benar) |
| `jalurPaket(packageId)` | dipanggil ulang di denyut & autosave; nilainya **tidak pernah berubah** untuk satu paket |
| `getAttempt()` | `SELECT *` padahal pemanggilnya butuh 6–8 kolom |

### 6.4 `SELECT *` — 42 titik

Termasuk `getAttempt()` yang berada di jalur terpanas.

### 6.5 Indeks yang hilang (FK tanpa indeks)

PostgreSQL **tidak** membuat indeks otomatis untuk foreign key. Yang hilang dan
benar-benar dipakai:

| Kolom | Dipakai oleh | Akibat sekarang |
|---|---|---|
| `attempts(package_id)` | `papanLive`, `rekap`, seluruh panel paket, `ON DELETE CASCADE` | **seq scan seluruh tabel attempts** |
| `answers(question_id)` | hapus/ubah soal | seq scan `answers` |
| `ielts_pengerjaan(paket_id)` | seluruh panel IELTS | seq scan |
| `attempts(status)` parsial `'ongoing'` | papan Live, pemeriksaan pra-terbit | seq scan |
| `results(attempt_id, subtes)` | laporan & IRT | sebagian tertutup `idx_res_att` |

### 6.6 Sisa dialek SQLite di dalam SQL

Ditambal `db/03-fungsi-sqlite.sql` (fungsi `datetime()`, `julianday()`,
`strftime()` buatan sendiri) — **berjalan, tetapi mahal**: `julianday('now')`
adalah fungsi PL/pgSQL yang tidak bisa dipakai indeks. Muncul di jalur panas:
`catatDenyut`, `sisaDetik`, `tutupSubtesKedaluwarsa`, `papanLive`.

### 6.7 Papan peringkat Warung masih rusak di PostgreSQL

`src/lib/warung.ts` baris 710, 836, 874, 920 — kolom polos di samping `MAX()`,
ditolak PostgreSQL (42803). Perlu `DISTINCT ON` / `ROW_NUMBER()`.

### 6.8 Seluruh berkas uji `src/lib/__checks__/*.mjs` belum diport

Masih sinkron; `npm run cek:*` yang menyentuh basis data gagal. Artinya
**pemeriksa bawaan proyek belum bisa dipakai membuktikan migrasi ini.**

---

## 7. Kondisi balapan (race condition)

| Operasi | Perlindungan sekarang | Penilaian |
|---|---|---|
| Membuat attempt dari 2 tab | `UNIQUE (user_id, package_id)` | **aman di basis data**, tetapi `mulaiAttempt` belum `ON CONFLICT DO NOTHING ... RETURNING` sehingga tab kedua menerima galat mentah 23505 |
| Autosave ganda (klien mengulang) | `ON CONFLICT DO UPDATE` | **aman & idempoten** |
| Laporan pelanggaran ganda | `UNIQUE (attempt_id, kejadian)` | **aman** |
| Mulai subtes dari 2 tab | `UNIQUE (attempt_id, subtes)` | aman |
| `catatDenyut` SELECT-lalu-UPDATE | tidak ada kunci | **balapan nyata**: dua denyut yang tiba berbarengan sama-sama membaca `denyut_at` lama; keduanya bisa dinilai "jeda panjang". Harus jadi satu `UPDATE ... RETURNING` |
| Menyelesaikan ujian + menghitung skor | `tx()` | perlu diperiksa cakupannya per fungsi |
| Menggugurkan ujian | `gugurkanUjian` menulis tanpa syarat status | dua jalur (denyut + violation) bisa menggugurkan berbarengan dengan dua alasan berbeda |

---

## 8. Risiko keamanan (ringkas — rinciannya di fase keamanan)

| Hal | Keadaan |
|---|---|
| SQL injection | **rendah** — seluruh query berparameter lewat `keParamPg()`; tidak ditemukan perangkaian string dari masukan pengguna |
| Kunci jawaban bocor | `soalSubtes()` perlu diverifikasi **tidak** memulangkan kolom `kunci` ke klien |
| IDOR | tiap rute memeriksa `att.user_id !== user.id` — pola ini konsisten di 4 rute ujian |
| Rahasia | `ADZKIA_SECRET` punya **nilai bawaan di dalam kode** (`auth.ts:15`) — produksi yang lupa mengisinya memakai kunci yang tertulis di repositori |
| Pembatas laju | **tidak ada sama sekali** — login, denyut, autosave, semuanya tanpa pembatas |
| Cookie | `httpOnly`, `sameSite=lax`, `secure` adaptif — benar |
| Log | tidak ditemukan pencatatan kata sandi/token |

---

## 9. Hambatan skala — urutan mengikat

1. **Denyut 5 detik x 5 query.** 10.000 peserta = **2.000 req/dtk** -> **10.000
   query/dtk**, di antaranya 2.000 UPDATE `attempts`. Inilah langit-langit
   sistem ini, bukan autosave.
2. **`pg.Pool max=10` pada satu proses Next.js.** Satu proses Node tidak akan
   melayani 2.000 req/dtk; tanpa banyak proses + PgBouncer, antrean pool
   menjadi tembok sebelum PostgreSQL sempat menjadi tembok.
3. **Dua query sesi per permintaan** — 4.000 query/dtk hanya untuk membuktikan
   siapa penggunanya.
4. **Nol cache.** Metadata paket, daftar subtes, dan data rujukan prodi dibaca
   ulang dari basis data setiap kali.
5. **Papan Live tanpa batas.** Satu pengawas yang menyegarkan halaman saat
   1.000 peserta ujian menarik ratusan ribu baris.
6. **Semua halaman `force-dynamic`.** Halaman publik ikut membayar render penuh.

---

## 10. Yang SUDAH benar dan tidak boleh diubah

- Bentuk antarmuka `all/one/run/tx` dengan AsyncLocalStorage untuk transaksi —
  keputusan yang tepat; mengganti seluruhnya dengan ORM akan membuang
  ketepatan yang sudah dibuktikan di 144 titik panggil.
- `answers` upsert idempoten.
- Kendala UNIQUE di seluruh tabel konkuren.
- Degradasi anggun Redis di `cache.ts` (cache mati bukan berarti aplikasi mati).
- Ruang ujian memuat satu subtes sekaligus, bukan per soal.
- Pemaafan jaringan (`denyut_tersendat`, `pergi_saat_rekaman`) — ini aturan
  bisnis yang mahal dipelajari; **jangan disederhanakan atas nama performa.**
