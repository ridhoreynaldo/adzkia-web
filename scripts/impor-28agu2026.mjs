/**
 * Memasukkan paket "Tryout Real UTBK-SNBT 28 Agustus 2026" ke database.
 *
 * Sumber: scripts/data/soal-28agu2026.json — hasil ekstraksi naskah PDF resmi
 * (soal, kunci, dan pembahasan), dengan gambar soal di public/soal/28agu2026.
 *
 * Jalankan: node scripts/impor-28agu2026.mjs [--reset]
 *   --reset  hapus dulu seluruh soal paket ini sebelum memasukkan ulang.
 */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = process.env.ADZKIA_DB_PATH ?? path.join(ROOT, "data", "adzkia.db");
const SUMBER = path.join(ROOT, "scripts", "data", "soal-28agu2026.json");

const KODE = "TO-28AGU2026";
const NAMA = "Tryout Real UTBK-SNBT — Jumat, 28 Agustus 2026";
const DESKRIPSI =
  "Naskah resmi Tryout Real UTBK-SNBT SMA Islam Plus Adzkia, Jumat 28 Agustus 2026. " +
  "Soal berumus dan bergrafik (Penalaran Kuantitatif, Pengetahuan Kuantitatif, Penalaran Matematika) " +
  "ditampilkan sebagai gambar naskah asli agar rumusnya persis seperti di kertas.";

/**
 * Baris judul subtes yang ikut terbawa saat naskah PDF diekstrak, mis.
 * "LITERASI DALAM BAHASA INDONESIA" atau "PENGETAHUAN DAN PEMAHAMAN UMUM".
 * Cirinya: pendek dan huruf besar semua — kalimat bacaan tidak pernah begitu.
 */
function judulSubtesNyasar(p) {
  return p.length < 90 && /[A-Z]/.test(p) && p === p.toUpperCase();
}

/**
 * Rapikan bacaan hasil ekstraksi: gabungkan baris menjadi paragraf utuh,
 * buang judul subtes yang ikut terbawa, dan buang paragraf kembar.
 *
 * Naskah PDF menaruh bacaan yang sama di setiap halaman soal yang memakainya,
 * sehingga ekstraksi mentah menghasilkan bacaan yang tercetak dua sampai tiga
 * kali berturut-turut di layar peserta. Paragraf panjang yang sudah pernah
 * muncul karena itu dibuang; paragraf pendek dibiarkan, sebab kalimat pendek
 * yang berulang (mis. "Ia diam.") bisa saja memang begitu naskah aslinya.
 */
function rapikanStimulus(teks) {
  if (!teks) return null;
  if (teks.trim().startsWith("<img")) return teks.trim(); // bacaan berupa gambar

  const sudahAda = new Set();
  const paragraf = teks
    .split(/\n\s*\n/)
    .map((p) => p.split("\n").map((b) => b.trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((p) => !judulSubtesNyasar(p))
    .filter((p) => {
      if (p.length <= 80) return true;
      const kunci = p.toLowerCase().replace(/[^a-z0-9]+/g, "");
      if (sudahAda.has(kunci)) return false;
      sudahAda.add(kunci);
      return true;
    });

  // Digabung tanpa baris baru: `.isi-soal` mempertahankan spasi apa adanya,
  // jadi "\n" di antara dua <p> memunculkan satu baris kosong tambahan.
  return paragraf.length ? paragraf.map((p) => `<p>${p}</p>`).join("") : null;
}

function rapikan(teks) {
  const v = (teks ?? "").replace(/\s+/g, " ").trim();
  return v || null;
}

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA busy_timeout = 10000");
db.exec("PRAGMA foreign_keys = ON");

const butir = JSON.parse(fs.readFileSync(SUMBER, "utf8"));
if (!Array.isArray(butir) || butir.length === 0) {
  console.error("Berkas sumber kosong:", SUMBER);
  process.exit(1);
}

// Paket
db.prepare(
  `INSERT INTO packages (kode, nama, deskripsi, status, acak_soal, tampil_pembahasan)
   VALUES (?, ?, ?, 'draft', 0, 1)
   ON CONFLICT(kode) DO UPDATE SET nama = excluded.nama, deskripsi = excluded.deskripsi`,
).run(KODE, NAMA, DESKRIPSI);

const paket = db.prepare("SELECT id, status FROM packages WHERE kode = ?").get(KODE);

if (process.argv.includes("--reset")) {
  const n = db.prepare("DELETE FROM questions WHERE package_id = ?").run(paket.id);
  console.log(`--reset: ${n.changes} soal lama dihapus.`);
}

const sisip = db.prepare(
  `INSERT INTO questions
     (package_id, subtes, nomor, tipe, level, stimulus, pertanyaan, gambar_url, opsi, kunci, pembahasan)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(package_id, subtes, nomor) DO UPDATE SET
     tipe = excluded.tipe,
     level = excluded.level,
     stimulus = excluded.stimulus,
     pertanyaan = excluded.pertanyaan,
     gambar_url = excluded.gambar_url,
     opsi = excluded.opsi,
     kunci = excluded.kunci,
     pembahasan = excluded.pembahasan`,
);

let masuk = 0;
const hilangGambar = [];

db.exec("BEGIN");
try {
  for (const b of butir) {
    // Soal bergambar: pertanyaannya ada di dalam gambar naskah.
    const pertanyaan =
      rapikan(b.pertanyaan) ??
      (b.gambar_url ? "Perhatikan gambar soal di bawah ini." : "(perlu dilengkapi)");

    if (b.gambar_url) {
      const berkas = path.join(ROOT, "public", b.gambar_url.replace(/^\//, ""));
      if (!fs.existsSync(berkas)) hilangGambar.push(`${b.subtes} ${b.nomor}`);
    }

    sisip.run(
      paket.id,
      b.subtes,
      b.nomor,
      b.tipe,
      b.level || "C3",
      rapikanStimulus(b.stimulus),
      pertanyaan,
      b.gambar_url || null,
      JSON.stringify(b.opsi ?? []),
      b.kunci,
      rapikan(b.pembahasan),
    );
    masuk++;
  }
  db.exec("COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
}

const per = db
  .prepare(
    `SELECT subtes, COUNT(*) n,
            SUM(CASE WHEN gambar_url IS NOT NULL THEN 1 ELSE 0 END) bergambar,
            SUM(CASE WHEN stimulus IS NOT NULL THEN 1 ELSE 0 END) berbacaan
       FROM questions WHERE package_id = ? GROUP BY subtes`,
  )
  .all(paket.id);

const urut = ["PU", "PPU", "PBM", "PK", "LBIND", "LBING", "PM"];
console.log(`\nPaket ${KODE} (id ${paket.id}) — status ${paket.status}`);
console.log("SUBTES   SOAL  GAMBAR  BACAAN");
for (const k of urut) {
  const r = per.find((x) => x.subtes === k);
  if (r) console.log(`${k.padEnd(7)} ${String(r.n).padStart(5)} ${String(r.bergambar).padStart(7)} ${String(r.berbacaan).padStart(7)}`);
}
console.log(`\nTotal soal dimasukkan: ${masuk}`);
if (hilangGambar.length) {
  console.log(`PERINGATAN — berkas gambar tidak ditemukan untuk: ${hilangGambar.join(", ")}`);
}
console.log(`\nPaket masih berstatus "${paket.status}". Terbitkan lewat Admin → Paket Tryout bila sudah siap.`);
