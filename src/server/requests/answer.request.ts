import type { ItemSimpan } from "@/server/repositories/answer.repository";

/**
 * Pemeriksaan bentuk kiriman autosave — lapisan "request".
 *
 * TUGASNYA HANYA BENTUK, BUKAN WEWENANG. Yang diputuskan di sini: apakah
 * bodinya JSON yang masuk akal, apakah id butirnya bilangan bulat, apakah
 * jawabannya bisa dijadikan teks, dan apakah panjangnya wajar. Yang TIDAK
 * diputuskan di sini: apakah sesinya milik peserta ini, apakah butirnya milik
 * paket ini, dan apakah waktunya masih ada. Ketiganya diputuskan
 * `AnswerService` dengan bertanya ke basis data, karena ketiganya bergantung
 * pada keadaan yang bisa berubah di antara dua permintaan.
 *
 * Memisahkannya begini membuat aturan bentuk bisa diuji tanpa basis data sama
 * sekali, dan membuat rute API tinggal memanggil satu fungsi.
 */

/** Batas panjang satu jawaban. Isian singkat terpanjang pun jauh di bawah ini. */
const BATAS_PANJANG_JAWABAN = 5000;

/**
 * Batas banyak butir dalam satu kiriman.
 *
 * Paket terpanjang di aplikasi ini 160 butir, jadi 200 memberi kelonggaran
 * tanpa membuka pintu bagi kiriman sepanjang puluhan ribu baris yang akan
 * membuat satu permintaan menahan koneksi pool lebih lama daripada yang pantas.
 * Kelebihannya DIPOTONG, bukan ditolak: peserta yang jaringannya baru pulih
 * lebih baik menyimpan 200 butir pertamanya daripada kehilangan semuanya.
 */
const BATAS_BUTIR = 200;

export interface BodiSimpanJawabanMentah {
  attemptId?: unknown;
  jawaban?: unknown;
  questionId?: unknown;
  nilai?: unknown;
  ragu?: unknown;
}

export interface PermintaanSimpanJawaban {
  attemptId: number;
  items: ItemSimpan[];
}

export type HasilPeriksa<T> =
  | { ok: true; nilai: T }
  | { ok: false; pesan: string; status: 400 | 404 };

/**
 * Menormalkan satu butir. `null` berarti butirnya tidak bisa dipakai dan
 * dibuang diam-diam — kiriman dari ruang ujian kadang memuat slot kosong, dan
 * itu bukan alasan membuang butir lain yang sah.
 */
function normalkanItem(v: unknown): ItemSimpan | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;

  // Dua ejaan diterima karena keduanya benar-benar dikirim: ruang ujian memakai
  // `questionId`, sementara beberapa jalur lama memakai `question_id`.
  const questionId = Number(o.questionId ?? o.question_id);
  if (!Number.isInteger(questionId) || questionId <= 0) return null;

  const mentah = o.jawaban ?? o.nilai ?? null;
  let jawaban: string | null = null;
  if (typeof mentah === "string") jawaban = mentah;
  // Soal pilihan ganda kompleks (PGK) mengirim larik; disimpan sebagai JSON
  // teks, bentuk yang sama dengan yang dibaca kembali saat penilaian.
  else if (Array.isArray(mentah)) jawaban = JSON.stringify(mentah.map((x) => String(x)));
  else if (typeof mentah === "number") jawaban = String(mentah);

  if (jawaban !== null && jawaban.length > BATAS_PANJANG_JAWABAN) {
    jawaban = jawaban.slice(0, BATAS_PANJANG_JAWABAN);
  }
  if (jawaban !== null && jawaban.trim() === "") jawaban = null;

  return { questionId, jawaban, ragu: o.ragu === true || o.ragu === 1 };
}

/**
 * Memeriksa satu bodi permintaan autosave.
 *
 * Menerima DUA bentuk, dan keduanya harus tetap didukung: sekumpulan butir
 * (`jawaban: [...]`, dipakai autosave berkala) dan satu butir di tingkat atas
 * (`questionId` + `nilai`, dipakai saat peserta menekan satu pilihan). Bentuk
 * kedua dibungkus menjadi larik satu isi supaya sisa jalurnya cuma satu.
 */
export function periksaSimpanJawaban(body: unknown): HasilPeriksa<PermintaanSimpanJawaban> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, pesan: "Format permintaan tidak valid.", status: 400 };
  }
  const b = body as BodiSimpanJawabanMentah;

  const attemptId = Number(b.attemptId);
  if (!Number.isInteger(attemptId) || attemptId <= 0) {
    return { ok: false, pesan: "Sesi ujian tidak ditemukan.", status: 404 };
  }

  const mentah: unknown[] = Array.isArray(b.jawaban)
    ? b.jawaban.slice(0, BATAS_BUTIR)
    : [{ questionId: b.questionId, jawaban: b.nilai, ragu: b.ragu }];

  const items = mentah
    .map(normalkanItem)
    .filter((x): x is ItemSimpan => x !== null);

  if (items.length === 0) {
    return { ok: false, pesan: "Tidak ada jawaban untuk disimpan.", status: 400 };
  }

  return { ok: true, nilai: { attemptId, items } };
}
