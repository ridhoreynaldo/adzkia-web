/**
 * Tipe bersama modul ujian.
 * Sengaja dipisah dari `src/lib/exam.ts` (yang menyentuh database) supaya
 * client component bisa mengimpor tipe tanpa ikut menarik kode server.
 */
import type { TipeSoal } from "@/lib/tryout/snbt";

// Kalimat layar GAGAL tinggal di `@/lib/pelanggaran-jenis` bersama daftar jenis
// pelanggarannya, supaya sebab dan kalimatnya tidak pernah berpisah. Diekspor
// ulang di sini agar pemanggil lama tidak perlu diubah.
export {
  PESAN_GUGUR,
  PESAN_GUGUR_SKD,
  namaUjian,
  pesanGugur,
  pesanGugurJenis,
} from "@/lib/penjagaan/pelanggaran-jenis";

/** Satu butir soal siap tampil di ruang ujian, lengkap dengan jawaban tersimpan. */
export interface SoalUjian {
  id: number;
  /** Kode subtes butir ini: PU/PPU/... untuk UTBK, TWK/TIU/TKP untuk SKD. */
  subtes: string;
  /** Nomor tampil (1..N) sesuai urutan penyajian, bukan selalu `questions.nomor`. */
  nomor: number;
  tipe: TipeSoal;
  stimulus: string | null;
  pertanyaan: string;
  gambar_url: string | null;
  opsi: string[];
  jawaban: string | null;
  ragu: boolean;
}

/** Ringkasan keadaan sebuah attempt: subtes mana yang aktif dan berapa sisa waktunya. */
export interface KeadaanUjian {
  attemptId: number;
  packageId: number;
  selesai: boolean;
  /** Sesi yang sedang berjalan. SKD memakai satu kode sesi untuk semua soal. */
  subtes: string | null;
  namaSubtes: string;
  /** 1-based; 0 bila ujian sudah selesai. */
  urutanKe: number;
  totalSubtes: number;
  /** Sisa detik menurut jam server. Tidak pernah negatif. */
  sisaDetik: number;
  /** Sudah ada baris `attempt_subtes` (timer sudah berjalan). */
  sudahMulai: boolean;
}

/** Satu perubahan jawaban yang dikirim ke `POST /api/exam/answer`. */
export interface ItemJawaban {
  questionId: number;
  jawaban: string | null;
  ragu: boolean;
}

export interface BodiSimpanJawaban {
  attemptId: number;
  /** Boleh kirim banyak sekaligus (hasil debounce) ... */
  jawaban?: ItemJawaban[];
  /** ... atau satu butir saja. */
  questionId?: number;
  nilai?: string | null;
  ragu?: boolean;
}

export type StatusSimpan = "idle" | "menyimpan" | "tersimpan" | "gagal";

/** Balasan server action saat sebuah subtes ditutup. */
export type HasilAksiSubtes =
  | { status: "lanjut"; subtes: string; namaSubtes: string }
  | { status: "selesai"; attemptId: number }
  | { status: "gagal"; pesan: string };

/** Balasan `GET /api/exam/state`. */
export interface BalasanKeadaan {
  ok: boolean;
  selesai: boolean;
  /** Subtes yang seharusnya aktif menurut server. */
  subtes: string | null;
  /** Timer subtes tersebut sudah menyala (baris `attempt_subtes` ada). */
  sudahMulai: boolean;
  sisaDetik: number;
  attemptId: number;
}
