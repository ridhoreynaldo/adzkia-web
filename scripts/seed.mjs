/**
 * ADZKIA SMART — skrip data awal.
 *
 *   node scripts/seed.mjs            # idempoten, aman dijalankan berkali-kali
 *   node scripts/seed.mjs --reset    # kosongkan dulu data lama, lalu isi ulang
 *
 * Node murni (tanpa TypeScript) memakai `node:sqlite` bawaan Node 22+/24.
 * Database yang dibuka sama dengan yang dipakai aplikasi: <root>/data/adzkia.db
 */
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB_DIR = path.join(ROOT, "data");
const DB_PATH = process.env.ADZKIA_DB_PATH ?? path.join(DB_DIR, "adzkia.db");
const RESET = process.argv.includes("--reset");

/* ------------------------------------------------------------------ *
 * Skema — salinan persis SCHEMA pada src/lib/db.ts
 * ------------------------------------------------------------------ */
const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nama          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'siswa',   -- 'siswa' | 'admin'
  asal_sekolah  TEXT,
  no_hp         TEXT,
  target_ptn    TEXT,
  target_prodi  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Kunci satu-akun-satu-perangkat untuk pengelola. Lihat src/lib/sesi-admin.ts.
CREATE TABLE IF NOT EXISTS admin_sesi (
  user_id     INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  sid         TEXT NOT NULL,
  alat        TEXT,
  masuk_at    TEXT NOT NULL DEFAULT (datetime('now')),
  terakhir_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS packages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kode        TEXT NOT NULL UNIQUE,
  nama        TEXT NOT NULL,
  deskripsi   TEXT,
  status      TEXT NOT NULL DEFAULT 'draft',      -- 'draft' | 'published' | 'closed'
  mulai_at    TEXT,
  selesai_at  TEXT,
  acak_soal   INTEGER NOT NULL DEFAULT 0,
  tampil_pembahasan INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS questions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  package_id  INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  subtes      TEXT NOT NULL,                      -- PU | PPU | PBM | PK | LBIND | LBING | PM
  nomor       INTEGER NOT NULL,
  tipe        TEXT NOT NULL DEFAULT 'PG',         -- PG | PGK | IS
  level       TEXT NOT NULL DEFAULT 'C3',         -- C3 | C4
  stimulus    TEXT,                               -- bacaan/teks pengantar (opsional, HTML sederhana)
  pertanyaan  TEXT NOT NULL,
  gambar_url  TEXT,
  opsi        TEXT NOT NULL DEFAULT '[]',         -- JSON array of string (kosong untuk tipe IS)
  kunci       TEXT NOT NULL,                      -- PG: "A" | PGK: JSON ["A","C"] | IS: teks jawaban
  pembahasan  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (package_id, subtes, nomor)
);

CREATE TABLE IF NOT EXISTS attempts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_id    INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'ongoing',  -- 'ongoing' | 'finished'
  subtes_aktif  TEXT,
  started_at    TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at   TEXT,
  total_skor    REAL,
  UNIQUE (user_id, package_id)
);

-- Timer per subtes: satu baris per subtes yang sudah/ sedang dikerjakan.
CREATE TABLE IF NOT EXISTS attempt_subtes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id  INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  subtes      TEXT NOT NULL,
  mulai_at    TEXT NOT NULL DEFAULT (datetime('now')),
  deadline_at TEXT NOT NULL,
  selesai_at  TEXT,
  UNIQUE (attempt_id, subtes)
);

CREATE TABLE IF NOT EXISTS answers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id  INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  jawaban     TEXT,                                -- PG: "A" | PGK: JSON | IS: teks
  ragu        INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS results (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  subtes     TEXT NOT NULL,
  benar      INTEGER NOT NULL DEFAULT 0,
  salah      INTEGER NOT NULL DEFAULT 0,
  kosong     INTEGER NOT NULL DEFAULT 0,
  skor       REAL NOT NULL DEFAULT 0,              -- skala 0-1000 hasil IRT
  theta      REAL NOT NULL DEFAULT 0,              -- kemampuan laten (logit)
  UNIQUE (attempt_id, subtes)
);

-- Parameter butir hasil kalibrasi IRT (di-update tiap kali skoring dijalankan).
CREATE TABLE IF NOT EXISTS item_params (
  question_id INTEGER PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  b           REAL NOT NULL DEFAULT 0,             -- tingkat kesulitan
  p_benar     REAL NOT NULL DEFAULT 0,             -- proporsi peserta menjawab benar
  n_peserta   INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Basis data nilai UTBK per prodi untuk rekomendasi kampus.
CREATE TABLE IF NOT EXISTS campuses (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ptn          TEXT NOT NULL,
  prodi        TEXT NOT NULL,
  kelompok     TEXT NOT NULL DEFAULT 'Saintek',    -- Saintek | Soshum
  jenjang      TEXT NOT NULL DEFAULT 'S1',
  skor_min     REAL NOT NULL,                      -- skor UTBK minimum diterima
  daya_tampung INTEGER,
  peminat      INTEGER,
  UNIQUE (ptn, prodi)
);

CREATE INDEX IF NOT EXISTS idx_q_pkg      ON questions(package_id, subtes, nomor);
CREATE INDEX IF NOT EXISTS idx_ans_att    ON answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_att_user   ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_res_att    ON results(attempt_id);
`;

/* ------------------------------------------------------------------ *
 * Akun
 * ------------------------------------------------------------------ */
const SEKOLAH = "SMA Islam Plus Adzkia";

// Tiga akun pengelola tetap (ditetapkan 4 September 2026). Akun lama
// `admin@pintarbersamaadzkia.com` sengaja TIDAK ada lagi di daftar ini: kalau
// dibiarkan, `npm run seed` akan menghidupkannya kembali sesudah dihapus
// `scripts/akun-admin.mjs`. Daftar utamanya tetap di skrip itu — di sini hanya
// disalin supaya database yang baru dibuat langsung punya pintu masuk.
const ADMIN = [
  { nama: "Admin Satu", email: "admin1@pba.com", password: "admin999" },
  { nama: "Admin Dua", email: "admin2@pba.com", password: "admin9999" },
  { nama: "Admin Tiga", email: "admin3@pba.com", password: "admin99999" },
];

const AKUN = [
  ...ADMIN.map((a) => ({
    ...a,
    role: "admin",
    asal_sekolah: SEKOLAH,
    no_hp: null,
    target_ptn: null,
    target_prodi: null,
  })),
  {
    nama: "Siswa Demo",
    email: "siswa@pintarbersamaadzkia.com",
    password: "siswa123",
    role: "siswa",
    asal_sekolah: SEKOLAH,
    no_hp: "081200000002",
    target_ptn: "Universitas Indonesia",
    target_prodi: "Ilmu Komputer",
  },
  // Delapan siswa contoh agar papan peringkat tidak kosong.
  { nama: "Aisyah Nur Ramadhani", email: "aisyah.nur@pintarbersamaadzkia.com", password: "siswa123", role: "siswa", asal_sekolah: SEKOLAH, no_hp: "081200000003", target_ptn: "Universitas Indonesia", target_prodi: "Pendidikan Dokter" },
  { nama: "Bagus Prasetyo",       email: "bagus.prasetyo@pintarbersamaadzkia.com", password: "siswa123", role: "siswa", asal_sekolah: SEKOLAH, no_hp: "081200000004", target_ptn: "Institut Teknologi Bandung", target_prodi: "Teknik Informatika" },
  { nama: "Dinda Ayu Lestari",    email: "dinda.ayu@pintarbersamaadzkia.com", password: "siswa123", role: "siswa", asal_sekolah: SEKOLAH, no_hp: "081200000005", target_ptn: "Universitas Gadjah Mada", target_prodi: "Psikologi" },
  { nama: "Fajar Nugroho",        email: "fajar.nugroho@pintarbersamaadzkia.com", password: "siswa123", role: "siswa", asal_sekolah: SEKOLAH, no_hp: "081200000006", target_ptn: "Universitas Padjadjaran", target_prodi: "Ilmu Hukum" },
  { nama: "Hana Salsabila",       email: "hana.salsabila@pintarbersamaadzkia.com", password: "siswa123", role: "siswa", asal_sekolah: SEKOLAH, no_hp: "081200000007", target_ptn: "Universitas Airlangga", target_prodi: "Akuntansi" },
  { nama: "Ilham Maulana",        email: "ilham.maulana@pintarbersamaadzkia.com", password: "siswa123", role: "siswa", asal_sekolah: SEKOLAH, no_hp: "081200000008", target_ptn: "Institut Pertanian Bogor", target_prodi: "Teknologi Pangan" },
  { nama: "Kirana Puspita",       email: "kirana.puspita@pintarbersamaadzkia.com", password: "siswa123", role: "siswa", asal_sekolah: SEKOLAH, no_hp: "081200000009", target_ptn: "Universitas Diponegoro", target_prodi: "Ilmu Komunikasi" },
  { nama: "Rizky Ardiansyah",     email: "rizky.ardiansyah@pintarbersamaadzkia.com", password: "siswa123", role: "siswa", asal_sekolah: SEKOLAH, no_hp: "081200000010", target_ptn: "Universitas Brawijaya", target_prodi: "Teknik Sipil" },
];

/* ------------------------------------------------------------------ *
 * Paket
 * ------------------------------------------------------------------ */
const PAKET = {
  kode: "TO-DEMO-1",
  nama: "Tryout Real UTBK-SNBT #1 — Paket Demo",
  deskripsi:
    "Paket demo ADZKIA SMART. Berisi contoh butir untuk ketujuh subtes UTBK-SNBT lengkap dengan pembahasan. Dipakai untuk mencoba alur ujian, penilaian IRT, dan halaman hasil.",
  status: "published",
  acak_soal: 0,
  tampil_pembahasan: 1,
};

/* ------------------------------------------------------------------ *
 * Bank soal — 7 subtes x 5 butir = 35 butir
 * kunci PG: "A".."E" | PGK: JSON array | IS: teks jawaban
 * ------------------------------------------------------------------ */

const STIMULUS_PBM = `<p>Bacalah paragraf berikut, lalu jawab soal-soal yang menyertainya.</p>
<p>(1) Literasi digital merupakan kecakapan yang wajib dimiliki oleh generasi muda saat ini. (2) Melalui literasi digital, siswa mampu menyaring informasi dan menghindari berita bohong. (3) Sayangnya, banyak sekali siswa-siswa yang masih mempercayai informasi hanya karena informasi tersebut dibagikan berulang kali di media sosial. (4) Oleh sebab itu, sekolah perlu mengajarkan cara memeriksa sumber informasi secara sistematis. (5) Dengan demikian siswa tidak mudah terjebak hoaks yang setiap hari beredar.</p>`;

const STIMULUS_LBIND = `<p>Bacalah teks berikut, lalu jawab soal-soal yang menyertainya.</p>
<p>Kurang tidur telah menjadi masalah yang lazim di kalangan remaja Indonesia. Sebuah survei terhadap 1.200 pelajar SMA di lima kota besar menunjukkan bahwa 68 persen responden tidur kurang dari tujuh jam pada hari sekolah. Padahal, remaja berusia 15&ndash;18 tahun dianjurkan tidur delapan sampai sepuluh jam setiap malam. Penyebab yang paling sering disebut responden adalah penggunaan gawai hingga larut malam (54 persen), disusul tugas sekolah yang menumpuk (31 persen), dan kegiatan les tambahan (15 persen).</p>
<p>Dampak kurang tidur tidak berhenti pada rasa mengantuk di kelas. Penelitian menunjukkan bahwa otak yang kurang beristirahat mengalami penurunan kemampuan memusatkan perhatian dan mengingat kembali informasi yang baru dipelajari. Dengan kata lain, belajar semalam suntuk justru dapat menghapus sebagian hasil belajar itu sendiri. Sejumlah sekolah di Amerika Serikat yang memundurkan jam masuk menjadi pukul 08.30 melaporkan tingkat kehadiran siswa meningkat dan nilai rata-rata membaik.</p>
<p>Karena itu, mengatur waktu tidur sebaiknya diperlakukan sebagai bagian dari strategi belajar, bukan sekadar urusan kesehatan.</p>`;

const STIMULUS_LBING = `<p>Read the following passage, then answer the questions that follow.</p>
<p>Many students believe that highlighting a textbook is an effective way to study. Research, however, suggests otherwise. In a series of experiments, psychologists compared students who highlighted passages with students who tested themselves by recalling the material without looking at the text. A week later, the second group remembered roughly 50 percent more of what they had read.</p>
<p>The reason lies in how memory works. Highlighting feels productive because the page looks busy afterwards, yet the act itself requires little mental effort. Retrieval practice, by contrast, forces the brain to reconstruct information, and every successful reconstruction strengthens the pathway to that memory.</p>
<p>This does not mean that highlighting is useless. Used sparingly, it can help a reader locate key ideas later. The problem appears when highlighting becomes the whole of a student's revision. Teachers who introduce short, low-stakes quizzes report that their students not only score higher but also feel more confident before examinations.</p>`;

const SOAL = {
  /* ---------------------------- PU ---------------------------- */
  PU: [
    {
      tipe: "PG",
      level: "C3",
      pertanyaan:
        "Perhatikan dua premis berikut.<br>P1: Semua peserta bimbingan belajar A rajin mengerjakan latihan soal.<br>P2: Sebagian orang yang rajin mengerjakan latihan soal lolos SNBT.<br>Simpulan yang PASTI benar dari kedua premis tersebut adalah &hellip;",
      opsi: [
        "Semua peserta bimbingan belajar A lolos SNBT.",
        "Sebagian peserta bimbingan belajar A lolos SNBT.",
        "Sebagian orang yang lolos SNBT adalah peserta bimbingan belajar A.",
        "Semua orang yang rajin mengerjakan latihan soal adalah peserta bimbingan belajar A.",
        "Tidak ada simpulan yang pasti benar.",
      ],
      kunci: "E",
      pembahasan:
        "P1 berbentuk universal (A &sub; R), P2 berbentuk partikular (sebagian R adalah L). Kelompok &lsquo;sebagian R&rsquo; yang lolos itu belum tentu beririsan dengan A, sebab A hanyalah bagian dari R. Karena salah satu premis partikular dan tidak ada jaminan irisan, tidak ada simpulan universal maupun partikular yang pasti benar. Jawaban: E.",
    },
    {
      tipe: "PG",
      level: "C4",
      pertanyaan:
        "Perhatikan barisan bilangan berikut.<br>3, 4, 7, 11, 18, 29, &hellip;<br>Bilangan berikutnya adalah &hellip;",
      opsi: ["40", "43", "45", "47", "48"],
      kunci: "D",
      pembahasan:
        "Setiap suku mulai suku ketiga adalah jumlah dua suku sebelumnya: 3 + 4 = 7; 4 + 7 = 11; 7 + 11 = 18; 11 + 18 = 29. Maka suku berikutnya 18 + 29 = 47. Jawaban: D.",
    },
    {
      tipe: "PG",
      level: "C4",
      pertanyaan:
        "Sebuah tryout diikuti 200 siswa. Sebanyak 60% peserta berasal dari kelas XII dan sisanya kelas XI. Dari peserta kelas XII, 25% memperoleh skor di atas 650, sedangkan dari peserta kelas XI hanya 10% yang memperoleh skor di atas 650. Banyak peserta yang memperoleh skor di atas 650 adalah &hellip;",
      opsi: ["30 siswa", "34 siswa", "36 siswa", "38 siswa", "42 siswa"],
      kunci: "D",
      pembahasan:
        "Kelas XII = 60% &times; 200 = 120 siswa, kelas XI = 200 &minus; 120 = 80 siswa. Skor di atas 650: dari kelas XII 25% &times; 120 = 30 siswa; dari kelas XI 10% &times; 80 = 8 siswa. Total 30 + 8 = 38 siswa. Jawaban: D.",
    },
    {
      tipe: "PGK",
      level: "C4",
      pertanyaan:
        "Nilai tryout lima siswa berturut-turut adalah 620, 700, 655, 700, dan 580. Pilihlah SEMUA pernyataan yang benar (jawaban dapat lebih dari satu).",
      opsi: [
        "Rata-rata kelima nilai tersebut adalah 651.",
        "Modus dari data tersebut adalah 620.",
        "Median data tersebut lebih besar daripada rata-ratanya.",
        "Jangkauan (selisih nilai tertinggi dan terendah) data tersebut adalah 100.",
        "Semua siswa memperoleh nilai di atas 600.",
      ],
      kunci: JSON.stringify(["A", "C"]),
      pembahasan:
        "Jumlah data = 620 + 700 + 655 + 700 + 580 = 3.255 sehingga rata-rata = 3.255 : 5 = 651 (pernyataan A benar). Data terurut: 580, 620, 655, 700, 700 &rarr; median = 655, dan 655 &gt; 651 (pernyataan C benar). Modus adalah 700, bukan 620 (B salah). Jangkauan = 700 &minus; 580 = 120, bukan 100 (D salah). Ada nilai 580 yang kurang dari 600 (E salah). Jawaban: A dan C.",
    },
    {
      tipe: "PG",
      level: "C3",
      pertanyaan:
        "Perhatikan pernyataan berikut.<br>&bull; Jika seorang siswa lulus SNBT, ia melakukan daftar ulang.<br>&bull; Rani tidak melakukan daftar ulang.<br>Simpulan yang benar adalah &hellip;",
      opsi: [
        "Rani lulus SNBT.",
        "Rani tidak lulus SNBT.",
        "Rani lulus SNBT, tetapi memilih jalur lain.",
        "Rani melakukan daftar ulang di kampus lain.",
        "Tidak dapat ditarik simpulan apa pun.",
      ],
      kunci: "B",
      pembahasan:
        "Bentuknya modus tollens: dari &lsquo;jika p maka q&rsquo; dan &lsquo;bukan q&rsquo; disimpulkan &lsquo;bukan p&rsquo;. Karena Rani tidak daftar ulang (bukan q), maka Rani tidak lulus SNBT (bukan p). Jawaban: B.",
    },
  ],

  /* ---------------------------- PPU --------------------------- */
  PPU: [
    {
      tipe: "PG",
      level: "C3",
      pertanyaan:
        "Bacalah kalimat berikut.<br>&ldquo;Pemerintah daerah menyiapkan <i>mitigasi</i> bencana banjir sebelum musim hujan tiba.&rdquo;<br>Makna kata <i>mitigasi</i> pada kalimat tersebut adalah &hellip;",
      opsi: [
        "penanganan korban setelah bencana terjadi",
        "upaya mengurangi risiko dan dampak sebelum bencana terjadi",
        "penyelidikan atas penyebab terjadinya bencana",
        "pemulihan sarana dan prasarana yang rusak",
        "pemberian bantuan logistik kepada pengungsi",
      ],
      kunci: "B",
      pembahasan:
        "Dalam KBBI, <i>mitigasi</i> berarti tindakan mengurangi dampak atau risiko suatu bencana. Kata kunci pada kalimat adalah &lsquo;sebelum musim hujan tiba&rsquo;, yang menunjukkan tindakan pencegahan, bukan penanganan setelah kejadian. Jawaban: B.",
    },
    {
      tipe: "PG",
      level: "C3",
      pertanyaan: "Deretan kata yang SELURUHNYA ditulis secara baku adalah &hellip;",
      opsi: [
        "analisa, aktifitas, praktek",
        "analisis, aktivitas, praktik",
        "analisis, aktifitas, praktek",
        "analisa, aktivitas, praktik",
        "analisis, aktivitas, praktek",
      ],
      kunci: "B",
      pembahasan:
        "Bentuk baku menurut KBBI adalah <i>analisis</i> (bukan analisa), <i>aktivitas</i> (bukan aktifitas), dan <i>praktik</i> (bukan praktek). Hanya pilihan B yang ketiganya baku. Jawaban: B.",
    },
    {
      tipe: "PG",
      level: "C4",
      pertanyaan:
        "DOKTER : STETOSKOP = &hellip; : &hellip;<br>Pasangan kata yang memiliki hubungan paling sesuai adalah &hellip;",
      opsi: [
        "Guru : Sekolah",
        "Petani : Cangkul",
        "Nelayan : Laut",
        "Pelukis : Lukisan",
        "Penjahit : Baju",
      ],
      kunci: "B",
      pembahasan:
        "Hubungan DOKTER : STETOSKOP adalah profesi dengan alat kerjanya. Guru : Sekolah dan Nelayan : Laut adalah profesi dengan tempat kerja; Pelukis : Lukisan dan Penjahit : Baju adalah profesi dengan hasil kerja. Hanya Petani : Cangkul yang merupakan profesi dengan alat kerja. Jawaban: B.",
    },
    {
      tipe: "IS",
      level: "C3",
      pertanyaan:
        "Perhatikan kalimat berikut.<br>&ldquo;Wali kelas memberikan <i>nasehat</i> kepada siswa kelas XII menjelang UTBK.&rdquo;<br>Tuliskan bentuk BAKU dari kata yang dicetak miring tersebut. (Jawab dengan satu kata.)",
      opsi: [],
      kunci: "nasihat",
      pembahasan:
        "Bentuk baku menurut KBBI adalah <i>nasihat</i> (dengan huruf i), sedangkan <i>nasehat</i> merupakan bentuk tidak baku. Bandingkan pula dengan kata turunannya: menasihati, penasihat. Jawaban: nasihat.",
    },
    {
      tipe: "PG",
      level: "C4",
      pertanyaan: "Makna peribahasa &ldquo;Air beriak tanda tak dalam&rdquo; adalah &hellip;",
      opsi: [
        "Orang yang pendiam biasanya menyimpan banyak ilmu.",
        "Orang yang banyak bicara biasanya dangkal ilmunya.",
        "Perkara kecil dapat menimbulkan masalah yang besar.",
        "Orang yang sabar akan memperoleh keberuntungan.",
        "Kebiasaan buruk sangat sulit untuk diubah.",
      ],
      kunci: "B",
      pembahasan:
        "Air yang beriak (bersuara ramai) menandakan airnya dangkal; air dalam justru tenang. Peribahasa ini menggambarkan orang yang banyak bicara atau menyombongkan diri, padahal pengetahuannya tidak dalam. Jawaban: B.",
    },
  ],

  /* ---------------------------- PBM --------------------------- */
  PBM: [
    {
      tipe: "PG",
      level: "C3",
      stimulus: STIMULUS_PBM,
      pertanyaan: "Gagasan utama paragraf tersebut adalah &hellip;",
      opsi: [
        "pentingnya literasi digital bagi generasi muda",
        "cara kerja media sosial dalam menyebarkan informasi",
        "banyaknya berita bohong yang beredar setiap hari",
        "kewajiban sekolah menyediakan laboratorium komputer",
        "kebiasaan siswa membagikan informasi berulang kali",
      ],
      kunci: "A",
      pembahasan:
        "Kalimat (1) sebagai kalimat utama menyatakan bahwa literasi digital wajib dimiliki generasi muda; kalimat (2)&ndash;(5) hanya menjelaskan manfaat, masalah, dan solusinya. Jadi gagasan utamanya adalah pentingnya literasi digital bagi generasi muda. Jawaban: A.",
    },
    {
      tipe: "PG",
      level: "C3",
      stimulus: STIMULUS_PBM,
      pertanyaan:
        "Konjungsi <i>Oleh sebab itu</i> pada kalimat (4) menyatakan hubungan &hellip;",
      opsi: ["pertentangan", "penambahan", "sebab-akibat", "pemilihan", "waktu"],
      kunci: "C",
      pembahasan:
        "<i>Oleh sebab itu</i> merupakan konjungsi antarkalimat yang menghubungkan sebab pada kalimat (3) dengan akibat/tindak lanjut pada kalimat (4). Jadi hubungannya sebab-akibat. Jawaban: C.",
    },
    {
      tipe: "PG",
      level: "C4",
      stimulus: STIMULUS_PBM,
      pertanyaan: "Kalimat (3) tergolong kalimat tidak efektif karena &hellip;",
      opsi: [
        "menggunakan penanda makna jamak secara berlebihan",
        "tidak memiliki subjek yang jelas",
        "menggunakan konjungsi yang tidak tepat",
        "tidak memiliki predikat",
        "menggunakan kata serapan yang belum baku",
      ],
      kunci: "A",
      pembahasan:
        "Frasa &lsquo;banyak sekali siswa-siswa&rsquo; memuat penanda jamak ganda: kata <i>banyak</i> dan bentuk ulang <i>siswa-siswa</i>. Kalimat efektif cukup menulis &lsquo;banyak siswa&rsquo; atau &lsquo;siswa-siswa&rsquo;. Subjek, predikat, konjungsi, dan pilihan katanya sendiri sudah tepat. Jawaban: A.",
    },
    {
      tipe: "PG",
      level: "C4",
      stimulus: STIMULUS_PBM,
      pertanyaan: "Perbaikan penggunaan tanda baca pada kalimat (5) adalah &hellip;",
      opsi: [
        "menambahkan tanda koma setelah <i>Dengan demikian</i>",
        "menghilangkan tanda titik pada akhir kalimat",
        "menambahkan tanda koma setelah kata <i>siswa</i>",
        "mengganti tanda titik pada akhir kalimat dengan tanda seru",
        "menambahkan tanda koma sebelum kata <i>yang</i>",
      ],
      kunci: "A",
      pembahasan:
        "Menurut PUEBI, konjungsi antarkalimat seperti <i>Dengan demikian</i>, <i>Oleh sebab itu</i>, dan <i>Namun</i> yang terletak pada awal kalimat harus diikuti tanda koma. Bandingkan dengan kalimat (4) yang sudah benar. Jawaban: A.",
    },
    {
      tipe: "PG",
      level: "C4",
      stimulus: STIMULUS_PBM,
      pertanyaan:
        "Penulisan judul yang paling tepat untuk paragraf tersebut sesuai kaidah ejaan adalah &hellip;",
      opsi: [
        "Meningkatkan Literasi Digital Di Kalangan Pelajar",
        "meningkatkan literasi digital di kalangan pelajar",
        "Meningkatkan Literasi Digital di Kalangan Pelajar",
        "MENINGKATKAN Literasi Digital Di Kalangan Pelajar",
        "Meningkatkan Literasi Digital Di kalangan Pelajar",
      ],
      kunci: "C",
      pembahasan:
        "Pada judul, setiap kata diawali huruf kapital kecuali kata tugas (di, ke, dari, dan, yang, untuk) yang tidak terletak pada posisi awal. Kata <i>di</i> di sini adalah kata depan sehingga ditulis kecil. Jawaban: C.",
    },
  ],

  /* ---------------------------- PK ---------------------------- */
  PK: [
    {
      tipe: "PG",
      level: "C3",
      pertanyaan: "Jika 3x &minus; 7 = 2x + 5, nilai x adalah &hellip;",
      opsi: ["5", "7", "10", "12", "15"],
      kunci: "D",
      pembahasan:
        "3x &minus; 7 = 2x + 5 &rarr; 3x &minus; 2x = 5 + 7 &rarr; x = 12. Uji: ruas kiri 3(12) &minus; 7 = 29 dan ruas kanan 2(12) + 5 = 29. Jawaban: D.",
    },
    {
      tipe: "PG",
      level: "C3",
      pertanyaan:
        "Rata-rata enam bilangan adalah 15. Jika satu bilangan, yaitu 20, dikeluarkan dari kelompok itu, rata-rata bilangan yang tersisa adalah &hellip;",
      opsi: ["12", "13", "14", "15", "16"],
      kunci: "C",
      pembahasan:
        "Jumlah enam bilangan = 6 &times; 15 = 90. Setelah 20 dikeluarkan, jumlahnya 90 &minus; 20 = 70 dengan lima bilangan tersisa, sehingga rata-ratanya 70 : 5 = 14. Jawaban: C.",
    },
    {
      tipe: "PG",
      level: "C4",
      pertanyaan:
        "Harga sebuah buku mula-mula dinaikkan 20%, kemudian harga barunya didiskon 20%. Dibandingkan harga semula, harga akhir buku tersebut &hellip;",
      opsi: ["naik 4%", "turun 4%", "tidak berubah", "naik 2%", "turun 2%"],
      kunci: "B",
      pembahasan:
        "Misal harga awal 100. Setelah naik 20% menjadi 120. Diskon 20% dari 120 adalah 24, sehingga harga akhir 120 &minus; 24 = 96. Jadi harga turun 4 dari 100 atau 4%. Secara umum 1,2 &times; 0,8 = 0,96. Jawaban: B.",
    },
    {
      tipe: "PG",
      level: "C4",
      pertanyaan:
        "Keliling sebuah persegi panjang adalah 40 cm. Panjangnya 4 cm lebih dari lebarnya. Luas persegi panjang tersebut adalah &hellip;",
      opsi: ["84 cm&sup2;", "90 cm&sup2;", "96 cm&sup2;", "100 cm&sup2;", "108 cm&sup2;"],
      kunci: "C",
      pembahasan:
        "Keliling = 2(p + l) = 40 &rarr; p + l = 20. Karena p = l + 4, maka (l + 4) + l = 20 &rarr; 2l = 16 &rarr; l = 8 dan p = 12. Luas = 12 &times; 8 = 96 cm&sup2;. Jawaban: C.",
    },
    {
      tipe: "IS",
      level: "C4",
      pertanyaan:
        "Sebuah tabung memiliki jari-jari alas 7 cm dan tinggi 10 cm. Dengan &pi; = 22/7, volume tabung tersebut adalah &hellip; cm&sup3;. (Tulis angkanya saja, tanpa titik pemisah ribuan dan tanpa satuan.)",
      opsi: [],
      kunci: "1540",
      pembahasan:
        "Volume tabung = &pi;r&sup2;t = (22/7) &times; 7&sup2; &times; 10 = (22/7) &times; 49 &times; 10 = 22 &times; 7 &times; 10 = 1.540 cm&sup3;. Jawaban: 1540.",
    },
  ],

  /* --------------------------- LBIND -------------------------- */
  LBIND: [
    {
      tipe: "PG",
      level: "C3",
      stimulus: STIMULUS_LBIND,
      pertanyaan: "Ide pokok paragraf pertama teks tersebut adalah &hellip;",
      opsi: [
        "banyaknya pelajar SMA yang kurang tidur beserta penyebabnya",
        "anjuran lama tidur bagi remaja berusia 15&ndash;18 tahun",
        "jumlah pelajar SMA yang menjadi responden survei",
        "bahaya penggunaan gawai bagi kesehatan mata remaja",
        "cara sekolah mengurangi beban tugas bagi siswanya",
      ],
      kunci: "A",
      pembahasan:
        "Kalimat pertama menyatakan bahwa kurang tidur lazim di kalangan remaja; kalimat berikutnya memerinci angka survei dan daftar penyebabnya. Pilihan B, C, D, dan E hanya bagian kecil atau bahkan tidak dibahas pada paragraf itu. Jawaban: A.",
    },
    {
      tipe: "PG",
      level: "C3",
      stimulus: STIMULUS_LBIND,
      pertanyaan:
        "Berdasarkan teks tersebut, penyebab kurang tidur yang PALING BANYAK disebut responden adalah &hellip;",
      opsi: [
        "tugas sekolah yang menumpuk",
        "kegiatan les tambahan pada malam hari",
        "penggunaan gawai hingga larut malam",
        "jam masuk sekolah yang terlalu pagi",
        "kebiasaan belajar semalam suntuk",
      ],
      kunci: "C",
      pembahasan:
        "Teks menyebut tiga penyebab dengan persentasenya: gawai 54 persen, tugas sekolah 31 persen, dan les tambahan 15 persen. Angka terbesar adalah penggunaan gawai hingga larut malam. Jawaban: C.",
    },
    {
      tipe: "PG",
      level: "C4",
      stimulus: STIMULUS_LBIND,
      pertanyaan:
        "Maksud kalimat &ldquo;belajar semalam suntuk justru dapat menghapus sebagian hasil belajar itu sendiri&rdquo; adalah &hellip;",
      opsi: [
        "materi yang dipelajari malam hari selalu lebih sulit diingat daripada materi siang hari",
        "begadang untuk belajar menurunkan kemampuan otak mengingat materi yang baru dipelajari",
        "siswa yang belajar pada malam hari pasti memperoleh nilai yang buruk",
        "catatan hasil belajar akan hilang apabila siswa terlalu lelah",
        "belajar sebaiknya dilakukan bersama teman agar tidak mengantuk",
      ],
      kunci: "B",
      pembahasan:
        "Kalimat itu adalah simpulan dari penjelasan sebelumnya: otak yang kurang istirahat menurun kemampuannya memusatkan perhatian dan mengingat kembali informasi baru. Jadi waktu tidur yang dikorbankan untuk belajar justru merugikan penyimpanan memori. Pilihan A, C, D, dan E melebih-lebihkan atau tidak didukung teks. Jawaban: B.",
    },
    {
      tipe: "PG",
      level: "C4",
      stimulus: STIMULUS_LBIND,
      pertanyaan:
        "Kalimat tentang sekolah di Amerika Serikat yang memundurkan jam masuk berfungsi untuk &hellip;",
      opsi: [
        "membandingkan mutu pendidikan Indonesia dengan Amerika Serikat",
        "menyarankan agar seluruh sekolah di Indonesia masuk pukul 08.30",
        "memberikan bukti pendukung bahwa tambahan waktu tidur berdampak positif pada capaian akademik",
        "menunjukkan bahwa penelitian tentang tidur hanya dilakukan di luar negeri",
        "menyanggah pendapat bahwa kurang tidur berpengaruh pada prestasi",
      ],
      kunci: "C",
      pembahasan:
        "Kalimat tersebut berisi contoh empiris yang memperkuat pernyataan sebelumnya tentang dampak kurang tidur: ketika jam masuk dimundurkan (waktu tidur bertambah), kehadiran dan nilai rata-rata membaik. Fungsinya sebagai bukti pendukung, bukan perbandingan atau sanggahan. Jawaban: C.",
    },
    {
      tipe: "PG",
      level: "C4",
      stimulus: STIMULUS_LBIND,
      pertanyaan:
        "Berdasarkan data pada teks, banyak responden yang tidur kurang dari tujuh jam pada hari sekolah adalah &hellip;",
      opsi: ["680 pelajar", "750 pelajar", "816 pelajar", "840 pelajar", "900 pelajar"],
      kunci: "C",
      pembahasan:
        "Responden survei 1.200 pelajar dan 68 persen di antaranya tidur kurang dari tujuh jam. Maka 68% &times; 1.200 = 0,68 &times; 1.200 = 816 pelajar. Jawaban: C.",
    },
  ],

  /* --------------------------- LBING -------------------------- */
  LBING: [
    {
      tipe: "PG",
      level: "C3",
      stimulus: STIMULUS_LBING,
      pertanyaan: "What is the main idea of the passage?",
      opsi: [
        "Highlighting a textbook should be banned in every classroom.",
        "Testing yourself on the material is a more effective way to study than highlighting it.",
        "Psychologists disagree about how human memory actually works.",
        "Students who read more books remember more of what they study.",
        "Teachers should give their students longer examinations.",
      ],
      kunci: "B",
      pembahasan:
        "Paragraf pertama membandingkan dua cara belajar dan menyatakan kelompok yang menguji diri sendiri mengingat lebih banyak; paragraf kedua menjelaskan alasannya; paragraf ketiga menegaskan kembali. Jadi gagasan utamanya: retrieval practice lebih efektif daripada highlighting. Pilihan A terlalu ekstrem karena teks justru menyebut highlighting tetap berguna bila dipakai secukupnya. Jawaban: B.",
    },
    {
      tipe: "PG",
      level: "C3",
      stimulus: STIMULUS_LBING,
      pertanyaan:
        "According to the passage, one week after reading, the students who tested themselves remembered &hellip;",
      opsi: [
        "exactly the same amount as the students who highlighted",
        "about 50 percent less than the students who highlighted",
        "about 50 percent more than the students who highlighted",
        "twice as much as they had remembered on the first day",
        "only the ideas that they had marked in colour",
      ],
      kunci: "C",
      pembahasan:
        "Kalimat pada paragraf pertama: &ldquo;A week later, the second group remembered roughly 50 percent more of what they had read.&rdquo; Kelompok kedua adalah mereka yang menguji diri sendiri. Jawaban: C.",
    },
    {
      tipe: "PG",
      level: "C4",
      stimulus: STIMULUS_LBING,
      pertanyaan:
        "The word <i>sparingly</i> in the third paragraph is closest in meaning to &hellip;",
      opsi: ["carelessly", "frequently", "in limited amounts", "very quickly", "in secret"],
      kunci: "C",
      pembahasan:
        "<i>Sparingly</i> berarti &lsquo;hanya sedikit; tidak berlebihan&rsquo;. Konteksnya juga menegaskan hal itu: masalah muncul ketika highlighting menjadi keseluruhan cara belajar siswa. Jadi maknanya paling dekat dengan <i>in limited amounts</i>. Jawaban: C.",
    },
    {
      tipe: "PG",
      level: "C4",
      stimulus: STIMULUS_LBING,
      pertanyaan: "Why does highlighting feel productive, according to the author?",
      opsi: [
        "Because it takes a great deal of mental effort.",
        "Because the page looks busy afterwards even though little effort is required.",
        "Because teachers usually reward students who highlight neatly.",
        "Because it helps students reconstruct information from memory.",
        "Because coloured ink is easier for the eyes to follow.",
      ],
      kunci: "B",
      pembahasan:
        "Paragraf kedua: &ldquo;Highlighting feels productive because the page looks busy afterwards, yet the act itself requires little mental effort.&rdquo; Pilihan A dan D justru menggambarkan retrieval practice, bukan highlighting. Jawaban: B.",
    },
    {
      tipe: "PG",
      level: "C4",
      stimulus: STIMULUS_LBING,
      pertanyaan: "What can be inferred about short, low-stakes quizzes?",
      opsi: [
        "They replace the need for students to read their textbooks.",
        "They are a form of retrieval practice that can raise both scores and confidence.",
        "They make students more anxious before an examination.",
        "They are useful only for students who never highlight.",
        "They were the main subject of the psychologists' experiments.",
      ],
      kunci: "B",
      pembahasan:
        "Kuis singkat menuntut siswa mengingat kembali materi tanpa melihat teks &mdash; itulah definisi retrieval practice pada paragraf kedua. Kalimat terakhir menyebutkan siswa memperoleh nilai lebih tinggi dan merasa lebih percaya diri, sehingga simpulan B paling tepat. Jawaban: B.",
    },
  ],

  /* ---------------------------- PM ---------------------------- */
  PM: [
    {
      tipe: "PG",
      level: "C3",
      pertanyaan:
        "Sebuah lembaga bimbingan belajar menjual paket persiapan UTBK seharga Rp1.200.000,00. Pada bulan promosi, harga paket dipotong 15%. Harga paket setelah potongan adalah &hellip;",
      opsi: [
        "Rp960.000,00",
        "Rp1.020.000,00",
        "Rp1.050.000,00",
        "Rp1.080.000,00",
        "Rp1.140.000,00",
      ],
      kunci: "B",
      pembahasan:
        "Potongan = 15% &times; Rp1.200.000,00 = Rp180.000,00. Harga setelah potongan = Rp1.200.000,00 &minus; Rp180.000,00 = Rp1.020.000,00. Cara cepat: 85% &times; 1.200.000 = 1.020.000. Jawaban: B.",
    },
    {
      tipe: "PG",
      level: "C4",
      pertanyaan:
        "Sebuah bus berangkat dari terminal pukul 07.00 dengan kecepatan rata-rata 60 km/jam. Dari terminal yang sama, sebuah mobil berangkat pukul 08.00 menyusul bus tersebut dengan kecepatan rata-rata 80 km/jam pada jalur yang sama. Mobil akan menyusul bus pada pukul &hellip;",
      opsi: ["10.00", "10.30", "11.00", "11.30", "12.00"],
      kunci: "C",
      pembahasan:
        "Pada pukul 08.00 bus sudah menempuh 60 km. Selisih kecepatan mobil dan bus = 80 &minus; 60 = 20 km/jam, sehingga jarak 60 km terkejar dalam 60 : 20 = 3 jam. Mobil menyusul pukul 08.00 + 3 jam = 11.00. (Cek: mobil menempuh 3 &times; 80 = 240 km; bus 4 &times; 60 = 240 km.) Jawaban: C.",
    },
    {
      tipe: "PG",
      level: "C4",
      pertanyaan:
        "Nilai tryout delapan siswa adalah 70, 75, 80, 80, 85, 90, 95, dan 100. Median data tersebut adalah &hellip;",
      opsi: ["80", "82,5", "83", "85", "87,5"],
      kunci: "B",
      pembahasan:
        "Data sudah terurut dan banyaknya genap (n = 8), sehingga median adalah rata-rata datum ke-4 dan ke-5, yaitu (80 + 85) : 2 = 82,5. Jawaban: B.",
    },
    {
      tipe: "PG",
      level: "C4",
      pertanyaan:
        "Di dalam sebuah kotak terdapat 4 kartu merah dan 6 kartu biru yang identik selain warnanya. Jika diambil satu kartu secara acak, peluang terambil kartu merah adalah &hellip;",
      opsi: ["1/5", "1/4", "2/5", "3/5", "2/3"],
      kunci: "C",
      pembahasan:
        "Banyak kartu seluruhnya = 4 + 6 = 10. Peluang terambil kartu merah = 4/10 = 2/5. Jawaban: C.",
    },
    {
      tipe: "PGK",
      level: "C4",
      pertanyaan:
        "Sebuah tryout diikuti 40 siswa dengan rata-rata skor 620. Setelah data diperiksa ulang, ternyata skor seorang peserta tercatat 500 padahal seharusnya 700. Pilihlah SEMUA pernyataan yang benar (jawaban dapat lebih dari satu).",
      opsi: [
        "Jumlah seluruh skor sebelum koreksi adalah 24.800.",
        "Rata-rata skor setelah koreksi adalah 625.",
        "Rata-rata skor setelah koreksi naik 20 poin.",
        "Rata-rata skor setelah koreksi tetap 620.",
        "Jumlah seluruh skor setelah koreksi adalah 24.600.",
      ],
      kunci: JSON.stringify(["A", "B"]),
      pembahasan:
        "Jumlah skor awal = 40 &times; 620 = 24.800 (A benar). Koreksi menambah 700 &minus; 500 = 200, sehingga jumlah baru = 25.000 (E salah) dan rata-rata baru = 25.000 : 40 = 625 (B benar). Kenaikan rata-rata = 200 : 40 = 5 poin, bukan 20 (C salah), dan rata-rata jelas berubah (D salah). Jawaban: A dan B.",
    },
  ],
};

const URUTAN_SUBTES = ["PU", "PPU", "PBM", "PK", "LBIND", "LBING", "PM"];

/* ------------------------------------------------------------------ *
 * Eksekusi
 * ------------------------------------------------------------------ */
function bukaDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(SCHEMA);
  return db;
}

function kosongkan(db) {
  // Urutan aman terhadap foreign key.
  const tabel = [
    "answers",
    "results",
    "item_params",
    "attempt_subtes",
    "attempts",
    "questions",
    "packages",
    "users",
  ];
  db.exec("PRAGMA foreign_keys = OFF");
  for (const t of tabel) db.exec(`DELETE FROM ${t}`);
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('" + tabel.join("','") + "')");
  db.exec("PRAGMA foreign_keys = ON");
  console.log(`  ! --reset: ${tabel.length} tabel dikosongkan (tabel campuses tidak disentuh).`);
}

function seedUsers(db) {
  const cari = db.prepare("SELECT id FROM users WHERE email = ?");
  const sisip = db.prepare(
    `INSERT INTO users (nama, nama_login, email, password_hash, role, asal_sekolah, no_hp, target_ptn, target_prodi)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(email) DO NOTHING`,
  );

  let baru = 0;
  for (const a of AKUN) {
    const email = a.email.toLowerCase().trim();
    if (cari.get(email)) continue;
    // Siswa masuk memakai nama (dinormalisasi); admin memakai email.
    const namaLogin = a.role === "admin" ? null : a.nama.trim().toLowerCase().replace(/\s+/g, " ");
    sisip.run(
      a.nama,
      namaLogin,
      email,
      bcrypt.hashSync(a.password, 10),
      a.role,
      a.asal_sekolah ?? null,
      a.no_hp ?? null,
      a.target_ptn ?? null,
      a.target_prodi ?? null,
    );
    baru++;
  }
  return baru;
}

function seedPaket(db) {
  db.prepare(
    `INSERT INTO packages (kode, nama, deskripsi, status, acak_soal, tampil_pembahasan)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(kode) DO UPDATE SET
       nama = excluded.nama,
       deskripsi = excluded.deskripsi,
       status = excluded.status,
       acak_soal = excluded.acak_soal,
       tampil_pembahasan = excluded.tampil_pembahasan`,
  ).run(
    PAKET.kode,
    PAKET.nama,
    PAKET.deskripsi,
    PAKET.status,
    PAKET.acak_soal,
    PAKET.tampil_pembahasan,
  );
  const row = db.prepare("SELECT id FROM packages WHERE kode = ?").get(PAKET.kode);
  return Number(row.id);
}

function seedSoal(db, packageId) {
  const sisip = db.prepare(
    `INSERT INTO questions (package_id, subtes, nomor, tipe, level, stimulus, pertanyaan, gambar_url, opsi, kunci, pembahasan)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
     ON CONFLICT(package_id, subtes, nomor) DO UPDATE SET
       tipe = excluded.tipe,
       level = excluded.level,
       stimulus = excluded.stimulus,
       pertanyaan = excluded.pertanyaan,
       opsi = excluded.opsi,
       kunci = excluded.kunci,
       pembahasan = excluded.pembahasan`,
  );

  const perSubtes = {};
  for (const kode of URUTAN_SUBTES) {
    const butir = SOAL[kode] ?? [];
    butir.forEach((q, i) => {
      const opsi = q.opsi ?? [];
      if (q.tipe !== "IS" && opsi.length !== 5) {
        throw new Error(`Soal ${kode} nomor ${i + 1} harus punya 5 opsi (A-E).`);
      }
      if (q.tipe === "IS" && opsi.length !== 0) {
        throw new Error(`Soal isian singkat ${kode} nomor ${i + 1} tidak boleh punya opsi.`);
      }
      sisip.run(
        packageId,
        kode,
        i + 1,
        q.tipe,
        q.level,
        q.stimulus ?? null,
        q.pertanyaan,
        JSON.stringify(opsi),
        q.kunci,
        q.pembahasan ?? null,
      );
    });
    perSubtes[kode] = butir.length;
  }
  return perSubtes;
}

function main() {
  console.log("\n=== ADZKIA SMART — seed data awal ===");
  console.log(`  Basis data : ${DB_PATH}`);

  const db = bukaDb();
  try {
    db.exec("BEGIN");
    if (RESET) kosongkan(db);

    const userBaru = seedUsers(db);
    const packageId = seedPaket(db);
    const perSubtes = seedSoal(db, packageId);

    db.exec("COMMIT");

    /* ---------- ringkasan ---------- */
    const jumlahUser = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
    const jumlahAdmin = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get().n;
    const jumlahPaket = db.prepare("SELECT COUNT(*) AS n FROM packages").get().n;
    const jumlahSoal = db
      .prepare("SELECT COUNT(*) AS n FROM questions WHERE package_id = ?")
      .get(packageId).n;
    const perTipe = db
      .prepare(
        "SELECT tipe, COUNT(*) AS n FROM questions WHERE package_id = ? GROUP BY tipe ORDER BY tipe",
      )
      .all(packageId);

    console.log(`\n  Akun     : ${jumlahUser} user total (${jumlahAdmin} admin), ${userBaru} baru ditambahkan.`);
    console.log(`  Paket    : ${jumlahPaket} paket di basis data; paket demo "${PAKET.kode}" berstatus ${PAKET.status}.`);
    console.log(`  Soal     : ${jumlahSoal} butir pada paket ${PAKET.kode}.`);
    console.log("\n  Rincian soal per subtes:");
    for (const kode of URUTAN_SUBTES) {
      const n = db
        .prepare("SELECT COUNT(*) AS n FROM questions WHERE package_id = ? AND subtes = ?")
        .get(packageId, kode).n;
      console.log(`    - ${kode.padEnd(6)}: ${n} butir (disiapkan ${perSubtes[kode]})`);
    }
    console.log("\n  Rincian tipe butir: " + perTipe.map((t) => `${t.tipe}=${t.n}`).join(" · "));

    console.log("\n  Kredensial demo:");
    for (const a of ADMIN) console.log(`    admin  -> ${a.email} / ${a.password}`);
    console.log("    siswa  -> siswa@pintarbersamaadzkia.com / siswa123");
    console.log("    8 siswa contoh lain memakai kata sandi yang sama: siswa123");
    console.log("\n  Selesai. Siswa masuk lewat /login, pengelola lewat /ADZ-ADM4S.\n");
  } catch (e) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* transaksi mungkin sudah ditutup */
    }
    throw e;
  } finally {
    db.close();
  }
}

main();
