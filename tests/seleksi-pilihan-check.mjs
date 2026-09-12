/**
 * Pengujian cepat mesin seleksi Pilihan 1-4 (tanpa framework tes).
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/seleksi-pilihan-check.mjs
 *
 * Aturan yang diperiksa — semuanya meniru SNBT nasional:
 *
 *   1. Peserta yang skornya menyentuh ancar-ancar Pilihan 1 dinyatakan LULUS,
 *      dan pilihan 2-4 TIDAK DIPROSES (satu peserta hanya satu kursi).
 *   2. Gagal di Pilihan 1 membuat seleksi turun ke Pilihan 2, dan seterusnya —
 *      skor peserta tidak "hangus" gara-gara gagal di pilihan pertama.
 *   3. Gagal di keempat pilihan menghasilkan diterimaDi = null.
 *   4. Lulus tepat di ambang (skor == skor_min) dihitung LULUS.
 *   5. Prodi tanpa padanan di tabel `campuses` berstatus TANPA_DATA dan tidak
 *      pernah menghentikan kaskade.
 *   6. Penjodohan prodi mengabaikan besar-kecil huruf ("KEDOKTERAN" vs
 *      "Kedokteran"), karena katalog `prodi` dan `campuses` menulisnya beda.
 *   7. Peringkat di antara sesama peserta dihitung dari skor total.
 *
 * Berkas .ts asli dipakai apa adanya — hanya disalin ke folder sementara
 * dengan penambahan ekstensi pada impornya supaya bisa dimuat langsung Node.
 */
import fs from "node:fs";
import os from "node:os";
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
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "adzkia-seleksi-"));

process.env.ADZKIA_DB_PATH = path.join(TMP, "cek.db");

/* ---- salin modul yang diperlukan, rapikan impornya ---- */
for (const nama of ["db", "siklus", "kampus"]) {
  const sumber = fs.readFileSync(cariDiLib(`${nama}.ts`), "utf8");
  const rapi = sumber
    .replace(/from "\.\/([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"')
    .replace(/from "@\/data\/kampus"/g, 'from "./data-kampus.ts"');
  fs.writeFileSync(path.join(TMP, `${nama}.ts`), rapi);
}
fs.copyFileSync(
  path.join(AKAR, "src", "data", "kampus.ts"),
  path.join(TMP, "data-kampus.ts"),
);

const dbMod = await import(pathToFileURL(path.join(TMP, "db.ts")).href);
const kampus = await import(pathToFileURL(path.join(TMP, "kampus.ts")).href);
const { run } = dbMod;
const { seleksiPilihanPeserta } = kampus;

/* ------------------------------------------------------------------ */
/* Penyiapan data                                                      */
/* ------------------------------------------------------------------ */

let gagal = 0;
function periksa(nama, syarat, tambahan = "") {
  if (syarat) {
    console.log(`  ✓ ${nama}`);
  } else {
    gagal++;
    console.log(`  ✗ ${nama}${tambahan ? ` — ${tambahan}` : ""}`);
  }
}

// Ancar-ancar buatan: empat prodi dengan ambang menurun.
const PRODI = [
  { ptn: "Universitas Alfa", prodi: "Kedokteran", min: 700, dt: 50, pm: 1500 },
  { ptn: "Universitas Beta", prodi: "Ilmu Komputer", min: 650, dt: 40, pm: 1000 },
  { ptn: "Universitas Gama", prodi: "Ilmu Hukum", min: 600, dt: 60, pm: 900 },
  { ptn: "Universitas Delta", prodi: "Sastra Jawa", min: 500, dt: 30, pm: 200 },
];

for (const p of PRODI) {
  run(
    `INSERT INTO campuses (ptn, prodi, kelompok, jenjang, skor_min, daya_tampung, peminat)
     VALUES (?, ?, 'Saintek', 'S1', ?, ?, ?)`,
    p.ptn,
    p.prodi,
    p.min,
    p.dt,
    p.pm,
  );
}

run(
  `INSERT INTO packages (id, kode, nama, status, jalur) VALUES (1, 'CEK-1', 'Paket Cek', 'published', 'utbk')`,
);

/** Buat satu peserta lengkap dengan attempt selesai dan pilihannya. */
function buatPeserta(id, nama, skor, pilihan) {
  run(
    `INSERT INTO users (id, nama, email, password_hash, role) VALUES (?, ?, ?, 'x', 'siswa')`,
    id,
    nama,
    `${nama.toLowerCase().replace(/\s+/g, "-")}@cek.local`,
  );
  run(
    `INSERT INTO attempts (user_id, package_id, status, total_skor, finished_at)
     VALUES (?, 1, 'finished', ?, datetime('now'))`,
    id,
    skor,
  );
  pilihan.forEach((p, i) => {
    run(
      `INSERT INTO pilihan_prodi (user_id, package_id, urutan, prodi_nama, ptn)
       VALUES (?, 1, ?, ?, ?)`,
      id,
      i + 1,
      p.prodi,
      p.ptn,
    );
  });
}

// Pilihan ditulis HURUF BESAR seperti katalog `prodi` yang sesungguhnya,
// sedangkan `campuses` memakai kapital di awal kata.
const P = (i) => ({ prodi: PRODI[i].prodi.toUpperCase(), ptn: PRODI[i].ptn.toUpperCase() });

buatPeserta(1, "Anak Pintar", 720, [P(0), P(1), P(2), P(3)]);   // lolos di Pilihan 1
buatPeserta(2, "Anak Sedang", 660, [P(0), P(1), P(2), P(3)]);   // gagal 1, lolos 2
buatPeserta(3, "Anak Gigih", 520, [P(0), P(1), P(2), P(3)]);    // lolos baru di Pilihan 4
buatPeserta(4, "Anak Belum", 400, [P(0), P(1), P(2), P(3)]);    // gagal semua
buatPeserta(5, "Anak Pas", 650, [P(1), P(2)]);                  // tepat di ambang Pilihan 1
buatPeserta(6, "Anak Asing", 720, [
  { prodi: "TEKNIK ANTARIKSA", ptn: "UNIVERSITAS ENTAH" },      // tanpa data
  P(1),
]);

/* ------------------------------------------------------------------ */
/* Pemeriksaan                                                         */
/* ------------------------------------------------------------------ */

const s = (id, skor) => seleksiPilihanPeserta(id, 1, skor);

console.log("\n1) Lolos di Pilihan 1 -> sisanya tidak diproses");
{
  const h = s(1, 720);
  periksa("diterimaDi = 1", h.diterimaDi === 1, `dapat ${h.diterimaDi}`);
  periksa("Pilihan 1 LULUS", h.pilihan[0].status === "LULUS", h.pilihan[0].status);
  periksa(
    "Pilihan 2-4 TIDAK_DIPROSES",
    h.pilihan.slice(1).every((p) => p.status === "TIDAK_DIPROSES"),
    h.pilihan.map((p) => p.status).join(","),
  );
}

console.log("\n2) Gagal di Pilihan 1 -> turun ke Pilihan 2");
{
  const h = s(2, 660);
  periksa("diterimaDi = 2", h.diterimaDi === 2, `dapat ${h.diterimaDi}`);
  periksa("Pilihan 1 TIDAK_LULUS", h.pilihan[0].status === "TIDAK_LULUS", h.pilihan[0].status);
  periksa("Pilihan 2 LULUS", h.pilihan[1].status === "LULUS", h.pilihan[1].status);
  periksa(
    "Pilihan 3-4 TIDAK_DIPROSES",
    h.pilihan.slice(2).every((p) => p.status === "TIDAK_DIPROSES"),
  );
}

console.log("\n3) Kaskade sampai Pilihan 4");
{
  const h = s(3, 520);
  periksa("diterimaDi = 4", h.diterimaDi === 4, `dapat ${h.diterimaDi}`);
  periksa(
    "Pilihan 1-3 TIDAK_LULUS",
    h.pilihan.slice(0, 3).every((p) => p.status === "TIDAK_LULUS"),
    h.pilihan.map((p) => p.status).join(","),
  );
}

console.log("\n4) Gagal di keempat pilihan");
{
  const h = s(4, 400);
  periksa("diterimaDi = null", h.diterimaDi === null, `dapat ${h.diterimaDi}`);
  periksa(
    "keempatnya TIDAK_LULUS",
    h.pilihan.every((p) => p.status === "TIDAK_LULUS"),
  );
}

console.log("\n5) Tepat di ambang dihitung LULUS");
{
  const h = s(5, 650);
  periksa("skor 650 vs ambang 650 -> LULUS", h.pilihan[0].status === "LULUS", h.pilihan[0].status);
  periksa("diterimaDi = 1", h.diterimaDi === 1);
}

console.log("\n6) Prodi tanpa ancar-ancar tidak menghentikan kaskade");
{
  const h = s(6, 720);
  periksa("Pilihan 1 TANPA_DATA", h.pilihan[0].status === "TANPA_DATA", h.pilihan[0].status);
  periksa("ancar Pilihan 1 null", h.pilihan[0].ancar === null);
  periksa("Pilihan 2 tetap diproses & LULUS", h.pilihan[1].status === "LULUS", h.pilihan[1].status);
  periksa("diterimaDi = 2", h.diterimaDi === 2, `dapat ${h.diterimaDi}`);
}

console.log("\n7) Penjodohan huruf besar/kecil & data kampus terbaca");
{
  const h = s(1, 720);
  const a = h.pilihan[0].ancar;
  periksa("ancar ditemukan walau beda kapitalisasi", a !== null);
  periksa("skorMin 700", a?.skorMin === 700, String(a?.skorMin));
  periksa("dayaTampung 50", a?.dayaTampung === 50, String(a?.dayaTampung));
  periksa("peminat 1.500", a?.peminat === 1500, String(a?.peminat));
  periksa("keketatan 30", a?.keketatan === 30, String(a?.keketatan));
}

console.log("\n8) Peringkat di antara sesama pemilih prodi yang sama");
{
  // Kedokteran Alfa dipilih peserta 1,2,3,4 (skor 720, 660, 520, 400) dan
  // peserta 6 memilih prodi lain di urutan 1. Jadi pesaingnya 4 orang.
  const h1 = s(1, 720);
  const h4 = s(4, 400);
  periksa("pesaing Kedokteran = 4", h1.pilihan[0].pesaing === 4, String(h1.pilihan[0].pesaing));
  periksa("skor tertinggi -> peringkat 1", h1.pilihan[0].peringkat === 1, String(h1.pilihan[0].peringkat));
  periksa("skor terendah -> peringkat 4", h4.pilihan[0].peringkat === 4, String(h4.pilihan[0].peringkat));
}

/* ------------------------------------------------------------------ */

// Berkas SQLite harus ditutup dulu; Windows menolak menghapus berkas yang
// masih dipegang proses ini.
try {
  dbMod.db.close();
} catch {
  /* abaikan */
}
try {
  fs.rmSync(TMP, { recursive: true, force: true });
} catch {
  /* folder sementara akan dibersihkan sistem */
}

if (gagal > 0) {
  console.log(`\n${gagal} pemeriksaan GAGAL.\n`);
  process.exit(1);
}
console.log("\nSemua pemeriksaan seleksi pilihan lulus.\n");
process.exit(0);
