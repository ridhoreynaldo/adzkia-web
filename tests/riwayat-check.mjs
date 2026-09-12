/**
 * Pengujian penghapusan RIWAYAT pengerjaan satu paket (tanpa framework tes).
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/riwayat-check.mjs
 *
 * Aksi ini membuang nilai peserta secara permanen, jadi yang diuji bukan
 * sekadar "barisnya hilang":
 *
 *   1. JEJAK. Angka yang dipakai dialog konfirmasi harus benar — pengelola
 *      memutuskan berdasarkan angka itu.
 *   2. BATAS SAPUAN. Riwayat paket LAIN, soal, jadwal, akun siswa, dan izin
 *      susulan tidak boleh ikut tersapu. Cascade yang salah arah di sini akan
 *      menghancurkan bank soal menjelang hari-H.
 *   3. GERBANG. Paket yang SEDANG dikerjakan tidak boleh dibersihkan; sesi yang
 *      sekadar ditinggalkan (tenggatnya sudah lewat) tidak boleh menghalangi.
 *   4. KALIBRASI DISETEL ULANG. Tingkat kesulitan butir dihitung dari peserta
 *      yang sudah selesai. Kalau tidak dihitung ulang, angka dari pengerjaan
 *      yang barusan dihapus tetap ikut menilai peserta sungguhan nanti.
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
const TMP = path.join(AKAR, ".tmp", "cek", "riwayat");

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

const { one, run } = await muat("db");
const A = await muat("admin");
const T = await muat("tampilan");

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
// Isi basis data uji: satu admin, tiga siswa, DUA paket masing-masing 2 soal.
// Paket 10 yang dibersihkan; paket 11 pembanding yang harus tetap utuh.
/* ------------------------------------------------------------------ */

run(
  `INSERT INTO users (id, nama, email, password_hash, role)
   VALUES (1, 'Pengelola', 'admin@cek.local', 'x', 'admin')`,
);
for (const [id, nama] of [
  [2, "Siswa Satu"],
  [3, "Siswa Dua"],
  [4, "Siswa Tiga"],
  [5, "Siswa Empat"],
  [6, "Siswa Lima"],
]) {
  run(
    `INSERT INTO users (id, nama, email, password_hash, role, nisn)
     VALUES (?, ?, ?, 'x', 'siswa', ?)`,
    id,
    nama,
    `${id}@siswa.local`,
    String(100 + id),
  );
}

for (const [id, kode] of [
  [10, "TO-CEK-BERSIH"],
  [11, "TO-CEK-UTUH"],
]) {
  run(
    `INSERT INTO packages (id, kode, nama, jalur, status)
     VALUES (?, ?, 'Paket ' || ?, 'utbk', 'published')`,
    id,
    kode,
    kode,
  );
}
// Dua butir per paket supaya kalibrasi punya sesuatu untuk dihitung.
let idSoal = 100;
for (const paket of [10, 11]) {
  for (const nomor of [1, 2]) {
    run(
      `INSERT INTO questions (id, package_id, subtes, nomor, tipe, level, pertanyaan, opsi, kunci)
       VALUES (?, ?, 'PU', ?, 'PG', 'C3', 'Soal ' || ?, '["1","2","3","4","5"]', 'B')`,
      idSoal++,
      paket,
      nomor,
      nomor,
    );
  }
}
run("INSERT INTO prodi (id, nama, ptn) VALUES (30, 'PENDIDIKAN DOKTER', 'USU')");

/**
 * Satu pengerjaan lengkap: subtes, jawaban, hasil, dan pelanggaran.
 * `tenggat` menentukan apakah timernya masih hidup — itulah yang membedakan
 * "sedang mengerjakan" dari "sesi yang ditinggalkan".
 */
function beriPengerjaan(
  { attemptId, userId, paket, status, soalBenar, tenggat = "2099-01-01 00:00:00", tutup = true },
) {
  run(
    `INSERT INTO attempts (id, user_id, package_id, status, total_skor)
     VALUES (?, ?, ?, ?, 700)`,
    attemptId,
    userId,
    paket,
    status,
  );
  run(
    `INSERT INTO attempt_subtes (attempt_id, subtes, deadline_at, selesai_at)
     VALUES (?, 'PU', ?, ?)`,
    attemptId,
    tenggat,
    tutup ? "2026-01-01 00:00:00" : null,
  );
  const soal = paket === 10 ? [100, 101] : [102, 103];
  for (const q of soal) {
    run(
      "INSERT INTO answers (attempt_id, question_id, jawaban) VALUES (?, ?, ?)",
      attemptId,
      q,
      q === soalBenar ? "B" : "A",
    );
  }
  run("INSERT INTO results (attempt_id, subtes, benar, skor) VALUES (?, 'PU', 1, 700)", attemptId);
  run(
    `INSERT INTO violations (attempt_id, user_id, package_id, subtes, jenis)
     VALUES (?, ?, ?, 'PU', 'keluar_tab')`,
    attemptId,
    userId,
    paket,
  );
}

const beriPilihan = (userId, paket) =>
  run(
    `INSERT INTO pilihan_prodi (user_id, package_id, urutan, prodi_id, prodi_nama, ptn)
     VALUES (?, ?, 1, 30, 'PENDIDIKAN DOKTER', 'USU')`,
    userId,
    paket,
  );

// Paket 10: dua peserta selesai + satu gugur. Pesertanya harus BERBEDA — tabel
// attempts unik pada (user_id, package_id), satu siswa cuma boleh punya satu
// baris per paket.
beriPengerjaan({ attemptId: 500, userId: 2, paket: 10, status: "finished", soalBenar: 100 });
beriPengerjaan({ attemptId: 501, userId: 3, paket: 10, status: "finished", soalBenar: 100 });
beriPengerjaan({ attemptId: 502, userId: 4, paket: 10, status: "gugur", soalBenar: 101 });
beriPilihan(2, 10);
beriPilihan(3, 10);

// Paket 11: pembanding, harus tetap utuh seluruhnya.
beriPengerjaan({ attemptId: 510, userId: 5, paket: 11, status: "finished", soalBenar: 102 });
beriPilihan(5, 11);

run(
  `INSERT INTO susulan (user_id, package_id, diberikan_oleh, catatan)
   VALUES (2, 10, 1, 'sakit')`,
);

/* ------------------------------------------------------------------ */
console.log("\n1. Jejak yang dilaporkan ke pengelola");
/* ------------------------------------------------------------------ */

const jejak = A.jejakRiwayatPaket(10);
periksa("kode paket terbaca", jejak.kode === "TO-CEK-BERSIH", "dapat " + jejak?.kode);
periksa("3 pengerjaan terhitung", jejak.pengerjaan === 3, "dapat " + jejak.pengerjaan);
periksa("2 pengerjaan selesai", jejak.selesai === 2, "dapat " + jejak.selesai);
periksa("1 pengerjaan gugur", jejak.gugur === 1, "dapat " + jejak.gugur);
periksa("6 jawaban terhitung", jejak.jawaban === 6, "dapat " + jejak.jawaban);
periksa("3 catatan pelanggaran", jejak.pelanggaran === 3, "dapat " + jejak.pelanggaran);
periksa("2 pilihan prodi", jejak.pilihanProdi === 2, "dapat " + jejak.pilihanProdi);
periksa("tidak ada pengerjaan berjalan", jejak.berjalan === 0, "dapat " + jejak.berjalan);
periksa("paket lain punya jejak sendiri", A.jejakRiwayatPaket(11).pengerjaan === 1);
periksa("paket yang tidak ada tidak punya jejak", A.jejakRiwayatPaket(999) === undefined);

periksa(
  "kalimat konfirmasi menyebut semua yang ikut hilang",
  T.konfirmasiHapusRiwayat("TO-CEK-BERSIH", jejak).startsWith(
    "Hapus riwayat paket TO-CEK-BERSIH? pengerjaan 3 peserta, 3 catatan pelanggaran, dan 2 pilihan program studi ikut terhapus permanen",
  ),
  T.konfirmasiHapusRiwayat("TO-CEK-BERSIH", jejak),
);
periksa(
  "kalimat konfirmasi menegaskan soal dan akun TIDAK ikut terhapus",
  T.konfirmasiHapusRiwayat("TO-CEK-BERSIH", jejak).includes(
    "Soal, jadwal, dan akun siswa TIDAK ikut terhapus",
  ),
);
periksa(
  "paket tanpa riwayat dapat kalimat yang berbeda",
  T.konfirmasiHapusRiwayat("TO-KOSONG", { pengerjaan: 0 }).includes("belum punya riwayat"),
);

/* ------------------------------------------------------------------ */
console.log("\n2. Gerbang: paket yang sedang dikerjakan");
/* ------------------------------------------------------------------ */

// Timer masih hidup: subtes belum ditutup DAN tenggatnya belum lewat.
beriPengerjaan({
  attemptId: 503,
  userId: 6,
  paket: 10,
  status: "ongoing",
  soalBenar: 100,
  tenggat: "2099-01-01 00:00:00",
  tutup: false,
});
periksa("pengerjaan berjalan terdeteksi", A.jejakRiwayatPaket(10).berjalan === 1);

const ditolak = A.hapusRiwayatPaket(10, { hapusPilihanProdi: true });
periksa("penghapusan ditolak saat ada yang sedang ujian", Boolean(ditolak.error));
periksa(
  "pesan penolakan menyebut jumlah dan kodenya",
  (ditolak.error ?? "").includes("1 peserta") && (ditolak.error ?? "").includes("TO-CEK-BERSIH"),
  ditolak.error,
);
periksa("tidak ada baris yang hilang saat ditolak", angka("SELECT COUNT(*) AS n FROM attempts WHERE package_id = 10") === 4);

// Sesi TELANTAR: belum ditutup, tapi tenggatnya sudah lewat. Ini tidak boleh
// menghalangi — di basis data sungguhan ada sesi begini dari berhari-hari lalu.
run("UPDATE attempt_subtes SET deadline_at = '2020-01-01 00:00:00' WHERE attempt_id = 503");
periksa("sesi telantar tidak dihitung berjalan", A.jejakRiwayatPaket(10).berjalan === 0);

/* ------------------------------------------------------------------ */
console.log("\n3. Kalibrasi sebelum dibersihkan");
/* ------------------------------------------------------------------ */

const IRT = await muat("irt");
IRT.kalibrasiPaket(10);
IRT.kalibrasiPaket(11);
periksa(
  "butir paket 10 terkalibrasi dari peserta",
  angka("SELECT n_peserta AS n FROM item_params WHERE question_id = 100") > 0,
);
const b11Sebelum = one("SELECT b FROM item_params WHERE question_id = 102")?.b;
periksa("butir paket 11 juga terkalibrasi", typeof b11Sebelum === "number");

/* ------------------------------------------------------------------ */
console.log("\n4. Pembersihan, termasuk pilihan prodi");
/* ------------------------------------------------------------------ */

const hasil = A.hapusRiwayatPaket(10, { hapusPilihanProdi: true });
periksa("penghapusan berhasil", !hasil.error, hasil.error);
periksa("jejak dikembalikan untuk pesan sukses", hasil.jejak?.pengerjaan === 4, "dapat " + hasil.jejak?.pengerjaan);

periksa("pengerjaan paket 10 habis", angka("SELECT COUNT(*) AS n FROM attempts WHERE package_id = 10") === 0);
periksa(
  "jawaban ikut terhapus (cascade)",
  angka("SELECT COUNT(*) AS n FROM answers WHERE attempt_id IN (500,501,502,503)") === 0,
);
periksa(
  "hasil per subtes ikut terhapus (cascade)",
  angka("SELECT COUNT(*) AS n FROM results WHERE attempt_id IN (500,501,502,503)") === 0,
);
periksa(
  "baris attempt_subtes ikut terhapus (cascade)",
  angka("SELECT COUNT(*) AS n FROM attempt_subtes WHERE attempt_id IN (500,501,502,503)") === 0,
);
periksa(
  "pelanggaran paket 10 ikut terhapus",
  angka("SELECT COUNT(*) AS n FROM violations WHERE package_id = 10") === 0,
);
periksa(
  "pilihan prodi paket 10 ikut terhapus",
  angka("SELECT COUNT(*) AS n FROM pilihan_prodi WHERE package_id = 10") === 0,
);

/* ------------------------------------------------------------------ */
console.log("\n5. Yang TIDAK boleh ikut tersapu");
/* ------------------------------------------------------------------ */

periksa("paket 10 sendiri tetap ada", ada("SELECT id FROM packages WHERE id = 10"));
periksa("soal paket 10 tetap 2 butir", angka("SELECT COUNT(*) AS n FROM questions WHERE package_id = 10") === 2);
periksa("keenam akun tetap ada", angka("SELECT COUNT(*) AS n FROM users") === 6);
periksa("katalog prodi tetap ada", ada("SELECT id FROM prodi WHERE id = 30"));
periksa(
  "izin susulan TIDAK ikut dicabut",
  angka("SELECT COUNT(*) AS n FROM susulan WHERE package_id = 10") === 1,
);

periksa("pengerjaan paket 11 utuh", angka("SELECT COUNT(*) AS n FROM attempts WHERE package_id = 11") === 1);
periksa("jawaban paket 11 utuh", angka("SELECT COUNT(*) AS n FROM answers WHERE attempt_id = 510") === 2);
periksa("hasil paket 11 utuh", angka("SELECT COUNT(*) AS n FROM results WHERE attempt_id = 510") === 1);
periksa(
  "pelanggaran paket 11 utuh",
  angka("SELECT COUNT(*) AS n FROM violations WHERE package_id = 11") === 1,
);
periksa(
  "pilihan prodi paket 11 utuh",
  angka("SELECT COUNT(*) AS n FROM pilihan_prodi WHERE package_id = 11") === 1,
);
periksa(
  "kalibrasi paket 11 tidak berubah",
  one("SELECT b FROM item_params WHERE question_id = 102")?.b === b11Sebelum,
);

/* ------------------------------------------------------------------ */
console.log("\n6. Kalibrasi paket 10 disetel ulang");
/* ------------------------------------------------------------------ */

periksa(
  "tidak ada lagi peserta yang tercatat pada butirnya",
  angka("SELECT n_peserta AS n FROM item_params WHERE question_id = 100") === 0,
);
periksa(
  "tingkat kesulitan kembali netral (b = 0)",
  one("SELECT b FROM item_params WHERE question_id = 100")?.b === 0,
  "dapat " + one("SELECT b FROM item_params WHERE question_id = 100")?.b,
);
periksa(
  "baris item_params tidak dihapus, hanya disetel ulang",
  angka("SELECT COUNT(*) AS n FROM item_params WHERE question_id IN (100,101)") === 2,
);

/* ------------------------------------------------------------------ */
console.log("\n7. Membersihkan yang sudah bersih");
/* ------------------------------------------------------------------ */

const kosong = A.hapusRiwayatPaket(10, { hapusPilihanProdi: true });
periksa("paket tanpa riwayat ditolak dengan pesan yang jelas", Boolean(kosong.error), kosong.error);
periksa("paket yang tidak ada ditolak", Boolean(A.hapusRiwayatPaket(999).error));

/* ------------------------------------------------------------------ */
console.log("\n8. Membersihkan tanpa menyentuh pilihan prodi");
/* ------------------------------------------------------------------ */

const sisa = A.hapusRiwayatPaket(11);
periksa("penghapusan paket 11 berhasil", !sisa.error, sisa.error);
periksa("pengerjaan paket 11 habis", angka("SELECT COUNT(*) AS n FROM attempts WHERE package_id = 11") === 0);
periksa(
  "pilihan prodi paket 11 SENGAJA dipertahankan",
  angka("SELECT COUNT(*) AS n FROM pilihan_prodi WHERE package_id = 11") === 1,
);

/* ------------------------------------------------------------------ */
// Folder sementara TIDAK dihapus di sini: Windows masih memegang berkas SQLite
// yang terbuka. Yang membersihkannya adalah rmSync di awal berkas ini.

if (gagal > 0) {
  console.log("\n" + gagal + " pemeriksaan GAGAL.\n");
  process.exit(1);
}
console.log("\nSemua pemeriksaan hapus riwayat lulus.\n");
