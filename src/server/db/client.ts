import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";

import { klienAktif, pool } from "@/lib/core/db";

import * as schema from "./schema";

/**
 * Drizzle di atas pool yang SUDAH ADA.
 *
 * DUA KEPUTUSAN YANG MENENTUKAN BENAR-SALAHNYA SELURUH LAPISAN INI.
 *
 * 1. POOL-NYA DIPINJAM, BUKAN DIBUAT BARU. `drizzle(pool)` memakai `pg.Pool`
 *    yang sama dengan `src/lib/db.ts`. Membuat pool kedua akan MELIPATGANDAKAN
 *    koneksi ke PostgreSQL tanpa menambah satu pun kapasitas — dan di belakang
 *    PgBouncer, jumlah koneksilah yang dibatasi. Selama migrasi ini berlangsung
 *    separuh kode memakai Drizzle dan separuh lagi memakai `all/one/run`;
 *    keduanya harus mengantre di pool yang sama.
 *
 * 2. DI DALAM `tx()`, DRIZZLE WAJIB MEMAKAI KLIEN TRANSAKSINYA. `tx()` menaruh
 *    satu `PoolClient` di AsyncLocalStorage. Repositori Drizzle yang tetap
 *    menembak ke pool akan mengambil koneksi LAIN: tulisannya jatuh di luar
 *    transaksi, `ROLLBACK` tidak membatalkannya, dan kodenya tetap "berjalan"
 *    tanpa galat apa pun. Itulah sebabnya akses basis data di lapisan
 *    repositori selalu lewat `db()`, tidak pernah lewat variabel modul.
 */
const dbPool = drizzle(pool, { schema });

/**
 * Instance Drizzle untuk permintaan yang sedang berjalan.
 *
 * Panggil sebagai fungsi setiap kali — `const d = db()` di tingkat modul akan
 * membekukan instance pool dan mematahkan keputusan (2) di atas.
 */
export function db() {
  const klien = klienAktif();
  return klien ? drizzle(klien, { schema }) : dbPool;
}

export { schema };
export type Db = ReturnType<typeof db>;
