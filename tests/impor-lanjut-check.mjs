/**
 * Pengujian UNGGAH BERTAHAP satu subtes (tanpa framework tes).
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/impor-lanjut-check.mjs
 *
 * Naskah dari guru datang sepotong-sepotong: 20 soal PU hari ini, 10 sisanya
 * menyusul — dan berkas susulan itu di Word hampir selalu kembali bernomor 1.
 * Mode penomoran "lanjut" yang mengurusnya. Yang diuji:
 *
 *   1. Paket kosong: mode "lanjut" tidak mengubah apa pun, nomornya tetap 1..N.
 *   2. Naskah susulan bernomor 1-10 masuk sebagai PU 21-30, dan benar-benar
 *      tersimpan begitu — subtes PU jadi genap 30 soal.
 *   3. Berkas yang sama diunggah dua kali tidak menggandakan soal.
 *   4. Nomor yang kosong karena soalnya dihapus ditambal lebih dulu.
 *   5. Kuota subtes tetap dijaga; kelebihannya ditolak dengan alasan yang jelas.
 *   6. Soal yang terulang di dalam satu berkas ikut dikenali.
 *   7. Mode "berkas" (perilaku lama) tidak berubah sedikit pun.
 *   8. Subtes SKD ikut kebagian — kuotanya dibaca dari daftar SKD, bukan 0.
 *   9. Ringkasan kelengkapan per subtes menghitung dengan benar.
 *
 * Berkas .ts asli dipakai apa adanya — disalin ke folder sementara di dalam
 * proyek dengan penambahan ekstensi pada impornya.
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
const TMP = path.join(AKAR, ".tmp", "cek", "impor-lanjut");

// Dibersihkan di AWAL saja: di Windows berkas SQLite masih dipegang proses ini
// sampai keluar, jadi menghapusnya di akhir melempar EPERM.
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

const { parseFileImpor, simpanHasilImpor } = await import(
  pathToFileURL(path.join(TMP, "import-soal.ts")).href
);
const { all, one, run } = await import(pathToFileURL(path.join(TMP, "db.ts")).href);

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
/* Alat bantu: paket kosong + berkas CSV karangan                      */
/* ------------------------------------------------------------------ */

const JUDUL =
  "subtes,nomor,tipe,level,stimulus,pertanyaan,gambar_url,opsi_a,opsi_b,opsi_c,opsi_d,opsi_e,kunci,nilai_a,nilai_b,nilai_c,nilai_d,nilai_e,pembahasan";

/** Satu baris soal PG biasa; teksnya dibuat unik lewat `tanda`. */
const soal = (subtes, nomor, tanda) =>
  `${subtes},${nomor},PG,C3,,Soal ${tanda} tentang apa?,,Alfa,Beta,Gama,Delta,Epsilon,B,,,,,,`;

/** Satu baris butir TKP — SKD menuntut kolom nilai_a..nilai_e. */
const soalTkp = (nomor, tanda) =>
  `TKP,${nomor},PG,C3,,Sikap ${tanda} yang tepat?,,Alfa,Beta,Gama,Delta,Epsilon,B,5,4,3,2,1,`;

const berkas = (baris) => new TextEncoder().encode([JUDUL, ...baris].join("\n")).buffer;

function paketBaru(kode) {
  run("INSERT INTO packages (kode, nama) VALUES (?, ?)", kode, `Paket ${kode}`);
  return one("SELECT id FROM packages WHERE kode = ?", kode).id;
}

const baca = (packageId, baris, modeNomor) =>
  parseFileImpor("uji.csv", berkas(baris), { packageId, modeNomor });

/** Baca lalu langsung simpan, seperti yang dilakukan tombol Simpan. */
async function imporkan(packageId, baris, modeNomor, timpa = false) {
  const hasil = await baca(packageId, baris, modeNomor);
  const simpan = simpanHasilImpor(packageId, hasil.baris, timpa);
  return { hasil, simpan };
}

const nomorTersimpan = (packageId, subtes) =>
  all(
    "SELECT nomor FROM questions WHERE package_id = ? AND subtes = ? ORDER BY nomor",
    packageId,
    subtes,
  ).map((r) => Number(r.nomor));

/* ------------------------------------------------------------------ */
console.log("\n1. Paket kosong — mode lanjut tidak mengubah penomoran");
/* ------------------------------------------------------------------ */

const p1 = paketBaru("CEK-1");
const gelombang1 = Array.from({ length: 20 }, (_, i) => soal("PU", i + 1, `pu-${i + 1}`));
const awal = await baca(p1, gelombang1, "lanjut");

periksa("20 baris terbaca", awal.baris.length === 20, `${awal.baris.length} baris`);
periksa("semuanya layak simpan", awal.jumlahValid === 20, `${awal.jumlahValid} layak`);
periksa(
  "nomornya tetap 1..20",
  awal.baris.every((b, i) => b.nomor === i + 1),
  awal.baris.map((b) => b.nomor).join(","),
);
periksa(
  "tidak ada yang ditandai dinomori ulang",
  awal.baris.every((b) => !b.dinomoriUlang),
);

/* ------------------------------------------------------------------ */
console.log("\n2. Naskah susulan bernomor 1-10 menjadi PU 21-30");
/* ------------------------------------------------------------------ */

const t1 = simpanHasilImpor(p1, awal.baris, false);
periksa("gelombang pertama tersimpan", t1.disimpan === 20, JSON.stringify(t1));

// Naskah kedua dari guru lain: isinya lanjutan, tapi nomornya kembali dari 1.
const gelombang2 = Array.from({ length: 10 }, (_, i) => soal("PU", i + 1, `pu-${i + 21}`));
const susulan = await baca(p1, gelombang2, "lanjut");

periksa("sepuluh soal susulan layak simpan", susulan.jumlahValid === 10, `${susulan.jumlahValid}`);
periksa(
  "nomornya bergeser ke 21..30",
  susulan.baris.every((b, i) => b.nomor === i + 21),
  susulan.baris.map((b) => b.nomor).join(","),
);
periksa(
  "nomor asli berkas tetap terbaca",
  susulan.baris.every((b, i) => b.nomorBerkas === i + 1),
  susulan.baris.map((b) => b.nomorBerkas).join(","),
);
periksa("semuanya ditandai dinomori ulang", susulan.baris.every((b) => b.dinomoriUlang));
periksa("tidak ada yang dianggap kembar", susulan.jumlahKembar === 0);

const t2 = simpanHasilImpor(p1, susulan.baris, false);
periksa("kesepuluhnya tersimpan sebagai soal baru", t2.disimpan === 10, JSON.stringify(t2));
periksa(
  "PU genap berisi 1..30",
  nomorTersimpan(p1, "PU").join(",") ===
    Array.from({ length: 30 }, (_, i) => i + 1).join(","),
  nomorTersimpan(p1, "PU").join(","),
);

/* ------------------------------------------------------------------ */
console.log("\n3. Berkas yang sama diunggah dua kali tidak menggandakan soal");
/* ------------------------------------------------------------------ */

const ulang = await baca(p1, gelombang2, "lanjut");
periksa("tidak ada satu pun yang layak simpan", ulang.jumlahValid === 0, `${ulang.jumlahValid}`);
periksa("kesepuluhnya ditandai kembar", ulang.jumlahKembar === 10, `${ulang.jumlahKembar}`);
periksa(
  "tidak dihitung sebagai naskah rusak",
  ulang.jumlahGalat === 0,
  `${ulang.jumlahGalat} bermasalah`,
);
periksa(
  "alasannya menyebut nomor soal yang sudah ada",
  /sudah ada di paket sebagai PU nomor 21/.test(ulang.baris[0].galat.join(" ")),
  ulang.baris[0].galat.join(" | "),
);

const t3 = simpanHasilImpor(p1, ulang.baris, false);
periksa("penyimpanan menolak dengan sopan", !!t3.error, JSON.stringify(t3));
periksa("jumlah soal PU tidak bertambah", nomorTersimpan(p1, "PU").length === 30);

/* ------------------------------------------------------------------ */
console.log("\n4. Nomor yang kosong ditambal lebih dulu");
/* ------------------------------------------------------------------ */

run("DELETE FROM questions WHERE package_id = ? AND subtes = 'PU' AND nomor IN (7, 19)", p1);
periksa("dua soal PU dihapus", nomorTersimpan(p1, "PU").length === 28);

const tambal = await baca(p1, [soal("PU", 1, "tambal-a"), soal("PU", 2, "tambal-b")], "lanjut");
periksa(
  "keduanya mengisi lubang 7 dan 19, bukan 31 dan 32",
  tambal.baris.map((b) => b.nomor).join(",") === "7,19",
  tambal.baris.map((b) => b.nomor).join(","),
);

simpanHasilImpor(p1, tambal.baris, false);
periksa("PU kembali genap 30 soal", nomorTersimpan(p1, "PU").length === 30);

/* ------------------------------------------------------------------ */
console.log("\n5. Kuota subtes tetap dijaga");
/* ------------------------------------------------------------------ */

const penuh = await baca(p1, [soal("PU", 1, "kelebihan")], "lanjut");
periksa("soal ke-31 tidak layak simpan", penuh.jumlahValid === 0, `${penuh.jumlahValid}`);
periksa(
  "alasannya menyebut kuota penuh",
  /Kuota PU sudah penuh \(30 soal\)/.test(penuh.baris[0].galat.join(" ")),
  penuh.baris[0].galat.join(" | "),
);

/* ------------------------------------------------------------------ */
console.log("\n6. Soal yang terulang di dalam satu berkas");
/* ------------------------------------------------------------------ */

const p2 = paketBaru("CEK-2");
const kembarSendiri = await baca(
  p2,
  [soal("PPU", 1, "sama"), soal("PPU", 2, "beda"), soal("PPU", 3, "sama")],
  "lanjut",
);
periksa("dua yang layak simpan", kembarSendiri.jumlahValid === 2, `${kembarSendiri.jumlahValid}`);
periksa("satu ditandai kembar", kembarSendiri.jumlahKembar === 1, `${kembarSendiri.jumlahKembar}`);
periksa(
  "yang kembar adalah baris ketiga",
  kembarSendiri.baris[2].kembar && !kembarSendiri.baris[0].kembar,
);
periksa(
  "alasannya menunjuk baris asalnya",
  /terulang di berkas yang sama \(baris 2\)/.test(kembarSendiri.baris[2].galat.join(" ")),
  kembarSendiri.baris[2].galat.join(" | "),
);
periksa(
  "dua yang tersisa tetap bernomor 1 dan 2",
  kembarSendiri.baris[0].nomor === 1 && kembarSendiri.baris[1].nomor === 2,
  `${kembarSendiri.baris[0].nomor},${kembarSendiri.baris[1].nomor}`,
);

/* ------------------------------------------------------------------ */
console.log("\n7. Mode berkas — perilaku lama tidak berubah");
/* ------------------------------------------------------------------ */

const p3 = paketBaru("CEK-3");
await imporkan(p3, [soal("PK", 1, "lama-1"), soal("PK", 2, "lama-2")], "berkas");
periksa("dua soal PK tersimpan", nomorTersimpan(p3, "PK").join(",") === "1,2");

const lama = await baca(p3, [soal("PK", 1, "isi-baru"), soal("PK", 3, "lama-3")], "berkas");
periksa("nomor diambil apa adanya", lama.baris.map((b) => b.nomor).join(",") === "1,3");
periksa("nomor 1 ditandai sudah terpakai", lama.baris[0].sudahAda === true);
periksa("tidak ada penandaan kembar di mode ini", lama.jumlahKembar === 0);
periksa("jumlah bentrok terhitung satu", lama.jumlahBentrok === 1, `${lama.jumlahBentrok}`);

const tanpaTimpa = simpanHasilImpor(p3, lama.baris, false);
periksa(
  "tanpa timpa: satu disimpan, satu dilewati",
  tanpaTimpa.disimpan === 1 && tanpaTimpa.dilewati === 1,
  JSON.stringify(tanpaTimpa),
);

const lagi = await baca(p3, [soal("PK", 1, "isi-baru")], "berkas");
const denganTimpa = simpanHasilImpor(p3, lagi.baris, true);
periksa("dengan timpa: satu diperbarui", denganTimpa.diperbarui === 1, JSON.stringify(denganTimpa));
periksa(
  "isinya benar-benar tertimpa",
  one(
    "SELECT pertanyaan FROM questions WHERE package_id = ? AND subtes = 'PK' AND nomor = 1",
    p3,
  ).pertanyaan.includes("isi-baru"),
);

const nomorNgawur = await baca(p3, [soal("PK", 99, "di-luar-kuota")], "berkas");
periksa(
  "nomor di luar kuota tetap ditolak di mode berkas",
  /melebihi kuota PK \(20 soal\)/.test(nomorNgawur.baris[0].galat.join(" ")),
  nomorNgawur.baris[0].galat.join(" | "),
);

/* ------------------------------------------------------------------ */
console.log("\n8. Subtes SKD ikut kebagian");
/* ------------------------------------------------------------------ */

const p4 = paketBaru("CEK-4");
const skdAwal = await imporkan(p4, [soalTkp(1, "skd-1"), soalTkp(2, "skd-2")], "lanjut");
periksa(
  "butir TKP tidak lagi tervonis melebihi kuota",
  skdAwal.hasil.jumlahValid === 2,
  skdAwal.hasil.baris.map((b) => b.galat.join("/")).join(" | "),
);
periksa("keduanya tersimpan", skdAwal.simpan.disimpan === 2, JSON.stringify(skdAwal.simpan));

const skdSusulan = await baca(p4, [soalTkp(1, "skd-3")], "lanjut");
periksa(
  "susulan TKP masuk sebagai nomor 3",
  skdSusulan.baris[0].nomor === 3,
  `${skdSusulan.baris[0].nomor}`,
);

const twk = await baca(p4, [soal("TWK", 1, "twk-1")], "berkas");
periksa(
  "TWK di mode berkas juga tidak lagi ditolak kuota 0",
  twk.jumlahValid === 1,
  twk.baris[0].galat.join(" | "),
);

/* ------------------------------------------------------------------ */
console.log("\n9. Ringkasan kelengkapan per subtes");
/* ------------------------------------------------------------------ */

const p5 = paketBaru("CEK-5");
await imporkan(
  p5,
  Array.from({ length: 12 }, (_, i) => soal("LBING", i + 1, `en-${i + 1}`)),
  "lanjut",
);

const rekapHasil = await baca(
  p5,
  Array.from({ length: 5 }, (_, i) => soal("LBING", i + 1, `en-${i + 13}`)),
  "lanjut",
);
const rekap = rekapHasil.rekapSubtes.find((r) => r.subtes === "LBING");

periksa("ringkasan LBING ada", !!rekap, JSON.stringify(rekapHasil.rekapSubtes));
periksa("sudah ada 12", rekap?.sudahAda === 12, `${rekap?.sudahAda}`);
periksa("ditambah 5", rekap?.ditambah === 5, `${rekap?.ditambah}`);
periksa("kuotanya 20", rekap?.kuota === 20, `${rekap?.kuota}`);
periksa("mode ikut dilaporkan", rekapHasil.modeNomor === "lanjut", rekapHasil.modeNomor);

/* ------------------------------------------------------------------ */
console.log(
  gagal === 0
    ? "\n✅ Semua pemeriksaan unggah bertahap lolos.\n"
    : `\n❌ ${gagal} pemeriksaan gagal.\n`,
);
process.exit(gagal === 0 ? 0 : 1);
