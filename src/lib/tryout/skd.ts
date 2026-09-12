/**
 * Konstanta resmi SKD Kedinasan: 3 subtes, 110 soal, satu sesi 100 menit.
 *
 * Acuan angka di berkas ini:
 *   - PermenPANRB No. 13 Tahun 2026 tentang Penerimaan Peserta Didik Sekolah
 *     Kedinasan (struktur tes dan bobot jawaban).
 *   - KepmenPANRB No. 406 Tahun 2026 tentang Nilai Ambang Batas SKD
 *     (TWK 65, TIU 80, TKP 156; jalur afirmasi TIU 55 dan kumulatif 281).
 *
 * Berbeda dari UTBK yang memakai timer per subtes dan penilaian IRT, SKD
 * dikerjakan dalam satu sesi utuh dan dinilai dengan poin tetap, lalu
 * dibandingkan terhadap nilai ambang batas (passing grade).
 */

export type SubtesSkdKode = "TWK" | "TIU" | "TKP";

/**
 * Cara sebuah subtes dinilai.
 *
 *   dikotomi  : benar 5 poin, salah maupun kosong 0 (TWK & TIU).
 *   politomi  : setiap pilihan punya bobot 1-5, hanya kosong yang 0 (TKP).
 */
export type PenilaianSkd = "dikotomi" | "politomi";

export interface SubtesSkd {
  kode: SubtesSkdKode;
  nama: string;
  namaPendek: string;
  jumlahSoal: number;
  penilaian: PenilaianSkd;
  /** Nilai ambang batas resmi (formasi umum). */
  ambang: number;
  /** Nilai tertinggi yang mungkin dicapai pada subtes ini. */
  nilaiMaks: number;
  keterangan: string;
}

/** Poin untuk jawaban benar pada TWK dan TIU. Salah maupun kosong bernilai 0. */
export const POIN_BENAR = 5;

/**
 * Rentang nilai tiap pilihan pada TKP.
 *
 * TKP_MIN = 1 bukan 0: opsi terburuk sekalipun tetap memberi 1 poin, dan hanya
 * soal yang TIDAK dijawab yang bernilai 0. Selisih satu poin per butir inilah
 * yang kerap menentukan lolos-tidaknya ambang 156.
 */
export const TKP_MIN = 1;
export const TKP_MAKS = 5;

export const SUBTES_SKD: SubtesSkd[] = [
  {
    kode: "TWK",
    nama: "Tes Wawasan Kebangsaan",
    namaPendek: "Wawasan Kebangsaan",
    jumlahSoal: 30,
    penilaian: "dikotomi",
    ambang: 65,
    nilaiMaks: 150,
    keterangan: "Nasionalisme, integritas, bela negara, pilar negara, dan bahasa Indonesia.",
  },
  {
    kode: "TIU",
    nama: "Tes Intelegensia Umum",
    namaPendek: "Intelegensia Umum",
    jumlahSoal: 35,
    penilaian: "dikotomi",
    ambang: 80,
    nilaiMaks: 175,
    keterangan: "Kemampuan verbal, numerik, dan figural — analogi, deret, silogisme, dan logika.",
  },
  {
    kode: "TKP",
    nama: "Tes Karakteristik Pribadi",
    namaPendek: "Karakteristik Pribadi",
    jumlahSoal: 45,
    penilaian: "politomi",
    ambang: 156,
    nilaiMaks: 225,
    keterangan:
      "Pelayanan publik, jejaring kerja, sosial budaya, teknologi informasi, dan profesionalisme.",
  },
];

export const URUTAN_SUBTES_SKD: SubtesSkdKode[] = SUBTES_SKD.map((s) => s.kode);

export const TOTAL_SOAL_SKD = SUBTES_SKD.reduce((a, s) => a + s.jumlahSoal, 0); // 110
export const TOTAL_MENIT_SKD = 100;
export const NILAI_MAKS_SKD = SUBTES_SKD.reduce((a, s) => a + s.nilaiMaks, 0); // 550
export const AMBANG_TOTAL_SKD = SUBTES_SKD.reduce((a, s) => a + s.ambang, 0); // 301

/**
 * Kategori peserta menurut KepmenPANRB 406/2026.
 *
 *   umum     : ketiga ambang subtes (65 / 80 / 156) wajib terpenuhi sekaligus.
 *   afirmasi : peserta daerah tertentu atas usulan instansi — hanya TIU yang
 *              diberi ambang (55), ditambah syarat nilai kumulatif minimal 281.
 */
export type KategoriPesertaSkd = "umum" | "afirmasi";

/** Ambang TIU bagi peserta afirmasi daerah tertentu. */
export const AMBANG_AFIRMASI_TIU = 55;
/** Nilai kumulatif minimal bagi peserta afirmasi daerah tertentu. */
export const AMBANG_AFIRMASI_TOTAL = 281;

/**
 * Kode sesi tunggal SKD.
 *
 * Mesin ujian menyimpan timer per "subtes"; SKD hanya punya satu timer untuk
 * seluruh 110 soal, jadi dipakai satu kode semu. TWK/TIU/TKP tetap tersimpan
 * pada tiap butir soal dan dipakai saat menilai.
 */
export const SESI_SKD = "SKD";

export function getSubtesSkd(kode: string): SubtesSkd | undefined {
  return SUBTES_SKD.find((s) => s.kode === kode);
}

export function namaSubtesSkd(kode: string): string {
  return getSubtesSkd(kode)?.nama ?? kode;
}

export function ambangSubtes(kode: string): number {
  return getSubtesSkd(kode)?.ambang ?? 0;
}

/**
 * Nilai kumulatif SKD: penjumlahan langsung ketiga subtes, tanpa pembobotan
 * persentase. Tertinggi 550.
 */
export function totalSkd(nilai: Record<string, number>): number {
  return SUBTES_SKD.reduce((a, s) => a + (nilai[s.kode] ?? 0), 0);
}

/**
 * Lulus ambang batas.
 *
 * Formasi umum: SEMUA subtes harus mencapai ambangnya masing-masing — nilai
 * tinggi di satu subtes tidak menutupi kekurangan di subtes lain.
 * Afirmasi: cukup TIU >= 55 DAN nilai kumulatif >= 281.
 */
export function lulusSkd(
  nilai: Record<string, number>,
  kategori: KategoriPesertaSkd = "umum",
): boolean {
  if (kategori === "afirmasi") {
    return (nilai.TIU ?? 0) >= AMBANG_AFIRMASI_TIU && totalSkd(nilai) >= AMBANG_AFIRMASI_TOTAL;
  }
  return SUBTES_SKD.every((s) => (nilai[s.kode] ?? 0) >= s.ambang);
}

/**
 * Jumlah jawaban benar paling sedikit agar subtes dikotomi melewati ambang —
 * TWK 13 butir, TIU 16 butir. Untuk TKP hasilnya null karena tidak ada
 * benar/salah di sana; ukurannya rata-rata bobot per soal.
 */
export function soalBenarMinimal(kode: string): number | null {
  const s = getSubtesSkd(kode);
  if (!s || s.penilaian !== "dikotomi") return null;
  return Math.ceil(s.ambang / POIN_BENAR);
}

/** Rata-rata poin per soal yang harus dicapai agar subtes lolos ambang. */
export function rataAmbangPerSoal(kode: string): number {
  const s = getSubtesSkd(kode);
  if (!s || s.jumlahSoal === 0) return 0;
  return s.ambang / s.jumlahSoal;
}

/**
 * Nilai satu butir TKP dari `bobot_opsi`.
 *
 * Aturan resminya: yang bernilai 0 HANYA soal yang dikosongkan. Begitu peserta
 * memilih salah satu opsi, butir itu minimal bernilai TKP_MIN — termasuk bila
 * bobot butirnya belum lengkap terisi saat impor, supaya kelalaian data tidak
 * menghukum peserta.
 */
export function nilaiTkp(bobot: number[], jawaban: string | null): number {
  if (!jawaban) return 0;
  const bersih = jawaban.trim().toUpperCase();
  if (bersih === "") return 0;

  const indeks = bersih.charCodeAt(0) - 65; // "A" -> 0
  // Di luar A-E berarti jawabannya bukan pilihan yang sah -> dianggap kosong.
  if (!Number.isInteger(indeks) || indeks < 0 || indeks > 4) return 0;

  const n = bobot[indeks];
  if (!Number.isFinite(n)) return TKP_MIN;
  return Math.min(TKP_MAKS, Math.max(TKP_MIN, n));
}

/** Baca kolom `questions.bobot_opsi` menjadi array angka. */
export function parseBobot(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try {
    const p: unknown = JSON.parse(raw);
    if (!Array.isArray(p)) return [];
    return p.map((v) => {
      const n = Number(v);
      // Bobot di luar 1-5 dirapatkan ke rentang resmi; yang tidak terbaca
      // dibiarkan NaN agar nilaiTkp menurunkannya ke TKP_MIN, bukan ke 0.
      return Number.isFinite(n) ? Math.max(TKP_MIN, Math.min(TKP_MAKS, Math.round(n))) : NaN;
    });
  } catch {
    return [];
  }
}
