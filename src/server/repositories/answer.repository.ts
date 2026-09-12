import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { answers, packages, questions } from "@/server/db/schema";

/**
 * Akses data jawaban peserta.
 *
 * Inilah tabel yang paling banyak DITULIS di aplikasi ini: 160 butir per
 * peserta, disimpan ulang setiap kali jawabannya berubah, oleh ribuan peserta
 * pada jam yang sama. Setiap query di berkas ini dihitung.
 */

export interface ItemSimpan {
  questionId: number;
  jawaban: string | null;
  ragu: boolean;
}

export interface SoalUntukPeriksa {
  id: number;
  subtes: string;
  jalur: string;
}

/**
 * Butir mana saja dari daftar ini yang benar-benar milik paket tersebut, di
 * subtes mana, berikut jalur paketnya.
 *
 * Jalur paket ikut diambil DI SINI — bukan lewat query `jalurPaket()`
 * tersendiri — supaya seluruh pembuktian autosave tetap tiga query. Butir yang
 * tidak terjawab query ini akan ditolak, termasuk id karangan yang dikirim dari
 * luar ruang ujian. Itu membuat query ini sekaligus gerbang otorisasi, bukan
 * sekadar pengambilan data: peserta tidak bisa menitipkan jawaban ke butir
 * paket lain.
 */
export async function soalMilikPaket(
  packageId: number,
  idSoal: number[],
): Promise<SoalUntukPeriksa[]> {
  if (idSoal.length === 0) return [];
  return await db()
    .select({ id: questions.id, subtes: questions.subtes, jalur: packages.jalur })
    .from(questions)
    .innerJoin(packages, eq(packages.id, questions.packageId))
    .where(and(eq(questions.packageId, packageId), inArray(questions.id, idSoal)));
}

/**
 * Upsert SEKUMPULAN jawaban dalam SATU pernyataan, berapa pun banyak butirnya.
 *
 * `unnest` memecah ketiga larik menjadi baris. Bentuknya setara INSERT
 * bernilai banyak, bedanya panjang SQL-nya TETAP untuk 1 maupun 160 butir —
 * sehingga PostgreSQL bisa memakai ulang rencana eksekusi yang sama alih-alih
 * merencanakan ulang pernyataan sepanjang beberapa kilobyte pada tiap autosave.
 *
 * `ON CONFLICT` menjaga sifat IDEMPOTEN: klien yang mengulang kiriman karena
 * jaringannya putus tidak pernah melahirkan jawaban ganda, hanya menimpa dengan
 * nilai yang sama. Itulah jawaban atas "bagaimana kalau peserta mengirim dua
 * kali" — dijamin kunci `UNIQUE (attempt_id, question_id)`, bukan oleh
 * pemeriksaan di sisi klien.
 *
 * PEMANGGIL WAJIB MENYARING BUTIR KEMBAR LEBIH DULU. Satu pernyataan
 * `ON CONFLICT DO UPDATE` menolak menyentuh baris yang sama dua kali dan
 * membatalkan SELURUH pernyataannya dengan galat 21000 — satu butir kembar
 * membuang seluruh kiriman, termasuk jawaban butir lain yang sah.
 * `AnswerService.simpanBanyak()` melakukan penyaringan itu.
 */
export async function simpanBanyak(attemptId: number, items: ItemSimpan[]): Promise<number> {
  if (items.length === 0) return 0;

  const idSoal = items.map((i) => i.questionId);
  const isi = items.map((i) => (i.jawaban && i.jawaban !== "" ? i.jawaban : null));
  const ragu = items.map((i) => (i.ragu ? 1 : 0));

  // `sql.param()` WAJIB di sini, dan kelalaian memakainya tidak akan tertangkap
  // `tsc` maupun `next build`.
  //
  // Larik JavaScript yang disisipkan polos ke template `sql` dipecah Drizzle
  // menjadi DAFTAR parameter — `($2, $3, $4)` — karena itulah yang dibutuhkan
  // `IN (...)`, bentuk yang jauh lebih sering dipakai. Di sini yang dibutuhkan
  // kebalikannya: SATU parameter bertipe larik. Tanpa `sql.param()`, PostgreSQL
  // menerima sebuah record dan menolaknya dengan "cannot cast type record to
  // integer[]" (42846) — galat yang hanya muncul saat query benar-benar
  // dijalankan, yaitu saat peserta menyimpan jawaban.
  const hasil = await db().execute(sql`
    INSERT INTO ${answers} (attempt_id, question_id, jawaban, ragu, updated_at)
    SELECT ${attemptId}, x.qid, x.jawaban, x.ragu, now()
      FROM unnest(
             ${sql.param(idSoal)}::int[],
             ${sql.param(isi)}::text[],
             ${sql.param(ragu)}::int[]
           ) AS x(qid, jawaban, ragu)
    ON CONFLICT (attempt_id, question_id) DO UPDATE SET
      jawaban    = excluded.jawaban,
      ragu       = excluded.ragu,
      updated_at = excluded.updated_at
  `);

  return hasil.rowCount ?? 0;
}

/** Menyimpan satu jawaban. Jalur lambat — dipakai di luar autosave berbatch. */
export async function simpanSatu(
  attemptId: number,
  questionId: number,
  jawaban: string | null,
  ragu: boolean,
): Promise<void> {
  await db()
    .insert(answers)
    .values({
      attemptId,
      questionId,
      jawaban: jawaban && jawaban !== "" ? jawaban : null,
      ragu: ragu ? 1 : 0,
      updatedAt: sql`now()`,
    })
    .onConflictDoUpdate({
      target: [answers.attemptId, answers.questionId],
      set: {
        jawaban: sql`excluded.jawaban`,
        ragu: sql`excluded.ragu`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
}

/** Menghapus seluruh jawaban satu sesi. Dipakai saat sesi gugur disetel ulang. */
export async function hapusMilikSesi(attemptId: number): Promise<void> {
  await db().delete(answers).where(eq(answers.attemptId, attemptId));
}
