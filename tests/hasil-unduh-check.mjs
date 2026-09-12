/**
 * Pengujian lembar HASIL yang dibagikan kepada ORANG TUA (tanpa framework tes).
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/hasil-unduh-check.mjs
 *
 * Lembar ini beredar di luar sekolah — grup WhatsApp wali murid, cetakan yang
 * dibawa pulang. Karena itu yang dijaga di sini bukan cuma "berkasnya jadi",
 * melainkan JANJI-JANJI yang menempel padanya:
 *
 *   1. JUDUL mengikuti portalnya: UTBK-SNBT atau SKD Kedinasan, keduanya
 *      menyebut nama sekolah.
 *   2. TANGGAL UJIAN tercetak, dan diambil dari tanggal hari-H — bukan tanggal
 *      berkasnya dibuat.
 *   3. KOLOMNYA HANYA nomor, nama, skor tiap subtes, dan total. Tidak lebih.
 *   4. TIDAK ADA SATU PUN jejak pelanggaran di dalamnya. Ini yang paling
 *      penting: menyelipkan status "gugur" seorang anak ke lembar yang dibaca
 *      seluruh angkatan adalah kerugian yang tidak bisa ditarik kembali.
 *   5. Rutenya hanya bisa dibuka pengelola.
 *
 * Basis datanya dibuat sendiri di folder sementara, jadi pemeriksa ini tidak
 * pernah menyentuh data sungguhan.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ExcelJS from "exceljs";

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
const TMP = path.join(AKAR, ".tmp", "cek", "hasil");

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
process.env.ADZKIA_DB_PATH = path.join(TMP, "cek.db");

const rapikan = (sumber) =>
  sumber
    .replace(/^import "server-only";\s*$/m, "")
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

const muat = (nama) => import(pathToFileURL(path.join(TMP, `${nama}.ts`)).href);
const { run } = await muat("db");
const L = await muat("laporan-hasil");

let gagal = 0;
function periksa(nama, syarat, tambahan = "") {
  if (syarat) {
    console.log("  ✓ " + nama);
  } else {
    gagal++;
    console.log("  ✗ " + nama + (tambahan ? " — " + tambahan : ""));
  }
}

/* ------------------------------------------------------------------ */
/* Penyiapan: dua paket, empat peserta, plus satu peserta yang GUGUR    */
/* ------------------------------------------------------------------ */

const SISWA = ["Aisyah Nur Ramadhani", "Bagus Prasetyo", "Dinda Ayu Lestari"];
SISWA.forEach((nama, i) =>
  run(
    "INSERT INTO users (id, nama, email, password_hash, role, nisn) VALUES (?, ?, ?, 'x', 'siswa', ?)",
    i + 1,
    nama,
    `siswa${i + 1}@cek.local`,
    `00${i + 1}`,
  ),
);
// Peserta yang digugurkan — dipakai membuktikan ia TIDAK muncul di lembar hasil.
run(
  "INSERT INTO users (id, nama, email, password_hash, role) VALUES (9, 'Peserta Digugurkan', 'gugur@cek.local', 'x', 'siswa')",
);

run(
  "INSERT INTO packages (id, kode, nama, status, jalur, siklus) VALUES (1, 'TO-11SEP2026', 'Tryout Real UTBK-SNBT', 'published', 'utbk', '2026-09-11')",
);
run(
  "INSERT INTO packages (id, kode, nama, status, jalur, mulai_at) VALUES (2, 'SKD-1', 'SKD Kedinasan Perdana', 'published', 'skd', '2026-09-13T07:00')",
);

const SUBTES_UTBK = ["PU", "PPU", "PBM", "PK", "LBIND", "LBING", "PM"];
const SUBTES_SKD = ["TWK", "TIU", "TKP"];

function pengerjaan(id, userId, paketId, subtes, skorFn) {
  const total = subtes.reduce((a, _s, j) => a + skorFn(j), 0);
  const nilai = paketId === 2 ? total : Math.round(total / subtes.length);
  run(
    "INSERT INTO attempts (id, user_id, package_id, status, total_skor, finished_at) VALUES (?, ?, ?, 'finished', ?, datetime('now'))",
    id,
    userId,
    paketId,
    nilai,
  );
  subtes.forEach((s, j) =>
    run(
      "INSERT INTO results (attempt_id, subtes, benar, salah, kosong, skor, theta) VALUES (?, ?, 0, 0, 0, ?, 0)",
      id,
      s,
      skorFn(j),
    ),
  );
}

// UTBK: skor sengaja TIDAK urut supaya urutan lembar benar-benar diuji.
pengerjaan(1, 1, 1, SUBTES_UTBK, (j) => 700 - j * 10); // rata-rata 670
pengerjaan(2, 2, 1, SUBTES_UTBK, (j) => 820 - j * 10); // rata-rata 790 (tertinggi)
pengerjaan(3, 3, 1, SUBTES_UTBK, (j) => 610 - j * 10); // rata-rata 580
// SKD
pengerjaan(4, 1, 2, SUBTES_SKD, (j) => [100, 110, 120][j]);
pengerjaan(5, 2, 2, SUBTES_SKD, (j) => [90, 100, 110][j]);

// Peserta yang digugurkan, lengkap dengan barisnya di tabel pelanggaran.
run(
  "INSERT INTO attempts (id, user_id, package_id, status, total_skor, alasan_gugur) VALUES (6, 9, 1, 'gugur', 400, 'Mohon maaf, ujian kamu DIHENTIKAN karena alt_tab')",
);
run(
  "INSERT INTO violations (attempt_id, user_id, package_id, subtes, jenis, urutan, ronde) VALUES (6, 9, 1, 'PU', 'alt_tab', 1, 1)",
);

const paketUtbk = { id: 1, kode: "TO-11SEP2026", nama: "Tryout Real UTBK-SNBT", jalur: "utbk", siklus: "2026-09-11", mulai_at: null };
const paketSkd = { id: 2, kode: "SKD-1", nama: "SKD Kedinasan Perdana", jalur: "skd", siklus: null, mulai_at: "2026-09-13T07:00" };

/* ------------------------------------------------------------------ */
console.log("\n1. Judul mengikuti portal ujiannya");
/* ------------------------------------------------------------------ */

const judulUtbk = L.judulLaporan("utbk");
const judulSkd = L.judulLaporan("skd");
periksa(
  "judul UTBK persis seperti yang diminta pengelola",
  judulUtbk === "HASIL TRYOUT UTBK-SNBT SMA ISLAM PLUS ADZKIA MEDAN",
  judulUtbk,
);
periksa(
  "judul SKD persis seperti yang diminta pengelola",
  judulSkd === "HASIL SKD KEDINASAN SMA ISLAM PLUS ADZKIA MEDAN",
  judulSkd,
);
periksa("judul UTBK tidak menyebut SKD", !/SKD/.test(judulUtbk));
periksa("judul SKD tidak menyebut UTBK", !/UTBK/.test(judulSkd));

/* ------------------------------------------------------------------ */
console.log("\n2. Tanggal ujian, bukan tanggal berkas dibuat");
/* ------------------------------------------------------------------ */

periksa(
  "paket siklus memakai tanggal hari-H-nya",
  L.tanggalUjian(paketUtbk) === "Jumat, 11 September 2026",
  L.tanggalUjian(paketUtbk),
);
periksa(
  "paket berjendela memakai tanggal mulainya",
  L.tanggalUjian(paketSkd) === "Minggu, 13 September 2026",
  L.tanggalUjian(paketSkd),
);
// Paket tanpa siklus dan tanpa jendela masih harus punya tanggal — diambil dari
// pengerjaan pesertanya sendiri, kalau tidak kepalanya kosong tanpa guna.
periksa(
  "paket tanpa jendela tetap mendapat tanggal dari pengerjaannya",
  L.tanggalUjian({ ...paketUtbk, siklus: null, mulai_at: null }) !== null,
);
periksa(
  "nama berkas membedakan UTBK dan SKD",
  L.namaBerkasHasil(paketUtbk).startsWith("HASIL-TRYOUT-UTBK") &&
    L.namaBerkasHasil(paketSkd).startsWith("HASIL-SKD"),
);

/* ------------------------------------------------------------------ */
console.log("\n3. Isi lembar UTBK");
/* ------------------------------------------------------------------ */

async function bacaLembar(paket) {
  const buf = await L.bukuHasilPaket(paket, L.hasilPaket(paket.id, paket.jalur));
  const berkas = path.join(TMP, `hasil-${paket.kode}.xlsx`);
  fs.writeFileSync(berkas, buf);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(berkas);
  return wb;
}

const wbUtbk = await bacaLembar(paketUtbk);
const wsUtbk = wbUtbk.worksheets[0];
const nilai = (r, c) => wsUtbk.getRow(r).getCell(c).value;
const teksKepala = (c) => String(nilai(5, c) ?? "");

periksa("hanya SATU sheet — tidak ada lembar tambahan", wbUtbk.worksheets.length === 1);
periksa("baris 1 memuat judul besar", String(nilai(1, 1)) === judulUtbk);
periksa("baris 3 memuat tanggal ujian", /Tanggal ujian: Jumat, 11 September 2026/.test(String(nilai(3, 1))));

periksa("kolom 1 adalah No", teksKepala(1) === "No");
periksa("kolom 2 adalah Nama Siswa", teksKepala(2) === "Nama Siswa");
periksa(
  "tujuh kolom subtes UTBK hadir dan urut",
  SUBTES_UTBK.every((s, i) => teksKepala(3 + i).startsWith(s)),
  SUBTES_UTBK.map((_s, i) => teksKepala(3 + i).split("\n")[0]).join(","),
);
periksa("kolom terakhir adalah Total Skor", teksKepala(10) === "Total Skor");
// Kepala kolom memuat nama panjangnya juga: lembar ini dibaca orang tua, dan
// "PBM" tidak berarti apa-apa bagi mereka.
periksa(
  "kepala kolom subtes menyertakan nama panjangnya",
  teksKepala(3).includes("Penalaran Umum"),
  teksKepala(3),
);

periksa(
  "urut dari skor tertinggi",
  nilai(6, 2) === "Bagus Prasetyo" && nilai(7, 2) === "Aisyah Nur Ramadhani" && nilai(8, 2) === "Dinda Ayu Lestari",
  [nilai(6, 2), nilai(7, 2), nilai(8, 2)].join(" > "),
);
periksa("penomorannya mulai dari 1", nilai(6, 1) === 1 && nilai(7, 1) === 2);
periksa("skor subtes ikut tercetak", nilai(6, 3) === 820, String(nilai(6, 3)));
periksa("total skor ikut tercetak", nilai(6, 10) === 790, String(nilai(6, 10)));

/* ------------------------------------------------------------------ */
console.log("\n4. Isi lembar SKD");
/* ------------------------------------------------------------------ */

const wsSkd = (await bacaLembar(paketSkd)).worksheets[0];
const kepalaSkd = (c) => String(wsSkd.getRow(5).getCell(c).value ?? "");
periksa("baris 1 memuat judul SKD", String(wsSkd.getRow(1).getCell(1).value) === judulSkd);
periksa(
  "tiga kolom subtes SKD hadir dan urut",
  SUBTES_SKD.every((s, i) => kepalaSkd(3 + i).startsWith(s)),
  SUBTES_SKD.map((_s, i) => kepalaSkd(3 + i).split("\n")[0]).join(","),
);
periksa("kolom terakhir SKD adalah Total Skor", kepalaSkd(6) === "Total Skor");
periksa(
  "total SKD adalah penjumlahan, bukan rata-rata",
  wsSkd.getRow(6).getCell(6).value === 330,
  String(wsSkd.getRow(6).getCell(6).value),
);

/* ------------------------------------------------------------------ */
console.log("\n5. TIDAK ADA jejak pelanggaran (yang paling penting)");
/* ------------------------------------------------------------------ */

const isiUtbk = JSON.stringify(wsUtbk.getSheetValues()).toLowerCase();
for (const kata of ["pelanggar", "gugur", "alt_tab", "blur_window", "keluar_tab", "tangkap_layar", "esc_layar"]) {
  periksa(`lembar tidak memuat kata "${kata}"`, !isiUtbk.includes(kata));
}
periksa(
  "peserta yang DIGUGURKAN tidak ikut tercantum",
  !isiUtbk.includes("peserta digugurkan"),
);
periksa(
  "jumlah baris isi sama dengan jumlah peserta yang selesai",
  wsUtbk.rowCount === 5 + 3,
  "dapat " + wsUtbk.rowCount,
);
// Kolomnya benar-benar berhenti di Total Skor. Kolom ke-11 yang terisi berarti
// ada keterangan yang menyelinap masuk.
periksa("tidak ada kolom tambahan sesudah Total Skor", !teksKepala(11));

/* ------------------------------------------------------------------ */
console.log("\n6. Rutenya hanya untuk pengelola");
/* ------------------------------------------------------------------ */

const rute = fs.readFileSync(
  path.join(AKAR, "src", "app", "api", "admin", "hasil", "[id]", "route.ts"),
  "utf8",
);
periksa("rute memanggil requireAdmin", /await requireAdmin\(\)/.test(rute));
periksa(
  "requireAdmin dipanggil SEBELUM berkasnya disusun",
  rute.indexOf("requireAdmin") < rute.indexOf("bukuHasilPaket"),
);
// Yang diuji perilakunya, bukan komentarnya: rute ini tidak boleh MEMBAWA
// MASUK apa pun dari pustaka pelanggaran. Komentarnya sendiri memang menyebut
// kata itu — justru untuk menerangkan bahwa isinya tidak ikut.
const impor = rute
  .split(String.fromCharCode(10))
  .filter((b) => b.trimStart().startsWith("import"))
  .join(" · ");
periksa(
  "rute tidak mengimpor apa pun dari pustaka pelanggaran",
  !/pelanggaran/i.test(impor),
  impor,
);
const sumberLaporan = fs.readFileSync(path.join(AKAR, "src", "lib", "laporan-hasil.ts"), "utf8");
periksa(
  "penyusun lembarnya pun tidak menyentuh pustaka pelanggaran",
  !/from "@\/lib\/(pelanggaran|laporan-pelanggaran)"/.test(sumberLaporan),
);

const halamanPaket = fs.readFileSync(
  path.join(AKAR, "src", "app", "admin", "paket", "page.tsx"),
  "utf8",
);
periksa(
  "tombol unduhnya terpasang di halaman Paket Tryout",
  /\/api\/admin\/hasil\/\$\{p\.id\}/.test(halamanPaket) && /Unduh hasil ujian/.test(halamanPaket),
);

/* ------------------------------------------------------------------ */
// Folder sementara TIDAK dihapus di sini: Windows masih memegang berkas SQLite
// yang terbuka. Yang membersihkannya adalah rmSync di awal berkas ini.

if (gagal > 0) {
  console.log("\n" + gagal + " pemeriksaan GAGAL.\n");
  process.exit(1);
}
console.log("\nSemua pemeriksaan lembar hasil lulus.\n");
