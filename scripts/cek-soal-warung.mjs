/**
 * Pemeriksa isi naskah Warung Soal di `scripts/soal-warung/`.
 *
 * Dibuat karena isi Warung akhirnya 210 paket / ±4.600 butir: kunci yang salah
 * ketik, komposisi yang meleset, atau bacaan yang terulang di paket lain tidak
 * mungkin ditangkap dengan membaca satu per satu. Skrip ini TIDAK menyentuh
 * basis data — murni memeriksa berkasnya, jadi aman dijalankan kapan saja.
 *
 * Jalankan: npm run cek:soal          (semua berkas)
 *           npm run cek:soal -- PU    (satu subtes)
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DIR = path.join(process.cwd(), "scripts", "soal-warung");
const PUBLIK = path.join(process.cwd(), "public");

/** Sengaja disalin dari `src/lib/warung.ts` supaya skrip tetap jalan tanpa TS. */
const KOMPOSISI = {
  PU: { pg: 26, pgk: 3, is: 1, total: 30 },
  PPU: { pg: 16, pgk: 3, is: 1, total: 20 },
  PBM: { pg: 16, pgk: 3, is: 1, total: 20 },
  PK: { pg: 15, pgk: 3, is: 2, total: 20 },
  LBIND: { pg: 26, pgk: 3, is: 1, total: 30 },
  LBING: { pg: 15, pgk: 3, is: 2, total: 20 },
  PM: { pg: 15, pgk: 3, is: 2, total: 20 },
};
const HURUF = ["A", "B", "C", "D", "E"];

const saring = (process.argv[2] ?? "").trim().toUpperCase() || null;

let galat = 0;
let peringatan = 0;
const catat = (berkas, nomor, pesan) => {
  galat++;
  console.log(`  GALAT  ${berkas} #${nomor}: ${pesan}`);
};
const ingat = (berkas, nomor, pesan) => {
  peringatan++;
  console.log(`  warn   ${berkas} #${nomor}: ${pesan}`);
};

/**
 * Teks polos dari HTML. Besar-kecil huruf DIPERTAHANKAN, karena soal PBM
 * tentang huruf kapital memakai lima pilihan yang hanya berbeda kapitalisasi —
 * menyeragamkannya membuat pilihan yang sah terbaca kembar.
 */
const polos = (s) =>
  String(s ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Untuk menjodohkan soal kembar antarpaket, beda kapital tidak dianggap beda. */
const sidikTeks = (s) => polos(s).toLowerCase();

const berkas = fs
  .readdirSync(DIR)
  .filter((n) => /^[a-z]+-\d+\.mjs$/.test(n))
  .filter((n) => !saring || n.toUpperCase().startsWith(saring + "-"))
  .sort((a, b) => {
    const [, sa, na] = /^([a-z]+)-(\d+)\.mjs$/.exec(a);
    const [, sb, nb] = /^([a-z]+)-(\d+)\.mjs$/.exec(b);
    return sa.localeCompare(sb) || Number(na) - Number(nb);
  });

/** Pertanyaan yang sudah dipakai, per subtes — untuk menangkap soal kembar. */
const dipakai = new Map();
let totalButir = 0;

for (const nama of berkas) {
  const [, kodeKecil, nomorPaket] = /^([a-z]+)-(\d+)\.mjs$/.exec(nama);
  const kode = kodeKecil.toUpperCase();
  const komp = KOMPOSISI[kode];
  if (!komp) {
    catat(nama, 0, `subtes "${kode}" tidak dikenal`);
    continue;
  }

  const modul = await import(pathToFileURL(path.join(DIR, nama)).href);
  const soal = modul.SOAL ?? [];
  totalButir += soal.length;

  /* --- jumlah dan komposisi butir --- */
  const pg = soal.filter((b) => b.tipe === "PG").length;
  const pgk = soal.filter((b) => b.tipe === "PGK").length;
  const is = soal.filter((b) => b.tipe === "IS").length;
  if (soal.length !== komp.total)
    catat(nama, 0, `jumlah butir ${soal.length}, seharusnya ${komp.total}`);
  if (pg !== komp.pg) catat(nama, 0, `PG ${pg}, seharusnya ${komp.pg}`);
  if (pgk !== komp.pgk) catat(nama, 0, `PGK ${pgk}, seharusnya ${komp.pgk}`);
  if (is !== komp.is) catat(nama, 0, `IS ${is}, seharusnya ${komp.is}`);

  /* --- urutan tipe: PG dulu, lalu PGK, lalu IS (mengikuti Paket 1) --- */
  const urut = soal.map((b) => b.tipe).join(",");
  const seharusnya = [
    ...Array(pg).fill("PG"),
    ...Array(pgk).fill("PGK"),
    ...Array(is).fill("IS"),
  ].join(",");
  if (urut !== seharusnya)
    ingat(nama, 0, "urutan tipe tidak PG → PGK → IS seperti paket lain");

  const sebaran = { A: 0, B: 0, C: 0, D: 0, E: 0 };

  soal.forEach((b, i) => {
    const n = i + 1;

    if (!b.pertanyaan || !polos(b.pertanyaan))
      catat(nama, n, "pertanyaan kosong");
    if (!b.pembahasan || !polos(b.pembahasan))
      catat(nama, n, "pembahasan kosong");

    if (b.gambar) {
      const berkasGambar = path.join(PUBLIK, String(b.gambar).replace(/^\//, ""));
      if (!fs.existsSync(berkasGambar))
        catat(nama, n, `gambar tidak ada: ${b.gambar}`);
    }

    if (b.tipe === "PG") {
      const opsi = b.opsi ?? [];
      if (opsi.length !== 5) catat(nama, n, `PG punya ${opsi.length} pilihan, seharusnya 5`);
      if (opsi.some((o) => !polos(o))) catat(nama, n, "ada pilihan kosong");
      const unik = new Set(opsi.map(polos));
      if (unik.size !== opsi.length) catat(nama, n, "ada pilihan yang sama persis");
      const k = String(b.kunci ?? "").trim().toUpperCase();
      if (!HURUF.includes(k)) catat(nama, n, `kunci "${b.kunci}" bukan A-E`);
      else sebaran[k]++;
    } else if (b.tipe === "PGK") {
      const opsi = b.opsi ?? [];
      if (opsi.length < 3 || opsi.length > 5)
        catat(nama, n, `PGK punya ${opsi.length} pernyataan, seharusnya 3-5`);
      const kunci = Array.isArray(b.kunci) ? b.kunci : [];
      if (kunci.length !== opsi.length)
        catat(nama, n, `kunci PGK ${kunci.length} butir, pernyataan ${opsi.length}`);
      if (kunci.some((k) => !["B", "S"].includes(String(k).trim().toUpperCase())))
        catat(nama, n, `kunci PGK harus B atau S, dapat [${kunci.join(", ")}]`);
      if (kunci.length && kunci.every((k) => k === kunci[0]))
        ingat(nama, n, "seluruh pernyataan PGK berkunci sama — mudah ditebak");
    } else if (b.tipe === "IS") {
      if ((b.opsi ?? []).length) catat(nama, n, "isian singkat tidak boleh berpilihan");
      const k = String(b.kunci ?? "").trim();
      if (!k) catat(nama, n, "kunci isian singkat kosong");
      if (/^[A-E]$/.test(k)) ingat(nama, n, `kunci isian singkat "${k}" mencurigakan (seperti huruf pilihan)`);
    } else {
      catat(nama, n, `tipe "${b.tipe}" tidak dikenal`);
    }

    /* --- soal kembar antar paket dalam satu subtes --- */
    const sidik = sidikTeks(b.pertanyaan) + "|" + (b.opsi ?? []).map(sidikTeks).join("|");
    if (!dipakai.has(kode)) dipakai.set(kode, new Map());
    const daftarSubtes = dipakai.get(kode);
    if (daftarSubtes.has(sidik))
      catat(nama, n, `soal kembar dengan ${daftarSubtes.get(sidik)}`);
    else daftarSubtes.set(sidik, `${nama} #${n}`);
  });

  /* --- sebaran kunci PG: tidak boleh menumpuk di satu huruf --- */
  const terbanyak = Math.max(...Object.values(sebaran));
  if (pg >= 10 && terbanyak > pg * 0.4)
    ingat(
      nama,
      0,
      `sebaran kunci timpang (A${sebaran.A} B${sebaran.B} C${sebaran.C} D${sebaran.D} E${sebaran.E})`,
    );
  const nol = HURUF.filter((h) => sebaran[h] === 0);
  if (pg >= 10 && nol.length)
    ingat(nama, 0, `kunci ${nol.join("/")} tidak pernah dipakai`);

  console.log(
    `${galat === 0 ? "ok" : "  "} ${nama.padEnd(12)} ${String(soal.length).padStart(2)}/${komp.total} butir` +
      `  (PG ${pg}, PGK ${pgk}, IS ${is})`,
  );
}

console.log(
  `\n${berkas.length} berkas · ${totalButir} butir · ${galat} galat · ${peringatan} peringatan`,
);
process.exit(galat ? 1 : 0);
