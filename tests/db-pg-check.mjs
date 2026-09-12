/**
 * Pengujian LAPISAN POSTGRESQL — `src/lib/db.ts`.
 *
 * Cara menjalankan (dari folder adzkia-smart-pg):
 *     npm run cek:db
 *
 * Menyambung ke PostgreSQL SUNGGUHAN yang alamatnya ada di DATABASE_URL.
 * Seluruh yang ditulisnya dibatalkan sendiri, jadi aman dijalankan berkali-kali
 * pada basis data yang sedang dipakai.
 *
 * Yang diperiksa — semuanya hal yang kalau salah, kodenya tetap "berjalan"
 * tetapi hasilnya diam-diam keliru:
 *
 *   1. Penanda `?` diterjemahkan ke `$1, $2, …`, dan tanda tanya di dalam
 *      string SQL TIDAK ikut diterjemahkan.
 *   2. COUNT(*) memulangkan ANGKA, bukan string. Bawaan `pg` memulangkan
 *      bigint sebagai string, dan `hasil.n > 0` pada string selalu salah.
 *   3. Kolom waktu memulangkan teks "YYYY-MM-DD HH:MM:SS", bukan objek Date.
 *   4. Transaksi benar-benar membatalkan — termasuk tulisan yang terjadi di
 *      dalam fungsi yang dipanggil dari dalam `tx()`, yang hanya mungkin bila
 *      klien transaksinya terbawa lewat AsyncLocalStorage.
 *   5. `sisip()` memulangkan id baru, dan null bila barisnya tidak jadi masuk.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const AKAR = path.resolve(import.meta.dirname, "..");

// .env dibaca sendiri: skrip ini berjalan di luar Next, yang biasanya
// memuatkannya.
for (const baris of fs.readFileSync(path.join(AKAR, ".env"), "utf8").split("\n")) {
  const cocok = /^\s*([A-Z_0-9]+)\s*=\s*(.*)\s*$/.exec(baris);
  if (cocok && !process.env[cocok[1]]) process.env[cocok[1]] = cocok[2].trim();
}

const TMP = path.join(AKAR, ".tmp", "cek", "db");
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
for (const berkas of ["db.ts"]) {
  const sumber = fs.readFileSync(path.join(AKAR, "src", "lib", "core", berkas), "utf8");
  fs.writeFileSync(path.join(TMP, berkas), sumber.replace(/^import "server-only";\s*$/m, ""));
}

const D = await import(pathToFileURL(path.join(TMP, "db.ts")).href);

let gagal = 0;
function periksa(nama, syarat, tambahan = "") {
  if (syarat) console.log(`  OK   ${nama}`);
  else {
    gagal++;
    console.log(`  GAGAL ${nama}${tambahan ? ` — ${tambahan}` : ""}`);
  }
}

/* ---------------- 1. Penanda parameter ---------------- */

console.log("\n1) Penanda ? diterjemahkan ke $n");
{
  periksa("satu penanda", D.keParamPg("SELECT * FROM t WHERE a = ?") === "SELECT * FROM t WHERE a = $1");
  periksa(
    "tiga penanda berurutan",
    D.keParamPg("INSERT INTO t (a,b,c) VALUES (?,?,?)") === "INSERT INTO t (a,b,c) VALUES ($1,$2,$3)",
  );
  periksa(
    "tanda tanya di dalam string dibiarkan",
    D.keParamPg("SELECT * FROM t WHERE nama LIKE '%?%' AND a = ?") ===
      "SELECT * FROM t WHERE nama LIKE '%?%' AND a = $1",
    D.keParamPg("SELECT * FROM t WHERE nama LIKE '%?%' AND a = ?"),
  );
  periksa(
    "kutip ganda di dalam string tidak mengacaukan hitungan",
    D.keParamPg("SELECT 'it''s ?' , ? FROM t") === "SELECT 'it''s ?' , $1 FROM t",
    D.keParamPg("SELECT 'it''s ?' , ? FROM t"),
  );
  periksa(
    "tanda tanya di dalam komentar dibiarkan",
    D.keParamPg("SELECT ? -- benarkah ?\n, ?") === "SELECT $1 -- benarkah ?\n, $2",
  );
  const nyata = await D.all("SELECT ?::int AS a, ?::text AS b", 7, "tujuh");
  periksa("dipakai sungguhan ke PostgreSQL", nyata[0].a === 7 && nyata[0].b === "tujuh");
}

/* ---------------- 2. Tipe angka ---------------- */

console.log("\n2) Angka dibaca sebagai angka");
{
  const r = await D.one("SELECT COUNT(*) AS n FROM users");
  periksa("COUNT(*) bertipe number, bukan string", typeof r.n === "number", `dapat ${typeof r.n}`);
  periksa("nilainya masuk akal", r.n > 0, `dapat ${r.n}`);

  const b = await D.one("SELECT 9007199254740993::bigint AS besar");
  periksa("bigint tetap terbaca angka", typeof b.besar === "number");

  const d = await D.one("SELECT 3.5::double precision AS pecahan");
  periksa("double precision bertipe number", typeof d.pecahan === "number" && d.pecahan === 3.5);
}

/* ---------------- 3. Waktu ---------------- */

console.log("\n3) Waktu dibaca sebagai teks siap tampil");
{
  const r = await D.one("SELECT created_at FROM users WHERE created_at IS NOT NULL LIMIT 1");
  periksa("bertipe string, bukan Date", typeof r.created_at === "string", `dapat ${typeof r.created_at}`);
  periksa(
    "berbentuk YYYY-MM-DD HH:MM:SS",
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(r.created_at),
    r.created_at,
  );

  const n = await D.one("SELECT now() AS sekarang");
  const jamSetempat = new Date().toLocaleString("sv-SE", { timeZone: D.ZONA }).slice(0, 13);
  periksa("now() memakai zona sekolah", n.sekarang.slice(0, 13) === jamSetempat, `${n.sekarang} vs ${jamSetempat}`);

  periksa("NULL tetap null", (await D.one("SELECT NULL::timestamptz AS k")).k === null);
}

/* ---------------- 4. Transaksi ---------------- */

console.log("\n4) Transaksi benar-benar membatalkan");
{
  const EMAIL = "cek.db.pg@contoh.test";
  await D.run("DELETE FROM users WHERE email = ?", EMAIL);

  // Fungsi terpisah, dipanggil DARI DALAM tx(): inilah yang membuktikan klien
  // transaksinya terbawa lewat AsyncLocalStorage, bukan diambil dari pool.
  const sisipDalam = () =>
    D.run("INSERT INTO users (nama, email, password_hash, role) VALUES (?,?,?,?)", "Cek DB", EMAIL, "x", "siswa");

  let dilempar = null;
  try {
    await D.tx(async () => {
      await sisipDalam();
      const adaDiDalam = await D.one("SELECT id FROM users WHERE email = ?", EMAIL);
      periksa("baris terlihat DI DALAM transaksi", !!adaDiDalam);
      throw new Error("sengaja dibatalkan");
    });
  } catch (e) {
    dilempar = e.message;
  }
  periksa("galat diteruskan ke pemanggil", dilempar === "sengaja dibatalkan", String(dilempar));

  const sesudah = await D.one("SELECT id FROM users WHERE email = ?", EMAIL);
  periksa("baris HILANG sesudah dibatalkan", sesudah === undefined, sesudah ? "masih ada" : "");

  // Transaksi yang berhasil harus benar-benar menulis.
  await D.tx(async () => {
    await sisipDalam();
  });
  const tersimpan = await D.one("SELECT id FROM users WHERE email = ?", EMAIL);
  periksa("transaksi yang selesai benar-benar menulis", !!tersimpan);

  // Transaksi bersarang menumpang yang di luar, tidak menutupnya lebih awal.
  await D.run("DELETE FROM users WHERE email = ?", EMAIL);
  let bersarangBatal = false;
  try {
    await D.tx(async () => {
      await sisipDalam();
      await D.tx(async () => {
        await D.run("UPDATE users SET nama = ? WHERE email = ?", "Diubah", EMAIL);
      });
      throw new Error("batal");
    });
  } catch {
    bersarangBatal = true;
  }
  periksa("transaksi bersarang ikut dibatalkan", bersarangBatal && !(await D.one("SELECT id FROM users WHERE email = ?", EMAIL)));

  await D.run("DELETE FROM users WHERE email = ?", EMAIL);
}

/* ---------------- 5. sisip() ---------------- */

console.log("\n5) sisip() memulangkan id baru");
{
  const EMAIL = "cek.sisip.pg@contoh.test";
  await D.run("DELETE FROM users WHERE email = ?", EMAIL);

  const id = await D.sisip(
    "INSERT INTO users (nama, email, password_hash, role) VALUES (?,?,?,?)",
    "Cek Sisip",
    EMAIL,
    "x",
    "siswa",
  );
  periksa("id bertipe number", typeof id === "number", `dapat ${typeof id}`);

  const cek = await D.one("SELECT nama FROM users WHERE id = ?", id);
  periksa("id menunjuk baris yang benar", cek?.nama === "Cek Sisip");

  const lagi = await D.sisip(
    "INSERT INTO users (nama, email, password_hash, role) VALUES (?,?,?,?) ON CONFLICT (email) DO NOTHING",
    "Kembar",
    EMAIL,
    "x",
    "siswa",
  );
  periksa("baris yang tidak jadi masuk memulangkan null", lagi === null, `dapat ${lagi}`);

  const punyaReturning = await D.sisip(
    "INSERT INTO users (nama, email, password_hash, role) VALUES (?,?,?,?) RETURNING id",
    "Cek Returning",
    "cek.returning.pg@contoh.test",
    "x",
    "siswa",
  );
  periksa("RETURNING yang sudah ditulis sendiri tidak digandakan", typeof punyaReturning === "number");

  await D.run("DELETE FROM users WHERE email IN (?, ?)", EMAIL, "cek.returning.pg@contoh.test");
  periksa("baris uji dibersihkan", (await D.one("SELECT id FROM users WHERE email = ?", EMAIL)) === undefined);
}

/* ---------------- 6. Kesehatan ---------------- */

console.log("\n6) Laporan kesehatan");
{
  const s = await D.sehat();
  periksa("basis data menjawab", s.siap === true, s.pesan);
  periksa("waktu jawab tercatat", typeof s.ms === "number" && s.ms >= 0, `${s.ms} ms`);
  console.log(`       ${s.pesan} dalam ${s.ms} ms, ${s.koneksiMenganggur} koneksi menganggur`);
}

await D.pool.end();

console.log(gagal === 0 ? "\nSEMUA LULUS.\n" : `\n${gagal} PENGUJIAN GAGAL.\n`);
process.exit(gagal === 0 ? 0 : 1);
