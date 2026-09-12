/**
 * Warung Soal — penyiapan kerangka paket dan pengisian soalnya.
 *
 * Yang dilakukan skrip ini:
 *   1. Membuat kerangka 30 paket untuk KETUJUH subtes (total 210 paket),
 *      semuanya kosong. Paket yang sudah ada tidak disentuh.
 *   2. Mengisi SETIAP paket yang berkas soalnya ada di `scripts/soal-warung/`,
 *      dinamai `<subtes>-<nomor>.mjs` (mis. `pu-1.mjs`, `lbind-12.mjs`).
 *      Paket yang jumlah soalnya sudah lengkap langsung tersedia bagi siswa
 *      tanpa perlu diterbitkan; yang belum lengkap tampil "Segera" dan tidak
 *      pernah sampai ke ruang latihan.
 *
 * Paket tanpa berkas dibiarkan kosong — itu tempat naskah dari pengajar, yang
 * bisa diisi lewat Admin -> Warung Soal -> paket -> Impor Word/Excel. Paket 2
 * baru terbuka bagi seorang siswa setelah ia menuntaskan Paket 1, begitu
 * seterusnya.
 *
 * Soalnya karangan sendiri untuk latihan harian, BUKAN naskah tryout Adzkia.
 *
 * Jalankan: npm run seed:warung          (aman diulang, seluruh paket)
 *           npm run seed:warung -- PU    (hanya subtes tertentu)
 *           npm run seed:warung -- PU 12 (hanya satu paket)
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Basis datanya dibuka lewat `src/lib/db.ts` — bukan koneksi sendiri — supaya
 * migrasi skema (termasuk pembuatan tabel warung_*) ikut berjalan lebih dulu.
 * Node 24 sanggup memuat berkas .ts langsung dengan pelucutan tipe bawaan.
 */
const dbMod = await import(
  pathToFileURL(path.join(process.cwd(), "src", "lib", "db.ts")).href
);
const db = dbMod.db;

const DIR = path.join(process.cwd(), "scripts", "soal-warung");

/** Subtes, nama pendek, dan jumlah butir satu paketnya. */
const SUBTES = [
  { kode: "PU", nama: "Penalaran Umum", target: 30 },
  { kode: "PPU", nama: "Pengetahuan Umum", target: 20 },
  { kode: "PBM", nama: "Bacaan & Menulis", target: 20 },
  { kode: "PK", nama: "Kuantitatif", target: 20 },
  { kode: "LBIND", nama: "Literasi Indonesia", target: 30 },
  { kode: "LBING", nama: "Literasi Inggris", target: 20 },
  { kode: "PM", nama: "Penalaran Matematika", target: 20 },
];

const PAKET_PER_SUBTES = 30;

/** Penyaring dari baris perintah: `-- PU 12` atau `-- PU` atau kosong. */
const argSubtes = (process.argv[2] ?? "").trim().toUpperCase() || null;
const argNomor = process.argv[3] ? Number(process.argv[3]) : null;
if (argSubtes && !SUBTES.some((s) => s.kode === argSubtes)) {
  console.error(`Subtes "${argSubtes}" tidak dikenal. Pilih: ${SUBTES.map((s) => s.kode).join(", ")}`);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* 1. Kerangka 30 paket per subtes                                     */
/* ------------------------------------------------------------------ */

const adaPaket = db.prepare("SELECT id FROM warung_paket WHERE subtes = ? AND nomor = ?");
const buatPaket = db.prepare("INSERT INTO warung_paket (subtes, nomor, judul) VALUES (?, ?, ?)");

let paketBaru = 0;
for (const s of SUBTES) {
  for (let n = 1; n <= PAKET_PER_SUBTES; n++) {
    if (adaPaket.get(s.kode, n)) continue;
    buatPaket.run(s.kode, n, `${s.nama} — Paket ${n}`);
    paketBaru++;
  }
}
console.log(`Kerangka paket: ${paketBaru} paket baru dibuat (target ${SUBTES.length * PAKET_PER_SUBTES}).`);

/* ------------------------------------------------------------------ */
/* 2. Isi tiap paket yang berkasnya tersedia                           */
/* ------------------------------------------------------------------ */

const hapusSoal = db.prepare("DELETE FROM warung_soal WHERE paket_id = ?");
const sisipSoal = db.prepare(
  `INSERT INTO warung_soal (paket_id, nomor, tipe, stimulus, pertanyaan, gambar_url, opsi, kunci, pembahasan)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
/** Kunci disimpan sesuai tipe: PG satu huruf, PGK larik JSON, IS teks apa adanya. */
function kunciTersimpan(butir) {
  if (butir.tipe === "PGK") {
    const larik = Array.isArray(butir.kunci) ? butir.kunci : String(butir.kunci).split(/[,\s]+/);
    return JSON.stringify(larik.map((k) => String(k).trim().toUpperCase()));
  }
  if (butir.tipe === "IS") return String(butir.kunci).trim();
  return String(butir.kunci).trim().toUpperCase();
}

/** Semua berkas soal yang ada, dikelompokkan per subtes lalu urut nomor. */
function berkasSoal() {
  const daftar = [];
  for (const nama of fs.readdirSync(DIR)) {
    const m = /^([a-z]+)-(\d+)\.mjs$/.exec(nama);
    if (!m) continue;
    const kode = m[1].toUpperCase();
    const nomor = Number(m[2]);
    const s = SUBTES.find((x) => x.kode === kode);
    if (!s) continue;
    if (nomor < 1 || nomor > PAKET_PER_SUBTES) continue;
    if (argSubtes && kode !== argSubtes) continue;
    if (argNomor && nomor !== argNomor) continue;
    daftar.push({ subtes: s, nomor, nama });
  }
  const urutan = SUBTES.map((s) => s.kode);
  daftar.sort((a, b) =>
    a.nomor - b.nomor ||
    urutan.indexOf(a.subtes.kode) - urutan.indexOf(b.subtes.kode));
  return daftar;
}

let totalSoal = 0;
const ringkasan = [];

for (const b of berkasSoal()) {
  const modul = await import(pathToFileURL(path.join(DIR, b.nama)).href);
  const soal = modul.SOAL ?? [];

  const paket = adaPaket.get(b.subtes.kode, b.nomor);
  if (!paket) {
    console.log(`  ! Paket ${b.nomor} ${b.subtes.kode} tidak ditemukan, dilewati.`);
    continue;
  }

  hapusSoal.run(paket.id);
  soal.forEach((butir, i) => {
    sisipSoal.run(
      paket.id,
      i + 1,
      butir.tipe,
      butir.stimulus ?? null,
      butir.pertanyaan,
      butir.gambar ?? null,
      JSON.stringify(butir.opsi ?? []),
      kunciTersimpan(butir),
      butir.pembahasan ?? null,
    );
  });

  totalSoal += soal.length;
  ringkasan.push({
    kode: b.subtes.kode,
    nomor: b.nomor,
    jumlah: soal.length,
    target: b.subtes.target,
    pg: soal.filter((x) => x.tipe === "PG").length,
    pgk: soal.filter((x) => x.tipe === "PGK").length,
    is: soal.filter((x) => x.tipe === "IS").length,
  });
}

/* ------------------------------------------------------------------ */

console.log("\nPaket yang terisi:");
for (const r of ringkasan) {
  const tanda = r.jumlah === r.target ? "OK  " : "BEDA";
  console.log(
    `  ${tanda} ${r.kode.padEnd(6)} Paket ${String(r.nomor).padStart(2)}` +
      `  ${String(r.jumlah).padStart(2)}/${r.target} soal` +
      `  (PG ${r.pg}, PGK ${r.pgk}, IS ${r.is})`,
  );
}

/** Berapa paket tiap subtes yang sudah lengkap — itulah yang bisa dibuka siswa. */
const lengkapPerSubtes = db
  .prepare(
    `SELECT p.subtes, COUNT(*) AS n FROM warung_paket p
      WHERE (SELECT COUNT(*) FROM warung_soal s WHERE s.paket_id = p.id) > 0
      GROUP BY p.subtes`,
  )
  .all();
const peta = new Map(lengkapPerSubtes.map((r) => [r.subtes, r.n]));

console.log(`\nSelesai: ${totalSoal} soal masuk ke ${ringkasan.length} paket.`);
console.log("Paket terisi per subtes: " +
  SUBTES.map((s) => `${s.kode} ${peta.get(s.kode) ?? 0}/30`).join(" · "));
console.log("Paket kosong bisa diisi lewat Admin -> Warung Soal -> Impor Word/Excel.");
console.log("Siswa membuka paket berurutan: Paket 2 terbuka setelah Paket 1 ia tuntaskan.");
