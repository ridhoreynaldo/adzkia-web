/**
 * Bentuk paket IELTS yang diawetkan ke dalam aplikasi.
 *
 * Dipisah dari `../paket-bawaan.ts` supaya berkas data di folder ini — yang
 * dibuat mesin, bukan tangan — hanya bergantung pada tipe, tidak pada modul
 * yang menyentuh basis data. Tanpa pemisahan itu, mengimpor satu paket berarti
 * ikut menarik seluruh lapisan penyimpanan.
 *
 * Lihat `scripts/ekspor-paket-ielts.mjs` untuk yang menuliskannya, dan
 * `../paket-bawaan.ts` untuk alasan keberadaan seluruh mekanisme ini.
 */

export interface SeksiBawaan {
  subtes: string;
  nomor: number;
  judul: string | null;
  instruksi: string | null;
  bacaan: string | null;
  transkrip: string | null;
  /**
   * Nama berkas rekaman, TANPA jalur.
   *
   * Namanya adalah cap sidik jari isi berkasnya (lihat `ielts-audio.ts`), jadi
   * satu nilai ini merangkap dua tugas: alamat yang diunduh dari server asal,
   * dan bukti bahwa yang terunduh benar-benar berkas itu.
   */
  audioBerkas: string | null;
  audioNama: string | null;
}

export interface SoalBawaan {
  subtes: string;
  /** Nomor bagiannya, bukan id barisnya — id berbeda di tiap basis data. */
  seksiNomor: number | null;
  nomor: number;
  tipe: string;
  pertanyaan: string;
  opsi: string[];
  kunci: string;
  catatan: string | null;
}

export interface PaketBawaan {
  kode: string;
  nama: string;
  deskripsi: string | null;
  status: string;
  mulai_at: string | null;
  selesai_at: string | null;
  menit: {
    listening: number | null;
    reading: number | null;
    writing: number | null;
    speaking: number | null;
  };
  folderAudio: string;
  seksi: SeksiBawaan[];
  soal: SoalBawaan[];
}
