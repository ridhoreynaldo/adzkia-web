# Lapisan Kode — repository / service / request

Tanggal: **12 September 2026**
Cakupan: **jalur ujian saja.** Selebihnya sengaja belum disentuh; alasannya di
bagian 5.

---

## 1. Bentuknya

```text
src/
├── server/                        ← BARU
│   ├── db/
│   │   ├── client.ts              Drizzle di atas pool yang SUDAH ADA
│   │   └── schema/                potret tabel yang sudah ada
│   │       ├── users.ts  packages.ts  questions.ts
│   │       ├── attempts.ts  answers.ts  results.ts  violations.ts
│   │       └── index.ts
│   ├── repositories/              HANYA baca/tulis. Tanpa aturan bisnis.
│   │   ├── attempt.repository.ts
│   │   ├── answer.repository.ts
│   │   ├── package.repository.ts
│   │   ├── heartbeat.repository.ts
│   │   └── violation.repository.ts
│   ├── services/                  Aturan bisnis, transaksi, cache.
│   │   ├── exam.service.ts
│   │   └── answer.service.ts
│   ├── requests/                  Pemeriksaan BENTUK masukan.
│   │   └── answer.request.ts
│   └── http/
│       └── errors.ts              Galat aman-tampil + catatan server
│
└── lib/                           ← LAMA, tetap ada
    ├── exam.ts                    kini MENERUSKAN ke service/repository
    ├── pelanggaran.ts             idem
    ├── db.ts                      pool + tx(); dipinjam lapisan baru
    └── …                          selebihnya belum disentuh
```

---

## 2. Siapa boleh tahu apa

| Lapisan | Boleh | TIDAK boleh |
|---|---|---|
| **request** | bentuk masukan, panjang, tipe | menyentuh basis data; memutuskan wewenang |
| **repository** | SQL, Drizzle, bentuk baris | memutuskan boleh/tidak; membuka transaksi; cache |
| **service** | aturan bisnis, transaksi, cache, melempar `GalatTampil` | menyusun SQL; membaca `Request` HTTP |
| **route / action** | memanggil request → service, menyusun jawaban | aturan bisnis |

Aturan yang paling sering dilanggar dan paling mahal: **repository tidak boleh
memutuskan wewenang.** Satu-satunya pengecualian yang disengaja adalah
`answerRepo.soalMilikPaket()`, yang membatasi hasilnya pada satu `package_id` —
dan karena itu ikut menjadi gerbang "peserta tidak bisa menitipkan jawaban ke
butir paket lain". Itu ditulis di komentarnya supaya tidak dikira kebetulan.

---

## 3. Dua keputusan yang menentukan benar-salahnya seluruh lapisan ini

### 3.1 Drizzle MEMINJAM pool, tidak membuat yang baru

`src/server/db/client.ts` memakai `pg.Pool` milik `src/lib/db.ts`. Selama
migrasi ini separuh kode memakai Drizzle dan separuh lagi memakai
`all/one/run`; pool kedua akan **melipatgandakan koneksi ke PostgreSQL tanpa
menambah satu pun kapasitas** — dan di belakang PgBouncer, jumlah koneksilah
yang dibatasi.

### 3.2 Di dalam `tx()`, Drizzle WAJIB memakai klien transaksinya

`tx()` menaruh satu `PoolClient` di `AsyncLocalStorage`. Repositori Drizzle
yang tetap menembak ke pool akan mengambil koneksi **lain**: tulisannya jatuh
di luar transaksi, `ROLLBACK` tidak membatalkannya, dan **kodenya tetap
"berjalan" tanpa galat apa pun.**

Karena itu akses basis data selalu lewat pemanggilan fungsi `db()`, tidak
pernah lewat variabel modul:

```ts
// BENAR — ikut transaksi yang sedang berjalan
const [row] = await db().select(...).from(attempts);

// SALAH — membeku ke pool, keluar dari transaksi tanpa peringatan
const d = db();                       // di tingkat modul
const [row] = await d.select(...);
```

`klienAktif()` di `src/lib/db.ts` adalah jembatannya.

---

## 4. Yang berubah dalam angka

Dibuktikan `npm run cek:panas`, yang **menghitung** query dengan membungkus
`pg.Client.prototype.query` — bukan dengan membaca kode.

| Jalur | Sebelum | Sesudah | Cara |
|---|---|---|---|
| Gerbang peserta (`pesertaDiizinkan`) | 2 | **1** | `paketDibatasi` + pemeriksaan digabung jadi `izinPeserta()` |
| Membuka sesi (`mulaiAttempt`), sesi baru | 3 | **1** | `INSERT … ON CONFLICT DO NOTHING … RETURNING` |
| Membuka sesi, sesi sudah ada | 1 | **1** | tidak berubah |
| Membuka timer subtes (`mulaiSubtes`) | 2 | **1** | `INSERT … RETURNING`, bukan INSERT lalu SELECT |
| Catat jeda denyut (`catatDenyutHilang`) | 3 | **1** | `ronde` & `urutan` dihitung di dalam `INSERT … SELECT` |
| Catat denyut (`catatDenyut`) | 1 | **1** | sudah optimal sebelumnya |
| Autosave, 3 butir | 3 | **3** | sudah optimal sebelumnya |
| Autosave, 9 butir | 3 | **3** | tetap tiga berapa pun butirnya |

Selain lebih murah, dua di antaranya **menutup balapan**:

- **`mulaiAttempt`** — SELECT-lalu-INSERT menyisakan celah; dua permintaan
  "Mulai" yang tiba bersamaan sama-sama membaca "belum ada" dan keduanya
  menyisipkan. Yang menyelamatkan aplikasi selama ini semata-mata kunci
  `UNIQUE (user_id, package_id)` — artinya permintaan kedua **gagal dengan
  galat basis data**, bukan dilayani dengan benar.
- **`catatDenyutHilang`** — `COUNT(*)` terpisah membuat dua kejadian yang
  tercatat berdekatan mendapat nomor `urutan` yang **kembar**, sehingga laporan
  pengawas memuat dua "kepergian ke-3" dan tidak ada kepergian ke-4.

---

## 5. Yang SENGAJA belum dipindahkan

| Bagian | Alasan |
|---|---|
| IELTS, Warung, prodi, kampus, IRT, impor naskah | Di luar jalur ujian UTBK. Memindahkannya sekarang menyeret penilaian dan setengah panel admin ke dalam perubahan ini tanpa satu pun manfaat hari ini |
| `results`, `susulan` | Dipakai `ExamService` lewat `run()` biasa. Tetap ikut transaksi yang sama — `tx()` menaruh kliennya di AsyncLocalStorage dan `db()` memakainya. Lihat catatan di ujung `exam.service.ts` |
| `src/lib/exam.ts` mesin keadaan & penyusunan layar | Bukan akses data. Tidak ada yang bertambah baik dengan memindahkannya |

`src/lib/exam.ts` dan `src/lib/pelanggaran.ts` **tetap ada dan tetap menjadi
pintu masuk** bagi seluruh pemanggil lama — halaman, Server Action, rute API,
dan berkas uji. Isinya kini meneruskan ke service/repository. **Tidak ada satu
pun pemanggil yang perlu disentuh**, dan itu disengaja: perubahan sebesar ini
tidak boleh sekaligus menjadi perubahan kontrak.

---

## 6. Jebakan Drizzle yang sudah memakan korban di sini

**`sql.param()` wajib untuk parameter bertipe larik.**

Larik JavaScript yang disisipkan polos ke template `sql` dipecah Drizzle
menjadi **daftar parameter** — `($2, $3, $4)` — karena itulah yang dibutuhkan
`IN (...)`. `unnest(...)` membutuhkan kebalikannya: SATU parameter bertipe
larik.

```ts
// SALAH — PostgreSQL: "cannot cast type record to integer[]" (42846)
sql`FROM unnest(${idSoal}::int[], …)`

// BENAR
sql`FROM unnest(${sql.param(idSoal)}::int[], …)`
```

**Ini lolos `npx tsc --noEmit` DAN `npm run build`.** Yang menangkapnya adalah
`npm run cek:panas`, yang benar-benar menjalankan querynya. Pola yang sama
sudah dua kali terjadi di proyek ini (`?1` → `$11`, `COLLATE NOCASE`): **sisa
dialek dan salah-bind hanya tertangkap oleh query yang dijalankan, bukan oleh
query yang dibaca.**

**`.prepare()` jangan dipakai** — ia membuat prepared statement bernama, yang
tidak aman di balik `pool_mode = transaction`. Lihat
`docs/production-architecture.md` bagian 3.
