# Arsitektur Produksi — ADZKIA SMART

Tanggal: **12 September 2026**
Status: **dirancang dan ditulis, BELUM diterapkan ke server dan BELUM diuji beban.**

> Dokumen ini menjelaskan susunan yang dituju beserta ALASAN tiap angkanya.
> Angka yang belum dibuktikan ditandai terus terang. Jangan mengubah salah satu
> angka tanpa membaca alasannya lebih dulu — sebagian besar di antaranya
> terlihat "bisa dinaikkan" padahal menaikkannya justru memperburuk.

---

## 1. Susunan

```text
                        Internet
                           |
                           v
                    Cloudflare / CDN          (opsional, belum dipakai)
                           |
                           v
                  Nginx  (di host, TLS)
                           |
          +----------------+----------------+
          v                v                v
      app:3000         app:3001         app:3002       ← 3 proses Next.js
          |                |                |
          +--------+-------+-------+--------+
                   |               |
                   v               v
              PgBouncer:6432     Redis:6379
                   |
                   v
             PostgreSQL:5432
```

Berkasnya:

| Berkas | Isi |
|---|---|
| `infra/docker-compose.prod.yml` | seluruh layanan |
| `infra/pgbouncer/pgbouncer.ini` | pooling, ukuran, batas waktu |
| `infra/postgres/postgresql.tuning.conf` | memori, WAL, pencatatan |
| `infra/nginx/conf.d/adzkia.conf` | TLS, statis, penyebaran beban, pembatas laju |
| `infra/redis/redis.conf` | cache murni, tanpa persistensi |

---

## 2. Struktur folder di server

```text
/srv/adzkia/
├── app/                      ← kode aplikasi (hasil rilis)
│   ├── .next/
│   │   └── static/           ← disajikan LANGSUNG oleh Nginx
│   ├── db/                   ← 01..04.sql, dipakai initdb
│   ├── infra/                ← seluruh berkas di tabel atas
│   ├── public/
│   └── package.json
│
├── data/                     ← SATU-SATUNYA yang wajib dicadangkan
│   ├── postgres/             ← bind mount PGDATA
│   ├── redis/                ← kosong; Redis sengaja tanpa persistensi
│   └── unggahan/
│       ├── soal/             ← gambar soal
│       ├── peserta/          ← foto peserta
│       ├── warung/           ← berkas Warung Soal
│       └── audio/            ← rekaman Listening IELTS
│
├── rahasia/                  ← DI LUAR repositori, chmod 600
│   ├── .env
│   └── pgbouncer/
│       └── userlist.txt
│
├── cadangan/
│   ├── harian/               ← pg_dump
│   └── unggahan/             ← rsync dari data/unggahan
│
└── log/
    ├── nginx/
    └── app/
```

**Pemisahan yang menentukan: `app/` boleh dihapus dan dibangun ulang kapan
saja; `data/` dan `rahasia/` tidak pernah.** Itulah sebabnya berkas yang
diunggah pengguna TIDAK berada di dalam `app/public`, melainkan di
`data/unggahan` yang dipasang ke dalamnya lewat bind mount. Setiap rilis yang
menimpa `app/` karena itu tidak pernah bisa menghapus rekaman Listening atau
foto peserta — kesalahan yang hanya perlu terjadi sekali untuk menghabiskan
satu hari kerja.

Bind mount dipilih alih-alih volume Docker bernama karena isinya harus bisa
dicadangkan, dilihat, dan dipulihkan dengan `rsync`, `ls`, dan `tar` biasa.

### Menyamakan di komputer sendiri

```bash
npm run infra:lokal
```

Skrip `scripts/siapkan-struktur.mjs` membuat `.lokal/` dengan bentuk yang sama
persis, sehingga jalur relatif, urutan folder, dan tempat berkas rahasia tidak
berbeda antara laptop dan server. `.lokal/` sudah masuk `.gitignore`.

```text
adzkia-smart-pg/.lokal/     ←→     /srv/adzkia/
├── data/                          ├── data/
├── rahasia/                       ├── rahasia/
├── cadangan/                      ├── cadangan/
└── log/                           └── log/
```

---

## 3. PgBouncer — dari mana angkanya

### Beban puncak

| Jalur | Laju per peserta | Pada 10.000 peserta |
|---|---|---|
| Denyut nadi | 1 / 5 detik | 2.000 req/dtk |
| Sinkron timer | 1 / 15 detik | 667 req/dtk |
| Autosave jawaban | ±1 / 30 detik | 333 req/dtk |
| **Total** | | **±3.000 req/dtk** |

Sesudah optimasi jalur panas (denyut 1 query, autosave 3 query berapa pun
butirnya, sesi dari cache Redis), itu **±5.000 query/detik**.

### Ukuran kumpulan

Seluruh query jalur ujian adalah pencarian lewat indeks unik pada basis data
yang muat di memori — di bawah 5 ms. Satu koneksi yang sibuk penuh karena itu
sanggup ±200 query/detik:

```text
5.000 query/dtk ÷ 200 query/dtk per koneksi ≈ 25 koneksi yang benar-benar bekerja
```

| Setelan | Nilai | Alasan |
|---|---|---|
| `default_pool_size` | **40** | 25 + kelonggaran 60% untuk query yang lebih lambat dari dugaan |
| `reserve_pool_size` | 10 | menahan ledakan sesaat agar tidak jadi galat |
| `max_db_connections` | 90 | batas atas mutlak; **tetap di bawah** `max_connections` PostgreSQL |
| `max_client_conn` | 5.000 | koneksi klien hanya soket, bukan proses — inilah manfaat utamanya |
| `pool_mode` | `transaction` | koneksi dilepas tiap transaksi selesai, bukan tiap sambungan putus |
| PostgreSQL `max_connections` | 200 | 90 untuk aplikasi, sisanya untuk psql, cadangan, pemantauan |
| `PGPOOL_MAX` per proses app | 25 | 25 × 3 proses = 75 koneksi klien → diringkas jadi ≤40 koneksi server |

> **Angka-angka ini perkiraan yang beralasan, bukan hasil pengukuran.** Yang
> bisa dibuktikan hari ini hanyalah jumlah query per permintaan (diukur
> `npm run cek:panas`). Berapa query per detik yang benar-benar sanggup
> dilayani VPS ini belum pernah diukur.

### Kenapa menaikkan angkanya bukan jawaban

Tiap koneksi PostgreSQL adalah satu proses OS dengan memorinya sendiri. Di
atas jumlah inti prosesor, menambah koneksi tidak menambah pekerjaan yang
selesai — ia menambah pekerjaan yang diperebutkan. Kalau antrean menumpuk,
yang salah hampir selalu query atau indeksnya; menambah koneksi memindahkan
antrean dari PgBouncer ke PostgreSQL, tempat antrean jauh lebih mahal.

### Empat hal yang rusak diam-diam di balik `pool_mode = transaction`

Mode transaksi berarti **tidak ada keadaan yang boleh menumpang di antara dua
transaksi**. Empat hal berikut akan jalan saat diuji sendirian lalu gagal saat
ramai:

| | Keadaan di aplikasi ini |
|---|---|
| `SET` di luar transaksi | **Sudah ditangani.** Zona waktu dulu dikirim sebagai parameter pembuka `options=-c timezone=…`; PgBouncer menolak parameter pembuka yang tidak dikenalnya dan **koneksinya gagal sama sekali**. `PGBOUNCER=1` membuat `src/lib/db.ts` berhenti mengirimnya; zonanya dipasang di sisi server dengan `ALTER DATABASE adzkia SET timezone = 'Asia/Jakarta'` |
| Prepared statement bernama | **Aman.** `node-postgres` memakai pernyataan tanpa nama. Yang **tidak** aman adalah `.prepare()` milik Drizzle — jangan dipakai. `max_prepared_statements = 200` jadi jaring pengaman |
| `LISTEN` / `NOTIFY` | Tidak dipakai |
| Kunci penasihat lintas transaksi | Tidak dipakai. Penguncian memakai `SELECT … FOR UPDATE` **di dalam** satu pernyataan, yang selesai bersama transaksinya |

### Pekerjaan berat tidak lewat PgBouncer

Ekspor nilai, rekap seluruh paket, dan penghitungan ulang IRT memegang koneksi
puluhan detik. Lewat PgBouncer, satu pekerjaan begitu menahan slot yang
seharusnya melayani ribuan denyut. Jalankan lewat **port 5432 langsung**, yang
tetap terbuka untuk `127.0.0.1`.

---

## 4. Langkah yang WAJIB dijalankan sekali di server

```sql
-- Tanpa ini, di belakang PgBouncer seluruh waktu tampil dalam UTC.
ALTER DATABASE adzkia SET timezone = 'Asia/Jakarta';

-- Untuk menjawab "endpoint mana yang paling banyak querynya" dengan angka.
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

```bash
# Indeks konkurensi — aman dijalankan saat ujian berlangsung (CONCURRENTLY).
psql -d adzkia -f db/04-indeks-konkurensi.sql
```

---

## 5. Status kejujuran

| | |
|---|---|
| **Terimplementasi** | Berkas PgBouncer, Nginx, PostgreSQL, Redis, compose produksi; `LEWAT_PGBOUNCER` di `src/lib/db.ts`; struktur folder + skrip cerminnya |
| **Terverifikasi** | YAML compose terurai benar (anchor & merge key). `npx tsc --noEmit` lulus. `npm run cek:panas` lulus 28 pemeriksaan pada PostgreSQL 16 sungguhan |
| **Perlu validasi infrastruktur** | **SELURUH angka pooling.** PgBouncer belum pernah dijalankan — Docker tidak terpasang di mesin ini. Nginx belum pernah dimuat. Tiga proses aplikasi belum pernah hidup bersamaan. Belum ada uji beban k6 sama sekali. **Klaim "mendukung 10.000 pengguna" belum boleh diucapkan** |
