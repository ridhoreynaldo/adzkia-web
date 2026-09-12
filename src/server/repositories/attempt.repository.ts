import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { attemptSubtes, attempts } from "@/server/db/schema";

/**
 * Akses data sesi ujian. TIDAK ADA ATURAN BISNIS DI SINI — tidak ada keputusan
 * boleh/tidak boleh, tidak ada cache, tidak ada transaksi. Semua itu milik
 * `ExamService`. Berkas ini hanya tahu cara membaca dan menulis baris.
 *
 * BENTUK BARISNYA SENGAJA SNAKE_CASE. Drizzle memulangkan `packageId`, tetapi
 * seluruh `src/lib`, komponen, dan Server Action di aplikasi ini membaca
 * `package_id`. Menerjemahkannya DI SINI — satu tempat — membuat lapisan lama
 * dan lapisan baru bisa hidup berdampingan tanpa satu pun pemanggil yang perlu
 * disentuh. Itu memang tugas repositori: memetakan bentuk penyimpanan ke bentuk
 * yang dipakai domain.
 */

export type StatusAttempt = "ongoing" | "finished" | "gugur";
export type JalurUjian = "utama" | "susulan";

export interface AttemptRow {
  id: number;
  user_id: number;
  package_id: number;
  status: StatusAttempt;
  jalur: JalurUjian;
  ronde: number;
  subtes_aktif: string | null;
  started_at: string;
  finished_at: string | null;
  digugurkan_at: string | null;
  alasan_gugur: string | null;
  total_skor: number | null;
}

export interface AttemptSubtesRow {
  id: number;
  attempt_id: number;
  subtes: string;
  mulai_at: string;
  deadline_at: string;
  selesai_at: string | null;
}

/**
 * Kolom yang diambil, ditulis satu kali dan dipakai ulang.
 *
 * Ini menggantikan `SELECT *`. Bedanya bukan kosmetik: `attempts` punya kolom
 * `denyut_at` dan `denyut_aktif` yang berubah TIAP LIMA DETIK per peserta dan
 * tidak pernah dipakai pemanggil `AttemptRow`. Tidak mengambilnya berarti satu
 * kolom waktu lebih sedikit yang diurai penerjemah tipe pada setiap pembacaan
 * sesi — dan pembacaan sesi terjadi di hampir setiap permintaan.
 */
const KOLOM = {
  id: attempts.id,
  user_id: attempts.userId,
  package_id: attempts.packageId,
  status: attempts.status,
  jalur: attempts.jalur,
  ronde: attempts.ronde,
  subtes_aktif: attempts.subtesAktif,
  started_at: attempts.startedAt,
  finished_at: attempts.finishedAt,
  digugurkan_at: attempts.digugurkanAt,
  alasan_gugur: attempts.alasanGugur,
  total_skor: attempts.totalSkor,
} as const;

/** Sesi peserta untuk satu paket. `undefined` bila belum pernah mulai. */
export async function cariMilikPeserta(
  userId: number,
  packageId: number,
): Promise<AttemptRow | undefined> {
  const [row] = await db()
    .select(KOLOM)
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.packageId, packageId)))
    .limit(1);
  return row as AttemptRow | undefined;
}

export async function cariById(attemptId: number): Promise<AttemptRow | undefined> {
  // Id yang bukan bilangan bulat positif ditolak SEBELUM menyentuh basis data.
  // Nilainya datang dari URL, dan `/tryout/abc` tidak layak membuang satu
  // koneksi pool hanya untuk dijawab "tidak ada".
  if (!Number.isInteger(attemptId) || attemptId <= 0) return undefined;
  const [row] = await db().select(KOLOM).from(attempts).where(eq(attempts.id, attemptId)).limit(1);
  return row as AttemptRow | undefined;
}

/**
 * Menyisipkan sesi baru bila belum ada, lalu memulangkan yang berlaku.
 *
 * `ON CONFLICT DO NOTHING` + `RETURNING` dalam SATU pernyataan adalah inti
 * pengamanan balapannya: dua permintaan "Mulai" yang tiba bersamaan — dua tab,
 * atau peramban yang mencoba lagi sesudah jaringan putus — sama-sama sampai ke
 * sini, tetapi kunci `UNIQUE (user_id, package_id)` hanya meloloskan satu. Yang
 * kalah memulangkan nol baris, lalu membaca baris pemenang.
 *
 * Mengeceknya lebih dulu dengan SELECT lalu INSERT — yang dilakukan kode lama —
 * menyisakan celah di antara keduanya.
 */
export async function sisipJikaBelumAda(
  userId: number,
  packageId: number,
  jalur: JalurUjian = "utama",
): Promise<AttemptRow | undefined> {
  const [baru] = await db()
    .insert(attempts)
    .values({ userId, packageId, status: "ongoing", jalur, startedAt: sql`now()` })
    .onConflictDoNothing({ target: [attempts.userId, attempts.packageId] })
    .returning(KOLOM);
  return (baru as AttemptRow | undefined) ?? (await cariMilikPeserta(userId, packageId));
}

/** Menandai sesi sebagai jalur susulan tanpa menyentuh isinya. */
export async function tandaiJalurSusulan(attemptId: number): Promise<void> {
  await db().update(attempts).set({ jalur: "susulan" }).where(eq(attempts.id, attemptId));
}

/**
 * Menyetel ulang sesi yang GUGUR supaya peserta mengulang dari nol.
 *
 * `denyut_at`/`denyut_aktif` ikut dilupakan. Tanpa itu, jeda berhari-hari sejak
 * ujian yang gugur langsung terbaca sebagai kepergian panjang dan menggugurkan
 * peserta lagi seketika — sebelum ia sempat menjawab satu butir pun. Pemanggil
 * bertanggung jawab menghapus jawaban, nilai, dan timer lamanya DI DALAM
 * transaksi yang sama.
 */
export async function setelUlangUntukSusulan(attemptId: number): Promise<void> {
  await db()
    .update(attempts)
    .set({
      status: "ongoing",
      jalur: "susulan",
      ronde: sql`${attempts.ronde} + 1`,
      subtesAktif: null,
      startedAt: sql`now()`,
      finishedAt: null,
      digugurkanAt: null,
      alasanGugur: null,
      totalSkor: null,
      denyutAt: null,
      denyutAktif: 0,
    })
    .where(eq(attempts.id, attemptId));
}

/**
 * Menggugurkan sesi. Memulangkan `false` bila sesinya sudah tidak `ongoing` —
 * artinya ada yang mendahului, dan pemanggil TIDAK boleh menulis alasan gugur
 * di atas alasan yang sudah tercatat.
 *
 * Syarat `status = 'ongoing'` ada DI DALAM WHERE, bukan di JavaScript. Dua
 * permintaan yang menggugurkan sesi yang sama pada saat bersamaan — lumrah,
 * karena denyut dan laporan pelanggaran berjalan sendiri-sendiri — hanya
 * membuat satu di antaranya mengubah baris.
 */
export async function gugurkan(attemptId: number, alasan: string): Promise<boolean> {
  const hasil = await db()
    .update(attempts)
    .set({
      status: "gugur",
      digugurkanAt: sql`now()`,
      alasanGugur: alasan,
      subtesAktif: null,
      // Skor TIDAK dihitung untuk sesi yang gugur, dan skor lama — kalau
      // sesinya pernah dinilai — ikut dibuang.
      totalSkor: null,
      // `finished_at` SENGAJA TIDAK DISENTUH. Sesi yang gugur bukan sesi yang
      // selesai, dan beberapa laporan memisahkan keduanya persis lewat kolom
      // ini. Mengisinya di sini akan membuat peserta yang digugurkan ikut
      // terhitung sebagai "sudah menyelesaikan ujian".
    })
    .where(and(eq(attempts.id, attemptId), eq(attempts.status, "ongoing")));
  return (hasil.rowCount ?? 0) > 0;
}

/* ------------------------------------------------------------------ */
/* Timer per subtes                                                     */
/* ------------------------------------------------------------------ */

const KOLOM_SUBTES = {
  id: attemptSubtes.id,
  attempt_id: attemptSubtes.attemptId,
  subtes: attemptSubtes.subtes,
  mulai_at: attemptSubtes.mulaiAt,
  deadline_at: attemptSubtes.deadlineAt,
  selesai_at: attemptSubtes.selesaiAt,
} as const;

export async function cariBarisSubtes(
  attemptId: number,
  subtes: string,
): Promise<AttemptSubtesRow | undefined> {
  const [row] = await db()
    .select(KOLOM_SUBTES)
    .from(attemptSubtes)
    .where(and(eq(attemptSubtes.attemptId, attemptId), eq(attemptSubtes.subtes, subtes)))
    .limit(1);
  return row;
}

/**
 * Membuka timer sebuah subtes, sekali saja.
 *
 * `deadline_at` dihitung PostgreSQL (`now() + interval`), bukan JavaScript. Jam
 * server basis datalah satu-satunya jam yang dipercaya seluruh aplikasi ini;
 * menghitungnya di aplikasi berarti peserta yang dilayani proses Next.js lain —
 * atau mesin lain — bisa mendapat tenggat yang berbeda.
 *
 * `ON CONFLICT DO NOTHING` membuatnya IDEMPOTEN: menyegarkan halaman ruang
 * ujian tidak memperpanjang waktu peserta.
 */
export async function bukaSubtes(
  attemptId: number,
  subtes: string,
  menit: number,
): Promise<AttemptSubtesRow | undefined> {
  const [baru] = await db()
    .insert(attemptSubtes)
    .values({
      attemptId,
      subtes,
      mulaiAt: sql`now()`,
      deadlineAt: sql`now() + make_interval(mins => ${menit})`,
    })
    .onConflictDoNothing({ target: [attemptSubtes.attemptId, attemptSubtes.subtes] })
    .returning(KOLOM_SUBTES);
  return baru ?? (await cariBarisSubtes(attemptId, subtes));
}

/** Menutup subtes. Idempoten — subtes yang sudah tertutup tidak disentuh. */
export async function tutupSubtes(attemptId: number, subtes: string): Promise<void> {
  await db()
    .update(attemptSubtes)
    .set({ selesaiAt: sql`now()` })
    .where(
      and(
        eq(attemptSubtes.attemptId, attemptId),
        eq(attemptSubtes.subtes, subtes),
        sql`${attemptSubtes.selesaiAt} IS NULL`,
      ),
    );
}

/**
 * Menutup SELURUH subtes yang masih terbuka pada satu sesi.
 *
 * Dipakai saat sesi digugurkan: begitu ujiannya berakhir, tidak boleh ada satu
 * pun timer yang masih menerima jawaban. Idempoten.
 */
export async function tutupSemuaSubtes(attemptId: number): Promise<void> {
  await db()
    .update(attemptSubtes)
    .set({ selesaiAt: sql`now()` })
    .where(and(eq(attemptSubtes.attemptId, attemptId), sql`${attemptSubtes.selesaiAt} IS NULL`));
}

/** Menghapus seluruh timer satu sesi. Dipakai saat sesi gugur disetel ulang. */
export async function hapusSemuaSubtes(attemptId: number): Promise<void> {
  await db().delete(attemptSubtes).where(eq(attemptSubtes.attemptId, attemptId));
}

/**
 * Menutup subtes yang tenggatnya sudah lewat, dengan `selesai_at = deadline_at`
 * — BUKAN `now()`.
 *
 * Bedanya kelihatan di laporan pengawas: subtes yang habis waktunya pukul 09.30
 * tetapi baru tersentuh pukul 10.15 karena peserta menutup laptopnya harus
 * tercatat berakhir 09.30. Memakai `now()` di sini akan memberi peserta itu 45
 * menit pengerjaan yang tidak pernah terjadi.
 *
 * Perbandingannya kini `deadline_at <= now()` — aritmetika `timestamptz` biasa —
 * menggantikan `julianday(deadline_at) <= julianday('now')`, yang memanggil dua
 * fungsi padanan SQLite dari `db/03-fungsi-sqlite.sql` untuk setiap baris.
 */
export async function tutupSubtesKedaluwarsa(attemptId: number): Promise<void> {
  await db()
    .update(attemptSubtes)
    .set({ selesaiAt: sql`${attemptSubtes.deadlineAt}` })
    .where(
      and(
        eq(attemptSubtes.attemptId, attemptId),
        sql`${attemptSubtes.selesaiAt} IS NULL`,
        sql`${attemptSubtes.deadlineAt} <= now()`,
      ),
    );
}

/**
 * Menandai sesi selesai. Syarat `status = 'ongoing'` ada di dalam WHERE supaya
 * sesi yang sudah digugurkan TIDAK berubah menjadi `finished` — peserta yang
 * gugur tidak boleh keluar dari pintu yang sama dengan peserta yang selesai.
 */
export async function tandaiSelesai(attemptId: number): Promise<void> {
  await db()
    .update(attempts)
    .set({ status: "finished", finishedAt: sql`now()`, subtesAktif: null })
    .where(and(eq(attempts.id, attemptId), eq(attempts.status, "ongoing")));
}

export interface KeadaanSubtes {
  subtes: string;
  ditutup: boolean;
  /** Sisa detik menurut jam PostgreSQL. Negatif berarti sudah lewat. */
  sisa: number | null;
}

/**
 * Keadaan SELURUH subtes satu sesi dalam satu query — paling banyak delapan
 * baris.
 *
 * Mengambil semuanya sekaligus jauh lebih murah daripada satu query untuk tiap
 * butir yang diperiksa, dan itulah yang membuat autosave 160 butir tetap tiga
 * query.
 *
 * `EXTRACT(EPOCH FROM (deadline_at - now()))` menggantikan selisih `julianday()`
 * milik SQLite. Nilainya sama persis, tetapi ini aritmetika `timestamptz` asli
 * PostgreSQL — bukan fungsi padanan di `db/03-fungsi-sqlite.sql` yang dipanggil
 * sekali untuk setiap baris.
 */
export async function keadaanSemuaSubtes(attemptId: number): Promise<KeadaanSubtes[]> {
  return await db()
    .select({
      subtes: attemptSubtes.subtes,
      ditutup: sql<boolean>`(${attemptSubtes.selesaiAt} IS NOT NULL)`,
      sisa: sql<
        number | null
      >`CAST(ROUND(EXTRACT(EPOCH FROM (${attemptSubtes.deadlineAt} - now()))) AS integer)`,
    })
    .from(attemptSubtes)
    .where(eq(attemptSubtes.attemptId, attemptId));
}

/** Sisa detik satu subtes. Tidak pernah negatif. */
export async function sisaDetik(attemptId: number, subtes: string): Promise<number> {
  const [row] = await db()
    .select({
      sisa: sql<
        number | null
      >`CAST(ROUND(EXTRACT(EPOCH FROM (${attemptSubtes.deadlineAt} - now()))) AS integer)`,
    })
    .from(attemptSubtes)
    .where(and(eq(attemptSubtes.attemptId, attemptId), eq(attemptSubtes.subtes, subtes)))
    .limit(1);

  const s = row?.sisa;
  if (s == null || !Number.isFinite(s)) return 0;
  return Math.max(0, Math.trunc(s));
}
