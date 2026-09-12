/**
 * Memeriksa ISI paket Tryout/SKD sebelum diterbitkan — tanpa mengubah apa pun.
 *
 *     npm run cek:paket              # semua paket draft & terbit
 *     npm run cek:paket -- TO-11SEP2026
 *     ADZKIA_DB_PATH=... npm run cek:paket
 *
 * Kembaran `cek:soal` yang sudah lebih dulu ada untuk Warung Soal. Dipakai
 * SEBELUM paket dibuka ke siswa, karena tiga jenis temuan di bawah ini membuat
 * butirnya MUSTAHIL dijawab benar — dan peserta yang kehilangan angka karenanya
 * baru ketahuan setelah tryout selesai:
 *
 *   1. Pilihan kembar persis  — dua pilihan yang isinya sama; mana pun yang
 *      ditandai peserta, salah satunya pasti dianggap salah.
 *   2. Kunci menunjuk pilihan kosong, atau bukan huruf A-E sama sekali.
 *   3. Kunci isian singkat yang tidak mungkin diketik ulang. Penilaian isian
 *      singkat mencocokkan PERSIS (huruf dikecilkan, spasi dibuang, koma jadi
 *      titik), jadi kunci berupa rumus, kalimat, atau angka bertitik ribuan
 *      praktis selalu dinilai salah.
 *
 * Selain itu dijalankan juga pemeriksa kewajaran butir milik panel admin
 * (`src/lib/mutu-soal.ts`), yang antara lain menangkap kalimat pengantar naskah
 * yang tertelan menjadi pilihan jawaban.
 *
 * Keluar dengan kode 1 bila ada temuan BERAT, supaya bisa dipakai sebagai
 * gerbang sebelum menerbitkan.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

const AKAR = path.resolve(import.meta.dirname, "..");
const DB = process.env.ADZKIA_DB_PATH ?? path.join(AKAR, "data", "adzkia.db");
const TMP = path.join(AKAR, ".cek-paket-tryout");

if (!fs.existsSync(DB)) {
  console.error(`Basis data tidak ditemukan: ${DB}`);
  process.exit(2);
}

// `mutu-soal.ts` dipakai apa adanya — disalin ke folder sementara dengan
// ekstensi impor ditambahkan, pola yang sama dengan pemeriksa lain di proyek ini.
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
for (const berkas of fs.readdirSync(path.join(AKAR, "src", "lib"))) {
  if (!berkas.endsWith(".ts")) continue;
  fs.writeFileSync(
    path.join(TMP, berkas),
    fs
      .readFileSync(path.join(AKAR, "src", "lib", berkas), "utf8")
      .replace(/^import "server-only";\s*$/m, "")
      .replace(/from "@\/lib\/([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"')
      .replace(/from "\.\/([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"'),
  );
}
const M = await import(pathToFileURL(path.join(TMP, "mutu-soal.ts")).href);

const saring = process.argv.slice(2).map((s) => s.toUpperCase()).filter(Boolean);
const HURUF = ["A", "B", "C", "D", "E"];

const db = new DatabaseSync(DB, { readOnly: true });
const paket = db
  .prepare("SELECT id, kode, nama, jalur, status FROM packages WHERE status <> 'closed' ORDER BY id")
  .all()
  .filter((p) => saring.length === 0 || saring.includes(p.kode.toUpperCase()));

if (paket.length === 0) {
  console.log("Tidak ada paket draft/terbit yang cocok.");
  process.exit(0);
}

let berat = 0;
let ringan = 0;

for (const p of paket) {
  const soal = db
    .prepare(
      `SELECT subtes, nomor, tipe, stimulus, pertanyaan, gambar_url, opsi, kunci
         FROM questions WHERE package_id = ? ORDER BY subtes, nomor`,
    )
    .all(p.id);

  const temuan = [];
  const catat = (s, tingkat, pesan) => temuan.push({ s, tingkat, pesan });

  for (const s of soal) {
    let opsi = [];
    try {
      opsi = JSON.parse(s.opsi || "[]");
    } catch {
      catat(s, "BERAT", "kolom `opsi` bukan JSON yang sah");
    }
    const bersih = opsi.map((o) => M.teksPolos(o));
    const terisi = bersih.filter((t) => t !== "");

    for (const c of M.periksaButir({ ...s, opsi })) catat(s, "ringan", c);

    if (!M.teksPolos(s.pertanyaan)) catat(s, "BERAT", "pertanyaannya kosong");

    if (s.tipe === "PG") {
      if (terisi.length < 2) catat(s, "BERAT", `hanya punya ${terisi.length} pilihan terisi`);
      const k = (s.kunci || "").trim().toUpperCase();
      if (!HURUF.includes(k)) catat(s, "BERAT", `kunci "${s.kunci}" bukan huruf pilihan A-E`);
      else if (!bersih[HURUF.indexOf(k)]) catat(s, "BERAT", `kunci ${k} menunjuk pilihan yang KOSONG`);
      const kembar = terisi.filter((t, i) => terisi.indexOf(t) !== i);
      if (kembar.length) catat(s, "BERAT", "ada dua pilihan yang isinya sama persis");
    }

    if (s.tipe === "IS") {
      const k = (s.kunci || "").trim();
      if (!k) catat(s, "BERAT", "kunci isian singkat kosong");
      else if (/\s/.test(k) && !/^\d[\d.,\s]*$/.test(k)) {
        catat(s, "BERAT", `kunci "${k}" mengandung spasi — peserta hampir mustahil menjawab persis`);
      } else if (/[a-zA-Z]/.test(k) && /\d/.test(k)) {
        catat(s, "BERAT", `kunci "${k}" mencampur huruf dan angka — rawan selalu dinilai salah`);
      } else if (/\d\.\d{3}/.test(k)) {
        catat(s, "BERAT", `kunci "${k}" memakai titik ribuan — akan dinilai salah`);
      }
    }

    if (s.tipe === "BS") {
      const n = terisi.length;
      const k = (s.kunci || "").trim().toUpperCase().replace(/[^BS]/g, "");
      if (n === 0) catat(s, "BERAT", "bertipe Benar/Salah tetapi tidak punya pernyataan");
      else if (k.length !== n) {
        catat(s, "BERAT", `kunci "${s.kunci}" untuk ${n} pernyataan tidak cocok`);
      }
    }
  }

  const b = temuan.filter((t) => t.tingkat === "BERAT");
  const r = temuan.filter((t) => t.tingkat === "ringan");
  berat += b.length;
  ringan += r.length;

  const tanda = b.length ? "x " : soal.length === 0 ? "- " : "ok";
  console.log(
    `\n${tanda} ${p.kode}  [${p.jalur}/${p.status}]  ${soal.length} butir  ` +
      `· ${b.length} berat, ${r.length} ringan`,
  );
  if (soal.length === 0) console.log("     (paket masih kosong — soalnya belum diunggah)");
  for (const t of [...b, ...r]) {
    console.log(`     ${t.tingkat === "BERAT" ? "!" : "·"} ${t.s.subtes}-${t.s.nomor} [${t.s.tipe}] ${t.pesan}`);
  }
}

console.log(
  `\n${paket.length} paket diperiksa · ${berat} temuan BERAT · ${ringan} temuan ringan\n`,
);
if (berat > 0) {
  console.log("Temuan BERAT membuat butirnya mustahil dijawab benar. Perbaiki sebelum diterbitkan.\n");
  process.exit(1);
}
