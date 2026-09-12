/**
 * Pengujian FOTO PESERTA — penyimpanan, pemasangan, dan pelayanan berkasnya.
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/foto-peserta-check.mjs
 *
 * Yang diperiksa:
 *
 *   1. Jenis berkas ditimbang dari BYTE-nya, bukan dari namanya — berkas teks
 *      bernama .jpg harus ditolak.
 *   2. Berkas ditulis ke `public/peserta/` dengan nama sidik jari isinya, dan
 *      foto yang sama persis tidak pernah tersimpan dua kali.
 *   3. Kolom `users.foto` menyimpan ALAMAT, bukan gambarnya.
 *   4. Mengganti foto TIDAK menimpa berkas lama (alamat lama berhenti dipakai),
 *      supaya peramban yang masih memegang alamat itu tidak pernah menampilkan
 *      foto orang lain.
 *   5. Pelayan cadangan `/peserta/<berkas>` melayani foto yang baru ditulis
 *      SESUDAH server hidup, dan menolak jalan yang mencurigakan.
 *   6. Huruf awal nama untuk foto yang belum ada.
 *
 * Folder `public/peserta/` dibersihkan di AWAL, bukan di akhir — sama seperti
 * pemeriksa lain, karena Windows masih memegang berkasnya.
 */
import fs from "node:fs";
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
const TMP = path.join(AKAR, ".tmp", "cek", "foto-peserta");
const FOTO_DIR = path.join(AKAR, "public", "peserta");

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
process.env.ADZKIA_DB_PATH = path.join(TMP, "cek.db");

// Berkas uji ditulis ke folder foto sungguhan (itulah yang diuji), jadi jejaknya
// dicatat dan dibuang di akhir supaya `public/` tidak dikotori.
const dibuat = [];

// Menelusuri src/lib SECARA REKURSIF: sejak 12 September 2026 isinya
// bersarang per domain (core/, tryout/, ielts/, ...). Salinannya tetap
// diratakan — nama dasarnya unik di seluruh domain.
for (const berkas of fs
  .readdirSync(path.join(AKAR, "src", "lib"), { recursive: true })
  .map((p) => String(p))
  .filter((p) => p.endsWith(".ts"))
  .map((p) => p.split(/[\/]/).pop())) {
  if (!berkas.endsWith(".ts")) continue;
  const sumber = fs.readFileSync(cariDiLib(berkas), "utf8");
  const rapi = sumber
    .replace(/^import "server-only";\s*$/m, "")
    .replace(/from "@\/lib\/(?:[a-z0-9-]+\/)?([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"')
    .replace(/from "\.\/([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"');
  fs.writeFileSync(path.join(TMP, berkas), rapi);
}

const muat = (nama) => import(pathToFileURL(path.join(TMP, `${nama}.ts`)).href);

const dbMod = await muat("db");
const F = await muat("foto-peserta");
const K = await muat("foto-peserta-konstanta");
const G = await muat("gambar-soal");
const { run } = dbMod;

let gagal = 0;
function periksa(nama, syarat, tambahan = "") {
  if (syarat) {
    console.log("  ✓ " + nama);
  } else {
    gagal += 1;
    console.log("  ✗ " + nama + (tambahan ? "  — " + tambahan : ""));
  }
}

/* PNG 1x1 sungguhan, cukup untuk melewati pengenalan byte. */
const PNG_SATU = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
/* PNG 1x1 lain (warna berbeda) supaya sidik jarinya pasti tidak sama. */
const PNG_DUA = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

const siswa = (nama, nisn) => {
  const r = run(
    "INSERT INTO users (nama, email, password_hash, role, nisn) VALUES (?, ?, 'x', 'siswa', ?)",
    nama,
    `${nisn}@uji.test`,
    nisn,
  );
  return Number(r.lastInsertRowid);
};

const andi = siswa("Andi Pratama", "9000000001");
const budi = siswa("Budi", "9000000002");

/* ------------------------------------------------------------------ */
console.log("\n1. Jenis berkas ditimbang dari isinya");
/* ------------------------------------------------------------------ */

periksa("PNG sungguhan dikenali", G.kenaliJenisGambar(new Uint8Array(PNG_SATU))?.ext === "png");
periksa(
  "berkas teks yang mengaku .jpg DITOLAK",
  G.kenaliJenisGambar(new Uint8Array(Buffer.from("ini bukan gambar", "utf8"))) === null,
);
periksa("berkas kosong ditolak", G.kenaliJenisGambar(new Uint8Array(0)) === null);

/* ------------------------------------------------------------------ */
console.log("\n2. Berkas ditulis dengan nama sidik jari isinya");
/* ------------------------------------------------------------------ */

const h1 = await F.simpanBerkasFoto(new Uint8Array(PNG_SATU));
dibuat.push(path.join(FOTO_DIR, path.basename(h1.url)));
periksa("alamatnya berawalan /peserta/", h1.url.startsWith("/peserta/"), h1.url);
periksa("ekstensinya mengikuti isi berkas", h1.url.endsWith(".png"), h1.url);
periksa("berkasnya benar-benar ada di disk", fs.existsSync(path.join(FOTO_DIR, path.basename(h1.url))));
periksa("ukurannya dilaporkan apa adanya", h1.ukuran === PNG_SATU.length);

const h1b = await F.simpanBerkasFoto(new Uint8Array(PNG_SATU));
periksa("foto yang sama persis memakai alamat yang sama", h1b.url === h1.url);
periksa(
  "hanya satu berkas untuk isi yang sama",
  fs.readdirSync(FOTO_DIR).filter((n) => n === path.basename(h1.url)).length === 1,
);

/* ------------------------------------------------------------------ */
console.log("\n3. Basis data menyimpan ALAMAT, bukan gambarnya");
/* ------------------------------------------------------------------ */

F.setFotoPeserta(andi, h1.url);
periksa("foto terbaca kembali", F.fotoPeserta(andi) === h1.url);
periksa("panjangnya sepanjang alamat, bukan sepanjang gambar", (F.fotoPeserta(andi) ?? "").length < 80);
periksa("peserta lain tidak ikut berubah", F.fotoPeserta(budi) === null);

const ident = F.identitasFoto(andi);
periksa("identitas membawa nama, NISN, dan foto sekaligus",
  ident?.nama === "Andi Pratama" && ident?.nisn === "9000000001" && ident?.foto === h1.url);
periksa("identitas peserta yang tidak ada bernilai null", F.identitasFoto(999999) === null);

/* ------------------------------------------------------------------ */
console.log("\n4. Mengganti foto tidak menimpa berkas lama");
/* ------------------------------------------------------------------ */

const h2 = await F.simpanBerkasFoto(new Uint8Array(PNG_DUA));
dibuat.push(path.join(FOTO_DIR, path.basename(h2.url)));
F.setFotoPeserta(andi, h2.url);
periksa("alamatnya berubah", h2.url !== h1.url);
periksa("berkas lama MASIH ada di disk", fs.existsSync(path.join(FOTO_DIR, path.basename(h1.url))));
periksa("kolomnya menunjuk foto yang baru", F.fotoPeserta(andi) === h2.url);

F.setFotoPeserta(andi, null);
periksa("melepas foto mengosongkan kolomnya", F.fotoPeserta(andi) === null);
periksa(
  "tetapi berkasnya tidak ikut dihapus",
  fs.existsSync(path.join(FOTO_DIR, path.basename(h2.url))),
);

/* ------------------------------------------------------------------ */
console.log("\n5. Pelayan cadangan /peserta/<berkas>");
/* ------------------------------------------------------------------ */

const namaBaru = path.basename(h1.url);
const res = await G.layaniGambar("peserta", [namaBaru]);
periksa("foto dilayani dengan status 200", res.status === 200, "dapat " + res.status);
periksa("jenisnya image/png", res.headers.get("Content-Type") === "image/png");
periksa(
  "isinya sama persis dengan yang ditulis",
  Buffer.from(await res.arrayBuffer()).equals(PNG_SATU),
);

for (const [nama, segmen] of [
  ["berkas yang tidak ada", ["tidak-ada-sama-sekali.png"]],
  ["naik folder lewat ..", ["..", "adzkia.db"]],
  ["jalan bergaris miring", ["a/b.png"]],
  ["ekstensi bukan gambar", ["adzkia.db"]],
  ["segmen kosong", []],
]) {
  const r = await G.layaniGambar("peserta", segmen);
  periksa(`${nama} dibalas 404`, r.status === 404, "dapat " + r.status);
}

/* ------------------------------------------------------------------ */
console.log("\n6. Huruf awal nama & tetapan bersama");
/* ------------------------------------------------------------------ */

periksa('"Andi Pratama" -> "AP"', K.inisialNama("Andi Pratama") === "AP");
periksa('satu kata -> satu huruf', K.inisialNama("Budi") === "B");
periksa('tiga kata tetap dua huruf', K.inisialNama("Muhammad Farras Fatih") === "MF");
periksa('spasi berlebih tidak mengacaukan', K.inisialNama("  Citra   Dewi  ") === "CD");
periksa('nama kosong tidak melempar galat', K.inisialNama("") === "?");
periksa('nama tanpa huruf tidak melempar galat', K.inisialNama("123 456") === "?");

periksa("batas ukuran foto masuk akal", K.BATAS_FOTO_BYTE === K.BATAS_FOTO_MB * 1024 * 1024);
periksa("sisi foto cukup untuk layar beresolusi tinggi", K.SISI_FOTO >= 256);
periksa("GIF tidak termasuk format foto", !K.ACCEPT_FOTO.includes("gif"));
periksa("accept memuat jpeg", K.ACCEPT_FOTO.includes("image/jpeg"));

/* ------------------------------------------------------------------ */

for (const berkas of dibuat) {
  try {
    fs.rmSync(berkas, { force: true });
  } catch {
    /* biarkan: berkas uji yatim jauh lebih murah daripada pemeriksa yang gagal */
  }
}

if (gagal > 0) {
  console.log("\n" + gagal + " pemeriksaan GAGAL.\n");
  process.exit(1);
}
console.log("\nSemua pemeriksaan foto peserta lulus.\n");
