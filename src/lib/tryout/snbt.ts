// Konstanta resmi UTBK-SNBT: 7 subtes, 160 soal, 195 menit.
//
// Jalur SKD Kedinasan punya berkasnya sendiri (`skd.ts`); yang di sini hanya
// meminjam namanya supaya fungsi tampilan seperti `namaSubtes()` tetap bisa
// dipakai satu pintu oleh kedua jalur.
import { SESI_SKD, SUBTES_SKD, TOTAL_MENIT_SKD, getSubtesSkd } from "@/lib/tryout/skd";

export type SubtesKode =
  | "PU"
  | "PPU"
  | "PBM"
  | "PK"
  | "LBIND"
  | "LBING"
  | "PM";

export interface Subtes {
  kode: SubtesKode;
  nama: string;
  namaPendek: string;
  jumlahSoal: number;
  durasiMenit: number;
  kelompok: "TPS" | "Literasi";
}

export const SUBTES: Subtes[] = [
  { kode: "PU",    nama: "Penalaran Umum",                     namaPendek: "Penalaran Umum",      jumlahSoal: 30, durasiMenit: 30, kelompok: "TPS" },
  { kode: "PPU",   nama: "Pengetahuan dan Pemahaman Umum",     namaPendek: "Pengetahuan Umum",    jumlahSoal: 20, durasiMenit: 15, kelompok: "TPS" },
  { kode: "PBM",   nama: "Kemampuan Memahami Bacaan dan Menulis", namaPendek: "Bacaan & Menulis", jumlahSoal: 20, durasiMenit: 25, kelompok: "TPS" },
  { kode: "PK",    nama: "Pengetahuan Kuantitatif",            namaPendek: "Kuantitatif",         jumlahSoal: 20, durasiMenit: 20, kelompok: "TPS" },
  { kode: "LBIND", nama: "Literasi dalam Bahasa Indonesia",    namaPendek: "Literasi Indonesia",  jumlahSoal: 30, durasiMenit: 45, kelompok: "Literasi" },
  { kode: "LBING", nama: "Literasi dalam Bahasa Inggris",      namaPendek: "Literasi Inggris",    jumlahSoal: 20, durasiMenit: 30, kelompok: "Literasi" },
  { kode: "PM",    nama: "Penalaran Matematika",               namaPendek: "Penalaran Matematika",jumlahSoal: 20, durasiMenit: 30, kelompok: "Literasi" },
];

export const URUTAN_SUBTES: SubtesKode[] = SUBTES.map((s) => s.kode);

export const TOTAL_SOAL = SUBTES.reduce((a, s) => a + s.jumlahSoal, 0);   // 160
export const TOTAL_MENIT = SUBTES.reduce((a, s) => a + s.durasiMenit, 0); // 195

export function getSubtes(kode: string): Subtes | undefined {
  return SUBTES.find((s) => s.kode === kode);
}

export function namaSubtes(kode: string): string {
  if (kode === SESI_SKD) return "Seleksi Kompetensi Dasar";
  return getSubtes(kode)?.nama ?? getSubtesSkd(kode)?.nama ?? kode;
}

/**
 * Lama satu sesi berjalan, dalam menit.
 *
 * UTBK memakai timer per subtes, jadi nilainya diambil dari daftar subtes.
 * SKD hanya punya satu sesi utuh 100 menit dengan kode semu `SESI_SKD`.
 */
export function durasiSesi(kode: string): number | null {
  if (kode === SESI_SKD) return TOTAL_MENIT_SKD;
  return getSubtes(kode)?.durasiMenit ?? null;
}

/** Semua kode subtes yang sah pada kedua jalur — dipakai validasi impor soal. */
export const SEMUA_KODE_SUBTES: string[] = [
  ...SUBTES.map((s) => s.kode),
  ...SUBTES_SKD.map((s) => s.kode),
];

/**
 * Bentuk subtes seadanya — hanya bagian yang sama-sama dipunyai UTBK dan SKD.
 *
 * Panel admin (bank soal, editor butir, pratinjau) hanya perlu tahu kode, nama,
 * dan kuota soalnya. Sisanya — durasi per subtes untuk UTBK, ambang batas untuk
 * SKD — tidak sejajar antarjalur dan memang tidak dipakai di sana.
 */
export interface SubtesRingkas {
  kode: string;
  nama: string;
  namaPendek: string;
  jumlahSoal: number;
}

function keRingkas(s: {
  kode: string;
  nama: string;
  namaPendek: string;
  jumlahSoal: number;
}): SubtesRingkas {
  return { kode: s.kode, nama: s.nama, namaPendek: s.namaPendek, jumlahSoal: s.jumlahSoal };
}

const RINGKAS_UTBK: SubtesRingkas[] = SUBTES.map(keRingkas);
const RINGKAS_SKD: SubtesRingkas[] = SUBTES_SKD.map(keRingkas);

/**
 * Daftar subtes yang berlaku pada satu jalur paket.
 *
 * Panel admin dulu selalu memakai `SUBTES` — daftar UTBK — sehingga paket SKD
 * tampak kosong di Bank Soal padahal butirnya ada, dan butir TWK/TIU/TKP yang
 * dibuka di editor selalu ditolak dengan "Subtes tidak dikenal". Satu pintu ini
 * yang membuat kedua jalur memakai daftarnya masing-masing.
 */
export function subtesJalur(jalur: string | null | undefined): SubtesRingkas[] {
  return jalur === "skd" ? RINGKAS_SKD : RINGKAS_UTBK;
}

/** Kuota soal satu jalur: 160 untuk UTBK, 110 untuk SKD. */
export function totalSoalJalur(jalur: string | null | undefined): number {
  return subtesJalur(jalur).reduce((a, s) => a + s.jumlahSoal, 0);
}

/** Info satu subtes tanpa peduli jalurnya. Kode kedua jalur tidak pernah bentrok. */
export function getSubtesApaPun(kode: string): SubtesRingkas | undefined {
  return RINGKAS_UTBK.find((s) => s.kode === kode) ?? RINGKAS_SKD.find((s) => s.kode === kode);
}

/**
 * Tipe butir sesuai juknis UTBK:
 * - PG  : pilihan ganda satu jawaban (A-E)
 * - PGK : pilihan ganda kompleks, boleh lebih dari satu jawaban
 * - BS  : tabel pernyataan Benar/Salah — tiap pernyataan dijawab B atau S
 * - IS  : isian singkat
 */
export type TipeSoal = "PG" | "PGK" | "BS" | "IS";

export const LABEL_TIPE: Record<TipeSoal, string> = {
  PG: "Pilihan Ganda",
  PGK: "Jawaban Ganda",
  BS: "Benar / Salah",
  IS: "Isian Singkat",
};

/** Nilai yang sah untuk satu baris pernyataan pada soal Benar/Salah. */
export const LABEL_BS = ["B", "S"] as const;

export const LABEL_OPSI = ["A", "B", "C", "D", "E"] as const;
