/**
 * Mengawetkan satu paket IELTS dari basis data menjadi modul yang ikut
 * dibangun ke dalam aplikasi.
 *
 *     npm run ekspor:ielts -- IELTS-DEMO-1 IELTS-11SEP2026
 *
 * KENAPA INI ADA. Paket IELTS lahir dari naskah .docx dan skrip penyemai di
 * `scripts/`, dan keduanya TIDAK ikut ke server. Citra Docker produksi hanya
 * menyalin `.next/standalone`, `.next/static`, dan `public/` — tidak ada
 * `scripts/`, tidak ada `src/**.ts` yang bisa diimpor, tidak ada naskah Word.
 * Akibatnya paket yang sudah jadi di komputer penyusun tidak punya jalan sama
 * sekali menuju server yang dipasang lewat `git push`.
 *
 * Berkas di bawah `src/lib/ielts/paket-bawaan/` menutup jarak itu: ia diimpor
 * kode aplikasi, jadi Next ikut mengemasnya ke dalam standalone, dan pengelola
 * bisa memasangnya dari panel admin tanpa akses SSH ke server.
 *
 * BENTUKNYA MODUL TYPESCRIPT, BUKAN .json — dan itu bukan selera. Node menolak
 * mengimpor .json tanpa atribut `with { type: "json" }`, sedangkan modul ini
 * harus bisa dibaca DUA pihak: bundler Next di server, dan skrip `node` biasa
 * saat diperiksa di komputer penyusun. Modul .ts berisi satu objek dimengerti
 * keduanya tanpa syarat tambahan.
 *
 * YANG TIDAK IKUT: rekaman. Berkas suaranya berat (46 MB untuk dua paket) dan
 * tidak pantas masuk repo. Yang diawetkan hanya NAMA berkasnya — dan nama itu
 * cap sidik jari isinya, jadi cukup untuk mengunduhnya kembali dari server lama
 * sekaligus membuktikan yang terunduh benar. Lihat `src/lib/ielts/paket-bawaan.ts`.
 */

import "./muat-ts.mjs";

import fs from "node:fs";
import path from "node:path";

const KODE = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (KODE.length === 0) {
  console.error("Sebutkan kode paketnya, mis. npm run ekspor:ielts -- IELTS-DEMO-1");
  process.exit(1);
}

const { all } = await import("../src/lib/core/db.ts");
const { semuaPaket } = await import("../src/lib/ielts/ielts.ts");

const TUJUAN = path.join(process.cwd(), "src", "lib", "ielts", "paket-bawaan");
fs.mkdirSync(TUJUAN, { recursive: true });

/** Nama folder rekaman dari kode paket — sama persis dengan `ielts-audio.ts`. */
function folderAudio(kode) {
  return (
    kode
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "") || "paket"
  );
}

const semua = await semuaPaket();

for (const kode of KODE) {
  const paket = semua.find((p) => p.kode === kode);
  if (!paket) {
    console.error(`  ! ${kode} tidak ada di basis data ini.`);
    process.exitCode = 1;
    continue;
  }

  const seksi = await all(
    "SELECT * FROM ielts_seksi WHERE paket_id = ? ORDER BY subtes, nomor",
    paket.id,
  );
  const soal = await all(
    "SELECT * FROM ielts_soal WHERE paket_id = ? ORDER BY subtes, nomor",
    paket.id,
  );

  // Nomor bagian, bukan id-nya, yang dipakai menghubungkan soal ke bagiannya:
  // id berbeda di tiap basis data, nomor tidak.
  const nomorSeksi = new Map(seksi.map((s) => [s.id, s.nomor]));

  const isi = {
    kode: paket.kode,
    nama: paket.nama,
    deskripsi: paket.deskripsi,
    status: paket.status,
    mulai_at: paket.mulai_at ? new Date(paket.mulai_at).toISOString() : null,
    selesai_at: paket.selesai_at ? new Date(paket.selesai_at).toISOString() : null,
    menit: {
      listening: paket.menit_listening,
      reading: paket.menit_reading,
      writing: paket.menit_writing,
      speaking: paket.menit_speaking,
    },
    folderAudio: folderAudio(paket.kode),
    seksi: seksi.map((s) => ({
      subtes: s.subtes,
      nomor: s.nomor,
      judul: s.judul,
      instruksi: s.instruksi,
      bacaan: s.bacaan,
      transkrip: s.transkrip,
      // Hanya nama berkasnya; alamat lengkapnya disusun ulang saat dipasang.
      audioBerkas: s.audio_url ? s.audio_url.split("/").pop() : null,
      audioNama: s.audio_nama,
    })),
    soal: soal.map((q) => ({
      subtes: q.subtes,
      seksiNomor: q.seksi_id == null ? null : (nomorSeksi.get(q.seksi_id) ?? null),
      nomor: q.nomor,
      tipe: q.tipe,
      pertanyaan: q.pertanyaan,
      opsi: JSON.parse(q.opsi || "[]"),
      kunci: q.kunci,
      catatan: q.catatan,
    })),
  };

  const berkas = path.join(TUJUAN, `${folderAudio(paket.kode)}.ts`);
  const kepala = [
    "/**",
    ` * ${isi.nama}`,
    " *",
    " * DIBUAT MESIN oleh `scripts/ekspor-paket-ielts.mjs` — jangan disunting tangan.",
    " * Sunting paketnya lewat panel admin atau skrip penyemainya, lalu ekspor ulang:",
    " *",
    ` *     npm run ekspor:ielts -- ${isi.kode}`,
    " *",
    " * Kenapa berkas ini ada sama sekali: lihat `../paket-bawaan.ts`.",
    " */",
    "",
    'import type { PaketBawaan } from "./tipe";',
    "",
    "const paket: PaketBawaan = ",
  ].join("\n");
  fs.writeFileSync(
    berkas,
    kepala + JSON.stringify(isi, null, 1) + ";\n\nexport default paket;\n",
    "utf8",
  );

  const beraudio = isi.seksi.filter((s) => s.audioBerkas).length;
  const perSubtes = {};
  for (const q of isi.soal) perSubtes[q.subtes] = (perSubtes[q.subtes] ?? 0) + 1;
  console.log(
    `  ${paket.kode.padEnd(16)} ${isi.seksi.length} bagian · ` +
      Object.entries(perSubtes)
        .map(([s, n]) => `${s} ${n}`)
        .join(" · ") +
      ` · ${beraudio} rekaman · ${(fs.statSync(berkas).size / 1024).toFixed(0)} KB`,
  );
}

console.log(`\nTersimpan di ${path.relative(process.cwd(), TUJUAN)}\n`);
process.exit(process.exitCode ?? 0);
