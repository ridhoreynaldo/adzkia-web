/**
 * Mengekspor basis data SQLite ADZKIA SMART menjadi satu berkas .sql yang siap
 * dijalankan di PostgreSQL.
 *
 * Keluarannya bukan salinan mentah, melainkan TERJEMAHAN. Empat hal berubah
 * bentuk, dan tiga di antaranya menentukan benar-salahnya data sesudah pindah:
 *
 *   1. `INTEGER PRIMARY KEY AUTOINCREMENT` menjadi kolom IDENTITY, lalu
 *      urutannya (`sequence`) disetel ulang ke nilai tertinggi yang terpakai —
 *      tanpa langkah terakhir itu, INSERT pertama sesudah pindah langsung
 *      bentrok kunci primer.
 *
 *   2. Waktu berubah dari TEKS menjadi `timestamptz`. Inilah yang membuat
 *      indeks pada kolom waktu berguna: perbandingan teks memaksa Postgres
 *      memindai seluruh tabel, perbandingan timestamptz tidak.
 *
 *   3. ZONA WAKTUNYA TIDAK SERAGAM di basis data asal, dan itu harus
 *      diperlakukan apa adanya. Cap waktu sistem (`created_at`, `mulai_at`
 *      pengerjaan, dan seterusnya) ditulis `datetime('now')` — UTC. Tetapi
 *      JENDELA PAKET (`packages.mulai_at`, `ielts_paket.selesai_at`, …) diketik
 *      pengelola sebagai waktu setempat dan dibandingkan dengan
 *      `datetime('now','localtime')`. Menganggap keduanya UTC akan menggeser
 *      seluruh jadwal ujian tujuh jam. Daftar kolom waktu setempat ada di
 *      `KOLOM_WAKTU_SETEMPAT` di bawah.
 *
 *   4. Tabel diurutkan menurut ketergantungan kunci asing, sehingga berkasnya
 *      bisa dijalankan sekali jalan tanpa mematikan pemeriksaan constraint.
 *
 * Yang SENGAJA tidak diubah: kolom bendera 0/1 tetap `integer` (bukan
 * `boolean`) dan kolom JSON tetap `text` (bukan `jsonb`). Keduanya menuntut
 * perubahan di kode aplikasi, dan berkas ini harus bisa dimuat lebih dulu,
 * sebelum satu baris kode pun disentuh.
 *
 * Jalankan:  npm run ekspor:pg
 *            npm run ekspor:pg -- --keluaran ../adzkia-smart-pg/db/data.sql
 *            npm run ekspor:pg -- --skema-saja      (tanpa data)
 */
import "./muat-ts.mjs";

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const AKAR = process.cwd();
const { all } = await import(pathToFileURL(path.join(AKAR, "src", "lib", "db.ts")).href);

/* ---------------- Pilihan baris perintah ---------------- */

const arg = (nama, bawaan) => {
  const i = process.argv.indexOf(`--${nama}`);
  return i === -1 ? bawaan : (process.argv[i + 1] ?? bawaan);
};
const KELUARAN = path.resolve(AKAR, arg("keluaran", "keluaran/postgres/adzkia-postgres.sql"));
const SKEMA_SAJA = process.argv.includes("--skema-saja");

/* ==========================================================================
   ZONA WAKTU
   ========================================================================== */

/**
 * Kolom waktu yang isinya WAKTU SETEMPAT, bukan UTC.
 *
 * Seluruhnya jendela jadwal yang diketik pengelola lewat kotak
 * `datetime-local` di panel admin, lalu dibandingkan aplikasi dengan
 * `datetime('now','localtime')`. Kolom waktu lain adalah cap yang ditulis
 * server dengan `datetime('now')`, yaitu UTC.
 */
const KOLOM_WAKTU_SETEMPAT = new Set([
  "packages.mulai_at",
  "packages.selesai_at",
  "ielts_paket.mulai_at",
  "ielts_paket.selesai_at",
  "warung_paket.mulai_at",
  "warung_paket.selesai_at",
]);

/** Zona yang dipakai sekolah. Dipakai menafsirkan kolom di daftar atas. */
const ZONA_SETEMPAT = "Asia/Jakarta";

/** Kolom bernama begini menyimpan waktu, apa pun tipe SQLite-nya. */
const POLA_WAKTU = /(^|_)(at|date|tanggal)$/i;

function kolomWaktu(tabel, kolom, tipe) {
  if (tipe.toUpperCase() !== "TEXT") return false;
  return POLA_WAKTU.test(kolom) || KOLOM_WAKTU_SETEMPAT.has(`${tabel}.${kolom}`);
}

/* ==========================================================================
   MEMBACA SKEMA SQLITE
   ========================================================================== */

const tabelSemua = all(
  `SELECT name, sql FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name`,
);

const indeksSemua = all(
  `SELECT name, tbl_name, sql FROM sqlite_master
    WHERE type = 'index' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
    ORDER BY name`,
);

/** Keterangan tiap kolom, lengkap dengan tipe tujuannya di PostgreSQL. */
function bacaKolom(tabel) {
  const ddl = tabelSemua.find((t) => t.name === tabel)?.sql ?? "";
  return all(`PRAGMA table_info("${tabel}")`).map((k) => {
    const autoIncrement = new RegExp(
      `\\b${k.name}\\b[^,]*INTEGER\\s+PRIMARY\\s+KEY\\s+AUTOINCREMENT`,
      "i",
    ).test(ddl);
    return {
      nama: k.name,
      tipeAsal: k.type,
      wajib: k.notnull === 1,
      bawaan: k.dflt_value,
      kunciPrimer: k.pk > 0,
      urutanKunci: k.pk,
      autoIncrement,
      waktu: kolomWaktu(tabel, k.name, k.type),
      setempat: KOLOM_WAKTU_SETEMPAT.has(`${tabel}.${k.name}`),
    };
  });
}

/** Kunci asing tabel ini: [{ kolom, tabelTujuan, kolomTujuan, saatHapus }]. */
function bacaKunciAsing(tabel) {
  return all(`PRAGMA foreign_key_list("${tabel}")`).map((f) => ({
    kolom: f.from,
    tabelTujuan: f.table,
    kolomTujuan: f.to ?? "id",
    saatHapus: (f.on_delete ?? "NO ACTION").toUpperCase(),
  }));
}

/** Kelompok kolom yang harus unik bersama, dari indeks unik bawaan SQLite. */
function bacaUnik(tabel) {
  const hasil = [];
  for (const idx of all(`PRAGMA index_list("${tabel}")`)) {
    if (idx.unique !== 1) continue;
    // Indeks unik yang dibuat sendiri (bukan turunan UNIQUE pada DDL) sudah
    // ikut terbawa lewat daftar CREATE INDEX; yang di sini hanya yang lahir
    // dari klausa UNIQUE, dan namanya selalu berawalan "sqlite_autoindex".
    if (!idx.name.startsWith("sqlite_autoindex")) continue;
    const kolom = all(`PRAGMA index_info("${idx.name}")`)
      .sort((a, b) => a.seqno - b.seqno)
      .map((k) => k.name);
    if (kolom.length) hasil.push(kolom);
  }
  return hasil;
}

/* ==========================================================================
   URUTAN TABEL — topologis menurut kunci asing
   ========================================================================== */

function urutkanTabel(nama) {
  const sisa = new Set(nama);
  const hasil = [];
  const tergantung = new Map(
    nama.map((t) => [t, new Set(bacaKunciAsing(t).map((f) => f.tabelTujuan).filter((x) => x !== t))]),
  );

  while (sisa.size > 0) {
    const siap = [...sisa].filter((t) => [...tergantung.get(t)].every((d) => !sisa.has(d)));
    if (siap.length === 0) {
      // Lingkaran ketergantungan: sisanya dikeluarkan apa adanya. Tidak terjadi
      // pada skema ini, tetapi lebih baik memuat berkas yang urutannya kurang
      // rapi daripada berputar selamanya.
      hasil.push(...sisa);
      break;
    }
    siap.sort();
    for (const t of siap) {
      hasil.push(t);
      sisa.delete(t);
    }
  }
  return hasil;
}

/* ==========================================================================
   TIPE & NILAI
   ========================================================================== */

function tipePg(k) {
  if (k.autoIncrement) return "integer GENERATED BY DEFAULT AS IDENTITY";
  if (k.waktu) return "timestamptz";
  switch (k.tipeAsal.toUpperCase()) {
    case "INTEGER":
      return "integer";
    case "REAL":
      return "double precision";
    default:
      return "text";
  }
}

/**
 * Menerjemahkan nilai bawaan SQLite ke padanan PostgreSQL.
 *
 * `datetime('now')` menjadi `now()`; keduanya menghasilkan saat sekarang, dan
 * pada kolom `timestamptz` Postgres menyimpannya berikut zonanya — justru
 * memperbaiki kerancuan yang ada sekarang.
 */
function bawaanPg(k) {
  if (k.bawaan == null) return null;
  const v = String(k.bawaan).trim();
  if (/^\(?\s*datetime\s*\(\s*'now'[^)]*\)\s*\)?$/i.test(v)) return "now()";
  return v;
}

function kutip(teks) {
  return `'${String(teks).replace(/'/g, "''")}'`;
}

/**
 * Satu nilai baris menjadi literal SQL.
 *
 * Waktu ditulis lengkap dengan zonanya supaya Postgres tidak menebak: cap
 * sistem sebagai UTC, jendela jadwal sebagai waktu setempat sekolah.
 */
function nilaiSql(nilai, k) {
  if (nilai === null || nilai === undefined) return "NULL";

  if (k.waktu) {
    const teks = String(nilai).trim();
    if (!teks) return "NULL";
    const zona = k.setempat ? ZONA_SETEMPAT : "UTC";
    return `(${kutip(teks)}::timestamp AT TIME ZONE ${kutip(zona)})`;
  }

  if (typeof nilai === "number" || typeof nilai === "bigint") return String(nilai);
  if (nilai instanceof Uint8Array) return `'\\x${Buffer.from(nilai).toString("hex")}'::bytea`;
  return kutip(nilai);
}

/* ==========================================================================
   MENYUSUN BERKAS
   ========================================================================== */

const urutan = urutkanTabel(tabelSemua.map((t) => t.name));
const keluar = [];
const catat = (...b) => keluar.push(...b);

const sekarang = new Date().toISOString().replace("T", " ").slice(0, 19);

catat(
  "-- ============================================================",
  "-- ADZKIA SMART — basis data untuk PostgreSQL",
  `-- Dibuat ${sekarang} UTC oleh scripts/ekspor-postgres.mjs`,
  "--",
  "-- Berkas ini menerjemahkan basis data SQLite yang sedang berjalan.",
  "-- Jalankan sekali pada basis data KOSONG:",
  "--",
  "--     createdb adzkia",
  "--     psql -d adzkia -f adzkia-postgres.sql",
  "--",
  "-- Waktu disimpan sebagai timestamptz. Cap sistem ditafsirkan UTC; jendela",
  `-- jadwal paket ditafsirkan waktu setempat (${ZONA_SETEMPAT}), karena itulah`,
  "-- yang diketik pengelola di panel admin.",
  "-- ============================================================",
  "",
  "BEGIN;",
  "",
  "SET client_encoding = 'UTF8';",
  "SET standard_conforming_strings = on;",
  "",
);

/* ---------------- Tabel ---------------- */

catat("-- ------------------------------------------------------------", "-- TABEL", "-- ------------------------------------------------------------", "");

const kolomPerTabel = new Map();

for (const nama of urutan) {
  const kolom = bacaKolom(nama);
  kolomPerTabel.set(nama, kolom);

  const kunciPrimer = kolom.filter((k) => k.kunciPrimer).sort((a, b) => a.urutanKunci - b.urutanKunci);
  const asing = bacaKunciAsing(nama);
  const unik = bacaUnik(nama);

  const baris = [];

  for (const k of kolom) {
    const bagian = [`  ${k.nama}`, tipePg(k)];
    if (k.wajib && !k.kunciPrimer) bagian.push("NOT NULL");
    const bawaan = bawaanPg(k);
    if (bawaan !== null && !k.autoIncrement) bagian.push(`DEFAULT ${bawaan}`);
    baris.push(bagian.join(" "));
  }

  if (kunciPrimer.length === 1) {
    baris.push(`  PRIMARY KEY (${kunciPrimer[0].nama})`);
  } else if (kunciPrimer.length > 1) {
    baris.push(`  PRIMARY KEY (${kunciPrimer.map((k) => k.nama).join(", ")})`);
  }

  for (const u of unik) baris.push(`  UNIQUE (${u.join(", ")})`);

  for (const f of asing) {
    const saat = f.saatHapus === "NO ACTION" ? "" : ` ON DELETE ${f.saatHapus}`;
    baris.push(`  FOREIGN KEY (${f.kolom}) REFERENCES ${f.tabelTujuan} (${f.kolomTujuan})${saat}`);
  }

  catat(`CREATE TABLE ${nama} (`, baris.join(",\n"), ");", "");
}

/* ---------------- Data ---------------- */

if (!SKEMA_SAJA) {
  catat("-- ------------------------------------------------------------", "-- DATA", "-- ------------------------------------------------------------", "");

  for (const nama of urutan) {
    const kolom = kolomPerTabel.get(nama);
    const baris = all(`SELECT * FROM "${nama}"`);
    if (baris.length === 0) {
      catat(`-- ${nama}: kosong`, "");
      continue;
    }

    catat(`-- ${nama}: ${baris.length} baris`);
    const namaKolom = kolom.map((k) => k.nama).join(", ");

    // Dipotong per 200 baris: satu INSERT raksasa menyulitkan pembacaan galat
    // kalau ada satu nilai yang bermasalah, dan tidak lebih cepat.
    for (let i = 0; i < baris.length; i += 200) {
      const potongan = baris.slice(i, i + 200).map((r) => {
        const nilai = kolom.map((k) => nilaiSql(r[k.nama], k));
        return `  (${nilai.join(", ")})`;
      });
      catat(`INSERT INTO ${nama} (${namaKolom}) VALUES`, `${potongan.join(",\n")};`, "");
    }
  }
}

/* ---------------- Indeks ---------------- */

catat("-- ------------------------------------------------------------", "-- INDEKS", "-- ------------------------------------------------------------", "");

for (const idx of indeksSemua) {
  // DDL indeks SQLite dan PostgreSQL sudah sangat mirip, termasuk indeks
  // parsial ber-WHERE. Yang perlu ditambahkan hanya IF NOT EXISTS.
  const sql = idx.sql
    .replace(/^CREATE\s+(UNIQUE\s+)?INDEX\s+/i, (_, u) => `CREATE ${u ?? ""}INDEX IF NOT EXISTS `)
    .replace(/\s+/g, " ")
    .trim();
  catat(`${sql};`);
}
catat("");

/* ---------------- Sequence ---------------- */

const berIdentity = urutan.filter((t) => kolomPerTabel.get(t).some((k) => k.autoIncrement));
if (berIdentity.length > 0 && !SKEMA_SAJA) {
  catat(
    "-- ------------------------------------------------------------",
    "-- URUTAN KUNCI PRIMER",
    "--",
    "-- Wajib: baris di atas dimuat berikut id-nya, jadi penghitung IDENTITY",
    "-- masih menunjuk angka 1. Tanpa penyetelan ini, INSERT pertama sesudah",
    "-- pindah langsung bentrok kunci primer.",
    "-- ------------------------------------------------------------",
    "",
  );
  for (const t of berIdentity) {
    const k = kolomPerTabel.get(t).find((x) => x.autoIncrement).nama;
    catat(
      `SELECT setval(pg_get_serial_sequence('${t}', '${k}'), COALESCE((SELECT MAX(${k}) FROM ${t}), 1), true);`,
    );
  }
  catat("");
}

catat("COMMIT;", "");

/* ---------------- Tulis ---------------- */

fs.mkdirSync(path.dirname(KELUARAN), { recursive: true });
fs.writeFileSync(KELUARAN, keluar.join("\n"), "utf8");

const ukuran = fs.statSync(KELUARAN).size;
const jumlahBaris = urutan.reduce((n, t) => n + all(`SELECT COUNT(*) AS n FROM "${t}"`)[0].n, 0);

console.log(`Tertulis: ${KELUARAN}`);
console.log(
  `  ${urutan.length} tabel · ${indeksSemua.length} indeks · ` +
    `${SKEMA_SAJA ? "tanpa data" : `${jumlahBaris} baris`} · ${(ukuran / 1024).toFixed(0)} KB`,
);
console.log(`  urutan muat: ${urutan.slice(0, 6).join(", ")}, …`);

const waktu = [];
for (const [t, kolom] of kolomPerTabel) {
  for (const k of kolom) if (k.waktu) waktu.push(`${t}.${k.nama}${k.setempat ? " (setempat)" : ""}`);
}
console.log(`  ${waktu.length} kolom waktu jadi timestamptz, ${KOLOM_WAKTU_SETEMPAT.size} di antaranya waktu setempat`);
