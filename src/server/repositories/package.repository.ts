import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { packages } from "@/server/db/schema";

/**
 * Akses data paket tryout, termasuk gerbang "peserta ini boleh membuka paket
 * itu".
 *
 * Gerbang tersebut dipanggil di jalur masuk ujian DAN di dasbor setiap peserta,
 * jadi jumlah querynya berpengaruh langsung pada menit-menit pertama hari-H —
 * saat semua orang menekan Mulai dalam rentang waktu yang sama.
 */

export type StatusPaket = "draft" | "published" | "closed";
export type JalurPaket = "utbk" | "skd";

export interface PaketRow {
  id: number;
  kode: string;
  nama: string;
  jalur: JalurPaket;
  deskripsi: string | null;
  status: StatusPaket;
  mulai_at: string | null;
  selesai_at: string | null;
  acak_soal: number;
  tampil_pembahasan: number;
  created_at: string;
}

const KOLOM = {
  id: packages.id,
  kode: packages.kode,
  nama: packages.nama,
  jalur: packages.jalur,
  deskripsi: packages.deskripsi,
  status: packages.status,
  mulai_at: packages.mulaiAt,
  selesai_at: packages.selesaiAt,
  acak_soal: packages.acakSoal,
  tampil_pembahasan: packages.tampilPembahasan,
  created_at: packages.createdAt,
} as const;

export async function cariById(packageId: number): Promise<PaketRow | undefined> {
  if (!Number.isInteger(packageId) || packageId <= 0) return undefined;
  const [row] = await db().select(KOLOM).from(packages).where(eq(packages.id, packageId)).limit(1);
  return row as PaketRow | undefined;
}

/** Jalur paket saja — satu kolom, untuk pemanggil yang tidak butuh sisanya. */
export async function jalur(packageId: number): Promise<JalurPaket> {
  const [row] = await db()
    .select({ jalur: packages.jalur })
    .from(packages)
    .where(eq(packages.id, packageId))
    .limit(1);
  // Paket lama tanpa penanda dianggap UTBK.
  return row?.jalur === "skd" ? "skd" : "utbk";
}

/**
 * Paket masih di dalam jendela waktunya?
 *
 * `TRIM(...) = ''` SENGAJA TIDAK ADA di sini. Di SQLite kolom waktu adalah
 * TEKS, sehingga "belum diisi" bisa berupa NULL ATAU untaian kosong, dan
 * keduanya harus diperiksa. Di PostgreSQL kolomnya `timestamptz`: satu-satunya
 * bentuk "belum diisi" adalah NULL, dan `TRIM()` pada nilai waktu ditolak
 * mentah-mentah ("function btrim(timestamp with time zone) does not exist").
 * Query yang masih memakainya GAGAL TOTAL, bukan salah hitung — itulah yang
 * dulu menjatuhkan dasbor siswa dan papan Live.
 */
export async function dalamJendela(packageId: number): Promise<boolean> {
  const [row] = await db()
    .select({ n: sql<number>`COUNT(*)` })
    .from(packages)
    .where(
      and(
        eq(packages.id, packageId),
        sql`(${packages.mulaiAt} IS NULL OR ${packages.mulaiAt} <= now())`,
        sql`(${packages.selesaiAt} IS NULL OR ${packages.selesaiAt} >= now())`,
      ),
    );
  return (row?.n ?? 0) > 0;
}

export interface IzinPaket {
  /** Paket punya setidaknya satu baris pembatas (kelas atau nama peserta). */
  dibatasi: boolean;
  /** Peserta ini boleh membukanya. */
  diizinkan: boolean;
}

/**
 * Gerbang peserta, DALAM SATU QUERY.
 *
 * Kode lama memakai dua: `paketDibatasi()` lalu pemeriksaan kecocokan. Dua
 * query itu selalu berjalan berpasangan dan tidak pernah dipakai terpisah, jadi
 * menggabungkannya tidak menghilangkan keluwesan apa pun — hanya menghapus satu
 * perjalanan pulang-pergi dari jalur masuk ujian.
 *
 * ATURANNYA TIDAK BERUBAH, dan ini aturan yang gampang terbalik saat kode ini
 * disentuh lagi:
 *
 *   · Paket TANPA satu pun baris pembatas TERBUKA UNTUK SEMUA. Itulah keadaan
 *     seluruh paket yang sudah ada sebelum fitur pembatas dibuat, dan aturan
 *     itulah yang membuat fitur ini tidak mengunci siapa pun secara tidak
 *     sengaja.
 *   · Begitu ADA pembatasnya, dua jalan masuk dan salah satunya cukup: namanya
 *     didaftarkan satu per satu, atau KELASNYA didaftarkan.
 *
 * Pencocokan kelas mengabaikan besar-kecil huruf dan spasi tepi karena data
 * asli sekolah memuat "XII HARVARD" dan "XII Harvard" berdampingan, dan peserta
 * tidak boleh terkunci karena itu. Ditulis `lower(TRIM(...))`, BUKAN
 * `COLLATE NOCASE` — kolasi itu milik SQLite dan ditolak PostgreSQL dengan
 * "collation nocase does not exist". Untuk nama kelas yang seluruhnya ASCII,
 * `lower()` memberi hasil yang sama persis.
 */
export async function izinPeserta(userId: number, packageId: number): Promise<IzinPaket> {
  const hasil = await db().execute<{
    n_peserta: number;
    n_kelas: number;
    cocok_peserta: number;
    cocok_kelas: number;
  }>(sql`
    SELECT
      (SELECT COUNT(*) FROM paket_peserta WHERE package_id = ${packageId}) AS n_peserta,
      (SELECT COUNT(*) FROM paket_kelas   WHERE package_id = ${packageId}) AS n_kelas,
      (SELECT COUNT(*) FROM paket_peserta
        WHERE package_id = ${packageId} AND user_id = ${userId})           AS cocok_peserta,
      (SELECT COUNT(*) FROM paket_kelas pk
         JOIN users u ON u.id = ${userId}
        WHERE pk.package_id = ${packageId}
          AND u.kelas IS NOT NULL
          AND lower(TRIM(u.kelas)) = lower(TRIM(pk.kelas)))                AS cocok_kelas
  `);

  const r = hasil.rows[0];
  const dibatasi = (r?.n_peserta ?? 0) + (r?.n_kelas ?? 0) > 0;
  if (!dibatasi) return { dibatasi: false, diizinkan: true };
  return { dibatasi: true, diizinkan: (r?.cocok_peserta ?? 0) + (r?.cocok_kelas ?? 0) > 0 };
}
