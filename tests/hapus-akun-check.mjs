/**
 * Pengujian penghapusan akun peserta (tanpa framework tes).
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/hapus-akun-check.mjs
 *
 * Menghapus akun adalah satu-satunya aksi di panel admin yang membuang data
 * peserta secara permanen, jadi yang diuji bukan sekadar "barisnya hilang":
 *
 *   1. JEJAK. Angka yang dipakai dialog konfirmasi harus benar — pengelola
 *      memutuskan berdasarkan angka itu.
 *   2. CASCADE. Pengerjaan, jawaban, hasil, sesi Warung beserta jawabannya,
 *      pelanggaran, izin susulan, dan pilihan prodi ikut terhapus; milik
 *      peserta LAIN tidak boleh ikut tersapu.
 *   3. GERBANG. Akun sendiri, admin terakhir, dan peserta yang sedang
 *      mengerjakan ujian tidak boleh terhapus.
 *   4. SOAL DAN PAKET TIDAK IKUT HILANG. Menghapus peserta bukan menghapus bank
 *      soal — cascade yang salah arah akan menghancurkan naskah.
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
const TMP = path.join(AKAR, ".tmp", "cek", "hapus-akun");

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
const A = await muat("admin");
const T = await muat("tampilan");
const { one, run } = dbMod;

let gagal = 0;
function periksa(nama, syarat, tambahan = "") {
  if (syarat) {
    console.log("  ✓ " + nama);
  } else {
    gagal++;
    console.log("  ✗ " + nama + (tambahan ? " — " + tambahan : ""));
  }
}

const angka = (sql, ...p) => Number(one(sql, ...p)?.n ?? 0);
const ada = (sql, ...p) => one(sql, ...p) !== undefined;

/* ------------------------------------------------------------------ */
// Isi basis data uji: satu admin, dua siswa, satu paket berisi satu soal.
/* ------------------------------------------------------------------ */

const siswa = (id, nama, nisn) =>
  run(
    `INSERT INTO users (id, nama, email, password_hash, role, nisn)
     VALUES (?, ?, ?, 'x', 'siswa', ?)`,
    id,
    nama,
    `${nisn}@siswa.local`,
    nisn,
  );

run(
  `INSERT INTO users (id, nama, email, password_hash, role)
   VALUES (1, 'Pengelola', 'admin@cek.local', 'x', 'admin')`,
);
siswa(2, "Siswa Dihapus", "111");
siswa(3, "Siswa Tetangga", "222");

run(
  `INSERT INTO packages (id, kode, nama, jalur, status)
   VALUES (10, 'TO-CEK-1', 'Paket Cek', 'utbk', 'published')`,
);
run(
  `INSERT INTO questions (id, package_id, subtes, nomor, tipe, level, pertanyaan, opsi, kunci)
   VALUES (100, 10, 'PU', 1, 'PG', 'C3', '1 + 1 = ?', '["1","2","3","4","5"]', 'B')`,
);
run(
  `INSERT INTO warung_paket (id, subtes, nomor, judul)
   VALUES (20, 'PU', 1, 'Warung PU 1')`,
);
run(
  `INSERT INTO warung_soal (id, paket_id, nomor, tipe, pertanyaan, opsi, kunci)
   VALUES (200, 20, 1, 'PG', '2 + 2 = ?', '["2","3","4","5","6"]', 'C')`,
);
run("INSERT INTO prodi (id, nama, ptn) VALUES (30, 'PENDIDIKAN DOKTER', 'USU')");

/** Seluruh rekam jejak satu peserta: tryout selesai, Warung, pelanggaran, dst. */
function beriJejak(userId, attemptId, sesiId) {
  run(
    `INSERT INTO attempts (id, user_id, package_id, status, total_skor)
     VALUES (?, ?, 10, 'finished', 700)`,
    attemptId,
    userId,
  );
  run(
    `INSERT INTO attempt_subtes (attempt_id, subtes, deadline_at)
     VALUES (?, 'PU', '2099-01-01 00:00:00')`,
    attemptId,
  );
  run("INSERT INTO answers (attempt_id, question_id, jawaban) VALUES (?, 100, 'B')", attemptId);
  run("INSERT INTO results (attempt_id, subtes, benar, skor) VALUES (?, 'PU', 1, 700)", attemptId);
  run(
    `INSERT INTO violations (attempt_id, user_id, package_id, subtes, jenis)
     VALUES (?, ?, 10, 'PU', 'keluar_tab')`,
    attemptId,
    userId,
  );
  run(
    `INSERT INTO susulan (user_id, package_id, diberikan_oleh, catatan)
     VALUES (?, 10, 1, 'sakit')`,
    userId,
  );
  run(
    `INSERT INTO pilihan_prodi (user_id, package_id, urutan, prodi_id, prodi_nama, ptn)
     VALUES (?, 10, 1, 30, 'PENDIDIKAN DOKTER', 'USU')`,
    userId,
  );
  run(
    `INSERT INTO warung_sesi (id, user_id, paket_id, status, deadline_at)
     VALUES (?, ?, 20, 'finished', '2099-01-01 00:00:00')`,
    sesiId,
    userId,
  );
  run(
    "INSERT INTO warung_jawaban (sesi_id, soal_id, jawaban, benar) VALUES (?, 200, 'C', 1)",
    sesiId,
  );
}

beriJejak(2, 500, 600);
beriJejak(3, 501, 601);

/* ------------------------------------------------------------------ */
console.log("\n1. Jejak yang dilaporkan ke pengelola");
/* ------------------------------------------------------------------ */

const jejak = A.jejakPeserta(2);
periksa("nama peserta terbaca", jejak.nama === "Siswa Dihapus", "dapat " + jejak?.nama);
periksa("perannya siswa", jejak.role === "siswa");
periksa("1 pengerjaan tryout terhitung", jejak.tryout === 1, "dapat " + jejak.tryout);
periksa("tidak ada pengerjaan berjalan", jejak.tryoutBerjalan === 0);
periksa("1 sesi Warung terhitung", jejak.warung === 1, "dapat " + jejak.warung);
periksa("1 pelanggaran terhitung", jejak.pelanggaran === 1, "dapat " + jejak.pelanggaran);
periksa("1 izin susulan terhitung", jejak.susulan === 1, "dapat " + jejak.susulan);
periksa("akun yang tidak ada tidak punya jejak", A.jejakPeserta(999) === undefined);

periksa(
  "kalimat konfirmasi menyebut semua yang ikut hilang",
  T.konfirmasiHapusAkun("Siswa Dihapus", jejak) ===
    "Hapus akun Siswa Dihapus? 1 pengerjaan tryout, 1 sesi Warung, dan 1 catatan pelanggaran ikut terhapus permanen dan tidak bisa dikembalikan.",
  T.konfirmasiHapusAkun("Siswa Dihapus", jejak),
);
periksa(
  "akun tanpa jejak dapat kalimat yang berbeda",
  T.konfirmasiHapusAkun("Siswa Baru", { tryout: 0 }).includes("belum punya rekam jejak"),
);
periksa(
  "dua jenis jejak digabung dengan 'dan', tanpa koma",
  T.konfirmasiHapusAkun("X", { tryout: 2, warung: 1 }).includes(
    "2 pengerjaan tryout dan 1 sesi Warung",
  ),
);

/* ------------------------------------------------------------------ */
console.log("\n2. Gerbang yang tidak boleh terbuka");
/* ------------------------------------------------------------------ */

periksa(
  "akun sendiri tidak bisa dihapus",
  A.hapusPengguna(1, 1).error?.includes("akunmu sendiri"),
  JSON.stringify(A.hapusPengguna(1, 1)),
);
periksa("akunnya memang masih ada", ada("SELECT id FROM users WHERE id = 1"));

// Admin kedua supaya larangan "admin terakhir" bisa diuji terpisah dari "akun sendiri".
run(
  `INSERT INTO users (id, nama, email, password_hash, role)
   VALUES (4, 'Pengelola Dua', 'admin2@cek.local', 'x', 'admin')`,
);
periksa("admin kedua boleh dihapus selagi masih ada admin lain", !A.hapusPengguna(4, 1).error);
periksa("admin terakhir ditolak", A.hapusPengguna(1, 99).error?.includes("satu admin"));

// Timer subtes masih berjalan: ujiannya benar-benar hidup.
run("UPDATE attempts SET status = 'ongoing' WHERE id = 500");
run(
  "UPDATE attempt_subtes SET selesai_at = NULL, deadline_at = datetime('now', '+30 minutes') WHERE attempt_id = 500",
);
periksa("timer subtes yang hidup terbaca sebagai pengerjaan berjalan", A.jejakPeserta(2).tryoutBerjalan === 1);
periksa(
  "peserta yang sedang mengerjakan tryout tidak bisa dihapus",
  A.hapusPengguna(2, 1).error?.includes("sedang mengerjakan"),
);

// Sesi telantar: statusnya ongoing sampai kapan pun, tapi tenggatnya sudah
// lewat berhari-hari. Akun seperti ini justru yang mau dibersihkan pengelola.
run(
  "UPDATE attempt_subtes SET deadline_at = datetime('now', '-3 days') WHERE attempt_id = 500",
);
periksa(
  "sesi tryout telantar tidak dihitung berjalan",
  A.jejakPeserta(2).tryoutBerjalan === 0,
  "dapat " + A.jejakPeserta(2).tryoutBerjalan,
);
run("UPDATE attempts SET status = 'finished' WHERE id = 500");

run(
  "UPDATE warung_sesi SET status = 'ongoing', deadline_at = datetime('now','localtime','+20 minutes') WHERE id = 600",
);
periksa(
  "peserta yang sedang mengerjakan Warung juga tidak bisa dihapus",
  A.hapusPengguna(2, 1).error?.includes("sedang mengerjakan"),
);
run(
  "UPDATE warung_sesi SET deadline_at = datetime('now','localtime','-3 days') WHERE id = 600",
);
periksa(
  "sesi Warung telantar tidak dihitung berjalan",
  A.jejakPeserta(2).warungBerjalan === 0,
  "dapat " + A.jejakPeserta(2).warungBerjalan,
);
run("UPDATE warung_sesi SET status = 'finished' WHERE id = 600");

periksa(
  "id yang tidak dikenal ditolak dengan pesan jelas",
  A.hapusPengguna(999, 1).error?.includes("tidak ditemukan"),
);
periksa("setelah semua penolakan, jejaknya masih utuh", A.jejakPeserta(2).tryout === 1);

/* ------------------------------------------------------------------ */
console.log("\n3. Penghapusan dan cascade-nya");
/* ------------------------------------------------------------------ */

const hasil = A.hapusPengguna(2, 1);
periksa("penghapusan berhasil tanpa galat", !hasil.error, hasil.error);
periksa("jejak dikembalikan untuk pesan sukses", hasil.jejak?.nama === "Siswa Dihapus");

periksa("baris users hilang", !ada("SELECT id FROM users WHERE id = 2"));
periksa("pengerjaan tryout hilang", !ada("SELECT id FROM attempts WHERE id = 500"));
periksa("timer subtes hilang", !ada("SELECT id FROM attempt_subtes WHERE attempt_id = 500"));
periksa("jawaban hilang", !ada("SELECT id FROM answers WHERE attempt_id = 500"));
periksa("hasil per subtes hilang", !ada("SELECT id FROM results WHERE attempt_id = 500"));
periksa("catatan pelanggaran hilang", !ada("SELECT id FROM violations WHERE user_id = 2"));
periksa("izin susulan hilang", !ada("SELECT id FROM susulan WHERE user_id = 2"));
periksa("pilihan prodi hilang", !ada("SELECT id FROM pilihan_prodi WHERE user_id = 2"));
periksa("sesi Warung hilang", !ada("SELECT id FROM warung_sesi WHERE id = 600"));
periksa("jawaban Warung hilang", !ada("SELECT id FROM warung_jawaban WHERE sesi_id = 600"));

/* ------------------------------------------------------------------ */
console.log("\n4. Yang TIDAK boleh ikut terhapus");
/* ------------------------------------------------------------------ */

periksa("peserta lain tetap ada", ada("SELECT id FROM users WHERE id = 3"));
periksa("pengerjaan peserta lain utuh", ada("SELECT id FROM attempts WHERE id = 501"));
periksa("jawaban peserta lain utuh", ada("SELECT id FROM answers WHERE attempt_id = 501"));
periksa("hasil peserta lain utuh", ada("SELECT id FROM results WHERE attempt_id = 501"));
periksa("sesi Warung peserta lain utuh", ada("SELECT id FROM warung_sesi WHERE id = 601"));
periksa("pelanggaran peserta lain utuh", ada("SELECT id FROM violations WHERE user_id = 3"));

periksa("paket tryout tetap ada", ada("SELECT id FROM packages WHERE id = 10"));
periksa("soal tetap ada", ada("SELECT id FROM questions WHERE id = 100"));
periksa("paket Warung tetap ada", ada("SELECT id FROM warung_paket WHERE id = 20"));
periksa("soal Warung tetap ada", ada("SELECT id FROM warung_soal WHERE id = 200"));
periksa("katalog prodi tetap ada", ada("SELECT id FROM prodi WHERE id = 30"));

periksa(
  "daftar peserta admin tinggal 2 akun (1 admin + 1 siswa)",
  A.daftarPeserta().length === 2,
  "dapat " + A.daftarPeserta().length,
);
periksa("akun terhapus tidak muncul lagi di pencarian", A.daftarPeserta("Dihapus").length === 0);
periksa("jumlah admin tetap 1", angka("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'") === 1);

/* ------------------------------------------------------------------ */
// Folder sementara TIDAK dihapus di sini: Windows masih memegang berkas SQLite
// yang terbuka. Yang membersihkannya adalah rmSync di awal berkas ini.

if (gagal > 0) {
  console.log("\n" + gagal + " pemeriksaan GAGAL.\n");
  process.exit(1);
}
console.log("\nSemua pemeriksaan hapus akun lulus.\n");
