/**
 * Paket contoh IELTS — Listening 40, Reading 40, Writing 2, Speaking 3.
 *
 * Isinya dimasukkan LEWAT PENGURAI NASKAH yang sama persis dengan yang dipakai
 * tombol impor di panel admin (`src/lib/ielts-naskah.ts`), bukan lewat INSERT
 * langsung. Itu disengaja: kalau naskah di `scripts/naskah-ielts/` bisa masuk
 * dari sini, ia juga bisa masuk lewat unggahan admin, dan sebaliknya — satu
 * jalur, satu perilaku, tidak ada jalan pintas yang diam-diam menerima naskah
 * yang sebenarnya ditolak aplikasi.
 *
 * Jumlah butirnya mengikuti tes IELTS internasional:
 *
 *     Listening   4 rekaman  x 10 butir = 40
 *     Reading     3 bacaan   x 13/13/14 = 40
 *     Writing     Task 1 + Task 2       =  2
 *     Speaking    Part 1 + 2 + 3        =  3
 *
 * Naskahnya karangan sendiri untuk latihan di sekolah — BUKAN salinan naskah
 * ujian IELTS mana pun.
 *
 * Jalankan:  npm run seed:ielts
 *            npm run seed:ielts -- --kode IELTS-DEMO-2 --nama "Simulasi 2"
 *            npm run seed:ielts -- --ulang     (kosongkan dulu soal paketnya)
 *
 * Aman diulang: butir yang pertanyaannya sudah ada dilewati sendiri, jadi
 * menjalankan dua kali tidak menggandakan soal.
 */
import "./muat-ts.mjs";

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const AKAR = process.cwd();
const muat = (berkas) =>
  import(pathToFileURL(path.join(AKAR, "src", "lib", berkas)).href);

const { run, all } = await muat("core/db.ts");
const I = await muat("ielts/ielts.ts");
const N = await muat("ielts/ielts-naskah.ts");

/* ---------------- Pilihan baris perintah ---------------- */

const arg = (nama, bawaan) => {
  const i = process.argv.indexOf(`--${nama}`);
  return i === -1 ? bawaan : (process.argv[i + 1] ?? bawaan);
};
const KODE = arg("kode", "IELTS-DEMO-1");
const NAMA = arg("nama", "IELTS Academic — Simulasi 1");
const ULANG = process.argv.includes("--ulang");

/** Naskah yang diimpor, berikut subtes tujuannya. */
const NASKAH = [
  { berkas: "01-listening.txt", subtes: "LISTENING" },
  { berkas: "02-reading.txt", subtes: "READING" },
  { berkas: "03-writing.txt", subtes: "WRITING" },
  { berkas: "04-speaking.txt", subtes: "SPEAKING" },
];

const DIR = path.join(AKAR, "scripts", "naskah-ielts");

/* ---------------- Paket ---------------- */

let paket = (await all("SELECT * FROM ielts_paket WHERE kode = ?", KODE))[0];
if (!paket) {
  const id = await I.buatPaket({
    kode: KODE,
    nama: NAMA,
    deskripsi: "Paket contoh berstandar IELTS internasional — 40 / 40 / 2 / 3 butir.",
  });
  paket = await I.paketById(id);
  console.log(`Paket dibuat: ${paket.kode} — ${paket.nama} (id ${paket.id})`);
} else {
  console.log(`Paket sudah ada: ${paket.kode} (id ${paket.id})`);
}

if (ULANG) {
  await run("DELETE FROM ielts_soal WHERE paket_id = ?", paket.id);
  console.log("  Seluruh butir lama dihapus (--ulang).");
}

/* ---------------- Impor tiap subtes ---------------- */

let total = 0;
for (const { berkas, subtes } of NASKAH) {
  const jalan = path.join(DIR, berkas);
  if (!fs.existsSync(jalan)) {
    console.error(`  ! ${berkas} tidak ditemukan di ${DIR}`);
    continue;
  }
  const isi = fs.readFileSync(jalan);
  const data = isi.buffer.slice(isi.byteOffset, isi.byteOffset + isi.byteLength);

  const hasil = await N.parseNaskahIelts(berkas, data, {
    subtes,
    // "lanjut": nomor berkas diabaikan, tiap butir mengisi nomor kosong
    // terkecil. Itu yang membuat skrip ini aman diulang dan aman dijalankan
    // pada paket yang separuh isinya sudah diketik pengelola.
    mode: "lanjut",
    nomorTerpakai: await I.nomorTerpakai(paket.id, subtes),
    sidikAda: new Set((await I.pertanyaanSubtes(paket.id, subtes)).map(N.sidikPertanyaan)),
  });

  if (hasil.errorFile) {
    console.error(`  ! ${subtes}: ${hasil.errorFile}`);
    continue;
  }
  for (const c of hasil.catatan) console.log(`    catatan: ${c}`);
  for (const b of hasil.butir.filter((x) => x.galat)) {
    console.error(`    ! nomor ${b.nomor} (baris ${b.baris}): ${b.galat}`);
  }

  const simpan = await N.simpanNaskahIelts(paket.id, subtes, hasil, "lanjut");
  total += simpan.disimpan;
  console.log(
    `  ${subtes.padEnd(10)} ${String(simpan.disimpan).padStart(2)} butir baru` +
      `${simpan.dilewati ? `, ${simpan.dilewati} dilewati` : ""}` +
      `, ${simpan.seksiDiperbarui} bagian diperbarui`,
  );
}

/* ---------------- Ringkasan ---------------- */

console.log("\nKelengkapan paket:");
for (const r of await I.ringkasPaket(paket.id)) {
  const tanda = r.terisi >= r.target ? "OK  " : "BELUM";
  console.log(
    `  ${tanda} ${r.nama.padEnd(10)} ${String(r.terisi).padStart(2)}/${r.target} butir · ${r.menit} menit` +
      (r.pakaiAudio ? ` · rekaman ${r.audioTerisi}/${r.jumlahSeksi}` : ""),
  );
}

console.log(`\n${total} butir baru ditambahkan.`);
console.log(
  "Rekaman Listening belum ada — unggah berkas suaranya lewat Admin → IELTS → paket → Listening,\n" +
    "atau bacakan transkrip yang sudah ikut tersimpan di tiap Recording.",
);
console.log(
  `Paket masih berstatus "${(await I.paketById(paket.id)).status}". Terbitkan dari panel admin bila siap diujikan.`,
);
process.exit(0);
