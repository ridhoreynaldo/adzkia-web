/**
 * Menjalankan build produksi di komputer sendiri.
 *
 *     npm run build
 *     npm run start:prod            # 127.0.0.1:3000
 *     npm run start:prod -- 3001    # port lain, untuk menguji banyak proses
 *
 * KENAPA SKRIP INI ADA, dan kenapa `npm start` TIDAK bisa dipakai.
 *
 * `next.config.ts` memakai `output: "standalone"` — bentuk yang dibutuhkan
 * citra Docker produksi, karena ia mengemas hanya berkas yang benar-benar
 * dipakai beserta `node_modules` seperlunya. Harganya dua, dan keduanya
 * menggigit diam-diam:
 *
 *   1. `next start` MENOLAK bekerja dengan `output: standalone`. Ia
 *      memperingatkan lalu tetap menyala, sehingga terlihat berhasil.
 *
 *   2. Next.js TIDAK menyalin `.next/static` maupun `public/` ke dalam
 *      `.next/standalone`. Itu DISENGAJA oleh Next — di produksi keduanya
 *      seharusnya disajikan Nginx atau CDN, bukan oleh Node. Akibatnya kalau
 *      dijalankan sendirian: server hidup, halaman terkirim, tetapi SELURUH
 *      CSS dan JavaScript-nya 404. Halamannya tampil sebagai teks polos tanpa
 *      satu pun galat di terminal.
 *
 * Itulah yang terjadi pada percobaan uji beban 11 September 2026 (lihat
 * `server-beban.log`): servernya menyala, lalu percobaannya dihentikan.
 *
 * Skrip ini menyalin keduanya lebih dulu, baru menyalakan servernya — meniru
 * apa yang di produksi dikerjakan Nginx (`infra/nginx/conf.d/adzkia.conf`,
 * blok `/_next/static/`).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const AKAR = path.resolve(import.meta.dirname, "..");
const STANDALONE = path.join(AKAR, ".next", "standalone");

if (!fs.existsSync(path.join(STANDALONE, "server.js"))) {
  console.error("Belum ada hasil build standalone. Jalankan `npm run build` dulu.");
  process.exit(1);
}

/** Menyalin folder apa adanya. Tujuan yang sudah ada DIBUANG lebih dulu supaya
 *  berkas sisa build lama — yang namanya memuat sidik jari isi — tidak menumpuk. */
function salin(dari, ke, nama) {
  if (!fs.existsSync(dari)) {
    console.log(`  - ${nama}: tidak ada, dilewati`);
    return;
  }
  fs.rmSync(ke, { recursive: true, force: true });
  fs.cpSync(dari, ke, { recursive: true });
  console.log(`  + ${nama}`);
}

console.log("Menyiapkan berkas statis (yang di produksi disajikan Nginx):");
salin(
  path.join(AKAR, ".next", "static"),
  path.join(STANDALONE, ".next", "static"),
  ".next/static",
);
salin(path.join(AKAR, "public"), path.join(STANDALONE, "public"), "public");

// Port boleh diberikan sebagai argumen supaya beberapa proses bisa dijalankan
// berdampingan — persis susunan produksi (3000/3001/3002 di belakang Nginx).
const port = process.argv[2] || process.env.PORT || "3000";

// 0.0.0.0, bukan 127.0.0.1: pengujian dari iPad dan HP di jaringan yang sama
// adalah cara satu-satunya membuktikan penjagaan ruang ujian bekerja di sana.
const host = process.env.HOSTNAME || "0.0.0.0";

console.log(`\nMenyalakan server produksi di ${host}:${port} ...\n`);

const anak = spawn(process.execPath, [path.join(STANDALONE, "server.js")], {
  cwd: STANDALONE,
  stdio: "inherit",
  env: { ...process.env, PORT: String(port), HOSTNAME: host, NODE_ENV: "production" },
});

anak.on("exit", (kode) => process.exit(kode ?? 0));
for (const sinyal of ["SIGINT", "SIGTERM"]) {
  process.on(sinyal, () => anak.kill(sinyal));
}
