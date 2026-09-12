/**
 * Menerapkan migrasi `db/` ke basis data yang SUDAH ADA isinya.
 *
 *     npm run migrasi          # lihat dulu apa yang akan dikerjakan
 *     npm run migrasi -- --tulis
 *
 * KENAPA INI PERLU ADA, dan kenapa ia tidak bisa digantikan docker-compose.
 *
 * `docker-entrypoint-initdb.d` menjalankan berkas `db/*.sql` **sekali saja,
 * saat folder data PostgreSQL masih KOSONG**. Itu disengaja oleh Postgres dan
 * menyelamatkan kita dari menimpa data sungguhan — tetapi akibatnya: pada
 * basis data yang sudah berisi, migrasi baru TIDAK PERNAH dijalankan, tanpa
 * satu pun peringatan.
 *
 * Untuk rilis 12 September 2026 itu bukan urusan kecil. `db/05` menambahkan
 * kolom `users.lingkup`, dan `getSession()` membacanya di SETIAP permintaan
 * terautentikasi. Tanpa migrasi itu, PostgreSQL menjawab
 * "column lingkup does not exist" — dan yang gagal bukan satu halaman,
 * melainkan SELURUH login.
 *
 * YANG DIJALANKAN HANYA 02-05. Berkas `01` memuat 30 `CREATE TABLE` tanpa
 * `IF NOT EXISTS`: ia untuk basis data BARU, dan menjalankannya pada basis
 * data berisi hanya menghasilkan galat "relation already exists". 02-05
 * seluruhnya memakai `IF NOT EXISTS` atau `CREATE OR REPLACE`, jadi aman
 * dijalankan berulang kali.
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const AKAR = path.resolve(import.meta.dirname, "..");

for (const baris of fs.readFileSync(path.join(AKAR, ".env"), "utf8").split("\n")) {
  const m = baris.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const TULIS = process.argv.includes("--tulis");
const ALAMAT = process.env.DATABASE_URL;
if (!ALAMAT) {
  console.error("DATABASE_URL belum diisi.");
  process.exit(1);
}

/**
 * Migrasi HARUS lewat PostgreSQL langsung, bukan PgBouncer.
 *
 * `db/04` memakai `CREATE INDEX CONCURRENTLY`, yang TIDAK BOLEH berada di
 * dalam blok transaksi. Di `pool_mode = transaction`, PgBouncer membungkus
 * pernyataan lepas ke dalam transaksinya sendiri — dan PostgreSQL menolaknya
 * dengan "CREATE INDEX CONCURRENTLY cannot run inside a transaction block".
 */
if (/:6432\b/.test(ALAMAT)) {
  console.error(
    "DATABASE_URL menunjuk port 6432 (PgBouncer).\n" +
      "Migrasi harus lewat PostgreSQL LANGSUNG (5432) — `CREATE INDEX CONCURRENTLY`\n" +
      "di db/04 tidak boleh berjalan di dalam transaksi, dan mode transaksi\n" +
      "PgBouncer selalu membungkusnya.\n\n" +
      "Jalankan sekali dengan alamat langsung:\n" +
      '  DATABASE_URL="postgres://...@127.0.0.1:5432/adzkia" npm run migrasi -- --tulis',
  );
  process.exit(1);
}

/** Berkas yang aman diulang, berikut alasannya. */
const BERKAS = [
  ["02-penjagaan-ielts.sql", "CREATE TABLE IF NOT EXISTS + ALTER ... IF NOT EXISTS"],
  ["03-fungsi-sqlite.sql", "CREATE OR REPLACE FUNCTION"],
  ["04-indeks-konkurensi.sql", "CREATE INDEX CONCURRENTLY IF NOT EXISTS"],
  ["05-samakan-produksi.sql", "ALTER TABLE ... ADD COLUMN IF NOT EXISTS"],
];

const klien = new pg.Client({ connectionString: ALAMAT });
await klien.connect();

// Apa yang SUDAH ada — supaya laporannya menyebut keadaan, bukan cuma niat.
const { rows: kolom } = await klien.query(`
  SELECT table_name, column_name FROM information_schema.columns
   WHERE (table_name = 'users'       AND column_name = 'lingkup')
      OR (table_name = 'ielts_paket' AND column_name = 'tampil_pembahasan')
`);
const { rows: indeks } = await klien.query(
  "SELECT indexname FROM pg_indexes WHERE indexname LIKE 'idx_att_%' OR indexname LIKE 'idx_ans_soal'",
);

console.log(`\nBasis data: ${ALAMAT.replace(/:[^:@/]+@/, ":***@")}`);
console.log("\nKeadaan sekarang:");
console.log(`  users.lingkup              : ${kolom.some((r) => r.column_name === "lingkup") ? "ADA" : "BELUM"}`);
console.log(`  ielts_paket.tampil_pembahasan: ${kolom.some((r) => r.column_name === "tampil_pembahasan") ? "ADA" : "BELUM"}`);
console.log(`  indeks konkurensi          : ${indeks.length} terpasang`);

console.log(`\n${TULIS ? "MENERAPKAN" : "AKAN diterapkan"} (aman diulang):`);
for (const [nama, alasan] of BERKAS) console.log(`  ${nama.padEnd(30)} ${alasan}`);
console.log(`\n  01-adzkia-postgres.sql         DILEWATI — hanya untuk basis data baru`);

if (!TULIS) {
  console.log("\nJalankan lagi dengan --tulis untuk benar-benar menerapkannya.");
  await klien.end();
  process.exit(0);
}

/**
 * Memecah satu berkas SQL menjadi pernyataan-pernyataan tersendiri.
 *
 * INI BUKAN KERAPIAN — ia menentukan berhasil-tidaknya `db/04`. `node-postgres`
 * mengirim untaian yang memuat banyak pernyataan sebagai SATU "simple query",
 * dan PostgreSQL membungkus simple query berisi banyak pernyataan ke dalam
 * TRANSAKSI IMPLISIT. `CREATE INDEX CONCURRENTLY` menolak berada di dalam
 * transaksi mana pun, jadi seluruh berkas 04 gagal dengan
 * "CREATE INDEX CONCURRENTLY cannot run inside a transaction block" — walau
 * skripnya sendiri tidak pernah menulis BEGIN.
 *
 * Pemecahnya sadar akan KUTIPAN DOLAR (`$$ ... $$`). Tanpa itu, badan fungsi
 * di `db/03` — yang memuat titik koma — akan terpotong di tengah.
 */
function pecahSql(sql) {
  const hasil = [];
  let mulai = 0;
  let i = 0;
  let penanda = null; // penanda kutipan dolar yang sedang dibuka

  while (i < sql.length) {
    if (penanda) {
      if (sql.startsWith(penanda, i)) {
        i += penanda.length;
        penanda = null;
        continue;
      }
      i++;
      continue;
    }

    const c = sql[i];

    // Kutipan dolar: $$ atau $nama$
    if (c === "$") {
      const m = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(sql.slice(i));
      if (m) {
        penanda = m[0];
        i += m[0].length;
        continue;
      }
    }
    // Untaian berkutip tunggal; '' di dalamnya bukan penutup.
    if (c === "'") {
      i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") { i += 2; continue; }
        if (sql[i] === "'") { i++; break; }
        i++;
      }
      continue;
    }
    // Komentar satu baris & blok.
    if (c === "-" && sql[i + 1] === "-") {
      const n = sql.indexOf("\n", i);
      i = n === -1 ? sql.length : n;
      continue;
    }
    if (c === "/" && sql[i + 1] === "*") {
      const n = sql.indexOf("*/", i + 2);
      i = n === -1 ? sql.length : n + 2;
      continue;
    }

    if (c === ";") {
      const potong = sql.slice(mulai, i).trim();
      if (potong) hasil.push(potong);
      mulai = i + 1;
    }
    i++;
  }

  const sisa = sql.slice(mulai).trim();
  if (sisa) hasil.push(sisa);
  // Buang potongan yang isinya cuma komentar.
  return hasil.filter((s) => s.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "").trim());
}

for (const [nama] of BERKAS) {
  const isi = fs.readFileSync(path.join(AKAR, "db", nama), "utf8");
  const pernyataan = pecahSql(isi);
  process.stdout.write(`\n  ${nama} (${pernyataan.length} pernyataan) ... `);
  try {
    // SATU per satu, dan TANPA pembungkus transaksi.
    for (const p of pernyataan) await klien.query(p);
    console.log("selesai");
  } catch (e) {
    console.log("GAGAL");
    console.error(`     ${e.message}`);
    await klien.end();
    process.exit(1);
  }
}

// Zona waktu sisi server — WAJIB bila aplikasi berjalan di belakang PgBouncer.
const { rows: db } = await klien.query("SELECT current_database() AS nama");
const namaDb = db[0].nama;
const { rows: zona } = await klien.query(
  `SELECT setconfig FROM pg_db_role_setting s
     JOIN pg_database d ON d.oid = s.setdatabase
    WHERE d.datname = $1`,
  [namaDb],
);
// PERBANDINGANNYA TIDAK PEKA HURUF BESAR-KECIL. `ALTER DATABASE ... SET
// timezone` ditulis huruf kecil, tetapi PostgreSQL menyimpannya sebagai
// `TimeZone=` — nama setelan resminya. Perbandingan yang peka huruf akan
// selalu menjawab "belum disetel" dan melaporkan pekerjaan yang sebenarnya
// tidak dikerjakan.
const adaZona = (zona[0]?.setconfig ?? []).some((c) =>
  String(c).toLowerCase().startsWith("timezone="),
);
if (!adaZona) {
  const tz = process.env.ADZKIA_TZ || "Asia/Jakarta";
  process.stdout.write(`\n  zona waktu basis data ... `);
  await klien.query(`ALTER DATABASE ${JSON.stringify(namaDb).replace(/"/g, '"')} SET timezone = $1`.replace("$1", `'${tz}'`));
  console.log(`disetel ke ${tz}`);
} else {
  console.log(`\n  zona waktu basis data ... sudah disetel`);
}

await klien.end();
console.log("\nSelesai. Jalankan `npm run cek:pgbouncer` untuk memastikan.");
