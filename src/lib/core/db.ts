import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

/**
 * Sambungan PostgreSQL ADZKIA SMART.
 *
 * Menggantikan `node:sqlite` yang dipakai versi sebelumnya. Bentuk antarmukanya
 * SENGAJA dipertahankan — `all`, `one`, `run`, `tx` — supaya seluruh kode di
 * atasnya berubah seminimal mungkin. Satu-satunya perbedaan yang menjalar ke
 * mana-mana: keempatnya sekarang ASINKRON, karena tidak ada klien PostgreSQL
 * yang sinkron.
 *
 * Empat keputusan yang menentukan benar-salahnya seluruh lapisan ini:
 *
 *   1. TRANSAKSI MEMAKAI SATU KLIEN, dan klien itu diteruskan lewat
 *      AsyncLocalStorage. Tanpa itu, `run()` di dalam `tx()` akan mengambil
 *      koneksi lain dari pool — tulisannya jatuh di luar transaksi, dan
 *      pembatalan tidak membatalkan apa pun. Ini kesalahan paling mahal saat
 *      pindah dari basis data sinkron, karena kodenya tetap "berjalan".
 *
 *   2. PENANDA `?` DITERJEMAHKAN ke `$1, $2, …`. SQLite memakai `?`,
 *      PostgreSQL memakai `$n`. Menerjemahkannya di sini berarti ±360 query
 *      yang sudah ada tidak perlu disentuh satu pun.
 *
 *   3. BIGINT DIBACA SEBAGAI ANGKA. Bawaan `pg` memulangkan `bigint` sebagai
 *      STRING demi menjaga ketelitian — dan `COUNT(*)` bertipe bigint. Tanpa
 *      penyetelan ini, `hasil.n > 0` membandingkan string dengan angka dan
 *      seluruh pemeriksaan jumlah diam-diam salah.
 *
 *   4. WAKTU DIBACA SEBAGAI TEKS "YYYY-MM-DD HH:MM:SS" waktu setempat, bukan
 *      objek Date. Kode di atas menampilkan kolom waktu apa adanya di layar;
 *      objek Date akan tampil sebagai "Wed Sep 10 2026 07:15:00 GMT+0700".
 *      Perbandingan waktu tetap dikerjakan PostgreSQL lewat SQL, jadi bentuk
 *      teks ini murni urusan tampilan.
 */

/* ==========================================================================
   ZONA WAKTU
   ========================================================================== */

/**
 * Zona sekolah. Dipakai dua tempat yang harus sepakat: penerjemah tipe waktu
 * di bawah, dan `SET TIME ZONE` pada tiap koneksi baru.
 */
export const ZONA = process.env.ADZKIA_TZ || "Asia/Jakarta";

const FORMAT_WAKTU = new Intl.DateTimeFormat("sv-SE", {
  timeZone: ZONA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/**
 * `timestamptz` menjadi "2026-09-10 07:15:00" waktu setempat.
 *
 * Locale "sv-SE" dipilih bukan karena Swedia, melainkan karena ia satu-satunya
 * locale bawaan yang menulis tanggal persis ISO — "2026-09-10 07:15:00" —
 * sehingga tidak perlu menyusun ulang potongannya sendiri.
 */
function waktuKeTeks(nilai: string | null): string | null {
  if (nilai === null) return null;
  const t = new Date(nilai);
  if (Number.isNaN(t.getTime())) return nilai;
  return FORMAT_WAKTU.format(t).replace("T", " ");
}

/* ==========================================================================
   PENERJEMAH TIPE
   --------------------------------------------------------------------------
   Nomor OID-nya tetap dan sudah ditentukan PostgreSQL sejak lama; dituliskan
   di sini berikut namanya supaya tidak perlu dicari lagi kelak.
   ========================================================================== */

types.setTypeParser(20, (v) => (v === null ? null : Number(v))); // int8 / bigint
types.setTypeParser(1700, (v) => (v === null ? null : Number(v))); // numeric
types.setTypeParser(1114, waktuKeTeks); // timestamp tanpa zona
types.setTypeParser(1184, waktuKeTeks); // timestamptz

/* ==========================================================================
   POOL
   ========================================================================== */

const ALAMAT = process.env.DATABASE_URL;

// Jangan hentikan eksekusi jika proses yang berjalan adalah 'next build'
const sedangBuild = process.env.npm_lifecycle_event === 'build' || process.env.NEXT_PHASE === 'phase-production-build';

if (!ALAMAT && !sedangBuild) {
  throw new Error(
    "DATABASE_URL belum diisi. Salin .env.example menjadi .env, lalu isi alamat PostgreSQL-nya.",
  );
}

/**
 * Benar bila aplikasi berbicara ke PgBouncer, bukan langsung ke PostgreSQL.
 *
 * Ini mengubah SATU hal di bawah, dan hal itu menentukan aplikasinya jalan atau
 * tidak: parameter pembuka `options`. PgBouncer menolak parameter pembuka yang
 * tidak dikenalnya dengan `unsupported startup parameter: options` — koneksi
 * gagal, bukan zona waktunya yang salah. Di belakang PgBouncer, zona waktu
 * dipasang di SISI SERVER sebagai gantinya:
 *
 *     ALTER DATABASE adzkia SET timezone = 'Asia/Jakarta';
 *
 * Cara itu berlaku untuk setiap koneksi, tidak bergantung pada mode pooling,
 * dan tidak menambah satu pun query per permintaan. `infra/pgbouncer` dan
 * `docs/production-architecture.md` menjelaskannya lebih panjang.
 */
export const LEWAT_PGBOUNCER = process.env.PGBOUNCER === "1";

function buatPool(): Pool {
  const pool = new Pool({
    connectionString: ALAMAT,
    // Zona dikirim sebagai PARAMETER PEMBUKA sambungan, bukan sebagai query
    // `SET TIME ZONE` sesudahnya. Bedanya menentukan: parameter pembuka sudah
    // berlaku sebelum query PERTAMA dikirim, sedangkan `SET` yang ditembakkan
    // dari penangan `connect` berlomba dengan query pertama itu — `pg` bahkan
    // memperingatkannya ("client is already executing a query"). Pada sambungan
    // yang kalah lomba, `now()` sempat memakai zona server.
    ...(LEWAT_PGBOUNCER ? {} : { options: `-c timezone=${ZONA}` }),
    // 10 koneksi cukup: satu sekolah, puluhan peserta serentak, dan tiap
    // permintaan hanya memegang koneksi selama query berjalan. Angka besar
    // justru memperlambat PostgreSQL, bukan mempercepatnya.
    max: Number(process.env.PGPOOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    // Gagal menyambung harus CEPAT dan berisik. Menggantung sepuluh detik di
    // tengah ujian jauh lebih buruk daripada satu galat yang jelas.
    connectionTimeoutMillis: 5_000,
  });

  // Koneksi yang mati saat menganggur tidak boleh menjatuhkan proses. Pool akan
  // menggantinya sendiri; yang perlu dilakukan hanya mencatatnya.
  pool.on("error", (e) => {
    console.error("[db] koneksi menganggur terputus:", e.message);
  });

  return pool;
}

// Disimpan di globalThis supaya hot-reload `next dev` tidak membuka pool baru
// tiap kali berkas disunting — pola yang sama dengan versi SQLite.
const g = globalThis as unknown as { __adzkiaPool?: Pool };
export const pool: Pool = g.__adzkiaPool ?? (g.__adzkiaPool = buatPool());

/* ==========================================================================
   PENANDA PARAMETER
   ========================================================================== */

/**
 * Mengubah `?` gaya SQLite menjadi `$1, $2, …` gaya PostgreSQL.
 *
 * Tanda tanya DI DALAM string SQL dilewati — `WHERE nama LIKE '%?%'` tidak
 * boleh ikut diterjemahkan. Begitu pula `??` gaya operator JSON PostgreSQL,
 * dan komentar `--` maupun blok komentar.
 *
 * PENANDA BERNOMOR `?1`, `?2` IKUT DIKENALI, dan itu bukan kemewahan.
 * SQLite memakainya untuk memakai SATU parameter di BEBERAPA tempat — pola yang
 * dipakai empat query di aplikasi ini, semuanya pada gerbang "peserta ini boleh
 * membuka paket itu". Tanpa cabang di bawah, `?1` diterjemahkan menjadi `$1`
 * DIIKUTI angka 1 yang tertinggal, menghasilkan `$11`: query meminta parameter
 * kesebelas yang tidak pernah dikirim, dan PostgreSQL menolaknya dengan
 * "there is no parameter $11". Akibatnya tidak kelihatan saat membangun dan
 * tidak tertangkap `tsc` — yang gagal justru saat peserta menekan Mulai.
 *
 * Penomorannya sepadan: `?N` pada SQLite berarti parameter ke-N, sama persis
 * dengan `$N` pada PostgreSQL.
 */
export function keParamPg(sql: string): string {
  let hasil = "";
  let n = 0;
  let i = 0;

  while (i < sql.length) {
    const c = sql[i];

    // String literal berkutip tunggal; '' di dalamnya berarti satu kutip.
    if (c === "'") {
      const akhir = cariPenutup(sql, i, "'");
      hasil += sql.slice(i, akhir);
      i = akhir;
      continue;
    }
    // Pengenal berkutip ganda.
    if (c === '"') {
      const akhir = cariPenutup(sql, i, '"');
      hasil += sql.slice(i, akhir);
      i = akhir;
      continue;
    }
    // Komentar satu baris.
    if (c === "-" && sql[i + 1] === "-") {
      const akhir = sql.indexOf("\n", i);
      const potong = akhir === -1 ? sql.length : akhir;
      hasil += sql.slice(i, potong);
      i = potong;
      continue;
    }
    // Komentar blok.
    if (c === "/" && sql[i + 1] === "*") {
      const akhir = sql.indexOf("*/", i + 2);
      const potong = akhir === -1 ? sql.length : akhir + 2;
      hasil += sql.slice(i, potong);
      i = potong;
      continue;
    }
    // Operator JSON `??` milik PostgreSQL — dibiarkan utuh.
    if (c === "?" && sql[i + 1] === "?") {
      hasil += "??";
      i += 2;
      continue;
    }
    if (c === "?") {
      // `?12` → `$12`. Nomornya dipakai apa adanya, dan pencacah bawaan ikut
      // digeser supaya `?` polos sesudahnya tidak menabrak nomor yang sudah
      // terpakai.
      let j = i + 1;
      while (j < sql.length && sql[j]! >= "0" && sql[j]! <= "9") j++;
      if (j > i + 1) {
        const nomor = Number(sql.slice(i + 1, j));
        if (nomor > n) n = nomor;
        hasil += `$${nomor}`;
        i = j;
        continue;
      }

      n++;
      hasil += `$${n}`;
      i++;
      continue;
    }

    hasil += c;
    i++;
  }

  return hasil;
}

/** Indeks tepat SESUDAH kutip penutup, dengan menghormati kutip ganda ''. */
function cariPenutup(sql: string, mulai: number, kutip: string): number {
  let i = mulai + 1;
  while (i < sql.length) {
    if (sql[i] === kutip) {
      if (sql[i + 1] === kutip) {
        i += 2; // kutip yang di-escape, bukan penutup
        continue;
      }
      return i + 1;
    }
    i++;
  }
  return sql.length;
}

/* ==========================================================================
   TRANSAKSI
   ========================================================================== */

/**
 * Klien transaksi yang sedang berjalan, kalau ada.
 *
 * AsyncLocalStorage membuatnya terbawa sendiri ke seluruh fungsi yang dipanggil
 * di dalam `tx()`, sedalam apa pun — tanpa satu pun tanda tangan fungsi yang
 * perlu diubah untuk menerima "klien" sebagai argumen.
 */
const konteks = new AsyncLocalStorage<PoolClient>();

/**
 * Klien transaksi yang sedang berjalan, untuk lapisan LAIN yang perlu
 * menumpang transaksi yang sama.
 *
 * Dipakai `src/server/db/client.ts`: repositori Drizzle wajib memakai klien
 * INI saat berada di dalam `tx()`, kalau tidak tulisannya jatuh di luar
 * transaksi dan pembatalan tidak membatalkan apa pun — persis kesalahan yang
 * dijelaskan di keputusan (1) pada kepala berkas ini, hanya berpindah tempat.
 */
export function klienAktif(): PoolClient | undefined {
  return konteks.getStore();
}

/** Menjalankan satu query pada klien transaksi bila ada, atau pada pool. */
async function jalankan<T extends QueryResultRow>(sql: string, params: unknown[]) {
  const teks = keParamPg(sql);
  const klien = konteks.getStore();
  return klien ? klien.query<T>(teks, params) : pool.query<T>(teks, params);
}

/**
 * Menjalankan `fn` di dalam satu transaksi.
 *
 * Seluruh `all`/`one`/`run` di dalamnya memakai klien yang sama, sehingga
 * pembatalan benar-benar membatalkan semuanya. Transaksi bersarang tidak
 * membuka transaksi baru — ia menumpang yang sedang berjalan, karena
 * `BEGIN` di dalam `BEGIN` hanya menghasilkan peringatan di PostgreSQL dan
 * `COMMIT` yang di dalam akan menutup transaksi luar lebih awal.
 */
export async function tx<T>(fn: () => Promise<T> | T): Promise<T> {
  const sedangBerjalan = konteks.getStore();
  if (sedangBerjalan) return await fn();

  const klien = await pool.connect();
  try {
    await klien.query("BEGIN");
    const hasil = await konteks.run(klien, async () => await fn());
    await klien.query("COMMIT");
    return hasil;
  } catch (e) {
    try {
      await klien.query("ROLLBACK");
    } catch {
      // Koneksinya sudah rusak; galat aslinya yang penting, bukan yang ini.
    }
    throw e;
  } finally {
    klien.release();
  }
}

/* ==========================================================================
   QUERY
   ========================================================================== */

/** SELECT banyak baris. */
export async function all<T extends QueryResultRow = Record<string, unknown>>(
  sql: string,
  ...params: unknown[]
): Promise<T[]> {
  const hasil = await jalankan<T>(sql, params);
  return hasil.rows;
}

/** SELECT satu baris; `undefined` bila tidak ada. */
export async function one<T extends QueryResultRow = Record<string, unknown>>(
  sql: string,
  ...params: unknown[]
): Promise<T | undefined> {
  const hasil = await jalankan<T>(sql, params);
  return hasil.rows[0];
}

export interface HasilRun {
  /** Banyak baris yang benar-benar berubah. */
  changes: number;
}

/** INSERT / UPDATE / DELETE yang nilai barunya tidak diperlukan. */
export async function run(sql: string, ...params: unknown[]): Promise<HasilRun> {
  const hasil = await jalankan(sql, params);
  return { changes: hasil.rowCount ?? 0 };
}

/**
 * INSERT yang id barunya diperlukan.
 *
 * Menggantikan `run(...).lastInsertRowid` milik SQLite. PostgreSQL tidak
 * menyimpan "id terakhir" di mana pun — nilainya harus diminta lewat
 * `RETURNING`, dan itu ditambahkan di sini bila belum ditulis pemanggilnya.
 *
 * Meminta id secara eksplisit begini juga lebih jujur: pada SQLite,
 * `lastInsertRowid` diam-diam salah kalau baris yang disisipkan ternyata
 * dilewati klausa `ON CONFLICT DO NOTHING` — ia memulangkan id sisipan
 * SEBELUMNYA. Di sini, baris yang tidak jadi disisipkan memulangkan null.
 */
export async function sisip(sql: string, ...params: unknown[]): Promise<number | null> {
  const teks = /returning/i.test(sql) ? sql : `${sql.trimEnd().replace(/;$/, "")} RETURNING id`;
  const hasil = await jalankan<{ id: number }>(teks, params);
  return hasil.rows[0]?.id ?? null;
}

/**
 * Seperti `sisip()`, tetapi melempar bila tidak ada baris yang masuk.
 *
 * Dipakai INSERT biasa yang id barunya langsung dipakai pemanggil — membuat
 * paket, menyimpan butir soal, mendaftarkan peserta. Pada SQLite kegagalan
 * semacam itu memulangkan angka yang menyesatkan; di sini ia berhenti di
 * tempat, dengan SQL-nya ikut disebut supaya ketahuan yang mana.
 */
export async function sisipWajib(sql: string, ...params: unknown[]): Promise<number> {
  const id = await sisip(sql, ...params);
  if (id === null) {
    throw new Error(`INSERT tidak menghasilkan baris: ${sql.trim().slice(0, 120)}`);
  }
  return id;
}

/* ==========================================================================
   KESEHATAN
   ========================================================================== */

export interface Kesehatan {
  siap: boolean;
  pesan: string;
  /** Lama jawaban query paling sederhana, dalam milidetik. */
  ms: number;
  koneksiTerpakai: number;
  koneksiMenganggur: number;
  antre: number;
}

/**
 * Memastikan basis data benar-benar menjawab, bukan sekadar port yang terbuka.
 * Dipakai `/api/sehat` dan healthcheck Docker.
 */
export async function sehat(): Promise<Kesehatan> {
  const mulai = Date.now();
  try {
    await pool.query("SELECT 1");
    return {
      siap: true,
      pesan: "PostgreSQL menjawab",
      ms: Date.now() - mulai,
      koneksiTerpakai: pool.totalCount - pool.idleCount,
      koneksiMenganggur: pool.idleCount,
      antre: pool.waitingCount,
    };
  } catch (e) {
    return {
      siap: false,
      pesan: e instanceof Error ? e.message : "PostgreSQL tidak menjawab",
      ms: Date.now() - mulai,
      koneksiTerpakai: 0,
      koneksiMenganggur: 0,
      antre: 0,
    };
  }
}
