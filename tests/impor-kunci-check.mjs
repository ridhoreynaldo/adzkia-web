/**
 * Pengujian KUNCI KETIKAN ADMIN pada layar pratinjau impor (tanpa framework tes).
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/impor-kunci-check.mjs
 *
 * Naskah dari guru kerap datang tanpa kunci tertulis. Daripada memaksa naskah
 * disunting ulang di Word, admin boleh mengetik kuncinya langsung di sebelah
 * baris yang bermasalah. Yang diuji:
 *
 *   1. Baris tanpa kunci memang ditolak — itu titik berangkatnya.
 *   2. Kunci ketikan admin membuat baris itu layak simpan.
 *   3. Kunci ketikan dinilai dengan ATURAN YANG SAMA seperti kunci dari
 *      berkas: huruf di luar pilihan tetap ditolak.
 *   4. Kunci ketikan boleh membetulkan kunci yang sudah ada di berkas.
 *   5. Baris yang tidak diisi tidak ikut berubah.
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
const TMP = path.join(AKAR, ".tmp", "cek", "impor-kunci");

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

const { parseFileImpor } = await import(pathToFileURL(path.join(TMP, "import-soal.ts")).href);

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
/* Berkas uji: tiga soal PU, dua di antaranya tanpa kunci              */
/* ------------------------------------------------------------------ */

const CSV = [
  "subtes,nomor,tipe,level,stimulus,pertanyaan,gambar_url,opsi_a,opsi_b,opsi_c,opsi_d,opsi_e,kunci,nilai_a,nilai_b,nilai_c,nilai_d,nilai_e,pembahasan",
  "PU,1,PG,C3,,Ibu kota Indonesia adalah?,,Bandung,Jakarta,Surabaya,Medan,Padang,,,,,,,",
  "PU,2,PG,C3,,Ibu kota Jawa Barat adalah?,,Bandung,Jakarta,Surabaya,Medan,Padang,,,,,,,",
  "PU,3,PG,C3,,Ibu kota Jawa Timur adalah?,,Bandung,Jakarta,Surabaya,Medan,Padang,A,,,,,,",
].join("\n");

const data = () => new TextEncoder().encode(CSV).buffer;
const baca = (kunciManual) => parseFileImpor("uji.csv", data(), { kunciManual });

/* ------------------------------------------------------------------ */
console.log("\n1. Tanpa kunci, baris memang ditolak");
/* ------------------------------------------------------------------ */

const polos = await baca(undefined);
periksa("tiga baris terbaca", polos.baris.length === 3, `${polos.baris.length} baris`);
periksa("hanya satu yang layak", polos.jumlahValid === 1, `${polos.jumlahValid} layak`);
periksa(
  "galatnya menyebut kunci kosong",
  polos.baris[0].galat.some((g) => g.includes("Kunci jawaban kosong")),
  polos.baris[0].galat.join(" | "),
);

/* ------------------------------------------------------------------ */
console.log("\n2. Kunci ketikan admin menyelamatkan barisnya");
/* ------------------------------------------------------------------ */

const diisi = await baca({ 2: "B", 3: "A" });
periksa("ketiganya layak simpan", diisi.jumlahValid === 3, `${diisi.jumlahValid} layak`);
periksa("tidak ada yang bergalat", diisi.jumlahGalat === 0, `${diisi.jumlahGalat} bergalat`);
periksa("kunci baris 2 tersimpan sebagai B", diisi.baris[0].kunci === "B", diisi.baris[0].kunci);
periksa("kunci baris 3 tersimpan sebagai A", diisi.baris[1].kunci === "A", diisi.baris[1].kunci);

periksa(
  "huruf kecil ikut diterima",
  (await baca({ 2: "b", 3: "a" })).jumlahValid === 3,
);

/* ------------------------------------------------------------------ */
console.log("\n3. Kunci ketikan tetap diperiksa sama ketatnya");
/* ------------------------------------------------------------------ */

const ngawur = await baca({ 2: "Z" });
periksa(
  "huruf di luar pilihan ditolak",
  ngawur.baris[0].galat.length > 0,
  ngawur.baris[0].galat.join(" | "),
);
periksa("barisnya tidak ikut dihitung layak", ngawur.jumlahValid === 1, `${ngawur.jumlahValid} layak`);

/* ------------------------------------------------------------------ */
console.log("\n4. Membetulkan kunci yang sudah ada di berkas");
/* ------------------------------------------------------------------ */

const dibetulkan = await baca({ 4: "C" });
const barisKetiga = dibetulkan.baris.find((b) => b.nomor === 3);
periksa("kunci berkas ditimpa ketikan admin", barisKetiga?.kunci === "C", barisKetiga?.kunci);

const kosongan = await baca({ 4: "   " });
const tetap = kosongan.baris.find((b) => b.nomor === 3);
periksa("isian berisi spasi saja tidak menimpa apa pun", tetap?.kunci === "A", tetap?.kunci);

/* ------------------------------------------------------------------ */
console.log("\n5. Baris lain tidak ikut berubah");
/* ------------------------------------------------------------------ */

const sebagian = await baca({ 2: "B" });
periksa("baris yang tidak diisi tetap bergalat", sebagian.jumlahGalat === 1, `${sebagian.jumlahGalat} bergalat`);
periksa(
  "yang diisi saja yang berubah",
  sebagian.baris[0].kunci === "B" && sebagian.baris[1].kunci === "",
  `${sebagian.baris[0].kunci} / ${sebagian.baris[1].kunci}`,
);

/* ------------------------------------------------------------------ */
// Folder sementara TIDAK dihapus di sini: Windows masih memegang berkas SQLite
// yang terbuka. Yang membersihkannya adalah rmSync di awal berkas ini.

if (gagal > 0) {
  console.log("\n" + gagal + " pemeriksaan GAGAL.\n");
  process.exit(1);
}
console.log("\nSemua pemeriksaan kunci ketikan admin lulus.\n");
