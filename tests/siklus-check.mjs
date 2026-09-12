/**
 * Pengujian siklus tryout pekanan (tanpa framework tes).
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/siklus-check.mjs
 *
 * Tryout Real UTBK-SNBT Adzkia digelar sepekan sekali tiap Jumat. Yang diuji:
 *
 *   1. PENANGGALAN. Jumat dihitung dari pekan Senin-Minggu, batas yang sama
 *      persis dengan papan "TOAdzkia Pekan Ini", supaya jendela paket berakhir
 *      tepat ketika papan peringkatnya berganti.
 *   2. KODE DAN NAMA mengikuti pola yang sudah dipakai pengelola
 *      ("TO-4SEP2026"), sehingga paket otomatis dan paket buatan tangan tidak
 *      bisa dibedakan — dan paket lama ikut dikenali penjadwal.
 *   3. PENJADWAL: menutup paket siklus lama, menyiapkan paket siklus berjalan
 *      sebagai DRAFT (tidak pernah terbit sendiri), mengangkat paket buatan
 *      tangan alih-alih membuat kembarannya, dan TIDAK PERNAH menyentuh paket
 *      di luar siklus (paket demo, paket SKD).
 *   4. SIKLUS BERGANTI: siswa yang sudah menuntaskan tryout pekan lalu melihat
 *      tryout pekan ini sebagai paket yang bisa dikerjakan — inilah jawaban
 *      atas "siswa bisa login lagi dan lanjut ke TO berikutnya".
 *
 * Berkas .ts asli dipakai apa adanya — hanya disalin ke folder sementara DI
 * DALAM proyek (supaya node_modules terjangkau) dengan penambahan ekstensi
 * pada impornya, karena Node 24 sudah bisa menjalankan TypeScript.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const AKAR = path.resolve(import.meta.dirname, "..");

/** Jalur lengkap sebuah berkas src/lib, di domain mana pun ia berada. */
function cariDiLib(namaBerkas) {
  const dasar = String(namaBerkas).split(/[\/]/).pop();
  for (const p of fs.readdirSync(path.join(AKAR, "src", "lib"), { recursive: true })) {
    const jalur = String(p);
    if (jalur.split(/[\/]/).pop() === dasar) {
      return path.join(AKAR, "src", "lib", jalur);
    }
  }
  throw new Error(`Tidak ada ${dasar} di src/lib`);
}
const TMP = path.join(AKAR, ".tmp", "cek", "siklus");

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
process.env.ADZKIA_DB_PATH = path.join(TMP, "cek.db");

const rapikan = (sumber) =>
  sumber
    .replace(/^import "server-only";\s*$/m, "")
    .replace(/from "@\/components\/exam\/tipe"/g, 'from "./tipe-exam.ts"')
    .replace(/from "@\/lib\/(?:[a-z0-9-]+\/)?([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"')
    .replace(/from "\.\/([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"');

// Menelusuri src/lib SECARA REKURSIF: sejak 12 September 2026 isinya
// bersarang per domain (core/, tryout/, ielts/, ...). Salinannya tetap
// diratakan — nama dasarnya unik di seluruh domain.
for (const berkas of fs
  .readdirSync(path.join(AKAR, "src", "lib"), { recursive: true })
  .map((p) => String(p))
  .filter((p) => p.endsWith(".ts"))
  .map((p) => p.split(/[\/]/).pop())) {
  if (!berkas.endsWith(".ts")) continue;
  fs.writeFileSync(
    path.join(TMP, berkas),
    rapikan(fs.readFileSync(cariDiLib(berkas), "utf8")),
  );
}
fs.writeFileSync(
  path.join(TMP, "tipe-exam.ts"),
  rapikan(fs.readFileSync(path.join(AKAR, "src", "components", "exam", "tipe.ts"), "utf8")),
);

const muat = (nama) => import(pathToFileURL(path.join(TMP, `${nama}.ts`)).href);

const dbMod = await muat("db");
const S = await muat("siklus");
const J = await muat("siklus-jadwal");
const E = await muat("exam");
const { all, one, run } = dbMod;

let gagal = 0;
function periksa(nama, syarat, tambahan = "") {
  if (syarat) {
    console.log("  ✓ " + nama);
  } else {
    gagal++;
    console.log("  ✗ " + nama + (tambahan ? " — " + tambahan : ""));
  }
}

const tgl = (iso) => new Date(iso + "T09:00:00");

/* ------------------------------------------------------------------ */
console.log("\n1. Penanggalan siklus");
/* ------------------------------------------------------------------ */

// Pekan 31 Agustus - 6 September 2026; Jumatnya 4 September.
periksa("dari hari Senin, Jumat pekan itu ketemu", S.jumatPekan(tgl("2026-08-31")).getDate() === 4);
periksa("dari hari Jumat sendiri, tetap Jumat itu", S.jumatPekan(tgl("2026-09-04")).getDate() === 4);
periksa("dari hari Minggu, masih Jumat pekan yang sama", S.jumatPekan(tgl("2026-09-06")).getDate() === 4);
periksa(
  "dari Senin berikutnya, sudah pindah ke Jumat 11 September",
  S.jumatPekan(tgl("2026-09-07")).getDate() === 11,
);
periksa("yang dihasilkan memang hari Jumat", S.jumatPekan(tgl("2026-09-02")).getDay() === 5);

/* ------------------------------------------------------------------ */
console.log("\n2. Kode, nama, dan jendela paket");
/* ------------------------------------------------------------------ */

const s4 = S.siklusBerjalan(tgl("2026-09-02"));
periksa("kode mengikuti pola pengelola", s4.kode === "TO-4SEP2026", "dapat " + s4.kode);
periksa(
  "nama mengikuti pola pengelola",
  s4.nama === "Tryout Real UTBK-SNBT — Jumat, 4 September 2026",
  "dapat " + s4.nama,
);
periksa("tanggal siklus tersimpan sebagai YYYY-MM-DD", s4.tanggal === "2026-09-04");
periksa("jendela dibuka Jumat 00.00", s4.mulaiAt === "2026-09-04T00:00");
periksa(
  "jendela ditutup Minggu 23.59, ujung pekan peringkat yang sama",
  s4.selesaiAt === "2026-09-06T23:59",
  "dapat " + s4.selesaiAt,
);

const sAgu = S.siklusBerjalan(tgl("2026-08-28"));
periksa("kode dua digit tanpa nol di depan", sAgu.kode === "TO-28AGU2026", "dapat " + sAgu.kode);

periksa("kode lama terbaca kembali jadi tanggal", S.tanggalDariKode("TO-28AGU2026") === "2026-08-28");
periksa("huruf kecil tetap terbaca", S.tanggalDariKode("to-4sep2026") === "2026-09-04");
periksa("singkatan lain (AGS) ikut dikenali", S.tanggalDariKode("TO-28AGS2026") === "2026-08-28");
periksa("kode demo tidak berpola siklus", S.tanggalDariKode("TO-DEMO-1") === null);
periksa("kode SKD tidak berpola siklus", S.tanggalDariKode("TO-SKD-DEMO") === null);
periksa("tanggal yang tidak ada ditolak", S.tanggalDariKode("TO-31FEB2026") === null);

/* ------------------------------------------------------------------ */
console.log("\n3. Penjadwal: menyiapkan, mengangkat, menutup");
/* ------------------------------------------------------------------ */

run(
  "INSERT INTO users (id, nama, email, password_hash, role, nisn) VALUES (1, 'Siswa Uji', 'uji@cek.local', 'x', 'siswa', '111')",
);
// Paket di luar siklus: tidak boleh pernah disentuh penjadwal.
run(
  "INSERT INTO packages (id, kode, nama, jalur, status) VALUES (10, 'TO-DEMO-1', 'Paket Demo', 'utbk', 'published')",
);
run(
  "INSERT INTO packages (id, kode, nama, jalur, status) VALUES (11, 'TO-SKD-DEMO', 'SKD Demo', 'skd', 'published')",
);
// Paket siklus pekan lalu, sudah terbit.
run(
  `INSERT INTO packages (id, kode, nama, jalur, status, siklus, acak_soal, tampil_pembahasan)
   VALUES (12, 'TO-28AGU2026', 'TO 28 Agustus', 'utbk', 'published', '2026-08-28', 1, 0)`,
);

const h1 = J.jalankanSiklus(tgl("2026-09-02"));
periksa("paket siklus berjalan dibuat", h1.dibuat === "TO-4SEP2026", "dapat " + h1.dibuat);
periksa("paket siklus lama ditutup", h1.ditutup.includes("TO-28AGU2026"));

const baru = one("SELECT * FROM packages WHERE kode = 'TO-4SEP2026'");
periksa("paket baru berstatus DRAFT, tidak pernah terbit sendiri", baru.status === "draft");
periksa("jendelanya terisi", baru.mulai_at === "2026-09-04T00:00" && baru.selesai_at === "2026-09-06T23:59");
periksa("jalurnya UTBK", baru.jalur === "utbk");
periksa("setelan disalin dari paket siklus terakhir", baru.acak_soal === 1 && baru.tampil_pembahasan === 0);

periksa(
  "paket demo di luar siklus TIDAK ikut tertutup",
  one("SELECT status FROM packages WHERE id = 10").status === "published",
);
periksa(
  "paket SKD TIDAK ikut tertutup",
  one("SELECT status FROM packages WHERE id = 11").status === "published",
);
periksa(
  "paket pekan lalu benar-benar closed di basis data",
  one("SELECT status FROM packages WHERE id = 12").status === "closed",
);

// Dijalankan ulang pada siklus yang sama: tidak boleh membuat apa pun lagi.
const h2 = J.jalankanSiklus(tgl("2026-09-02"));
periksa("dijalankan ulang tidak membuat paket kembar", h2.dibuat === null);
periksa("dan tidak menutup apa pun lagi", h2.ditutup.length === 0);
periksa(
  "hanya ada satu paket untuk siklus itu",
  all("SELECT id FROM packages WHERE siklus = '2026-09-04'").length === 1,
);

/* ------------------------------------------------------------------ */
console.log("\n4. Paket buatan tangan diangkat, bukan dikembarkan");
/* ------------------------------------------------------------------ */

// Pengelola membuat sendiri paket pekan berikutnya, tanpa kolom siklus.
// Tanpa id eksplisit: paket siklus yang dibuat penjadwal sudah memakai nomor
// berikutnya, jadi menetapkan id sendiri di sini akan bertabrakan.
run(
  `INSERT INTO packages (kode, nama, jalur, status)
   VALUES ('TO-11SEP2026', 'TO 11 September buatan tangan', 'utbk', 'draft')`,
);
const idTangan = one("SELECT id FROM packages WHERE kode = 'TO-11SEP2026'").id;
const h3 = J.jalankanSiklus(tgl("2026-09-09"));
periksa("paket buatan tangan diangkat ke siklus", h3.diangkat.includes("TO-11SEP2026"));
periksa("tidak dibuatkan kembarannya", h3.dibuat === null);
periksa(
  "kolom siklusnya terisi",
  one("SELECT siklus FROM packages WHERE id = ?", idTangan).siklus === "2026-09-11",
);
periksa(
  "namanya tidak ditimpa penjadwal",
  one("SELECT nama FROM packages WHERE id = ?", idTangan).nama === "TO 11 September buatan tangan",
);
const tangan = one("SELECT mulai_at, selesai_at FROM packages WHERE id = ?", idTangan);
periksa(
  "jendela yang tadinya kosong ikut diisikan",
  tangan.mulai_at === "2026-09-11T00:00" && tangan.selesai_at === "2026-09-13T23:59",
  `dapat ${tangan.mulai_at} .. ${tangan.selesai_at}`,
);

// Kasus yang baru terlihat pada data sungguhan: migrasi v13 sudah mengisi
// kolom `siklus` dari kode paket, tetapi jendelanya masih kosong. Penjadwal
// tetap harus mengisikan jendela itu, bukan berhenti karena siklusnya sudah
// cocok.
run(
  `INSERT INTO packages (kode, nama, jalur, status, siklus)
   VALUES ('TO-25SEP2026', 'TO 25 September', 'utbk', 'draft', '2026-09-25')`,
);
J.jalankanSiklus(tgl("2026-09-23"));
const dariMigrasi = one("SELECT mulai_at, selesai_at FROM packages WHERE kode = 'TO-25SEP2026'");
periksa(
  "paket yang siklusnya sudah terisi migrasi tetap dapat jendela",
  dariMigrasi.mulai_at === "2026-09-25T00:00" && dariMigrasi.selesai_at === "2026-09-27T23:59",
  `dapat ${dariMigrasi.mulai_at} .. ${dariMigrasi.selesai_at}`,
);

// Jendela yang sudah diisi pengelola tidak boleh ditimpa.
run(
  `INSERT INTO packages (kode, nama, jalur, status, mulai_at, selesai_at)
   VALUES ('TO-18SEP2026', 'TO 18 September', 'utbk', 'draft', '2026-09-18T07:00', '2026-09-18T12:00')`,
);
J.jalankanSiklus(tgl("2026-09-16"));
const dijaga = one("SELECT siklus, mulai_at, selesai_at FROM packages WHERE kode = 'TO-18SEP2026'");
periksa("paket itu tetap diangkat ke siklus", dijaga.siklus === "2026-09-18");
periksa(
  "tapi jendela buatan pengelola TIDAK ditimpa",
  dijaga.mulai_at === "2026-09-18T07:00" && dijaga.selesai_at === "2026-09-18T12:00",
);

/* ------------------------------------------------------------------ */
console.log("\n5. Penjaga jeda");
/* ------------------------------------------------------------------ */

const acuan = tgl("2026-09-16");
const p1 = J.pastikanSiklusTerbaru(acuan);
periksa("pemanggilan pertama benar-benar berjalan", p1.dijalankan === true);
const p2 = J.pastikanSiklusTerbaru(acuan);
periksa("pemanggilan kedua dilewati", p2.dijalankan === false);
const p3 = J.pastikanSiklusTerbaru(new Date(acuan.getTime() + 11 * 60_000));
periksa("sesudah 11 menit berjalan lagi", p3.dijalankan === true);

/* ------------------------------------------------------------------ */
console.log("\n6. Siklus berganti: siswa lanjut ke tryout berikutnya");
/* ------------------------------------------------------------------ */

// Penjaga jeda disetel ke "sekarang" supaya penjadwal yang menumpang di dalam
// daftarPaketSiswa() tidak ikut berjalan dengan jam sungguhan dan mengubah data
// uji di tengah pemeriksaan.
run(
  `INSERT INTO pengaturan (kunci, nilai) VALUES ('siklus_cek_terakhir', ?)
   ON CONFLICT(kunci) DO UPDATE SET nilai = excluded.nilai`,
  new Date().toISOString(),
);

// Siswa menuntaskan tryout pekan lalu (paket 12, kini closed).
run(
  `INSERT INTO attempts (user_id, package_id, status, total_skor, finished_at)
   VALUES (1, 12, 'finished', 650, datetime('now'))`,
);

// Pengelola menerbitkan paket siklus berjalan, TAPI jendelanya baru dibuka
// Jumat. Sebelum hari-H tiba paket itu memang belum boleh terlihat siswa —
// jendela waktu adalah jaring pengaman kedua sesudah status draft.
run("UPDATE packages SET status = 'published' WHERE kode = 'TO-4SEP2026'");
periksa(
  "paket yang sudah terbit tapi belum masuk jendelanya tidak terlihat siswa",
  !E.daftarPaketSiswa(1).some((p) => p.kode === "TO-4SEP2026"),
);

// Sekarang hari-H tiba: jendelanya terbuka.
run(
  "UPDATE packages SET mulai_at = '2020-01-01T00:00', selesai_at = '2099-12-31T23:59' WHERE kode = 'TO-4SEP2026'",
);

const daftar = E.daftarPaketSiswa(1);
const kode = daftar.map((p) => p.kode);
periksa("tryout pekan ini muncul di beranda siswa", kode.includes("TO-4SEP2026"));
periksa("tryout pekan lalu yang sudah tertutup tidak muncul lagi", !kode.includes("TO-28AGU2026"));

const pekanIni = daftar.find((p) => p.kode === "TO-4SEP2026");
periksa("belum punya sesi di paket baru, jadi siap dimulai", pekanIni.attempt_id === null);
periksa("paket baru berada dalam jendelanya", pekanIni.dalam_jendela === 1);
periksa(
  "sesi paket lama tetap tersimpan sebagai riwayat",
  one("SELECT status FROM attempts WHERE package_id = 12 AND user_id = 1").status === "finished",
);

/* ------------------------------------------------------------------ */
// Folder sementara TIDAK dihapus di sini: Windows masih memegang berkas SQLite
// yang terbuka. Yang membersihkannya adalah rmSync di awal berkas ini.

if (gagal > 0) {
  console.log("\n" + gagal + " pemeriksaan GAGAL.\n");
  process.exit(1);
}
console.log("\nSemua pemeriksaan siklus lulus.\n");
