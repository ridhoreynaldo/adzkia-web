/**
 * Memasang keempat rekaman Listening paket contoh IELTS-DEMO-1.
 *
 *     npm run rekaman:demo            # meninjau
 *     npm run rekaman:demo -- --tulis # menyimpan
 *
 * KENAPA TERPISAH DARI `seed:ielts`. Penyemai naskah hanya memasukkan teks;
 * rekaman bukan teks dan tidak pernah ikut di dalam .docx. Dulu satu-satunya
 * cara memasangnya adalah membangkitkannya lagi dengan `npm run rekaman:ielts`
 * (mesin pengucap Windows) atau mengunggahnya satu per satu lewat panel admin.
 * Keduanya tidak cocok untuk MEMINDAHKAN paket yang sudah ada ke server lain:
 *
 *   - Membangkitkan ulang menghasilkan berkas yang BUNYINYA sama tetapi BYTE-nya
 *     berbeda, jadi sidik jarinya berbeda, jadi alamatnya berbeda. Peserta yang
 *     sudah mengerjakan, dan lembar hasil yang menautnya, jadi menunjuk alamat
 *     yang tidak ada lagi.
 *   - Mengunggah manual menuntut seseorang duduk di panel admin dan tidak
 *     pernah salah menaruh Section 4 pada Recording 1.
 *
 * Skrip ini menyalin rekaman yang SUDAH ADA apa adanya, jadi alamat yang lahir
 * di server tujuan sama persis dengan alamat di server asal.
 *
 * URUTANNYA DIPAKU PADA SIDIK JARI, bukan pada nama berkas dan bukan pada
 * urutan `readdir`. Rekaman demo berformat WAV, dan WAV tidak membawa tag ID3
 * yang dipakai paket 11 September untuk mengurutkan dirinya sendiri — jadi
 * satu-satunya pengenal yang tidak bisa tertukar adalah isinya sendiri. Salah
 * pasang tidak berbunyi salah: ia berbunyi sempurna, untuk soal yang keliru.
 */

import "./muat-ts.mjs";

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const TULIS = process.argv.includes("--tulis");
const KODE = "IELTS-DEMO-1";

/** sidik jari (16 huruf pertama SHA-1) -> nomor Recording yang memakainya. */
const URUTAN = [
  { sidik: "556407d7b3cd0890", seksi: 1, nama: "recording-1.wav" },
  { sidik: "1561fd86ca66f77a", seksi: 2, nama: "recording-2.wav" },
  { sidik: "74323da777ec64a5", seksi: 3, nama: "recording-3.wav" },
  { sidik: "cb1af6bd29812dc2", seksi: 4, nama: "recording-4.wav" },
];

const FOLDER = path.join(process.cwd(), "data", "ielts-audio", "ielts-demo-1");

const { simpanAudio } = await import("../src/lib/ielts/ielts-audio.ts");
const { pasangAudio, paketById, seksiSubtes, semuaPaket } = await import(
  "../src/lib/ielts/ielts.ts"
);

/* ---------------- 1. Mencari berkasnya ---------------- */

console.log("\n=== 1/3  Membaca rekaman ===");
if (!fs.existsSync(FOLDER)) {
  throw new Error(
    `Folder rekaman tidak ada: ${FOLDER}\n` +
      `Salin dulu keempat berkas .wav paket demo ke sana.`,
  );
}

const berkas = new Map();
for (const nama of fs.readdirSync(FOLDER)) {
  const isi = fs.readFileSync(path.join(FOLDER, nama));
  berkas.set(createHash("sha1").update(isi).digest("hex").slice(0, 16), { nama, isi });
}

const siap = [];
for (const r of URUTAN) {
  const ada = berkas.get(r.sidik);
  if (!ada) {
    throw new Error(
      `Rekaman Recording ${r.seksi} (sidik ${r.sidik}) tidak ada di ${FOLDER}. ` +
        `Berkas yang ditemukan: ${[...berkas.values()].map((b) => b.nama).join(", ") || "(kosong)"}`,
    );
  }
  siap.push({ ...r, isi: ada.isi, berkas: ada.nama });
  console.log(
    `    Recording ${r.seksi}  <-  ${ada.nama}  ${(ada.isi.length / 1e6).toFixed(2)} MB`,
  );
}

/* ---------------- 2. Mencari paketnya ---------------- */

console.log("\n=== 2/3  Memeriksa paket ===");
const paket = (await semuaPaket()).find((p) => p.kode === KODE);
if (!paket) throw new Error(`Paket ${KODE} belum ada. Jalankan "npm run seed:ielts" lebih dulu.`);

const seksi = await seksiSubtes(paket.id, "LISTENING");
for (const r of siap) {
  const baris = seksi.find((x) => x.nomor === r.seksi);
  if (!baris) throw new Error(`Paket ${KODE} tidak punya Recording ${r.seksi}.`);
  r.seksiId = baris.id;
  console.log(
    `    Recording ${r.seksi} (bagian id ${baris.id}) — ` +
      (baris.audio_url ? `sudah ada: ${baris.audio_url}` : "masih kosong"),
  );
}

if (!TULIS) {
  console.log("\n=== 3/3  MENINJAU SAJA — tambahkan --tulis untuk menyimpan ===\n");
  process.exit(0);
}

/* ---------------- 3. Memasang ---------------- */

console.log("\n=== 3/3  Memasang ===");
for (const r of siap) {
  const hasil = await simpanAudio(r.isi, paket.kode);
  await pasangAudio(r.seksiId, hasil.url, r.nama);
  console.log(`    Recording ${r.seksi} -> ${hasil.url}`);
}

const status = (await paketById(paket.id))?.status;
console.log(`\nSelesai. Paket ${KODE} berstatus "${status}".\n`);
process.exit(0);
