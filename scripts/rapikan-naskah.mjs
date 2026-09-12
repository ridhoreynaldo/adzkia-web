/**
 * Rapikan soal yang TELANJUR tersimpan dengan pembaca naskah versi lama.
 *
 * Setiap kali `src/lib/naskah-docx.ts` diperbaiki, soal yang sudah masuk ke
 * basis data tetap membawa kekeliruan versi lamanya. Mengimpor ulang bukan
 * jawabannya: paket yang sudah terbit memakai penomoran hasil mode "lanjutan"
 * (naskah bernomor 21-40 tersimpan sebagai 1-20), sehingga mode timpa tidak
 * menemukan padanannya dan justru menolak dengan "melebihi kuota".
 *
 * Skrip ini membaca ulang naskah aslinya, MENJODOHKAN tiap butir dengan baris
 * basis data lewat sidik jari teks pertanyaannya (bukan nomor), lalu
 * memperbaiki HANYA dua kolom: `stimulus` dan `opsi`.
 *
 * Yang sengaja TIDAK pernah disentuh:
 *   - `kunci` — perbedaan kunci hanya dilaporkan, tidak ditulis. Kunci menentukan
 *     nilai peserta yang sudah mengerjakan, dan itu keputusan manusia.
 *   - `nomor`, `tipe`, `level`, `pertanyaan`, `pembahasan`, `gambar_url`.
 *   - Butir yang tidak punya padanan di naskah, dan butir yang sudah sama.
 *
 * Jalankan (dari root proyek):
 *   npm run rapikan:naskah -- <kodePaket> <berkas.docx> [SUBTES]           # tinjau
 *   npm run rapikan:naskah -- <kodePaket> <berkas.docx> [SUBTES] --tulis   # terapkan
 *
 * Tanpa `--tulis` tidak ada satu baris pun yang berubah. Dengan `--tulis`,
 * cadangan basis data dibuat lebih dulu lewat VACUUM INTO dan namanya dicetak.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

const AKAR = process.cwd();
const DB_PATH = process.env.ADZKIA_DB_PATH ?? path.join(AKAR, "data", "adzkia.db");

const argv = process.argv.slice(2);
const tulis = argv.includes("--tulis");
const [kodePaket, berkas, subtesBawaan = ""] = argv.filter((a) => !a.startsWith("--"));

if (!kodePaket || !berkas) {
  console.error(
    "Pemakaian: npm run rapikan:naskah -- <kodePaket> <berkas.docx> [SUBTES] [--tulis]",
  );
  process.exit(1);
}
if (!fs.existsSync(berkas)) {
  console.error(`Berkas naskah tidak ditemukan: ${berkas}`);
  process.exit(1);
}

/* ---- muat pembaca naskah (impor "@/lib/..." dirapikan lebih dulu) ---- */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "adzkia-rapikan-"));
for (const nama of ["snbt", "skd", "docx", "naskah-docx"]) {
  const sumber = fs.readFileSync(path.join(AKAR, "src", "lib", `${nama}.ts`), "utf8");
  fs.writeFileSync(
    path.join(TMP, `${nama}.ts`),
    sumber
      .replace(/^import "server-only";\s*$/m, "")
      .replace(/from "@\/lib\/([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"')
      .replace(/from "\.\/([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"'),
  );
}
fs.symlinkSync(
  path.join(AKAR, "node_modules"),
  path.join(TMP, "node_modules"),
  process.platform === "win32" ? "junction" : "dir",
);
const { bacaNaskahDocx } = await import(pathToFileURL(path.join(TMP, "naskah-docx.ts")).href);

/**
 * Sidik jari penjodohan: HANYA huruf dan angka dari teks pertanyaan. Tag HTML,
 * tanda baca, dan spasi dibuang supaya perbedaan cetak tebal/miring antara
 * naskah dan basis data tidak memutus pasangan yang sebenarnya sama.
 */
const sidik = (html) =>
  String(html ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();

const ringkas = (html, n = 90) =>
  String(html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, n);

/* ---------------------------------------------------------------- */
const db = new DatabaseSync(DB_PATH);
const paket = db.prepare("SELECT id, kode, nama, status FROM packages WHERE kode = ?").get(kodePaket);
if (!paket) {
  console.error(`Paket berkode ${kodePaket} tidak ada di ${DB_PATH}.`);
  process.exit(1);
}

const baris = db.prepare("SELECT * FROM questions WHERE package_id = ?").all(paket.id);
const buf = fs.readFileSync(berkas);
const hasil = await bacaNaskahDocx(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), {
  kodePaket: paket.kode,
  simpanGambar: false,
  subtesBawaan,
});

console.log(`Paket ${paket.kode} (${paket.status}) — ${baris.length} butir tersimpan`);
console.log(`Naskah ${path.basename(berkas)} — ${hasil.butir.length} butir terbaca\n`);

const ubahan = [];
const tanpaPadanan = [];
const kunciBeda = [];

for (const b of hasil.butir) {
  const s = sidik(b.pertanyaan);
  const cocok = baris.filter((r) => sidik(r.pertanyaan) === s);
  if (cocok.length !== 1) {
    tanpaPadanan.push({ butir: b, jumlah: cocok.length });
    continue;
  }
  const r = cocok[0];
  const opsiLama = r.opsi ?? "[]";
  const opsiBaru = JSON.stringify(b.opsi.map((o) => String(o)));
  const stimLama = r.stimulus ?? "";
  const stimBaru = b.stimulus ?? "";
  if ((r.kunci ?? "") !== (b.kunci ?? "")) kunciBeda.push({ r, baru: b.kunci });
  if (opsiLama === opsiBaru && stimLama === stimBaru) continue;
  ubahan.push({ r, opsiLama, opsiBaru, stimLama, stimBaru });
}

for (const u of ubahan) {
  console.log(`${u.r.subtes}-${u.r.nomor} (#${u.r.id})`);
  if (u.stimLama !== u.stimBaru) {
    console.log(`  bacaan  : ${u.stimLama.length} → ${u.stimBaru.length} karakter`);
    if (!u.stimLama) console.log(`            terisi  : ${ringkas(u.stimBaru)}`);
    else if (!u.stimBaru) console.log(`            dikosongkan: ${ringkas(u.stimLama)}`);
    else console.log(`            menjadi : ${ringkas(u.stimBaru)}`);
  }
  const lama = JSON.parse(u.opsiLama);
  const baru = JSON.parse(u.opsiBaru);
  for (let i = 0; i < Math.max(lama.length, baru.length); i++) {
    if (lama[i] === baru[i]) continue;
    console.log(`  pilihan ${"ABCDE"[i] ?? i + 1}`);
    console.log(`      lama: ${ringkas(lama[i], 120)}`);
    console.log(`      baru: ${ringkas(baru[i], 120)}`);
  }
}

if (tanpaPadanan.length) {
  console.log(`\n${tanpaPadanan.length} butir naskah tanpa padanan tunggal di basis data (dilewati):`);
  for (const t of tanpaPadanan) {
    console.log(`  [${t.jumlah} padanan] ${ringkas(t.butir.pertanyaan)}`);
  }
}
if (kunciBeda.length) {
  console.log(`\n${kunciBeda.length} butir berkunci berbeda — TIDAK diubah, periksa sendiri:`);
  for (const k of kunciBeda) {
    console.log(`  ${k.r.subtes}-${k.r.nomor} (#${k.r.id}): tersimpan ${k.r.kunci} · naskah ${k.baru}`);
  }
}

console.log(`\n${ubahan.length} butir akan dirapikan.`);

if (!ubahan.length) {
  fs.rmSync(TMP, { recursive: true, force: true });
  process.exit(0);
}

if (!tulis) {
  console.log('Peninjauan saja. Tambahkan "--tulis" untuk menerapkannya.');
  fs.rmSync(TMP, { recursive: true, force: true });
  process.exit(0);
}

/* ---- cadangan lebih dulu, baru menulis ---- */
// Detik ikut masuk, dan namanya diberi angka bila berkasnya sudah ada: VACUUM
// INTO GAGAL bila berkas tujuannya sudah ada, dan merapikan dua naskah dalam
// menit yang sama sempat membuat perintah kedua berhenti tanpa mengubah apa pun.
const cap = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
let cadangan = path.join(path.dirname(DB_PATH), `adzkia-cadangan-${cap}-sebelum-rapikan.db`);
for (let i = 2; fs.existsSync(cadangan); i++) {
  cadangan = path.join(path.dirname(DB_PATH), `adzkia-cadangan-${cap}-sebelum-rapikan-${i}.db`);
}
db.exec(`VACUUM INTO '${cadangan.replace(/\\/g, "/").replace(/'/g, "''")}'`);
console.log(`Cadangan dibuat: ${cadangan}`);

const perbarui = db.prepare("UPDATE questions SET stimulus = ?, opsi = ? WHERE id = ?");
db.exec("BEGIN");
try {
  for (const u of ubahan) perbarui.run(u.stimBaru || null, u.opsiBaru, u.r.id);
  db.exec("COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
}
console.log(`${ubahan.length} butir diperbarui.`);
fs.rmSync(TMP, { recursive: true, force: true });
