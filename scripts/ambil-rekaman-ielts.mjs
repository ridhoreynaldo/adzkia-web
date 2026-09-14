/**
 * Menarik rekaman Listening dari server ADZKIA SMART yang lain.
 *
 *     npm run rekaman:ambil
 *     npm run rekaman:ambil -- --asal https://pintarbersamaadzkia.com
 *
 * Dipakai saat memindahkan paket IELTS ke server baru. Rekaman TIDAK ikut
 * `git push` (`data/ielts-audio` ada di .gitignore) dan tidak ikut rsync
 * pembaruan (`perbarui.sh` mengecualikan `/data/`) — dua-duanya memang
 * disengaja, supaya pembaruan aplikasi tidak pernah menimpa berkas unggahan.
 * Akibatnya server baru berdiri dengan basis data yang menunjuk alamat rekaman,
 * tetapi tanpa berkasnya: pemutar di ruang ujian menjawab 404 dan peserta
 * Listening tidak mendengar apa pun.
 *
 * Berkasnya sendiri dilayani terbuka di alamat `/ielts/<paket>/<berkas>`, jadi
 * memindahkannya cukup dengan mengunduh — tidak perlu SSH, tidak perlu akses
 * basis data server asal.
 *
 * SIDIK JARINYA DIPERIKSA SESUDAH DIUNDUH, dan berkas yang tidak cocok dibuang.
 * Nama berkas di server memang sidik jari isinya (lihat `ielts-audio.ts`), jadi
 * unduhan yang terpotong di tengah jalan akan tersimpan dengan nama yang
 * menjanjikan isi yang tidak dimilikinya — persis jenis kerusakan yang baru
 * ketahuan saat ujian berjalan.
 *
 * Aman diulang: berkas yang sudah ada dan sidik jarinya cocok dilewati.
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const arg = (nama, bawaan) => {
  const i = process.argv.indexOf(`--${nama}`);
  return i === -1 ? bawaan : (process.argv[i + 1] ?? bawaan);
};

const ASAL = arg("asal", "https://pintarbersamaadzkia.com").replace(/\/+$/, "");

/**
 * Rekaman yang ditarik, menurut paket.
 *
 * Nama berkasnya sekaligus sidik jari isinya, jadi daftar ini merangkap dua
 * tugas: alamat yang diunduh, dan bukti bahwa yang terunduh benar.
 */
const REKAMAN = [
  {
    folder: "ielts-demo-1",
    berkas: [
      "556407d7b3cd0890.wav",
      "1561fd86ca66f77a.wav",
      "74323da777ec64a5.wav",
      "cb1af6bd29812dc2.wav",
    ],
  },
  {
    folder: "ielts-11sep2026",
    berkas: [
      "c461f4df9d2aafb6.mp3",
      "8a6734e6c13b4c1d.mp3",
      "cc4d7109c3bc621e.mp3",
      "de4cedbf32b117b6.mp3",
    ],
  },
];

const sidikDari = (isi) => createHash("sha1").update(isi).digest("hex").slice(0, 16);

console.log(`\nMenarik rekaman dari ${ASAL}\n`);

let diunduh = 0;
let dilewati = 0;
const gagal = [];

for (const paket of REKAMAN) {
  const folder = path.join(process.cwd(), "data", "ielts-audio", paket.folder);
  fs.mkdirSync(folder, { recursive: true });
  console.log(`  ${paket.folder}`);

  for (const nama of paket.berkas) {
    const tujuan = path.join(folder, nama);
    const harusnya = nama.split(".")[0];

    if (fs.existsSync(tujuan) && sidikDari(fs.readFileSync(tujuan)) === harusnya) {
      console.log(`    = ${nama}  sudah ada`);
      dilewati++;
      continue;
    }

    const alamat = `${ASAL}/ielts/${paket.folder}/${nama}`;
    try {
      const jawab = await fetch(alamat);
      if (!jawab.ok) throw new Error(`HTTP ${jawab.status}`);
      const isi = Buffer.from(await jawab.arrayBuffer());
      const sidik = sidikDari(isi);
      if (sidik !== harusnya) {
        throw new Error(`sidik jari ${sidik}, seharusnya ${harusnya} — unduhan tidak utuh`);
      }
      fs.writeFileSync(tujuan, isi);
      console.log(`    + ${nama}  ${(isi.length / 1e6).toFixed(2)} MB`);
      diunduh++;
    } catch (e) {
      console.error(`    ! ${nama}  ${e instanceof Error ? e.message : e}`);
      gagal.push(`${paket.folder}/${nama}`);
    }
  }
}

console.log(`\n${diunduh} terunduh, ${dilewati} dilewati, ${gagal.length} gagal.`);
if (gagal.length) {
  console.error("Yang gagal:\n  - " + gagal.join("\n  - "));
  process.exit(1);
}
console.log(
  "\nLangkah berikutnya:\n" +
    "  npm run rekaman:demo -- --tulis     (pasang ke paket IELTS-DEMO-1)\n" +
    "  npm run seed:ielts11 -- --tulis     (bangun paket IELTS-11SEP2026 berikut rekamannya)\n",
);
