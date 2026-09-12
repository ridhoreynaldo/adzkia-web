/**
 * Server UJI — `npm run dev:uji`, port 3100.
 *
 * Dipakai memeriksa perubahan sementara server produksi (`npm run start:lan`,
 * port 3000) tetap melayani ujian yang sedang berlangsung. Dua hal yang membuat
 * server kedua tidak menabrak yang pertama, dan keduanya WAJIB:
 *
 *   1. `distDir` sendiri (`.next-uji`). `next dev` dan `next start` sama-sama
 *      memakai folder `.next`; menjalankan dev di komputer yang sama akan
 *      menimpa hasil build yang sedang dibaca peserta, dan potongan JavaScript
 *      yang hilang membuat halaman ujian gagal dimuat di tengah jalan.
 *   2. SALINAN basis data (`data/uji.db`). Server uji tidak boleh menyentuh
 *      jawaban, pelanggaran, atau soal sungguhan. Salinannya dibuat sendiri
 *      lewat `VACUUM INTO` bila belum ada; hapus berkasnya untuk menyegarkan.
 *
 * Semua bisa ditimpa lewat lingkungan: ADZKIA_DIST_DIR, ADZKIA_DB_PATH, PORT.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const AKAR = path.resolve(import.meta.dirname, "..");
const ASLI = path.join(AKAR, "data", "adzkia.db");
const SALINAN = process.env.ADZKIA_DB_PATH ?? path.join(AKAR, "data", "uji.db");
const PORT = process.env.PORT ?? "3100";

if (!fs.existsSync(SALINAN)) {
  if (!fs.existsSync(ASLI)) {
    console.error(`Basis data ${ASLI} belum ada. Jalankan "npm run seed" dulu.`);
    process.exit(1);
  }
  const db = new DatabaseSync(ASLI, { readOnly: true });
  db.exec(`VACUUM INTO '${SALINAN.replace(/\\/g, "/").replace(/'/g, "''")}'`);
  db.close();
  console.log(`Salinan basis data dibuat: ${SALINAN}`);
}

const jumlah = (() => {
  const db = new DatabaseSync(SALINAN, { readOnly: true });
  const n = db.prepare("SELECT COUNT(*) AS n FROM questions").get().n;
  db.close();
  return n;
})();

console.log(`Server uji: http://localhost:${PORT} — ${jumlah} soal, basis data ${path.basename(SALINAN)}`);

// Biner `next` dipanggil lewat Node langsung, bukan lewat npx/`next.cmd`:
// sejak Node 20 memanggil berkas .cmd tanpa shell menghasilkan EINVAL di Windows.
const BINER_NEXT = path.join(AKAR, "node_modules", "next", "dist", "bin", "next");

const anak = spawn(
  process.execPath,
  [BINER_NEXT, "dev", "-p", PORT],
  {
    cwd: AKAR,
    stdio: "inherit",
    env: {
      ...process.env,
      ADZKIA_DB_PATH: SALINAN,
      ADZKIA_DIST_DIR: process.env.ADZKIA_DIST_DIR ?? ".next-uji",
    },
  },
);
anak.on("exit", (kode) => process.exit(kode ?? 0));
