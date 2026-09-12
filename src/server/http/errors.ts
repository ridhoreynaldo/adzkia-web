import "server-only";

/**
 * Galat yang boleh dibaca pengguna, dan galat yang tidak.
 *
 * ATURAN TUNGGAL BERKAS INI: pesan basis data TIDAK PERNAH sampai ke peramban.
 * "duplicate key value violates unique constraint answers_attempt_id_..."
 * memberi tahu penyerang nama tabel, nama kolom, dan nama kunci uniknya
 * sekaligus — dan tidak memberi tahu peserta apa pun yang bisa ia lakukan.
 * Peserta menerima kalimat yang bisa ditindaklanjuti; rinciannya masuk ke log
 * server, tempat pengawas bisa mencarinya lewat `rujukan`.
 */

export type KodeGalat =
  | "tidak_masuk"
  | "tidak_berwenang"
  | "tidak_ada"
  | "bentrok"
  | "tidak_valid"
  | "terlalu_sering"
  | "gangguan";

const STATUS: Record<KodeGalat, number> = {
  tidak_masuk: 401,
  tidak_berwenang: 403,
  tidak_ada: 404,
  bentrok: 409,
  tidak_valid: 400,
  terlalu_sering: 429,
  gangguan: 500,
};

/**
 * Galat yang pesannya memang ditujukan untuk pengguna.
 *
 * Dilempar oleh lapisan service. Apa pun yang BUKAN jenis ini dianggap galat
 * tak terduga dan diganti kalimat umum sebelum dikirim keluar.
 */
export class GalatTampil extends Error {
  readonly kode: KodeGalat;

  constructor(kode: KodeGalat, pesan: string) {
    super(pesan);
    this.name = "GalatTampil";
    this.kode = kode;
  }
}

export const galat = {
  tidakMasuk: (p = "Sesi berakhir. Silakan masuk lagi.") => new GalatTampil("tidak_masuk", p),
  tidakBerwenang: (p = "Kamu tidak berhak membuka halaman ini.") =>
    new GalatTampil("tidak_berwenang", p),
  tidakAda: (p = "Data tidak ditemukan.") => new GalatTampil("tidak_ada", p),
  bentrok: (p: string) => new GalatTampil("bentrok", p),
  tidakValid: (p: string) => new GalatTampil("tidak_valid", p),
  terlaluSering: (p = "Terlalu banyak permintaan. Coba lagi sebentar.") =>
    new GalatTampil("terlalu_sering", p),
};

/** Nomor pendek untuk mencocokkan keluhan pengguna dengan baris log. */
function rujukanBaru(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export interface BadanGalat {
  ok: false;
  pesan: string;
  kode: KodeGalat;
  /** Hanya ada pada galat tak terduga; disebut pengguna saat melapor. */
  rujukan?: string;
}

/**
 * Mengubah galat apa pun menjadi jawaban HTTP yang aman.
 *
 * Galat tak terduga DICATAT UTUH di server — termasuk jejak tumpukannya — lalu
 * dijawab dengan kalimat umum plus nomor rujukan. Itu membuat keluhan "error
 * pas simpan jawaban" bisa ditelusuri tanpa menunjukkan isi perut aplikasi
 * kepada orang yang mengetuknya.
 */
export function jawabGalat(e: unknown, konteks: string): Response {
  if (e instanceof GalatTampil) {
    const badan: BadanGalat = { ok: false, pesan: e.message, kode: e.kode };
    return Response.json(badan, { status: STATUS[e.kode] });
  }

  const rujukan = rujukanBaru();
  console.error(
    `[galat ${rujukan}] ${konteks}:`,
    e instanceof Error ? (e.stack ?? e.message) : e,
  );

  const badan: BadanGalat = {
    ok: false,
    pesan: "Terjadi gangguan di server. Jawabanmu yang sudah tersimpan tidak hilang.",
    kode: "gangguan",
    rujukan,
  };
  return Response.json(badan, { status: 500 });
}
