# ADZKIA SMART

Platform **Tryout Real UTBK-SNBT** milik **SMA Islam Plus Adzkia** — domain produksi
**pintarbersamaadzkia.com**.

Peserta mengerjakan paket tryout dengan aturan yang sama seperti UTBK asli: 7 subtes berurutan,
160 soal, 195 menit, timer terpisah setiap subtes dan tidak bisa mundur ke subtes sebelumnya.
Setelah selesai, sistem menghitung skor dengan pendekatan **IRT**, menampilkan pembahasan tiap
butir, peringkat antar peserta, serta rekomendasi kampus dan program studi.

| Hal | Keterangan |
|---|---|
| Framework | Next.js 16 (App Router, `src/`, TypeScript) |
| Styling | Tailwind CSS v4 + token warna di `src/app/globals.css` |
| Basis data | SQLite lewat `node:sqlite` (bawaan Node, tanpa native build) |
| Sesi login | Cookie httpOnly berisi JWT (`jose`) + kata sandi di-hash `bcryptjs` |
| Bahasa antarmuka | Bahasa Indonesia |

---

## 1. Menjalankan di komputer sendiri

Prasyarat: **Node.js 22 atau lebih baru** (disarankan Node 24). Modul `node:sqlite` hanya tersedia
mulai Node 22, jadi versi di bawah itu tidak akan jalan. Cek dengan `node -v`.

```bash
npm install        # pasang dependensi
npm run seed       # isi data awal: akun demo + paket TO-DEMO-1 + 35 soal
npm run seed:hasil # opsional: 8 pengerjaan contoh agar papan peringkat ada isinya
npm run dev        # jalankan di http://localhost:3000
```

Buka `http://localhost:3000`, lalu masuk lewat tombol **LOGIN SISWA** memakai kredensial di
bawah. Pintu admin sengaja tidak bertombol — lihat bagian 5.

### Perintah npm yang tersedia

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | Server pengembangan (hot reload) |
| `npm run build` | Build produksi |
| `npm run start` | Menjalankan hasil build produksi |
| `npm run lint` | Pemeriksaan ESLint |
| `npm run seed` | Mengisi data awal (aman diulang) |
| `npm run akun:admin` | Memasang tiga akun pengelola resmi dan menghapus admin di luar daftar. Meninjau saja; tambahkan `-- --tulis` untuk menyimpan |
| `npm run seed:hasil` | Membuat 8 pengerjaan contoh untuk menghidupkan papan peringkat & kalibrasi IRT (aman diulang; `--reset` untuk mengulang dari awal) |
| `npm run seed:warung` | Menyiapkan kerangka 210 paket Warung Soal dan mengisi Paket 1 ketujuh subtes (160 soal karangan) (aman diulang) |
| `npm run cek:naskah` | Menguji pembaca naskah Word: penomoran, pilihan, kunci, tabel, bacaan bertajuk, dan kebiasaan menulis guru — termasuk naskah PK/PM berpernyataan bernomor, tabel Benar/Salah, dan "(Jawaban: …)" (102 pemeriksaan) |
| `npm run cek:kunci` | Menguji kunci yang diketik admin di layar pratinjau impor (16 pemeriksaan) |
| `npm run cek:warung` | Menguji mesin Warung Soal: kunci kemajuan, penilaian, papan peringkat, impor tabel dan naskah Word (87 pemeriksaan) |
| `npm run cek:denyut` | Menguji penjagaan ujian di iPhone: denyut nadi, celah muat-ulang, dan penyatuan laporan kembar (30 pemeriksaan) |
| `npm run cek:jaga` | Menguji penjagaan ujian IELTS: membuktikan ambang, jenis pelanggaran, rem lama-pergi, rem menumpuk, denyut nadi, dan ronde sesi ulang SAMA PERSIS dengan ruang ujian UTBK (79 pemeriksaan) |
| `npm run cek:gambar` | Menguji unggah manual gambar soal pada KEDUA bank soal: pengenalan jenis dari isi berkas, batas 1 MB di kedua sisi, folder penyimpanan yang sama dengan gambar naskah, jaring pengaman 404, dan panel admin yang sadar jalur UTBK/SKD (64 pemeriksaan) |
| `npm run cek:tampilan` | Menguji perapian tampilan soal: tabel Word, pemisahan paragraf, bentuk pembahasan, dan rentang bacaan bersama (26 pemeriksaan) |
| `npm run cek:siklus` | Menguji siklus tryout pekanan: penanggalan Jumat, penutupan paket lama, penyiapan paket baru, dan pergantian siklus dari sisi siswa (44 pemeriksaan) |
| `npm run cek:riwayat` | Menguji pembersihan riwayat pengerjaan satu paket: jejak yang dilaporkan, batas sapuan terhadap paket lain, gerbang paket yang sedang dikerjakan, dan penyetelan ulang kalibrasi (41 pemeriksaan) |
| `npm run cek:admin` | Menguji kunci satu-akun-satu-perangkat pada pengelola: klaim, penolakan perangkat kedua, pengambilalihan sesudah menganggur, pelepasan saat Keluar, dan pembacaan label perangkat (42 pemeriksaan) |
| `npm run cek:hapus` | Menguji penghapusan akun peserta: jejak yang dilaporkan, cascade ke seluruh tabel, dan gerbang akun sendiri / admin terakhir / peserta yang timernya masih berjalan (48 pemeriksaan) |
| `npm run lengkapi:ambang` | Melengkapi ancar-ancar skor prodi yang belum punya angka sama sekali (hanya meninjau; tambahkan `-- --tulis` untuk menyimpan) |
| `node scripts/seed.mjs --reset` | Mengosongkan data lalu mengisi ulang dari nol |

---

## 2. Data awal (`npm run seed`)

`scripts/seed.mjs` adalah skrip Node murni (tanpa TypeScript) yang membuka database yang sama
dengan aplikasi, membuat tabelnya bila belum ada, lalu mengisi:

* **1 akun admin** dan **9 akun siswa** (1 siswa demo + 8 siswa contoh agar papan peringkat
  tidak kosong);
* **1 paket berstatus `published`** dengan kode `TO-DEMO-1` — “Tryout Real UTBK-SNBT #1 — Paket
  Demo”, pembahasan ditampilkan;
* **35 butir soal**: 5 butir untuk masing-masing subtes (PU, PPU, PBM, PK, LBIND, LBING, PM),
  lengkap dengan opsi A–E, kunci, dan pembahasan berisi langkah penyelesaian. Subtes PBM, LBIND,
  dan LBING memakai stimulus bacaan. Ketiga tipe butir ikut terwakili: 31 PG, 2 PGK (pilihan
  ganda kompleks), dan 2 IS (isian singkat).

Skrip ini **idempoten**: menjalankannya berkali-kali tidak menggandakan data. Akun yang sudah ada
dilewati (kata sandinya tidak ditimpa), sedangkan paket dan soal disegarkan isinya. Gunakan
`node scripts/seed.mjs --reset` bila ingin mengosongkan tabel `users`, `packages`, `questions`,
`attempts`, `attempt_subtes`, `answers`, `results`, dan `item_params` lebih dahulu — tabel
`campuses` tidak disentuh.

### Kredensial demo

**Siswa masuk memakai NAMA**, bukan email — lewat tombol LOGIN SISWA (`/login`):

| Peran | Diisi di kolom | Isian | Kata sandi |
|---|---|---|---|
| Siswa | Nama Siswa | `Siswa Demo` | `siswa123` |
| Admin | Email Admin | `admin1@pba.com` | `admin999` |
| Admin | Email Admin | `admin2@pba.com` | `admin9999` |
| Admin | Email Admin | `admin3@pba.com` | `admin99999` |

Delapan siswa contoh — Aisyah Nur Ramadhani, Bagus Prasetyo, Dinda Ayu Lestari, Fajar Nugroho,
Hana Salsabila, Ilham Maulana, Kirana Puspita, Rizky Ardiansyah — juga masuk dengan namanya
masing-masing, kata sandi `siswa123`.

Huruf besar-kecil dan spasi berlebih tidak berpengaruh: `  aisyah   nur ramadhani  ` sama saja
dengan `Aisyah Nur Ramadhani`. Karena nama menjadi identitas login, **nama harus unik** — siswa
kedua yang bernama sama diminta menambahkan nama belakang atau inisial saat mendaftar.

Kata sandi dibuat sendiri oleh siswa saat mendaftar dan disimpan dalam bentuk hash bcrypt, jadi
pengelola tidak bisa melihatnya. Siswa yang lupa sandi harus disetel ulang lewat database
(kolom `users.password_hash`).

> **Ganti seluruh kata sandi demo sebelum situs dipakai peserta sungguhan.**

---

## 3. Struktur folder

```
adzkia-smart/
├── data/
│   └── adzkia.db              # basis data SQLite (dibuat otomatis, WAJIB di-backup)
├── public/                    # aset statis
├── scripts/
│   ├── seed.mjs               # skrip data awal (npm run seed)
│   └── seed-hasil.mjs         # pengerjaan contoh untuk papan peringkat (npm run seed:hasil)
├── src/
│   ├── app/
│   │   ├── globals.css        # token warna & utilitas (.card .btn .input .label ...)
│   │   ├── layout.tsx         # kerangka HTML, font, metadata global
│   │   ├── page.tsx           # halaman depan (landing) pintarbersamaadzkia.com
│   │   ├── login/             # halaman masuk
│   │   └── register/          # halaman daftar
│   ├── components/
│   │   ├── Brand.tsx          # logo teks ADZKIA SMART
│   │   ├── Navbar.tsx         # bilah navigasi (sadar sesi login)
│   │   ├── ui.tsx             # Card, Badge, PageHeader, EmptyState, Alert
│   │   ├── LoginForm.tsx      # formulir masuk
│   │   ├── RegisterForm.tsx   # formulir daftar
│   │   └── landing/           # bagian-bagian halaman depan
│   │       ├── Hero.tsx           # judul utama + tombol ajakan
│   │       ├── ScoreMockup.tsx    # mockup kartu hasil (HTML/CSS/SVG, tanpa gambar eksternal)
│   │       ├── AngkaKunci.tsx     # 7 subtes · 160 soal · 195 menit · IRT
│   │       ├── DaftarSubtes.tsx   # kartu 7 subtes, dibangkitkan dari konstanta SUBTES
│   │       ├── Keunggulan.tsx     # alasan memilih ADZKIA SMART
│   │       ├── CaraKerja.tsx      # 4 langkah alur peserta
│   │       ├── Faq.tsx            # pertanyaan umum (<details>)
│   │       ├── CtaAkhir.tsx       # ajakan penutup
│   │       ├── FooterLanding.tsx  # footer situs
│   │       └── Section.tsx        # pembungkus & judul bagian
│   └── lib/
│       ├── db.ts              # koneksi SQLite + skema seluruh tabel + helper all/one/run/tx
│       ├── snbt.ts            # konstanta resmi: SUBTES, TOTAL_SOAL, TOTAL_MENIT, LABEL_OPSI
│       ├── auth.ts            # sesi, hash kata sandi, requireUser/requireAdmin
│       ├── auth-actions.ts    # server action login/register/logout
│       └── irt.ts             # penilaian: cekJawaban, hitungHasil, ambilHasil
├── .env.example               # contoh variabel lingkungan
├── CONTRACT.md                # kontrak kerja antar modul
└── next.config.ts
```

### Catatan basis data

Seluruh tabel didefinisikan pada konstanta `SCHEMA` di `src/lib/db.ts`:
`users`, `packages`, `questions`, `attempts`, `attempt_subtes`, `answers`, `results`,
`item_params`, dan `campuses`. Tabel dibuat otomatis (`CREATE TABLE IF NOT EXISTS`) saat aplikasi
atau skrip seed pertama kali dijalankan.

Format kolom `kunci` pada tabel `questions`:

| Tipe butir | Isi kolom `kunci` | Contoh |
|---|---|---|
| `PG` | satu huruf | `"D"` |
| `PGK` | JSON array huruf | `["A","C"]` |
| `IS` | teks jawaban (dibandingkan tanpa huruf besar/kecil & spasi) | `"1540"` |

### Mengosongkan riwayat sebuah paket

Peserta yang pengerjaannya sudah `finished` **selalu** dilempar ke halaman hasil — selama barisnya
di tabel `attempts` masih ada, ia tidak akan pernah bisa masuk ruang ujian paket itu lagi. Tabelnya
unik pada `(user_id, package_id)`, jadi satu siswa hanya punya satu baris per paket.

Karena itu paket yang sudah telanjur dicoba (uji coba menjelang hari-H, atau tryout yang harus
diulang) perlu dibersihkan lebih dulu. Panel admin → **Paket Tryout** → **Hapus riwayat**:

| | Ikut terhapus | Tetap utuh |
|---|---|---|
| **Hapus riwayat** | Pengerjaan, jawaban, nilai per subtes, timer subtes, catatan pelanggaran, dan (bila dicentang) pilihan program studi | Soal, jadwal, status paket, akun siswa, dan izin susulan |
| **Hapus paket** | Semuanya di atas **beserta paket dan seluruh soalnya** | — |

Dua hal yang dikerjakan sendiri oleh aksi ini:

- **Kalibrasi disetel ulang.** `item_params` menyimpan tingkat kesulitan butir yang dihitung dari
  peserta yang sudah selesai. Tanpa penyetelan ulang, angka dari pengerjaan yang barusan dihapus
  tetap tertinggal dan ikut menilai peserta sungguhan. Sesudah dibersihkan seluruh butir kembali
  netral (`b = 0`).
- **Izin susulan TIDAK dicabut.** Itu keputusan pengelola tentang orangnya, bukan rekam jejak
  pengerjaan.

Satu pintu dikunci: paket yang **sedang** dikerjakan tidak bisa dibersihkan — halaman ujian di HP
siswa akan mati mendadak tanpa nilai tersimpan. Yang dihitung "sedang dikerjakan" adalah timernya,
bukan sekadar status `ongoing`; sesi yang ditinggalkan peserta berhari-hari lalu tidak menghalangi.
Gugurkan dulu lewat halaman **Skor Live** kalau memang perlu.

### Ambang batas skor prodi (tabel `campuses`)

Kotak "Pilihan Program Studi" sebelum ujian menampilkan ancar-ancar skor minimum tiap prodi
(angka **±**), dan laporan hasil memakai angka yang sama untuk menyeleksi Pilihan 1-4. Angkanya
datang dari kolom `campuses.skor_min`, dengan tiga asal yang dibedakan lewat kolom `sumber`:

| `sumber` | Asal angka | Disusun oleh |
|---|---|---|
| `manual` | Ditetapkan langsung | Pengajar Adzkia. **Tidak pernah ditimpa skrip mana pun.** |
| `snpmb` | Dihitung dari keketatan resmi (peminat ÷ daya tampung) | `npm run impor:snpmb` |
| `perkiraan` | Diduga dari prodi sejenis di kampus setara, untuk prodi yang belum punya angka peminat sama sekali | `npm run lengkapi:ambang` |

Prodi tanpa angka sama sekali dulu muncul sebagai **"BELUM ADA DATA"** di laporan hasil dan tidak
ikut diseleksi. Penyebabnya prodi yang baru dibuka: SNPMB belum menerbitkan peminatnya, sehingga
rumus keketatan tidak bisa dipakai. `npm run lengkapi:ambang` menutup lubang itu dengan model dua
arah "prodi + kampus" yang dikalibrasi terhadap angka yang sudah ada; rinciannya — termasuk dua
koreksi yang sengaja **tidak** dipakai karena terbukti salah — ditulis di kepala
`scripts/lengkapi-ambang.mjs`.

Semua angka ini **perkiraan**, bukan pengumuman resmi SNPMB. Karena itu ditampilkan dengan tanda
`±` dan disertai keterangan di halaman pemilihan prodi. Begitu SNPMB menerbitkan peminat prodi
yang bersangkutan, `npm run impor:snpmb` akan menimpa baris `perkiraan` dengan hitungan yang lebih
baik — dan itu memang yang diinginkan.

### Perapian naskah Word

Naskah `.docx` yang diunggah lewat **Admin → Paket → Impor** dirapikan sendiri oleh
`src/lib/naskah-docx.ts` sebelum disimpan. Yang dilakukannya:

| Yang dirapikan | Sebelumnya |
|---|---|
| **Tabel Word dipertahankan** dan dibungkus `.tabel-soal` yang bergulir mendatar | Blok tabel disaring keluar sebelum naskah dibaca, sehingga soal "Perhatikan tabel berikut" sampai ke peserta **tanpa tabelnya** |
| **Tiap paragraf tetap paragraf** — data soal dan perintahnya dipisah `<p>` | Dilebur dengan spasi menjadi satu kalimat panjang |
| **Pembahasan mempertahankan tebal, miring, dan pangkat** | Disimpan sebagai teks polos: `s²` jatuh menjadi `s2` |
| Pemutus baris manual (Shift+Enter) dipecah jadi paragraf; paragraf kosong dibuang | Ikut menjadi satu blok raksasa |

### Naskah apa adanya dari guru

Naskah yang dikirim guru jarang mengikuti contoh penulisan di panel impor. Empat kebiasaan
menulis berikut sekarang dibaca apa adanya, tanpa naskahnya perlu dirapikan lebih dulu — semuanya
dijumpai pada naskah Tryout 4 September 2026:

| Kebiasaan menulis | Yang dilakukan pembaca |
|---|---|
| Pertanyaan dan kelima pilihan berada dalam **satu paragraf** yang dipisah jeda baris (Shift+Enter) | Paragraf dipecah dulu menjadi baris-baris semu (`pecahJedaBaris`). Sebelumnya semua yang berada setelah jeda pertama tertelan ke dalam pertanyaan |
| Pilihan berupa **daftar otomatis Word berhuruf** — hurufnya dibuat Word, tidak ada di teks | `word/numbering.xml` dibaca supaya daftar berhuruf (A, B, C) dibedakan dari daftar berangka (nomor soal). Sebelumnya tiap pilihan terhitung sebagai satu soal sendiri: naskah 30 soal terbaca menjadi 124 butir |
| Kunci ditulis **satu huruf sendirian** di bawah pilihan terakhir, tanpa label `Kunci:` | Dibaca sebagai kunci, dengan syarat pilihan sudah terbaca dan soalnya belum berkunci. Sebelumnya huruf itu menempel ke pilihan terakhir |
| **Daftar kunci di akhir naskah** (`Answer:` lalu `1. A  2. C`, atau `19. Known` untuk isian singkat) | Blok itu dikenali sebagai daftar kunci, bukan soal baru, lalu dipasangkan ke soalnya berdasarkan nomor |

| Jawaban benar **diwarnai atau distabilo**, tanpa tulisan "Kunci:" sama sekali | Pilihan yang ditandai dibaca sebagai kunci — hanya bila TEPAT SATU pilihan yang ditandai, sehingga naskah yang seluruh teksnya berwarna tidak tertipu. Pada pilihan berjajar satu baris, yang dibaca adalah **label** yang ikut diwarnai (`(C) `); kata bertanda di dalam kalimat soal diabaikan, karena kata itu kerap muncul lagi sebagai isi salah satu pilihan |
| Jawaban isian singkat diketik menempel di ujung pertanyaan dan diwarnai | Menjadi kunci, lalu **dibuang dari pertanyaan** — kalau tertinggal, kuncinya terpampang di layar peserta |
| Bacaan dibuka judul **"TEKS 2"** atau **"Passage 1"** saja, tanpa "untuk soal nomor 6 sampai 10" | Judul itu menutup soal sebelumnya lalu membuka bacaan baru yang berlaku untuk **seluruh soal sampai judul bacaan berikutnya**. Judul beruntun ("Passage 1" lalu "Passage 2") dibaca bersama untuk kelompok soal yang sama |
| Bacaan kelompok berikutnya ditulis **tanpa judul apa pun**, langsung sesudah pilihan soal sebelumnya | Paragraf sepanjang ≥ 200 karakter sesudah pilihan (atau sesudah baris `Kunci:`) dibaca sebagai bacaan baru, bukan sambungan pilihan. Tanpa ini pilihan E pernah membengkak menjadi 2.298 karakter berisi bacaan penuh |
| **Pernyataan (1)…(4) di dalam soal** dan butir bulat berisi data ditulis sebagai daftar otomatis Word, sejajar dengan nomor soal (naskah PK/PM 4 September 2026) | Label yang digambar Word dihitung ulang dari `numbering.xml` (`labelDaftar`/`nomorDaftar` di `docx.ts`). Daftar yang mulai lagi dari "(1)" di bawah soal yang belum berpilihan adalah pernyataan, bukan soal baru, dan labelnya ikut ditulis ke badan soal. Sebelumnya naskah PK 20 soal terbaca 32 butir dan pernyataannya menjadi "soal" tanpa pilihan |
| Pilihan berupa angka ribuan, **"1.800"**, **"2.000.000"** | Bukan nomor soal: angka yang langsung disusul angka lagi sesudah titiknya adalah pemisah ribuan. Sebelumnya lima pilihan seperti itu menjadi lima "soal" kosong dan soal aslinya kehilangan pilihannya |
| Pilihan **"A."** dibiarkan kosong lalu diisi butir bersarang **"(1) dan (2)"** (Tab di Word) | Butir bersarang mengisi pilihan kosong itu, lengkap dengan label yang digambar Word. Sebelumnya pilihannya terbaca "dan (2)" |
| Pilihan dibuat dengan gaya bawaan Word **"List Number"** — penomorannya ada di `styles.xml`, bukan di paragraf | Gaya paragraf yang membawa `numPr` ikut dibaca, jadi pilihan itu tetap pilihan berhuruf |
| Kunci isian singkat ditulis **"(Jawaban: 36)"** di ujung baris soal, atau baris **"Jawaban: ______ (bilangan bulat) (Jawaban: 8)"** | Menjadi kunci `IS` dan **dibuang dari pertanyaan** meski dicetak tebal (penghapusnya sadar-tag). Tanda minus Unicode dinormalkan ke `-`; satuan di belakang angka ("90 m") dibuang dengan catatan, karena pemeriksa jawaban mencocokkan persis |
| Soal Benar/Salah berupa **tabel "Pernyataan · Benar · Salah"** bercentang | Menjadi soal `BS`: tiap baris jadi pernyataan, letak centang jadi kunci `B,S,B`. Tabel tanpa centang tetap jadi `BS` dengan kunci kosong dan catatan |
| Judul bacaan **"TEKS-2 (Untuk soal nomor 5 sampai 8)"** | Dikenali sebagai judul bacaan **dengan cakupan nomor**, jadi bacaannya hanya menempel ke soal 5-8. Sebelumnya judul bertanda hubung tidak dikenali dan seluruh bacaan tertelan ke soal sebelumnya |
| Pilihan **satu angka** ("7") yang diwarnai merah | Tanda satu karakter dipercaya bila itulah seluruh isi pilihannya. Sebelumnya tanda di bawah dua karakter diabaikan, sehingga soal PK/PM berpilihan angka tidak pernah berkunci |

Soal tanpa pilihan yang kuncinya berupa **kata** otomatis ditandai bertipe `IS` (isian singkat).
Kunci satu huruf sengaja tidak ikut: soal tanpa pilihan yang kuncinya "B" hampir pasti pilihannya
yang gagal terbaca, dan lebih baik tetap ditandai galat supaya diperiksa mata admin.

Tanda dilacak menurut **nomor barisnya di dalam paragraf**, bukan dengan mencari teksnya. Ini
penting pada soal perbaikan kalimat: kelima pilihan menyusun ulang kata yang sama, dan guru
mewarnai seluruh kalimat pilihan yang benar — kalau tandanya dicocokkan dengan `includes`, semua
pilihan tampak bertanda dan kuncinya justru gagal disimpulkan.

### Mengetik kunci langsung di layar pratinjau

Kolom **Kunci** pada tabel pratinjau impor bisa diisi dan dibetulkan di tempat. Isian itu
ditimpakan ke naskah **sebelum** validasi, jadi kunci ketikan dinilai dengan aturan yang sama
persis seperti kunci dari berkas: huruf di luar pilihan tetap ditolak. Gunanya untuk naskah yang
kuncinya memang tidak tertulis, tanpa perlu menyunting Word lalu mengunggah ulang. Alurnya: isi
kolomnya → tekan **Baca & pratinjau** lagi → barisnya berubah hijau → **Simpan**. Isian bertahan
selama berkas yang dipilih tidak diganti.

Setiap kebiasaan di atas menyisakan **catatan** di layar pratinjau, misalnya "18 kunci dibaca dari
baris yang hanya berisi satu huruf". Naskah Word tetap ditebak dari tata letaknya, jadi
pratinjaunya tetap wajib dibaca sebelum menyimpan.

Satu jebakan lama ikut ditutup: baris pembahasan dulu dikenali walau **tanpa** tanda titik dua,
sehingga pilihan jawaban yang kebetulan diawali kata "Penjelasan" — mis. *"Penjelasan bentuk Bumi →
sejarah pengukuran → …"* — ditelan sebagai pembahasan. Pilihan itu lenyap, huruf pilihan sesudahnya
bergeser naik, dan kunci yang disimpulkan ikut meleset satu huruf. Sekarang tanda pemisahnya wajib,
kecuali labelnya berdiri sendiri satu baris penuh, dan butir daftar berhuruf tidak pernah dibaca
sebagai baris berlabel.

Untuk naskah per guru yang seluruhnya berisi satu subtes dan **tidak memuat judul bagian sama
sekali**, halaman impor menyediakan pilihan **"Subtes naskah Word ini"**. Judul yang ada di dalam
naskah tetap menang atas pilihan itu, dan berkas Excel/CSV tidak terpengaruh karena sudah membawa
kolom `subtes` sendiri.

Baris pertama tabel dijadikan judul kolom (`<th>`) hanya bila memang terbaca sebagai judul —
semua selnya terisi dan tak satu pun berupa angka. Tabel data yang langsung dimulai dengan angka
tetap utuh sebagai `<td>`.

Soal berparagraf **tunggal** sengaja tidak dibungkus `<p>`, supaya sakelar `.isi-soal:has(p)` di
`globals.css` berperilaku persis seperti sebelumnya.

### Bacaan bersama

Pada subtes literasi, satu bacaan dipakai beberapa soal berturut-turut dan disalin utuh ke kolom
`stimulus` tiap butir. `petaRentangBacaan()` di `src/lib/soal-tampilan.ts` mengenali deretan
berurutan yang stimulusnya sama persis, lalu ruang ujian menampilkan **"Bacaan untuk soal 1–3"**.
Dihitung dari daftar soal yang sudah ada, jadi tidak perlu kolom basis data baru dan naskah lama
ikut terbaca. Hanya deretan berurutan yang digabung: dua bacaan sama yang dipisah soal lain adalah
dua kejadian berbeda.

Di layar kecil, bacaan dan pertanyaan dipisah menjadi **dua tab**. Alasannya terukur: pada layar
375x812, bacaan LBIND setinggi **3.176 piksel** — hampir empat layar penuh yang harus digulung
sebelum pertanyaannya muncul, dan digulung ulang untuk setiap soal yang memakai bacaan itu.
Dengan tab, tinggi kartu soal kedua dan seterusnya turun dari ~4.800 piksel menjadi ~1.600.
Bacaan yang BARU dibuka pada tab bacaan; soal lanjutan yang memakai bacaan sama langsung dibuka
pada pertanyaannya. Layar besar (`lg`) tidak berubah — bacaan dan soal tetap berdampingan dua
kolom, dan tabnya disembunyikan.

### Gambar soal: unggah manual

Soal bergambar dulu hanya bisa lahir dari impor naskah Word. Satu-satunya kolom gambar di editor
butir adalah **URL gambar**, jadi admin yang mengetik soal langsung di panel harus lebih dulu
menaruh gambarnya di suatu tempat di internet — dan pada praktiknya itu berarti soal bergambar
tidak pernah diketik manual sama sekali. Sekarang editor butir punya kotak unggah sendiri, dipakai
jalur **Try Out UTBK-SNBT** maupun **SKD Kedinasan**.

Kotak yang sama juga dipasang di formulir soal **Warung Soal**, sehingga ketiga bank soal —
UTBK, SKD, dan Warung — memakai satu jalan yang sama.

| Bagian | Berkas | Perannya |
|---|---|---|
| Kotak unggah | `src/components/admin/UnggahGambar.tsx` | Pilih berkas, seret-jatuhkan, atau tempel tangkapan layar (Ctrl+V). Menaruh hasilnya pada input tersembunyi `gambar_url` |
| Pemakainya | `SoalEditor.tsx` (Tryout & SKD) · `WarungSoalForm.tsx` (Warung) | Meneruskan paket tujuannya lewat prop `paket={{ jenis, id }}` |
| Penerima | `src/app/api/admin/gambar-soal/route.ts` | Memeriksa sesi admin, ukuran, dan isi berkas, lalu menyimpannya |
| Penyimpan | `src/lib/gambar-soal.ts` | Menulis ke `public/soal/<kode-paket>/…` atau `public/warung/<SUBTES>-<nomor>/…` |
| Batas & format | `src/lib/gambar-soal-konstanta.ts` | Angka yang dipakai bersama peramban dan server |
| Jaring pengaman | `src/app/soal/[...jalan]/route.ts` · `src/app/warung/[subtes]/[...berkas]/route.ts` | Melayani gambar yang luput dari indeks `public/` |

Empat keputusan yang perlu diketahui sebelum mengubahnya:

**Batas 1 MB, tetapi berkas besar dikecilkan lebih dulu, bukan ditolak.** Foto papan tulis dari
ponsel hampir selalu 2–4 MB. Peramban mengecilkannya sendiri (lebar dikurangi lebih dulu sampai
maksimal 1.600 piksel, baru mutu JPEG diturunkan — urutan itu menjaga angka pada grafik tetap
terbaca) lalu memberi tahu admin: *"Gambar 2,4 MB dikecilkan otomatis menjadi 780 KB."* Yang naik
ke server selalu di bawah batas, dan server tetap menolak apa pun yang melewatinya. GIF beranimasi
dikecualikan — mengecilkannya menghilangkan animasinya.

**Rute API, bukan Server Action.** Badan Server Action dibatasi 1 MB oleh Next.js, dan batas itu
menghitung seluruh formulir. Gambar 1 MB ditambah stimulus, opsi, dan pembahasan pasti
melewatinya, sehingga soal akan gagal disimpan justru pada gambar yang ukurannya masih sah.
Gambarnya dipindahkan lebih dulu; yang ikut di formulir soal tinggal alamat hasilnya.

**Jenis gambar ditimbang dari byte berkasnya, bukan dari namanya.** Nama berkas dan header
`Content-Type` sama-sama datang dari peramban. Ekstensi yang ditulis ke disk pun mengikuti isi,
jadi berkas bernama `.png` yang sebetulnya JPEG tidak pernah tersimpan salah nama.

**Nama berkas adalah sidik jari isinya.** Sama persis dengan gambar hasil impor naskah, jadi
keduanya berbagi satu folder per paket, satu grafik yang dipakai lima soal hanya tersimpan sekali,
dan nama berkas dari komputer admin tidak pernah ikut masuk ke URL. Konsekuensinya: **berkas lama
tidak dihapus saat gambar soal diganti** — satu berkas bisa dipakai butir lain, dan berkas yatim
jauh lebih murah daripada soal tanpa gambar di tengah ujian.

**Folder tujuan selalu dihitung di server** dari baris paketnya, tidak pernah diambil dari yang
dikirim peramban: nama folder yang boleh ditentukan klien adalah lubang untuk menulis berkas ke
mana saja di dalam `public/`.

**SVG bisa dibaca, tetapi tidak bisa diunggah.** Berkasnya teks, dan teks itu boleh memuat
`<script>` yang berjalan pada asal (origin) aplikasi begitu gambarnya dibuka — sebuah "gambar soal"
yang bisa membaca kuki sesi. Gambar Warung bawaan yang sudah berformat `.svg` tetap dilayani (dan
dikirim dengan `Content-Security-Policy` yang mematikan skripnya); yang ditutup hanya pintu untuk
menambah yang baru.

#### Catatan khusus Warung Soal

Dua hal berbeda dari jalur Tryout, keduanya karena harus cocok dengan yang sudah ada di disk dan
di basis data:

1. **Nama foldernya MEMPERTAHANKAN huruf besar** — `public/warung/PK-1/`, bukan `pk-1`. Alamat
   yang sudah tersimpan berbunyi `/warung/PK-1/trapesium.svg`, dan di server Linux beda huruf
   besar-kecil berarti berkasnya tidak ketemu. Folder Tryout tetap huruf kecil, mengikuti
   `naskah-docx.ts`.
2. **Rute cadangannya bersarang** di `src/app/warung/[subtes]/[...berkas]/route.ts`, bukan
   `/warung/[...jalan]`, karena Next.js melarang dua nama segmen dinamis berbeda pada tingkat yang
   sama dan `src/app/warung/[subtes]/page.tsx` sudah memakai tingkat itu. Halaman tersebut hanya
   melayani satu segmen, sedangkan alamat gambar selalu dua ("PK-1/abc.svg"), jadi keduanya tidak
   pernah berebut.

Sekalian ditambal saat memasangnya: **impor naskah Word Warung yang bergambar sebelumnya selalu
gagal menulis berkasnya.** Ekstensinya diambil dari `jenisGambar()`, yang mengembalikan jenis MIME
(`"image/png"`), bukan ekstensi — nama berkasnya menjadi `<sidik>.image/png`, mengandung garis
miring, sehingga penulisannya mustahil berhasil. Sekarang `warung-impor.ts` menulis lewat
`simpanGambarSoal()` yang sama dengan unggahan manual.

#### Jaring pengaman gambar 404

`next start` mengindeks isi `public/` **satu kali** saat proses dinyalakan. Gambar yang mendarat di
`public/soal/` sesudah itu membalas 404 walau berkasnya jelas ada di disk — pernah terjadi
2 September 2026 pada dua PNG naskah PM, dan waktu itu obatnya hanya menyalakan ulang server.
Dengan unggah manual, celah itu jadi jauh lebih sering terbuka: admin mengunggah gambar,
pratinjaunya terlihat baik-baik saja (peramban masih memegang berkas yang baru saja ia kirim),
lalu peserta menemukan ikon gambar rusak. Rute `/soal/[...jalan]` menutupnya tanpa mengubah satu
pun alamat yang sudah tersimpan: berkas yang sudah terindeks tetap dilayani pelayan statis, dan
hanya yang luput yang dibacakan langsung dari disk.

### Pratinjau soal mengikuti susunan ruang ujian

Pratinjau admin dulu menaruh gambar **sebelum** pertanyaan, sedangkan ruang ujian menaruhnya
sesudah — jadi butir yang tampak rapi di pratinjau bisa terbaca lain oleh peserta. Sekarang
urutannya sama: bacaan → pertanyaan → gambar → pilihan. Soal yang pilihan jawabannya tercetak di
dalam gambar juga tidak lagi dituduh *"Opsi jawaban belum diisi"*; yang ditampilkan deretan huruf
A–E seperti yang dilihat peserta, dengan kuncinya ditandai.

### Panel soal mengikuti jalur paket

Menyusul dari pekerjaan yang sama: Bank Soal, Pratinjau Soal, dan editor butir dulu selalu
memasang tujuh tab subtes UTBK, apa pun jalur paketnya. Akibatnya paket **SKD Kedinasan**
tampak kosong padahal butir TWK/TIU/TKP-nya ada, dan butir SKD yang dibuka lewat tautan langsung
selalu ditolak saat disimpan dengan pesan *"Subtes tidak dikenal."* — sehingga tidak ada satu pun
cara memberi gambar pada soal SKD.

`subtesJalur(jalur)`, `totalSoalJalur(jalur)`, dan `getSubtesApaPun(kode)` di `src/lib/snbt.ts`
menjadi satu-satunya pintu daftar subtes. Paket UTBK memakai tujuh subtes berkuota 160 soal, paket
SKD memakai TWK/TIU/TKP berkuota 110. `ringkasanSubtes()` menerima jalurnya sebagai argumen kedua,
dan `validasiSoal()` menimbang nomor terhadap kuota subtes jalur yang benar.

---

## 4. Keamanan ujian

Ujian wajib dibuka **layar penuh**, dan selama timer berjalan halaman memantau peserta terus
menerus. Kebijakannya **NOL TOLERANSI**: begitu peserta meninggalkan halaman ujian, sesinya
langsung dinyatakan **GAGAL** — tidak ada peringatan, tidak ada tenggang.

### Yang menggugurkan seketika

| Jenis | Kapan tercatat |
|---|---|
| `keluar_tab` | Halaman disembunyikan: pindah tab, pindah aplikasi, minimize, layar terkunci |
| `blur_window` | Jendela ujian kehilangan fokus: mengeklik peramban kedua, aplikasi lain, atau bilah tugas |
| `keluar_layar_penuh` | Keluar dari mode layar penuh. **Satu-satunya yang diberi satu peringatan** (`TOLERANSI_LAYAR_PENUH`), karena mode penuh bisa lepas sendiri saat notifikasi sistem muncul |
| `denyut_hilang` | Halaman berhenti berdenyut lebih dari 20 detik — lihat "Penjagaan di iPhone" |

### Yang hanya dicatat untuk pengawas

| Jenis | Kapan tercatat |
|---|---|
| `salin` | Menyalin atau memotong teks soal |
| `klik_kanan` | Klik kanan pada halaman soal |
| `pintasan` | Ctrl/Cmd + C/X/P/S/U/A, F12, Ctrl+Shift+I/J/C |
| `tekan_tahan` | Menekan-tahan soal atau gambar soal di layar sentuh (menu Salin/Bagikan/Look Up iOS) |
| `lewat_safari` | Peserta iPhone memilih mengerjakan dari Safari, bukan dari ikon Layar Utama |

Kolom jawaban isian singkat **dikecualikan** dari seluruh penghalang di atas, supaya peserta tetap
bisa menyunting jawabannya.

Seluruh keputusan diambil **di server**, bukan di peramban. Peserta tidak bisa membatalkannya
dengan menutup dialog, membersihkan storage, atau memuat ulang halaman: `/tryout/[id]/kerjakan`
merender ulang layar penguncian dari status `attempts.status = 'gugur'`.

Pengelola memantaunya di **Admin → Keamanan Ujian**, dan menekan **Unduh Laporan Excel** untuk
mendapat berkas `.xlsx` berisi tiga sheet: *Rekap Peserta*, *Rincian Kejadian*, dan *Keterangan*.
Ujian susulan hanya bisa dibuka admin per (peserta, paket).

### Penjagaan di iPhone

iPhone butuh penanganan tersendiri, dan bukan karena tampilannya. Tiga perilaku WebKit membuat
penjagaan yang bekerja di laptop, tablet, dan Android tidak bisa dipakai apa adanya:

1. **Tidak ada Fullscreen API.** WebKit hanya menyediakannya untuk `<video>`. Ruang ujian karena
   itu memakai **layar penuh semu** (kelas `.ruang-semu`, 100dvh, `<main>` yang menggulung
   sendiri). Pelanggaran `keluar_layar_penuh` tidak pernah berlaku di sana karena peristiwanya
   memang tidak terpancar. Layar benar-benar tanpa bilah Safari hanya didapat lewat **Tambahkan ke
   Layar Utama** — gerbang ujian mewajibkannya, tetapi menyediakan jalan keluar "Lanjut dari
   Safari" yang dicatat sebagai `lewat_safari`, karena menahan siswa di gerbang pada hari-H lebih
   merugikan daripada bilah alamat yang masih terlihat.
2. **`blur` tidak pernah terpancar** saat peserta berpindah aplikasi, dan `document.hasFocus()`
   tetap `true` selama tab itu tab aktif walau Safari sudah di latar belakang. Seluruh lapisan
   `blur_window` — termasuk jaring pengaman satu detik — **mati total** di iPhone. Yang tersisa
   hanya `visibilitychange` dan `pagehide`.
3. **JavaScript dibekukan beberapa milidetik sesudah halaman disembunyikan.** Laporan pelanggaran
   yang dikirim tepat pada saat itu bisa mati bersama halamannya — `fetch` dengan `keepalive`
   sekalipun, karena WebKit baru menghormatinya sejak Safari 18. Akibatnya server tetap menganggap
   ujian berjalan, dan peserta cukup memuat ulang halaman untuk melanjutkan.

Dua lapis yang menutupnya:

- **`navigator.sendBeacon`.** Setiap laporan kepergian dikirim dua kali: lewat beacon (diserahkan
  ke sistem, jadi selamat dari pembekuan halaman) dan lewat `fetch` (satu-satunya yang membawa
  putusan server kembali ke layar). Keduanya membawa penanda `kejadian` yang sama, sehingga server
  menyatukannya menjadi **satu** baris pelanggaran.
- **Denyut nadi** (`/api/exam/denyut`, `src/lib/denyut.ts`). Selama penjagaan menyala, halaman
  wajib berdenyut tiap **5 detik**. Server tidak menunggu laporan kepergian — ia mengukur jarak
  antara dua denyut. Jarak lebih dari **20 detik** dicatat sebagai `denyut_hilang` dan langsung
  menggugurkan. Laporan bisa hilang di jaringan; diam tidak bisa dipalsukan menjadi hadir.

  Denyut PERTAMA sesudah halaman dimuat ulang tetap dinilai, sehingga memuat ulang tidak menghapus
  jejak kepergian yang baru saja terjadi. Sebaliknya, pembongkaran yang **disengaja** — peserta
  menekan "Selesaikan Subtes" — mengirim pembongkaran eksplisit lebih dulu, jadi jeda antar-subtes
  tidak pernah dituduh.

  Ambang 20 detik adalah kompromi yang disadari (ditetapkan pengguna, 1 September 2026): empat
  denyut boleh hilang berturut-turut sebelum peserta digugurkan. Ketika denyut gagal terkirim,
  peserta diberi **spanduk peringatan berhitung mundur** supaya sempat memperbaiki sambungannya —
  jaringan yang buruk tidak boleh menggugurkan seseorang tanpa ia tahu.

- **Menu tekan-tahan iOS.** Peristiwa `contextmenu` tidak terpancar di iPhone; yang mematikan menu
  Salin/Bagikan/Look Up adalah `-webkit-touch-callout: none` pada `.ruang-ujian` di `globals.css`.
  Tanpa itu peserta bisa menyalin dan membagikan soal **tanpa pernah meninggalkan halaman**,
  sehingga tak satu pun penjagaan lain menangkapnya.

Mesinnya diuji `npm run cek:denyut` (30 pemeriksaan, memakai basis data sementara lewat
`ADZKIA_DB_PATH`).

**Batas kemampuan yang harus dipahami:** peramban tidak mengizinkan halaman ujian melihat *isi*
tab lain. Sistem tahu peserta pergi dan berapa lama, tetapi tidak tahu apa yang dibuka. Yang
**tidak terdeteksi sama sekali**: HP kedua, catatan kertas, tangkapan layar, dan teman di sebelah.
Pengawasan langsung tetap diperlukan. Sebaliknya, telepon masuk dan alarm di iPhone terbaca persis
sama dengan berpindah aplikasi dan **ikut menggugurkan** — peserta perlu diminta menyalakan Mode
Fokus sebelum ujian dimulai.

## 4b. Siklus tryout pekanan

Tryout Real UTBK-SNBT Adzkia digelar **sepekan sekali tiap hari Jumat**. Siklusnya berjalan
sendiri lewat `src/lib/siklus.ts` (penanggalan murni) dan `src/lib/siklus-jadwal.ts` (penjadwal).

### Yang berjalan otomatis

| Kapan | Apa yang terjadi |
|---|---|
| Setiap pergantian pekan | Paket siklus **sebelumnya ditutup** (`status = 'closed'`): hilang dari beranda siswa, tidak bisa dimulai lagi, tetapi halaman hasil dan pembahasannya tetap terbuka |
| Setiap pergantian pekan | Paket siklus berjalan **disiapkan sebagai draft** dengan kode, nama, dan jendela waktunya sudah terisi |
| Setiap saat | Paket buatan tangan yang kodenya sama **diangkat** ke dalam siklus, bukan dibuatkan kembarannya; jendela yang masih kosong ikut diisikan, jendela yang sudah diisi pengelola tidak pernah ditimpa |

**Menerbitkan tidak pernah otomatis.** Paket siklus selalu lahir berstatus `draft`, karena
menerbitkan paket yang naskahnya belum diimpor berarti menyodorkan tryout kosong kepada peserta.
Ada jaring pengaman kedua: jendela waktu paket baru dibuka **Jumat 00.00**, jadi paket yang
telanjur diterbitkan lebih awal pun belum terlihat siswa sampai hari-H.

### Penanggalan

Jumat dihitung dari pekan **Senin–Minggu**, batas yang sama persis dengan papan
"TOAdzkia Pekan Ini". Menyamakan keduanya disengaja: jendela paket berakhir **Minggu 23.59**,
tepat ketika papan peringkatnya berganti, sehingga tidak ada tryout yang nilainya jatuh ke pekan
yang salah. Kode dan nama mengikuti pola yang sudah dipakai pengelola — `TO-4SEP2026`,
`Tryout Real UTBK-SNBT — Jumat, 4 September 2026` — supaya paket otomatis dan paket buatan tangan
tidak bisa dibedakan.

### Perankingan pekanan

**Tidak ada data yang dihapus.** `/to-pekan-ini` menyaring `attempts.finished_at` ke rentang
Senin 00.00 – Minggu 24.00 waktu setempat, jadi papannya kosong sendiri tiap Senin sementara
riwayat lengkapnya tetap utuh di Capaianku (`/rankup`, 12 bulan terakhir).

Bug yang diperbaiki bersama fitur ini: sebelumnya **tidak ada satu pun paket yang punya jendela
waktu**, sehingga setiap paket yang terbit terbuka selamanya. Akibatnya siswa yang mengerjakan
tryout pekan lalu pada hari ini nilainya masuk ke papan peringkat pekan **ini** — karena yang
dihitung tanggal selesainya, bukan paketnya.

### Kolom `packages.siklus` (skema v13)

Berisi tanggal Jumat pelaksanaan (`YYYY-MM-DD`). **NULL berarti di luar siklus** — paket demo,
paket SKD, atau paket khusus buatan pengelola — dan paket semacam itu tidak pernah disentuh
penjadwal, betapapun tuanya. Migrasi v13 mengangkat paket lama ke dalam siklus dengan membaca
tanggal dari kodenya (`TO-28AGU2026` → `2026-08-28`); kode yang tidak berpola dibiarkan di luar.

### Cara penjadwal dijalankan

Tidak ada cron — ini aplikasi Next.js di atas SQLite. Penjadwal menumpang permintaan yang memang
sudah terjadi: `daftarPaketSiswa()` (beranda siswa dan `/mulai`) serta halaman **Admin → Paket**.
Ia dijaga agar tidak berjalan lebih sering daripada **10 menit** (kunci `siklus_cek_terakhir` di
tabel `pengaturan`) dan menelan galatnya sendiri, sehingga beranda siswa tidak pernah gagal tampil
karena urusan penjadwalan. Panel **Siklus pekan ini** di Admin → Paket menampilkan posisi terkini
beserta sisa soal yang belum diimpor.

---

## 5. Dua pintu masuk

| Tombol | Tujuan | Untuk siapa |
|---|---|---|
| **LOGIN SISWA** (`/login`) | Mengerjakan tryout sampai selesai dan menerima skor IRT | Peserta. Masih bisa mendaftar sendiri lewat tautan di halaman ini |
| **LOGIN ADMIN** (`/ADZ-ADM4S`) | Menyusun paket, memasukkan soal + kunci, memantau keamanan | Pengelola. Akun siswa ditolak di sini. **Tanpa tombol** — lihat "Pintu admin disembunyikan" di bawah |
| **HASIL TO REAL UTBK SECARA LIVE** (`/admin/live`) | Papan skor peserta yang menyegar sendiri tiap 10 detik | Pengelola saja, dibuka dari Panel Admin → Skor Live. Tombolnya di halaman `/utbk` sudah dicabut |

### Pintu admin disembunyikan

Atas permintaan pengelola (31 Agustus 2026), **tidak ada satu pun tombol atau tautan menuju
halaman admin** di bagian situs yang dilihat siswa. Yang dicabut: tombol di halaman awal, di
halaman `/skd`, di `Navbar`, dua tautan di footer (termasuk "Hasil TO Real UTBK Live"), tombol
besar "HASIL TO REAL UTBK SECARA LIVE" di hero `/utbk`, dan kalimat "Pengelola? Masuk lewat Login
Admin" di bawah kolom sandi kedua halaman login siswa.

Gantinya, **baris hak cipta di kaki halaman adalah pintunya: ketuk 5 kali beruntun**
(`src/components/PintuPengelola.tsx`). Ketukan disetel ulang bila jedanya lebih dari 1,5 detik,
dan tidak ada penanda visual apa pun supaya tidak terbaca sebagai tautan.

**Alamatnya `/ADZ-ADM4S`** (4 September 2026), menggantikan `/login/admin` yang terlalu mudah
ditebak. Alamat lama DIHAPUS, bukan dialihkan — membiarkannya menjawab membuat penggantian ini
tidak ada gunanya, jadi bookmark lama sekarang menampilkan 404. Konstantanya `RUTE_LOGIN_ADMIN` di
`src/lib/admin-konstanta.ts`; kalau alamatnya diganti lagi, ubah di sana **dan** ganti nama folder
`src/app/ADZ-ADM4S/`. Halaman itu diberi `robots: noindex` supaya tidak muncul di hasil pencarian.

> Ini **penyamaran, bukan pengamanan.** Siapa pun yang menebak alamatnya tetap sampai ke sana;
> yang benar-benar menjaga panel adalah `requireAdmin()` dan kata sandi admin. Sengaja TIDAK
> dibuat `robots.txt` yang men-*disallow* `/admin`, sebab berkas itu justru mengumumkan alamat yang
> mau disembunyikan.

### Tiga akun pengelola, satu akun satu perangkat

Pengelola dipegang **tiga akun tetap** — `admin1@pba.com`, `admin2@pba.com`, `admin3@pba.com`.
Daftarnya ada di `scripts/akun-admin.mjs`; jalankan `npm run akun:admin` untuk meninjau rencananya,
lalu `npm run akun:admin -- --tulis` untuk menyimpan. Skrip itu juga **menghapus akun admin di luar
daftar** — begitulah `admin@pintarbersamaadzkia.com` yang lama dipensiunkan pada 4 September 2026.

**Satu akun admin hanya bisa dipakai di satu perangkat pada satu waktu.** Login yang berhasil
menitipkan satu baris di tabel `admin_sesi` berisi `sid` acak, dan `sid` yang sama ikut
ditandatangani ke dalam cookie sesi. Selama baris itu hidup, login kedua dengan akun yang sama
**ditolak** — perangkat pertama tidak ditendang, sebab admin yang sedang menyusun paket tidak
boleh terputus di tengah jalan.

Katup pengamannya ada di `JEDA_MENGANGGUR_MENIT` (`src/lib/sesi-admin.ts`, sekarang **15 menit**):
sesi yang tidak menunjukkan aktivitas selama itu dianggap ditinggalkan dan boleh diambil alih.
Tanpa katup ini, admin yang menutup browser tanpa menekan Keluar — atau kehabisan baterai —
mengunci akunnya sendiri sampai cookie kedaluwarsa 30 hari kemudian. Setiap halaman admin yang
dibuka menyegarkan penanda aktivitas, jadi sesi yang benar-benar dipakai tidak akan pernah direbut.

Begitu sesi diambil alih, cookie perangkat lama langsung mati: `sid`-nya tidak cocok lagi, dan
`getSession()` memperlakukannya sebagai tidak login. Melepas paksa dari server bila perlu:

```bash
sqlite3 /srv/adzkia/data/adzkia.db "DELETE FROM admin_sesi;"
```

Papan live menampilkan peserta yang sedang mengerjakan (baris kuning, skor **sementara** dari
subtes yang sudah ditutup) dan yang sudah selesai (skor final), lengkap dengan progres subtes dan
jumlah pelanggaran. Skor sementara dihitung di memori, tidak disimpan, dan tidak memengaruhi
peringkat resmi.

### Menghapus akun peserta

Tombol **Hapus akun** ada di kolom Aksi halaman `/admin/peserta` dan di kepala halaman detail
peserta. Penghapusannya **permanen dan tanpa tong sampah**: berjalan lewat `ON DELETE CASCADE`,
sehingga pengerjaan tryout, jawaban, hasil per subtes, sesi Warung beserta jawabannya, catatan
pelanggaran, izin susulan, dan pilihan program studi milik akun itu ikut hilang. Bank soal, paket,
dan data peserta lain tidak tersentuh. Dialog konfirmasinya menyebutkan angka jejak yang akan
hilang, supaya keputusannya diambil dengan mata terbuka.

Tiga hal yang sengaja ditolak `hapusPengguna()` di `src/lib/admin.ts`:

| Ditolak | Alasan |
|---|---|
| Akun sendiri | Supaya pengelola tidak mengunci dirinya sendiri di luar panel |
| Admin terakhir | Sama seperti larangan menurunkan peran admin terakhir |
| Peserta yang **sedang** mengerjakan tryout atau Warung | Menghapusnya di tengah ujian mematikan halaman di HP siswa tanpa nilai tersimpan. Tunggu selesai, atau gugurkan dulu lewat halaman Live |

Yang dibaca sebagai "sedang mengerjakan" adalah **timer**, bukan status `ongoing`. Sesi yang
ditinggalkan peserta tetap berstatus `ongoing` selamanya — di basis data sungguhan ada sesi
telantar dari berhari-hari lalu — dan kalau statusnya saja yang dipakai, justru akun telantar itu
yang tidak akan pernah bisa dihapus. Sebuah sesi disebut hidup bila masih ada subtes yang belum
ditutup dan tenggatnya belum lewat.

Siswa yang akunnya dihapus sementara ia masih login otomatis terlempar ke halaman masuk:
`getSession()` selalu mencocokkan ulang id di cookie dengan baris `users`, dan baris itu sudah
tidak ada.

Sebelum membersihkan **banyak** akun sekaligus, salin dulu `data/adzkia.db` — lihat bagian Backup.

## 6. Warung Soal — latihan harian per subtes

Ruang latihan terpisah dari tryout, dibuka lewat tombol **WARUNG SOAL** di halaman awal
(`/warung`). Akunnya sama dengan akun tryout: NISN + kata sandi yang dibagikan pengelola.

Alurnya: **pilih subtes → pilih paket → kerjakan → nilai + pembahasan → papan peringkat**.

| Hal | Aturan |
|---|---|
| Subtes | Tujuh subtes UTBK yang sama dengan tryout (PU, PPU, PBM, PK, LIT Indonesia, LIT Inggris, PM) |
| Paket | **30 paket tiap subtes**: 1–10 Easy, 11–20 Medium, 21–30 Hard. Tingkat dihitung dari nomor paket, tidak disimpan |
| Poin | Easy 10, Medium 20, Hard 35 per jawaban benar |
| Isi paket | Sama dengan jumlah soal subtes aslinya: PU & LIT Indonesia 30 soal, sisanya 20 soal. Tiap paket berisi **3 butir pilihan ganda kompleks (Benar/Salah)** dan 1–2 **isian singkat**; selebihnya pilihan ganda |
| Waktu | **Satu timer per paket** sepanjang durasi resmi subtesnya (PU 30 menit, PPU 15, PBM 25, PK 20, LIT Indo 45, LIT Ing 30, PM 30). Siswa bebas berpindah antar soal |
| Terbuka | **Paket 1 selalu terbuka; paket berikutnya terbuka begitu siswa menuntaskan paket sebelumnya.** Tidak ada tombol terbitkan — sebuah paket dianggap siap begitu jumlah soalnya lengkap sesuai target subtes |
| Pengulangan | Bebas, tanpa batas harian |
| Peringkat | Per subtes. Yang dijumlahkan hanya **nilai terbaik tiap paket**, jadi mengulang paket yang sama tidak menumpuk poin. Waktu total jadi pemisah saat poin sama |

Tidak ada layar penuh, tidak ada pengguguran, dan tidak ada penilaian IRT di sini — ini ruang
berlatih, bukan ruang ujian. Kunci jawaban tidak pernah dikirim ke peramban selama sesi
berlangsung; penilaian baru dilakukan server saat sesi ditutup (`selesaikanSesi()` di
`src/lib/warung.ts`). Sesi yang waktunya habis ditutup sendiri saat halamannya dibuka lagi,
sehingga siswa yang menutup peramban tetap menerima nilai atas apa yang sempat dijawab.

**Untuk pengelola.** Menu **Admin → Warung Soal** menampilkan ketujuh subtes beserta
kelengkapan paketnya. Kerangka 210 paket disiapkan sekali lewat tombol *Siapkan kerangka*;
setelah itu tiap paket tinggal diisi dengan mengetik manual atau **Impor Word/Excel** — tidak
ada langkah menerbitkan, karena paket terbuka sendiri begitu soalnya lengkap. Naskah `.docx`
ditulis mengalir seperti naskah tryout, dengan penanda `Tipe: PGK` atau `Tipe: IS` tepat
sebelum butir yang bukan pilihan ganda biasa.

Nomor soal boleh **diketik** (`1.`) maupun memakai **penomoran otomatis Word** — bentuk kedua
inilah yang muncul sendiri begitu Enter ditekan, dan teksnya tidak lagi memuat angka apa pun.
Keduanya diterima: naskah berpenomoran otomatis dinomori ulang urut dari 1 saat impor, dan
pilihan yang ditulis sebagai daftar bertakuk di bawah soalnya terbaca sebagai A, B, C. Cetak
tebal, miring, pangkat, dan indeks dipertahankan sampai ke dalam pilihan — penting untuk PK dan
PM, karena `3<sup>2</sup>` dan `32` adalah dua jawaban yang berbeda.

Soal Warung yang butuh gambar memakai kotak unggah yang sama dengan bank soal tryout — berkas
dipilih dari komputer, diseret, atau ditempel (Ctrl+V), maksimal 1 MB, dan mendarat di
`public/warung/<SUBTES>-<nomor>/`. Rinciannya di [Gambar soal: unggah manual](#gambar-soal-unggah-manual).

Akibatnya, **paket yang baru terisi sebagian tidak akan pernah muncul di layar siswa** — panel
admin menampilkannya sebagai *Disiapkan* beserta kekurangannya (mis. "kurang 4 soal lagi").

**Data awal.** `npm run seed:warung` menyiapkan kerangka 210 paket dan mengisi **Paket 1
ketujuh subtes** (160 soal, termasuk diagram batang, diagram lingkaran, grafik garis, dan
flowchart untuk PK & PM) Soal itu karangan sendiri untuk latihan, bukan naskah
tryout Adzkia. Paket 2–30 sengaja dibiarkan kosong, jadi untuk sekarang siswa berhenti setelah
menuntaskan Paket 1 tiap subtes.

Mesinnya diuji lewat `npm run cek:warung` (87 pemeriksaan). Tabelnya berdiri sendiri
(`warung_paket`, `warung_soal`, `warung_sesi`, `warung_jawaban`) dan tidak menumpang tabel
tryout, karena siklus hidup serta cara menilainya memang berbeda.

## 7. Menerbitkan ke pintarbersamaadzkia.com

Aplikasi ini menyimpan datanya pada **file SQLite di disk**, sehingga harus dijalankan pada server
yang punya penyimpanan permanen — VPS, atau layanan container dengan volume. Platform serverless
tanpa disk permanen (mis. deploy Vercel standar) tidak cocok karena file database akan hilang.

### Langkah build & start

```bash
git pull                     # ambil versi terbaru di server
npm ci                       # pasang dependensi persis sesuai package-lock.json
npm run build                # build produksi
npm run start -- -p 3000     # jalankan (default port 3000)
```

Jalankan proses `npm run start` di bawah pengelola proses seperti **pm2** atau unit **systemd**
supaya otomatis hidup lagi setelah server di-restart, lalu pasang **Nginx/Caddy** sebagai reverse
proxy dari `https://pintarbersamaadzkia.com` ke `http://127.0.0.1:3000` sekaligus pemasang
sertifikat HTTPS. HTTPS wajib: cookie sesi diberi atribut `secure` saat `NODE_ENV=production`,
jadi login tidak akan bertahan bila situs diakses lewat HTTP biasa.

### Variabel lingkungan

Salin `.env.example` menjadi `.env.local` di server, lalu isi:

| Variabel | Wajib | Keterangan |
|---|---|---|
| `ADZKIA_SECRET` | **Ya** | Kunci penanda-tangan JWT sesi login. Harus string acak panjang dan dirahasiakan. Bila tidak diisi, aplikasi memakai kunci pengembangan bawaan yang **tidak aman**. Menggantinya akan membuat semua sesi yang sedang berjalan logout. |
| `ADZKIA_DB_PATH` | Tidak | Lokasi file database bila ingin dipindah dari `./data/adzkia.db`, misalnya ke volume terpisah. |
| `NODE_ENV` | Otomatis | Diisi `production` oleh `npm run start`. |

Membuat nilai `ADZKIA_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Backup

Seluruh data peserta — akun, paket, soal, jawaban, hasil, dan peringkat — berada di satu file:

```
data/adzkia.db
```

Karena SQLite berjalan pada mode WAL, di sampingnya ada `data/adzkia.db-wal` dan
`data/adzkia.db-shm`. **Backup ketiganya bersamaan**, atau lebih aman gunakan perintah backup
resmi SQLite saat aplikasi sedang jalan:

```bash
sqlite3 data/adzkia.db ".backup 'backup/adzkia-$(date +%F).db'"
```

Sarannya: backup otomatis harian lewat cron, disimpan di luar server, dan sesekali diuji dengan
cara memulihkannya ke mesin lain. Folder `data/` sudah masuk `.gitignore` sehingga database tidak
pernah ikut ter-commit ke repositori.

### Setelah rilis pertama

1. Jalankan `npm run seed` sekali di server agar akun admin terbentuk.
2. Masuk sebagai admin, lalu **ganti kata sandi seluruh akun demo**.
3. Hapus atau nonaktifkan paket `TO-DEMO-1` bila sudah tidak diperlukan, dan terbitkan paket
   tryout yang sebenarnya.

---

## 8. Language Skill — IELTS

Jalur latihan bahasa Inggris, terpisah dari tryout UTBK dan SKD. Siswa masuk lewat tombol
**LANGUAGE SKILL** di beranda memakai NISN dan kata sandi tryout — tidak ada akun baru.

> **TERBIT sejak 10 September 2026.** Sampai 9 September fitur ini sengaja hanya hidup di
> komputer pengelola; sekarang `/language`, `/ielts`, dan menu admin IELTS tampil di
> pintarbersamaadzkia.com seperti jalur lain. Gerbangnya (`wajibFiturLanguage()`) masih ada dan
> **jangan dihapus** — ia sekarang berjalan sebagai REM DARURAT: `ADZKIA_LANGUAGE_SKILLS=0` di
> `.env.local` server menyembunyikan seluruh jalur ini tanpa menerbitkan ulang aplikasi, dan
> alamat lokal (localhost, 127.x, 192.168.x, 10.x, 172.16–31.x) tetap membukanya supaya rem itu
> tidak sekalian mematikan laptop tempat soalnya disiapkan. `=1` memaksa tampil di mana pun.
> Uji gerbangnya: `npm run cek:language`.

### Bentuk ujiannya

Jumlah butirnya mengikuti IELTS Academic internasional:

| Subtes    | Bagian                | Butir | Bentuk butir yang didukung          | Penilaian |
| --------- | --------------------- | ----- | ----------------------------------- | --------- |
| Listening | 4 Recording           | 40    | isian singkat, pilihan ganda A–D    | mesin     |
| Reading   | 3 Passage             | 40    | True/False/Not Given, PG, isian     | mesin     |
| Writing   | Task 1 + Task 2       | 2     | karangan                            | guru      |
| Speaking  | Part 1–3              | 3     | karangan (dijawab tertulis)         | guru      |

Subtes dikerjakan **berurutan**: satu subtes hanya terbuka setelah yang sebelumnya ditutup, dan
subtes yang sudah ditutup tidak bisa dibuka lagi. Timernya milik server — menutup halaman,
mengganti jam komputer, atau berpindah perangkat tidak menambah satu detik pun.

### Lama pengerjaan: diatur atau diacak per paket

Sejak skema v20, tiap paket punya waktunya sendiri di kolom `ielts_paket.menit_*`. `NULL`
berarti "pakai bawaan aplikasi", dan itulah keadaan paket yang waktunya belum pernah disentuh.
Yang berlaku saat ujian dibuka **selalu** hasil `menitPaket()`; jangan membaca kolomnya langsung.

Di **Admin → IELTS → paket** tersedia empat cara mengisinya:

- diketik sendiri, 5–180 menit tiap subtes;
- **Standar Adzkia** — 60 / 60 / 30 / 20, angka yang ditetapkan pengelola 9 September 2026 dan
  tetap menjadi bawaan;
- **Standar IELTS internasional** — 30 / 60 / 60 / 14, persis seperti tes aslinya;
- **🎲 Acak** — mengundi tiap subtes dalam rentang yang masuk akal (Listening 30–60,
  Reading 50–70, Writing 30–60, Speaking 15–25), selalu kelipatan lima menit, supaya tiap paket
  latihan berbeda iramanya dan siswa tidak menghafalnya.

Mengubah waktu paket **tidak menggeser tenggat siswa yang subtesnya sudah berjalan**: tenggat
dihitung sekali saat subtes dibuka. Angka yang berlaku ikut tertulis di halaman tata tertib yang
disetujui siswa sebelum mulai.

### Mengisi soal: ketik satu-satu atau unggah naskah

Tiap subtes punya halamannya sendiri (**Admin → IELTS → paket → subtes**) berisi editor butir,
kotak bagian (judul, instruksi, teks bacaan, **transkrip rekaman**), pengunggah berkas suara, dan
**pengunggah naskah**.

Naskah boleh **.docx**, **.pdf**, atau **.txt** — satu berkas untuk satu subtes. Keduanya dibaca
pustaka buatan sendiri (`src/lib/docx.ts` dan `src/lib/pdf-teks.ts`), tanpa dependensi tambahan.
PDF harus PDF asli; hasil pindaian ditolak dengan pesan yang menyebutkan sebabnya.

Alurnya dua langkah — **Baca & pratinjau**, lihat tabelnya, baru **Simpan** — karena naskah dari
guru hampir tidak pernah rapi pada unggahan pertama.

Bentuk naskahnya dirancang supaya bisa diketik guru di Word tanpa belajar apa pun yang baru:

```
RECORDING 1: Joining the Riverside Community Centre
TRANSCRIPT:
WOMAN: Good morning, Riverside Community Centre, Amelia speaking.
...
QUESTIONS: Questions 1-10. Write ONE WORD AND/OR A NUMBER for each answer.

1. Surname: .................
ANSWER: Whitcombe

2. What does the man decide to do?
A. Cancel the booking
B. Move to another hall
C. Pay the extra fee
D. Ask for a refund
ANSWER: C

3. The hall is open on public holidays.
ANSWER: NOT GIVEN
```

Aturan singkatnya (versi lengkapnya ada di tombol *Aturan penulisan naskah* pada halamannya):

- judul bagian: `SECTION 1:` / `RECORDING 1:` / `PASSAGE 2:` / `TASK 1:` / `PART 3:`;
- `INSTRUCTION:` untuk petunjuk siswa, `PASSAGE:` untuk teks bacaan, `TRANSCRIPT:` untuk naskah
  rekaman (tidak pernah ditampilkan kepada siswa);
- **sesudah blok `PASSAGE:` atau `TRANSCRIPT:`, wajib ada satu baris `QUESTIONS:` sebelum soal
  pertama.** Selama blok bacaan belum ditutup, semua baris berangka dianggap bagian dari bacaan —
  itulah yang mencegah kalimat seperti "12 kilometres of track were laid" berubah jadi soal;
- kunci ditulis `ANSWER: ...` di bawah soalnya, atau dikumpulkan di akhir berkas di bawah judul
  `ANSWER KEY`; keduanya boleh dicampur;
- isian singkat boleh punya beberapa jawaban sah: `ANSWER: coach|bus`. Huruf besar-kecil dan
  spasi berlebih diabaikan, **ejaan tetap dihitung** — sama seperti IELTS asli;
- bentuk butir tidak perlu ditulis. Ada pilihan A–D berarti pilihan ganda, kunci
  TRUE/FALSE/NOT GIVEN berarti TFNG, Writing/Speaking tanpa kunci berarti karangan, sisanya isian
  singkat. `TYPE: essay` memaksanya bila perlu.

Tiga mode penomoran tersedia, sama seperti impor bank soal UTBK: **lanjutan** (nomor berkas
diabaikan, mengisi nomor kosong terkecil — untuk mengunggah satu subtes bertahap), **ikuti nomor
berkas**, dan **ikuti nomor berkas & timpa**. Butir yang pertanyaannya sudah ada otomatis
dilewati, jadi berkas yang terunggah dua kali tidak menggandakan soal.

Kunci yang mustahil dikerjakan **ditandai galat dan tidak disimpan**, bukan diterima diam-diam:
kunci pilihan ganda di luar A–D, isian singkat tanpa kunci, dan kunci YES/NO — bentuk IELTS yang
belum didukung ruang ujian, yang hanya menyediakan TRUE/FALSE/NOT GIVEN.

### Paket contoh siap pakai

```bash
npm run naskah:ielts   # mencetak naskah di scripts/naskah-ielts/ menjadi .docx dan .pdf
npm run seed:ielts     # memasukkannya ke paket IELTS-DEMO-1 (aman diulang)
```

`scripts/naskah-ielts/` berisi naskah karangan sendiri untuk latihan — **bukan** salinan naskah
ujian IELTS mana pun: 4 rekaman Listening berikut transkripnya, 3 bacaan Reading, 2 tugas Writing,
dan 3 bagian Speaking. Berkas `.docx` dan `.pdf`-nya bisa langsung dipakai mencoba jalur unggah.

`seed:ielts` memasukkannya **lewat pengurai naskah yang sama** dengan tombol impor di panel admin
— bukan `INSERT` langsung — supaya tidak ada jalan pintas yang diam-diam menerima naskah yang
sebenarnya ditolak aplikasi.

### Rekaman Listening dibangkitkan dari transkripnya

```bash
npm run rekaman:ielts                  # empat rekaman untuk paket IELTS-DEMO-1
npm run rekaman:ielts -- --nomor 3     # hanya Recording 3
npm run rekaman:ielts -- --timpa       # ganti rekaman yang sudah terpasang
```

Satu rekaman per Recording — empat rekaman untuk empat puluh butir. Suaranya dibangkitkan **mesin
pengucap bawaan Windows** (SAPI) lewat `scripts/tts-ssml.ps1`: tidak ada layanan luar, tidak ada
kunci API, dan tidak satu byte pun naskah soal meninggalkan komputer pengelola. Keluarannya WAV
16 kHz mono, sekitar 6 MB untuk tiga menit — jauh di bawah batas 25 MB.

Sumbernya kolom `transkrip`, bukan berkas naskah, sehingga rekaman selalu mengikuti transkrip yang
benar-benar dipakai paket itu. Hasilnya disimpan lewat `simpanAudio()` dan dipasang dengan
`pasangAudio()` — fungsi yang sama persis dengan tombol unggah admin, jadi tidak bisa dibedakan
dari rekaman yang diunggah tangan.

**Siapa bersuara apa.** Baris pertama transkrip boleh menyebutkannya, dan baris itu tidak ikut
dibacakan:

```
VOICES: TUTOR=male, PRIYA=female, MARCUS=male
VOICES: narrator=female
```

Tanpa baris itu, label `WOMAN:` dan `MAN:` dikenali sendiri, dan pembicara lain dibagi bergantian
menurut urutan munculnya. Pembicara ketiga yang kebagian suara yang sama diberi nada lebih rendah
supaya tetap bisa dibedakan telinga — dua orang bersuara persis sama dalam satu dialog membuat
soalnya mustahil dijawab.

Tiap rekaman dibuka pengumuman baku IELTS ("Section 1 … answer questions 1 to 10 … you will hear
the recording once only") dan ditutup "That is the end of section 1". Pengumuman itu **tidak**
ikut tersimpan ke kolom transkrip: yang di sana naskah percakapannya saja, karena itulah yang
dibacakan pengawas bila rekamannya tidak dipakai.

Suaranya suara sintetis, bukan penutur asli — cukup untuk latihan mencatat dan menangkap angka,
tetapi bukan pengganti rekaman studio. Rekaman buatan sendiri tetap bisa diunggah menimpanya lewat
panel admin kapan saja.

### Penilaian: band 0–9

Listening dan Reading dinilai mesin lalu diubah menjadi band lewat **tabel konversi resmi**, dan
keduanya memakai tabel yang **berbeda** — Academic Reading menuntut jawaban benar lebih banyak
untuk band yang sama (31 benar: Listening 7.0, Reading 6.5).

Writing dan Speaking dinilai guru di **Admin → IELTS → paket → daftar nama → Nilai**. Halamannya
menaruh jawaban siswa berdampingan dengan empat kriteria resmi IELTS, masing-masing 0–9 setengah
demi setengah:

- **Writing** — Task Achievement/Response, Coherence and Cohesion, Lexical Resource, Grammatical
  Range and Accuracy. Dinilai **per Task**, lalu digabung `(Task 1 + 2 × Task 2) ÷ 3` seperti
  IELTS asli.
- **Speaking** — Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy,
  Pronunciation. Dinilai **sekali** untuk seluruh wawancara.

Band tiap bagian adalah rata-rata keempat kriterianya; guru tidak pernah diminta menghitung
apa pun. Kriteria yang belum diisi membuat bagiannya belum berband — **bukan** nol, sebab nol
adalah band yang sah di IELTS.

Band keseluruhan adalah rata-rata keempat subtes, dibulatkan menurut aturan IELTS: rata-rata yang
berakhiran ,25 naik ke setengah band berikutnya dan yang berakhiran ,75 naik ke band bulat
berikutnya. Selama masih ada subtes yang belum berband, halaman hasil menulis **"band sementara"**
berikut nama subtes yang ditunggu — subtes kosong tidak pernah dihitung sebagai nol.

### Keamanan ujian — sama persis dengan TryOut UTBK-SNBT

Sejak **10 September 2026** ruang ujian IELTS berada di bawah penjagaan yang SAMA dengan ruang
ujian TryOut UTBK-SNBT hasil revisi 7–9 September. Bukan penjagaan yang mirip: ambangnya dibaca
dari `src/lib/denyut.ts` yang sama, jenis pelanggarannya dari `src/lib/pelanggaran-jenis.ts` yang
sama, dan penolong perambannya dari `src/lib/penjagaan-peramban.ts` yang sama. Seluruh isi
bagian 4 di atas — layar penuh, ALT+TAB, ESC di komputer, denyut nadi, anggaran kepergian,
Screen Wake Lock, penjagaan iPhone/iPad — berlaku apa adanya di sini.

Yang berbeda hanya tiga, dan ketiganya memang harus berbeda:

| Hal | UTBK / SKD | IELTS |
|---|---|---|
| Rute | `/api/exam/violation`, `/api/exam/denyut` | `/api/language/ielts/violation`, `/api/language/ielts/denyut` |
| Tabel | `violations`, `attempts` | `ielts_pelanggaran`, `ielts_pengerjaan` |
| Nama ujian di layar GAGAL | "TryOut Real UTBK-SNBT" / "SKD Kedinasan" | "IELTS" |

Tabelnya sengaja terpisah, bukan satu tabel dengan kolom penanda jalur: `violations.attempt_id`
menunjuk `attempts(id)` lewat kunci asing ON DELETE CASCADE, dan kunci asing itulah yang menjamin
catatan pelanggaran ikut terhapus saat pengelola menghapus akun peserta. Satu kolom tidak bisa
menunjuk dua tabel induk.

**Panel pengawasnya `/admin/ielts/keamanan`** — padanan `/admin/pelanggaran`. Dua tabel (rekap per
peserta, lalu rincian tiap kejadian) dan dua tombol yang berpasangan: **Hentikan** untuk pengawas
yang melihat langsung apa yang tidak bisa dilihat halaman ujian (HP kedua, catatan kertas, teman
di sebelah), dan **Buka sesi ulang** sebagai katup pengamannya. Sesi ulang menaikkan `ronde`,
membersihkan jawaban dan timer, tetapi **catatan pelanggaran ronde lama tetap tersimpan** sebagai
bukti — yang membuatnya tidak lagi membebani peserta adalah nomor rondenya, bukan penghapusannya.

Peserta membaca aturannya lebih dulu: pasal **"Screen monitoring — read this carefully"** di
`/language/ielts/rules` menyebut setiap sebab yang menghentikan ujian, dan angkanya diambil dari
konstanta yang sama dengan yang dipakai server memutuskan.

> **Satu utang yang belum dibayar.** `src/components/exam/RuangUjian.tsx` masih memuat salinan
> logika penjagaan di badannya sendiri; ia sengaja tidak ikut dipindahkan ke `usePenjagaIelts`
> pada 10 September 2026 karena tryout sungguhan berjalan pekan itu juga. Sampai pemindahan itu
> dikerjakan, **setiap perbaikan penjagaan harus dipasang di KEDUA tempat.** Yang sudah menjadi
> satu sumber: penolong perambannya (`penjagaan-peramban.ts`), ambangnya (`denyut.ts`), dan
> daftar jenis pelanggarannya (`pelanggaran-jenis.ts`).

### Perintah pemeriksaan

```bash
npm run cek:ielts          # mesin ujian: urutan subtes, timer server, penilaian, band, nilai guru
npm run cek:naskah-ielts   # impor naskah: pengurai, pembaca .docx, pembaca .pdf
npm run cek:language       # gerbang fitur + rem darurat
npm run cek:jaga           # penjagaan ujian IELTS = penjagaan ujian UTBK, ambang demi ambang
```

`cek:naskah-ielts` membaca naskah sungguhan di `scripts/naskah-ielts/` dari **ketiga** bentuk
berkas dan menuntut hasilnya sama persis — itulah yang membuktikan pembaca .docx dan pembaca PDF
buatan sendiri bekerja.

### Tabel `ielts_*`

Berdiri di atas tabelnya sendiri, terpisah dari `packages`/`questions`/`attempts`: tryout UTBK dan
SKD melayani ujian sungguhan tiap pekan, dan satu jalur ujian tidak boleh punya jalan untuk
menyentuh hasil jalur yang lain.

| Tabel              | Isi                                                                 |
| ------------------ | ------------------------------------------------------------------- |
| `ielts_paket`      | paket, status terbit, jendela waktu, dan `menit_*` per subtes        |
| `ielts_seksi`      | Recording/Passage/Task/Part: judul, instruksi, bacaan, transkrip, rekaman |
| `ielts_soal`       | butir: tipe, pertanyaan, opsi (JSON), kunci                          |
| `ielts_pengerjaan` | satu baris per peserta per paket, berikut waktu persetujuan aturan   |
| `ielts_subtes`     | timer per subtes: `mulai_at`, `deadline_at`, `selesai_at`            |
| `ielts_jawaban`    | jawaban peserta                                                      |
| `ielts_pelanggaran`| catatan keamanan ujian (skema v21) — kembar `violations`              |
| `ielts_nilai_guru` | kriteria Writing/Speaking (JSON), catatan guru, dan penilainya       |

---

## Catatan khusus versi PostgreSQL

Seluruh isi dokumen di atas berlaku apa adanya. Bagian ini hanya mencatat hal-hal
yang **berbeda dari versi SQLite** yang berjalan di pintarbersamaadzkia.com.

### Berkas basis data

| Berkas | Untuk apa | Kapan dijalankan |
|---|---|---|
| `db/01-adzkia-postgres.sql` | Seluruh skema **beserta datanya**, hasil terjemahan basis data SQLite. Dihasilkan `npm run ekspor:pg` | Sekali, pada basis data yang masih **kosong** |
| `db/02-penjagaan-ielts.sql` | Skema v21: tabel `ielts_pelanggaran` dan enam kolom penjagaan pada `ielts_pengerjaan` | Hanya untuk basis data yang telanjur dibuat dari berkas 01 versi lama. Berkas 01 sekarang sudah memuatnya |
| `db/03-fungsi-sqlite.sql` | Fungsi padanan `datetime()`, `julianday()`, `strftime()` | **Wajib, selalu** — lihat di bawah |

Ketiganya aman dijalankan berulang kali.

### Mengapa `db/03` wajib

Kode ini lahir di atas SQLite, dan lebih dari seratus querynya memanggil fungsi
waktu bawaan SQLite. PostgreSQL tidak punya satu pun di antaranya, jadi tanpa
berkas itu query-query tersebut berhenti dengan *"function datetime(unknown,
unknown) does not exist"* — bukan salah hitung, melainkan gagal total. Yang
terkena bukan fitur pinggiran: penjagaan ujian, denyut peserta, sisa waktu
subtes, jendela jadwal paket, siklus pekanan, sesi perangkat, dan Warung.

Satu hal yang perlu diketahui sebelum menyentuhnya: pengubah **`'localtime'` dan
`'utc'` sengaja tidak melakukan apa-apa**. Pada SQLite waktu disimpan sebagai
teks polos yang tidak tahu zona, sehingga kedua pengubah itu perlu menggesernya
sendiri. Di sini kolomnya `timestamptz` — nilainya sudah menunjuk satu saat yang
pasti. Menggeser lagi justru membuat waktunya salah tujuh jam.

### Lapisan data menjadi asinkron

`all`, `one`, `run`, `tx` sekarang memulangkan Promise, karena tidak ada klien
PostgreSQL yang sinkron. Penjalarannya dikerjakan `scripts/kodemod-async.mjs`
memakai pengurai TypeScript, bukan cari-ganti teks. Dua alat pendampingnya:

```bash
node scripts/kodemod-async.mjs          # tinjau saja
node scripts/kodemod-async.mjs --tulis  # benar-benar menyunting
node scripts/kodemod-map-async.mjs      # HANYA tinjau — lihat peringatan di bawah
```

> **`kodemod-map-async.mjs` jangan dijalankan dengan `--tulis` begitu saja.** Ia
> melaporkan ulang titik yang SUDAH dibungkus `await Promise.all(...)`, sehingga
> menjalankannya lagi akan membungkusnya dua kali. Pakai keluarannya sebagai
> daftar tinjauan, lalu kerjakan dengan tangan.

### Yang belum selesai dipindahkan

- **Berkas uji `src/lib/__checks__/*.mjs` belum ikut dijadikan asinkron.**
  `kodemod-async.mjs` hanya memproses `.ts`/`.tsx`. Akibatnya sebagian besar
  perintah `npm run cek:*` yang menyentuh basis data gagal — termasuk
  `cek:jaga`, `cek:ielts`, `cek:denyut`, `cek:warung`, `cek:peserta`,
  `cek:siklus`, `cek:skd`. Yang tidak menyentuh basis data tetap lulus
  (`cek:language`, `cek:naskah-ielts`, `cek:db`, `cek:cache`). Skrip pemeriksa
  itu juga tidak memuat `.env` sendiri; jalankan dengan `DATABASE_URL`
  sudah terpasang di lingkungan.

- **Papan peringkat Warung memakai SQL khas SQLite.** `src/lib/warung.ts` baris
  710, 836, 874, dan 920 mengambil kolom polos di samping `MAX()` — SQLite
  memulangkan kolom itu dari baris pemilik nilai maksimum, PostgreSQL menolak
  querynya. Memperbaikinya bukan menambah kolom ke `GROUP BY`, melainkan menulis
  ulang dengan `DISTINCT ON` atau fungsi jendela, dan itu keputusan tersendiri.
