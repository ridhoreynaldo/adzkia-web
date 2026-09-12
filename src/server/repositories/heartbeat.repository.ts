import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/server/db";

/**
 * Denyut nadi ruang ujian — RUTE TERPANAS DI SELURUH APLIKASI.
 *
 * Tiap peserta memanggilnya sekali tiap lima detik. Pada 10.000 peserta
 * serentak itu 2.000 permintaan per detik, dan SATU query yang dihapus di sini
 * berarti 2.000 query per detik yang tidak pernah dikirim ke PostgreSQL.
 * Anggaran berkas ini: satu query per denyut, tanpa kecuali.
 */

export interface HasilDenyut {
  /** Jeda detik sejak denyut bersenjata sebelumnya, atau null bila tidak dinilai. */
  jeda: number | null;
}

/**
 * Mencatat satu denyut dan memulangkan jeda sejak denyut sebelumnya.
 *
 * SATU pernyataan, bukan SELECT-lalu-UPDATE. Dua alasan, dan yang kedua jauh
 * lebih penting daripada yang pertama:
 *
 *   1. Beban. Lihat anggaran di kepala berkas ini.
 *
 *   2. SELECT-LALU-UPDATE PUNYA BALAPAN YANG MENGGUGURKAN ORANG. Dua denyut
 *      yang tiba nyaris bersamaan — halaman dimuat ulang sementara denyut lama
 *      masih di jalan — sama-sama membaca `denyut_at` yang lama, sehingga
 *      KEDUANYA menghitung jeda panjang yang sama. Yang kedua bisa menggugurkan
 *      peserta atas kepergian yang sudah dinilai denyut pertama. `FOR UPDATE`
 *      pada anak query membuat denyut kedua menunggu lalu membaca nilai yang
 *      SUDAH diperbarui, jadi jedanya menjadi nol sebagaimana seharusnya.
 *
 * Penguncian ini tidak pernah menjadi rebutan: denyut satu sesi hanya datang
 * dari satu perangkat — dijamin `peserta_sesi` (satu akun, satu perangkat).
 *
 * `now()` menggantikan `datetime('now','localtime')` dan `EXTRACT(EPOCH FROM …)`
 * menggantikan selisih `julianday()`. Keduanya SAMA PERSIS nilainya — lihat
 * `db/03-fungsi-sqlite.sql`, di mana 'localtime' dan 'utc' sengaja tidak
 * menggeser apa pun pada kolom `timestamptz` — hanya tanpa memanggil fungsi
 * PL/pgSQL sekali untuk setiap baris.
 */
export async function catat(
  attemptId: number,
  aktif: boolean,
  nilaiJeda: boolean,
): Promise<HasilDenyut> {
  const hasil = await db().execute<{
    denyut_lama: string | null;
    aktif_lama: number;
    jeda: number | null;
  }>(sql`
    UPDATE attempts a
       SET denyut_at = now(), denyut_aktif = ${aktif ? 1 : 0}
      FROM (SELECT id, denyut_at, denyut_aktif FROM attempts WHERE id = ${attemptId} FOR UPDATE) lama
     WHERE a.id = lama.id
    RETURNING lama.denyut_at    AS denyut_lama,
              lama.denyut_aktif AS aktif_lama,
              CAST(ROUND(EXTRACT(EPOCH FROM (now() - lama.denyut_at))) AS integer) AS jeda
  `);

  const row = hasil.rows[0];
  if (!nilaiJeda) return { jeda: null };
  // Jeda hanya berarti bila denyut SEBELUMNYA juga bersenjata. Denyut pertama
  // sesudah penjagaan menyala tidak boleh dinilai sebagai kepergian panjang.
  if (!row || !row.denyut_lama || row.aktif_lama !== 1) return { jeda: null };
  return { jeda: row.jeda ?? null };
}

/** Melupakan denyut terakhir — dipakai saat sesi disetel ulang untuk susulan. */
export async function lupakan(attemptId: number): Promise<void> {
  await db().execute(sql`
    UPDATE attempts SET denyut_at = NULL, denyut_aktif = 0 WHERE id = ${attemptId}
  `);
}
