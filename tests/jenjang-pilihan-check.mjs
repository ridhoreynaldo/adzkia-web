/**
 * Pengujian ATURAN JENJANG Pilihan Program Studi.
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/jenjang-pilihan-check.mjs
 *
 * Aturan pengelola SMA Islam Plus Adzkia: Pilihan 1 dan 2 KHUSUS S1,
 * Pilihan 3 dan 4 KHUSUS D3 dan D4. Yang diperiksa:
 *
 *   1. Pencarian kotak Pilihan 1-2 hanya memulangkan S1, dan Pilihan 3-4
 *      hanya D3/D4 — prodi yang tidak boleh dipilih tidak ikut muncul.
 *   2. Pencarian tanpa penyaring (dipakai panel admin) tetap memulangkan semua.
 *   3. simpanPilihan MENOLAK jenjang yang salah kotak, walau id prodinya asli.
 *      Ini penjaga sesungguhnya: kotak isian mengirim id, dan id bisa disusun
 *      sendiri di luar halaman.
 *   4. Susunan yang benar (S1, S1, D4, D3) tersimpan utuh.
 *   5. Pilihan 3 dan 4 tetap boleh dikosongkan; pilihan 1 dan 2 tetap wajib.
 *   6. Tulisan jenjang yang bermacam-macam dibakukan saat impor — "S-1",
 *      "Sarjana", "D-IV", "Sarjana Terapan", "Diploma 3" — sehingga
 *      penyaringan tidak bergantung pada gaya penulisan berkas asalnya.
 *      "Sarjana Terapan" harus jadi D4, BUKAN S1.
 *   7. Prodi tanpa jenjang tidak muncul di kotak mana pun dan tidak bisa
 *      disimpan.
 *
 * Berkas .ts asli dipakai apa adanya — hanya disalin ke folder sementara DI
 * DALAM proyek (supaya node_modules tetap terjangkau) dengan penambahan
 * ekstensi pada impornya, sama seperti `peserta-paket-check.mjs`.
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
const TMP = path.join(AKAR, ".tmp", "cek", "jenjang-pilihan");

// Dibersihkan di AWAL, bukan di akhir: Windows masih memegang berkas SQLite
// yang terbuka dan rmSync di akhir melempar EPERM.
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
process.env.ADZKIA_DB_PATH = path.join(TMP, "cek.db");

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
const P = await muat("prodi");
const { all, one, run } = dbMod;

let gagal = 0;
function periksa(nama, syarat, tambahan = "") {
  if (syarat) {
    console.log("  ✓ " + nama);
  } else {
    gagal += 1;
    console.log("  ✗ " + nama + (tambahan ? "  — " + tambahan : ""));
  }
}

/* ------------------------------------------------------------------ */
/* Penyiapan data                                                      */
/* ------------------------------------------------------------------ */

run(
  "INSERT INTO users (nama, email, role, password_hash) VALUES (?, ?, ?, ?)",
  "Siswa Uji",
  "siswa.uji@adzkia.test",
  "siswa",
  "x",
);
const userId = one("SELECT id FROM users WHERE email = ?", "siswa.uji@adzkia.test").id;

run(
  `INSERT INTO packages (nama, kode, jalur, status) VALUES (?, ?, ?, ?)`,
  "Paket Uji Jenjang",
  "UJI-JENJANG",
  "utbk",
  "published",
);
const packageId = one("SELECT id FROM packages WHERE kode = ?", "UJI-JENJANG").id;

// Katalog kecil dengan gaya penulisan jenjang yang bermacam-macam, meniru
// berkas impor sungguhan.
P.imporProdi(
  [
    { nama: "PENDIDIKAN DOKTER", ptn: "UNIVERSITAS SUMATERA UTARA", jenjang: "S1" },
    { nama: "ILMU KOMPUTER", ptn: "UNIVERSITAS SUMATERA UTARA", jenjang: "S-1" },
    { nama: "MANAJEMEN", ptn: "UNIVERSITAS NEGERI MEDAN", jenjang: "Sarjana" },
    { nama: "TEKNIK MESIN", ptn: "POLITEKNIK NEGERI MEDAN", jenjang: "D-IV" },
    { nama: "ADMINISTRASI BISNIS", ptn: "POLITEKNIK NEGERI MEDAN", jenjang: "Sarjana Terapan" },
    { nama: "AKUNTANSI", ptn: "POLITEKNIK NEGERI MEDAN", jenjang: "Diploma 3" },
    { nama: "TEKNIK SIPIL", ptn: "POLITEKNIK NEGERI MEDAN", jenjang: "D3" },
    { nama: "SASTRA JAWA", ptn: "UNIVERSITAS TANPA JENJANG", jenjang: "" },
  ],
  false,
);

const id = (nama, ptn) => one("SELECT id FROM prodi WHERE nama = ? AND ptn = ?", nama, ptn).id;
const jenjangDi = (nama, ptn) =>
  one("SELECT jenjang FROM prodi WHERE nama = ? AND ptn = ?", nama, ptn).jenjang;

/* ------------------------------------------------------------------ */

console.log("\n1) Pembakuan tulisan jenjang saat impor");
periksa('"S-1" -> S1', jenjangDi("ILMU KOMPUTER", "UNIVERSITAS SUMATERA UTARA") === "S1");
periksa('"Sarjana" -> S1', jenjangDi("MANAJEMEN", "UNIVERSITAS NEGERI MEDAN") === "S1");
periksa('"D-IV" -> D4', jenjangDi("TEKNIK MESIN", "POLITEKNIK NEGERI MEDAN") === "D4");
periksa(
  '"Sarjana Terapan" -> D4, bukan S1',
  jenjangDi("ADMINISTRASI BISNIS", "POLITEKNIK NEGERI MEDAN") === "D4",
  jenjangDi("ADMINISTRASI BISNIS", "POLITEKNIK NEGERI MEDAN") ?? "null",
);
periksa('"Diploma 3" -> D3', jenjangDi("AKUNTANSI", "POLITEKNIK NEGERI MEDAN") === "D3");
periksa("jenjang kosong tetap null", jenjangDi("SASTRA JAWA", "UNIVERSITAS TANPA JENJANG") === null);

console.log("\n2) Penyaringan kotak pencarian");
const cari12 = P.cariProdi("politeknik negeri medan", 50, P.jenjangPilihan(1));
periksa("Pilihan 1 tidak memunculkan satu pun prodi vokasi", cari12.length === 0, `${cari12.length} baris`);

const cari34 = P.cariProdi("politeknik negeri medan", 50, P.jenjangPilihan(3));
periksa(
  "Pilihan 3 memunculkan seluruh D3/D4 politeknik",
  cari34.length === 4 && cari34.every((p) => p.jenjang === "D3" || p.jenjang === "D4"),
  cari34.map((p) => `${p.nama}:${p.jenjang}`).join(", "),
);

const cariS1 = P.cariProdi("universitas sumatera utara", 50, P.jenjangPilihan(2));
periksa(
  "Pilihan 2 hanya memunculkan S1",
  cariS1.length === 2 && cariS1.every((p) => p.jenjang === "S1"),
  cariS1.map((p) => `${p.nama}:${p.jenjang}`).join(", "),
);

const cariVokasiUntukS1 = P.cariProdi("universitas tanpa jenjang", 50, P.jenjangPilihan(1));
periksa("prodi tanpa jenjang tidak muncul di Pilihan 1-2", cariVokasiUntukS1.length === 0);
periksa(
  "prodi tanpa jenjang juga tidak muncul di Pilihan 3-4",
  P.cariProdi("universitas tanpa jenjang", 50, P.jenjangPilihan(4)).length === 0,
);
periksa(
  "tanpa penyaring, katalog utuh (dipakai panel admin)",
  P.cariProdi("politeknik negeri medan", 50).length === 4,
);

console.log("\n3) Label aturan yang ditampilkan ke peserta");
periksa(
  'label kotak = ["S1","S1","D3/D4","D3/D4"]',
  JSON.stringify(P.labelJenjangSemua()) === JSON.stringify(["S1", "S1", "D3/D4", "D3/D4"]),
  JSON.stringify(P.labelJenjangSemua()),
);

console.log("\n4) Penjaga penyimpanan (id prodi bisa disusun sendiri)");
const s1a = id("PENDIDIKAN DOKTER", "UNIVERSITAS SUMATERA UTARA");
const s1b = id("ILMU KOMPUTER", "UNIVERSITAS SUMATERA UTARA");
const s1c = id("MANAJEMEN", "UNIVERSITAS NEGERI MEDAN");
const d4 = id("TEKNIK MESIN", "POLITEKNIK NEGERI MEDAN");
const d3 = id("AKUNTANSI", "POLITEKNIK NEGERI MEDAN");
const tanpa = id("SASTRA JAWA", "UNIVERSITAS TANPA JENJANG");

let r = P.simpanPilihan(userId, packageId, [d4, s1b, d3, 0]);
periksa("D4 di Pilihan 1 ditolak", !!r.error, r.error ?? "tersimpan!");
periksa(
  "pesan tolakan menyebut jenjang yang benar",
  (r.error ?? "").includes("S1"),
  r.error ?? "",
);

r = P.simpanPilihan(userId, packageId, [s1a, d3, d4, 0]);
periksa("D3 di Pilihan 2 ditolak", !!r.error, r.error ?? "tersimpan!");

r = P.simpanPilihan(userId, packageId, [s1a, s1b, s1c, 0]);
periksa("S1 di Pilihan 3 ditolak", !!r.error, r.error ?? "tersimpan!");

r = P.simpanPilihan(userId, packageId, [s1a, s1b, d4, s1c]);
periksa("S1 di Pilihan 4 ditolak", !!r.error, r.error ?? "tersimpan!");

r = P.simpanPilihan(userId, packageId, [tanpa, s1b, d4, d3]);
periksa("prodi tanpa jenjang ditolak", !!r.error, r.error ?? "tersimpan!");

periksa(
  "tidak ada yang tersimpan sesudah semua penolakan",
  all("SELECT * FROM pilihan_prodi WHERE user_id = ?", userId).length === 0,
);

console.log("\n5) Susunan yang benar tersimpan utuh");
r = P.simpanPilihan(userId, packageId, [s1a, s1b, d4, d3]);
periksa("S1, S1, D4, D3 diterima", !r.error, r.error ?? "");

const tersimpan = P.pilihanPeserta(userId, packageId);
periksa("empat baris tersimpan", tersimpan.length === 4, `${tersimpan.length}`);
periksa(
  "jenjang tiap baris sesuai kotaknya",
  tersimpan.every((t) => P.jenjangCocok(t.urutan, t.jenjang)),
  tersimpan.map((t) => `${t.urutan}:${t.jenjang}`).join(", "),
);
periksa("pilihan wajib terpenuhi", P.pilihanLengkap(userId, packageId));

console.log("\n6) Pilihan 3 dan 4 tetap boleh kosong, 1 dan 2 tetap wajib");
r = P.simpanPilihan(userId, packageId, [s1a, s1b, 0, 0]);
periksa("hanya dua pilihan S1 diterima", !r.error, r.error ?? "");
periksa(
  "pilihan 3-4 lama ikut terhapus",
  P.pilihanPeserta(userId, packageId).length === 2,
);

r = P.simpanPilihan(userId, packageId, [s1a, 0, 0, 0]);
periksa("Pilihan 2 kosong ditolak", !!r.error, r.error ?? "tersimpan!");

/* ------------------------------------------------------------------ */

console.log(
  "\n" + (gagal === 0 ? "SEMUA PEMERIKSAAN LULUS ✅" : `${gagal} PEMERIKSAAN GAGAL ❌`) + "\n",
);
process.exit(gagal === 0 ? 0 : 1);
