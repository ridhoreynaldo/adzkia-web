import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/server/db";

/**
 * Catatan kepergian peserta dari layar ujian.
 *
 * Yang ditulis di sini menentukan seseorang lulus atau GAGAL, jadi dua sifatnya
 * tidak boleh hilang saat kode ini disentuh lagi kelak:
 *
 *   · nomor `urutan` dihitung PostgreSQL di dalam pernyataan yang sama, bukan
 *     oleh JavaScript lewat COUNT terpisah;
 *   · `ronde` diambil dari baris sesinya sendiri, bukan dari query kedua.
 *
 * Keduanya berasal dari satu perbaikan yang sama, dijelaskan di
 * `sisipKejadianSelesai()`.
 */

export type JenisKejadian = "denyut_hilang" | "denyut_tersendat";

/**
 * Mencatat kejadian yang SUDAH SELESAI saat diketahui.
 *
 * Berbeda dengan kepergian biasa, jeda denyut baru ketahuan justru ketika
 * peserta KEMBALI — jadi barisnya langsung ditutup dengan durasi sepanjang jeda
 * yang terukur, supaya pengawas membaca "tidak merespons 47 dtk" dan bukan
 * durasi yang kosong.
 *
 * SATU QUERY, TURUN DARI TIGA. Versi sebelumnya membaca `ronde` sesi, lalu
 * menghitung `COUNT(*)` pelanggaran ronde itu, baru menyisipkan. Selain mahal —
 * ini berjalan saat jaringan sedang buruk, persis saat basis data paling tidak
 * boleh dibebani — urutannya PUNYA BALAPAN: dua kejadian yang tercatat nyaris
 * bersamaan sama-sama membaca COUNT yang sama dan mendapat nomor `urutan` yang
 * kembar, sehingga laporan pengawas memuat dua "kepergian ke-3" dan tidak ada
 * kepergian ke-4. Menghitungnya sebagai anak query DI DALAM `INSERT … SELECT`
 * membuat nomornya dibaca pada saat baris itu benar-benar disisipkan.
 *
 * `user_id` dan `package_id` juga diambil dari baris `attempts` yang sama
 * alih-alih dipercaya dari pemanggil — sekaligus menutup kemungkinan mencatat
 * pelanggaran atas nama peserta lain.
 *
 * `now() - make_interval(secs => …)` menggantikan
 * `datetime('now','localtime', ? || ' seconds')`: nilainya sama, tetapi ini
 * aritmetika interval asli PostgreSQL, bukan fungsi padanan SQLite.
 */
export async function sisipKejadianSelesai(
  attemptId: number,
  subtes: string | null,
  jenis: JenisKejadian,
  jedaDetik: number,
  keterangan: string,
): Promise<number | null> {
  const hasil = await db().execute<{ id: number }>(sql`
    INSERT INTO violations
      (attempt_id, user_id, package_id, subtes, jenis, urutan, ronde,
       mulai_at, kembali_at, durasi_detik, keterangan)
    SELECT a.id, a.user_id, a.package_id, ${subtes}, ${jenis},
           (SELECT COUNT(*) + 1
              FROM violations v
             WHERE v.attempt_id = a.id AND v.ronde = a.ronde),
           a.ronde,
           now() - make_interval(secs => ${jedaDetik}),
           now(),
           ${jedaDetik},
           ${keterangan}
      FROM attempts a
     WHERE a.id = ${attemptId}
    RETURNING id
  `);
  return hasil.rows[0]?.id ?? null;
}

/** Menghapus seluruh catatan satu sesi. TIDAK dipakai jalur susulan — di sana
 *  pelanggaran sengaja DIPERTAHANKAN sebagai riwayat dan dibedakan `ronde`. */
export async function hapusMilikSesi(attemptId: number): Promise<void> {
  await db().execute(sql`DELETE FROM violations WHERE attempt_id = ${attemptId}`);
}
