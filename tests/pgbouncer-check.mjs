/**
 * Membuktikan aplikasi ini AMAN di balik `pool_mode = transaction`.
 *
 *     npm run cek:pgbouncer
 *
 * Mode transaksi mengembalikan koneksi PostgreSQL ke kumpulan begitu tiap
 * TRANSAKSI selesai. Itulah yang membuat beberapa puluh koneksi sanggup
 * melayani ribuan peserta — dan harganya: TIDAK ADA KEADAAN YANG BOLEH
 * MENUMPANG DI ANTARA DUA TRANSAKSI.
 *
 * Yang berbahaya tidak kelihatan saat diuji sendirian. Sebuah prepared
 * statement BERNAMA dibuat di koneksi A, lalu dipakai lagi ketika PgBouncer
 * kebetulan memberi koneksi B — dan B tidak pernah mendengar namanya.
 * Galatnya ("prepared statement S_1 does not exist") baru muncul saat banyak
 * orang memakainya bersamaan, yaitu saat ujian berlangsung.
 *
 * BERKAS INI TIDAK MEMBACA KODE. Ia MENJALANKAN jalur panas sungguhan sambil
 * membungkus `pg.Client.prototype.query`, lalu memeriksa apa yang benar-benar
 * dikirim ke PostgreSQL:
 *
 *   1. tidak ada query yang memakai NAMA prepared statement;
 *   2. tidak ada `SET` / `LISTEN` / `DECLARE CURSOR` di luar transaksi;
 *   3. tidak ada parameter pembuka `options` saat PGBOUNCER=1 — inilah yang
 *      membuat PgBouncer MENOLAK sambungannya sama sekali.
 *
 * Seluruh tulisannya dibatalkan (satu transaksi yang sengaja dilempar di
 * ujungnya), jadi aman dijalankan kapan saja.
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

import "../scripts/muat-ts.mjs";

const AKAR = path.resolve(import.meta.dirname, "..");

// .env dimuat sendiri — berkas uji tidak berjalan di dalam Next.js.
for (const baris of fs.readFileSync(path.join(AKAR, ".env"), "utf8").split("\n")) {
  const m = baris.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

// Diperiksa dalam mode yang SAMA dengan produksi.
process.env.PGBOUNCER = "1";

/* ------------------------------------------------------------------ */
/* Penyadap                                                             */
/* ------------------------------------------------------------------ */

const terkirim = [];
const queryAsli = pg.Client.prototype.query;
pg.Client.prototype.query = function (config, values, cb) {
  // `name` hanya terisi kalau pemanggilnya meminta prepared statement BERNAMA.
  const nama = typeof config === "object" && config !== null ? config.name : undefined;
  const teks = typeof config === "string" ? config : config?.text;
  terkirim.push({ nama, teks: String(teks ?? "") });
  return queryAsli.call(this, config, values, cb);
};

const D = await import("@/lib/core/db");
const E = await import("@/lib/tryout/exam");
const P = await import("@/lib/penjagaan/pelanggaran");

let gagal = 0;
function periksa(nama, syarat, tambahan = "") {
  if (syarat) console.log(`  OK   ${nama}`);
  else {
    gagal++;
    console.log(`  GAGAL ${nama}${tambahan ? ` — ${tambahan}` : ""}`);
  }
}

/* ------------------------------------------------------------------ */
/* 1. Parameter pembuka sambungan                                       */
/* ------------------------------------------------------------------ */

console.log("\n1) Parameter pembuka sambungan");

periksa(
  "LEWAT_PGBOUNCER menyala saat PGBOUNCER=1",
  D.LEWAT_PGBOUNCER === true,
);

// `options` adalah parameter pembuka yang DITOLAK PgBouncer dengan
// "unsupported startup parameter: options" — sambungannya gagal, bukan zonanya
// yang salah. Ia harus tidak ada sama sekali di setelan pool.
const opsiPool = D.pool.options ?? {};
periksa(
  "pool TIDAK mengirim parameter `options`",
  opsiPool.options === undefined,
  `options = ${JSON.stringify(opsiPool.options)}`,
);

/* ------------------------------------------------------------------ */
/* 2. Jalur panas dijalankan sungguhan                                  */
/* ------------------------------------------------------------------ */

console.log("\n2) Menjalankan jalur panas");

const BATAL = Symbol("batal");
let dijalankan = 0;

try {
  await D.tx(async () => {
    const userId = await D.sisipWajib(
      `INSERT INTO users (nama, email, password_hash, role, nisn)
       VALUES ('Uji PgBouncer', ?, 'x', 'siswa', ?)`,
      `pgb-${Date.now()}@uji.invalid`,
      `77${Date.now() % 100000}`,
    );
    const paketId = await D.sisipWajib(
      `INSERT INTO packages (kode, nama, status, jalur)
       VALUES (?, 'Uji PgBouncer', 'published', 'utbk')`,
      `PGB-${Date.now()}`,
    );
    const soalId = await D.sisipWajib(
      `INSERT INTO questions (package_id, subtes, nomor, pertanyaan, kunci)
       VALUES (?, 'PU', 1, 'Uji', 'A')`,
      paketId,
    );

    // Gerbang peserta, buka sesi, buka timer, autosave, denyut — seluruh
    // jalur yang benar-benar dipakai peserta.
    await E.pesertaDiizinkan(userId, paketId);
    const att = await E.mulaiAttempt(userId, paketId);
    await E.mulaiSubtes(att.id, "PU");
    await E.simpanJawabanBanyak(att, [{ questionId: soalId, jawaban: "A", ragu: false }]);
    await P.catatDenyut(att.id, true);
    await E.keadaanUjian(att, userId);
    dijalankan = terkirim.length;

    throw BATAL;
  });
} catch (e) {
  if (e !== BATAL) throw e;
}

periksa("jalur panas benar-benar berjalan", dijalankan > 10, `${dijalankan} query`);

/* ------------------------------------------------------------------ */
/* 3. Apa yang benar-benar dikirim                                      */
/* ------------------------------------------------------------------ */

console.log("\n3) Isi yang dikirim ke PostgreSQL");

const bernama = terkirim.filter((q) => typeof q.nama === "string" && q.nama.length > 0);
periksa(
  "NOL prepared statement bernama",
  bernama.length === 0,
  bernama.length ? `${bernama.length} bernama, mis. "${bernama[0].nama}"` : "",
);

// `SET` di luar transaksi adalah keadaan yang menumpang antar-transaksi.
// `SET LOCAL` di DALAM transaksi sebenarnya aman, tetapi aplikasi ini tidak
// memakainya sama sekali — jadi yang diperiksa cukup ketiadaannya.
const cocok = (re) => terkirim.filter((q) => re.test(q.teks));
const set = cocok(/^\s*SET\s+(?!LOCAL\b)/i);
periksa("tidak ada pernyataan SET", set.length === 0, set[0]?.teks?.slice(0, 60));

const listen = cocok(/^\s*(LISTEN|UNLISTEN|NOTIFY)\b/i);
periksa("tidak ada LISTEN/NOTIFY", listen.length === 0, listen[0]?.teks?.slice(0, 60));

const kursor = cocok(/\bDECLARE\b[\s\S]*\bCURSOR\b/i);
periksa("tidak ada kursor", kursor.length === 0, kursor[0]?.teks?.slice(0, 60));

const kunci = cocok(/pg_advisory_lock|pg_advisory_unlock/i);
periksa("tidak ada kunci penasihat lintas transaksi", kunci.length === 0);

const temp = cocok(/CREATE\s+(TEMP|TEMPORARY)\b/i);
periksa("tidak ada tabel sementara", temp.length === 0);

/* ------------------------------------------------------------------ */
/* 4. Bersih                                                            */
/* ------------------------------------------------------------------ */

console.log("\n4) Tidak ada sisa data uji");
const sisa = await D.one(
  "SELECT COUNT(*) AS n FROM users WHERE email LIKE 'pgb-%@uji.invalid'",
);
periksa("seluruh tulisan uji dibatalkan", Number(sisa?.n ?? 0) === 0);

pg.Client.prototype.query = queryAsli;
await D.pool.end();

console.log(
  gagal === 0
    ? `\nSEMUA LULUS — ${terkirim.length} query diperiksa, aman untuk pool_mode = transaction.`
    : `\n${gagal} GAGAL.`,
);
process.exit(gagal === 0 ? 0 : 1);
