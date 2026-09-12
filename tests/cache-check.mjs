/**
 * Pengujian LAPISAN CACHE — `src/lib/cache.ts`.
 *
 *     npm run cek:cache
 *
 * Menyambung ke Redis SUNGGUHAN di REDIS_URL. Seluruh kunci yang dipakainya
 * berawalan `adzkia:v1:cek:` dan dibuang di akhir, jadi aman dijalankan pada
 * Redis yang sedang dipakai.
 *
 * Yang paling penting diperiksa di sini bukan "cache-nya bekerja", melainkan
 * "cache yang MATI tidak menjatuhkan aplikasi" — sifat yang justru tidak
 * pernah terlihat selama semuanya berjalan normal.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const AKAR = path.resolve(import.meta.dirname, "..");

for (const baris of fs.readFileSync(path.join(AKAR, ".env"), "utf8").split("\n")) {
  const cocok = /^\s*([A-Z_0-9]+)\s*=\s*(.*)\s*$/.exec(baris);
  if (cocok && !process.env[cocok[1]]) process.env[cocok[1]] = cocok[2].trim();
}

const TMP = path.join(AKAR, ".tmp", "cek", "cache");
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
fs.writeFileSync(
  path.join(TMP, "cache.ts"),
  fs.readFileSync(path.join(AKAR, "src", "lib", "core", "cache.ts"), "utf8").replace(/^import "server-only";\s*$/m, ""),
);

const C = await import(pathToFileURL(path.join(TMP, "cache.ts")).href);

let gagal = 0;
function periksa(nama, syarat, tambahan = "") {
  if (syarat) console.log(`  OK   ${nama}`);
  else {
    gagal++;
    console.log(`  GAGAL ${nama}${tambahan ? ` — ${tambahan}` : ""}`);
  }
}

const K = (...b) => C.kunci("cek", ...b);

console.log("\n1) Menyimpan dan membaca kembali");
{
  periksa("cache memang aktif", C.cacheAktif === true, "REDIS_URL kosong?");

  await C.buangPola(K("*"));

  let dihitung = 0;
  const buat = async () => {
    dihitung++;
    return { nama: "Prodi Contoh", jumlah: 5173, daftar: ["A", "B"] };
  };

  const pertama = await C.ambil(K("rujukan"), 60, buat);
  periksa("panggilan pertama menghitung", dihitung === 1);
  periksa("isinya benar", pertama.jumlah === 5173 && pertama.daftar.length === 2);

  const kedua = await C.ambil(K("rujukan"), 60, buat);
  periksa("panggilan kedua TIDAK menghitung ulang", dihitung === 1, `dihitung ${dihitung} kali`);
  periksa("isinya sama persis", JSON.stringify(kedua) === JSON.stringify(pertama));
}

console.log("\n2) Umur simpan dipasang");
{
  await C.ambil(K("umur"), 42, async () => "x");
  const sisa = await C.redis.ttl(K("umur")).catch(() => -99);
  periksa("kunci punya umur, bukan menetap selamanya", sisa > 0 && sisa <= 42, `ttl ${sisa}`);

  const tanpaUmur = await C.redis.ttl(C.kunci("tidak", "ada"));
  periksa("kunci yang tidak ada memulangkan -2", tanpaUmur === -2);
}

console.log("\n3) Membuang entri");
{
  await C.ambil(K("buang", "satu"), 60, async () => 1);
  await C.ambil(K("buang", "dua"), 60, async () => 2);
  await C.buang(K("buang", "satu"));
  periksa("kunci yang dibuang hilang", (await C.redis.get(K("buang", "satu"))) === null);
  periksa("kunci lain tidak ikut hilang", (await C.redis.get(K("buang", "dua"))) !== null);

  await C.ambil(K("pola", "a"), 60, async () => 1);
  await C.ambil(K("pola", "b"), 60, async () => 2);
  const jumlah = await C.buangPola(K("pola", "*"));
  periksa("buangPola membuang seluruh yang cocok", jumlah === 2, `dibuang ${jumlah}`);
  periksa("benar-benar hilang", (await C.redis.get(K("pola", "a"))) === null);
}

console.log("\n4) Nilai yang tidak lazim");
{
  let kali = 0;
  const hasil = await C.ambil(K("undefined"), 60, async () => {
    kali++;
    return undefined;
  });
  periksa("undefined dipulangkan apa adanya", hasil === undefined);
  periksa("undefined TIDAK disimpan", (await C.redis.get(K("undefined"))) === null);
  await C.ambil(K("undefined"), 60, async () => {
    kali++;
    return undefined;
  });
  periksa("jadi dihitung lagi, bukan membaca entri rusak", kali === 2);

  const nol = await C.ambil(K("nol"), 60, async () => 0);
  periksa("angka 0 tersimpan benar", nol === 0);
  const nolLagi = await C.ambil(K("nol"), 60, async () => 99);
  periksa("0 dibaca dari cache, bukan dianggap kosong", nolLagi === 0, `dapat ${nolLagi}`);

  const kosong = await C.ambil(K("null"), 60, async () => null);
  periksa("null tersimpan benar", kosong === null);
}

console.log("\n5) Isi cache yang rusak tidak menjatuhkan");
{
  await C.redis.set(K("rusak"), "{ ini bukan json", "EX", 60);
  let jatuh = false;
  let nilai;
  try {
    nilai = await C.ambil(K("rusak"), 60, async () => "dihitung ulang");
  } catch {
    jatuh = true;
  }
  periksa("tidak melempar galat", !jatuh);
  periksa("jatuh ke perhitungan ulang", nilai === "dihitung ulang", String(nilai));
}

console.log("\n6) Cache MATI tidak menjatuhkan aplikasi");
{
  // Alamat yang pasti tidak ada isinya: port tertutup di localhost.
  process.env.REDIS_URL = "redis://127.0.0.1:6399";

  // Kunci globalThis-nya ikut diganti. Tanpa itu salinan ini memakai ULANG
  // klien hidup yang sudah tersimpan di sana, dan pengujian "cache mati" ini
  // diam-diam menguji cache yang sehat - lulus tanpa membuktikan apa pun.
  fs.writeFileSync(
    path.join(TMP, "cache-mati.ts"),
    fs
      .readFileSync(path.join(AKAR, "src", "lib", "core", "cache.ts"), "utf8")
      .replace(/^import "server-only";\s*$/m, "")
      .replaceAll("__adzkiaRedis", "__adzkiaRedisMati"),
  );
  const M = await import(pathToFileURL(path.join(TMP, "cache-mati.ts")).href);

  const mulai = Date.now();
  const nilai = await M.ambil(M.kunci("cek", "mati"), 60, async () => "dari basis data");
  const lama = Date.now() - mulai;

  periksa("tetap memulangkan nilai dari sumbernya", nilai === "dari basis data");
  periksa("tidak menggantung lama", lama < 5000, `${lama} ms`);

  const s = await M.sehatCache();
  periksa("laporan kesehatan TIDAK menyatakan aplikasi sakit", s.siap === true, s.pesan);
  console.log(`       ${s.pesan}`);
  M.redis?.disconnect();
}

console.log("\n7) Laporan kesehatan saat sehat");
{
  const s = await C.sehatCache();
  periksa("aktif dan menjawab", s.aktif === true && s.siap === true, s.pesan);
  console.log(`       ${s.pesan} dalam ${s.ms} ms`);
}

await C.buangPola(K("*"));
C.redis?.disconnect();

console.log(gagal === 0 ? "\nSEMUA LULUS.\n" : `\n${gagal} PENGUJIAN GAGAL.\n`);
process.exit(gagal === 0 ? 0 : 1);
