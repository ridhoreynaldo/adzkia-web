/**
 * Aturan FOTO PESERTA yang harus diketahui peramban DAN server.
 *
 * Dipisahkan dari `foto-peserta.ts` yang menyentuh disk, sama seperti hubungan
 * `gambar-soal-konstanta.ts` dengan `gambar-soal.ts`: batas ukuran dan daftar
 * format dipakai di dua sisi sekaligus, dan keduanya wajib memakai angka yang
 * sama supaya peramban tidak pernah menjanjikan sesuatu yang ditolak server.
 */

/** Batas ukuran satu foto peserta. Ditegakkan di peramban DAN di server. */
export const BATAS_FOTO_MB = 1;
export const BATAS_FOTO_BYTE = BATAS_FOTO_MB * 1024 * 1024;

/**
 * Sisi foto sesudah dipotong persegi di peramban.
 *
 * Foto peserta hanya pernah tampil sebesar ±40 px di bilah ujian dan ±96 px di
 * kartu identitas. 512 px sudah lebih dari cukup untuk layar beresolusi tinggi,
 * dan menahannya di angka itu membuat berkas dari kamera ponsel — yang aslinya
 * 3-5 MB — hampir selalu turun jauh di bawah batas tanpa terlihat pecah.
 */
export const SISI_FOTO = 512;

/** Format yang diterima. Sama dengan gambar soal, dikurangi GIF. */
export const FORMAT_FOTO = [
  { mime: "image/png", ext: "png", label: "PNG" },
  { mime: "image/jpeg", ext: "jpg", label: "JPG" },
  { mime: "image/webp", ext: "webp", label: "WEBP" },
] as const;

/** Nilai untuk atribut `accept` pada input berkas. */
export const ACCEPT_FOTO = FORMAT_FOTO.map((f) => f.mime).join(",");

/** Daftar format untuk kalimat bantuan, mis. "PNG, JPG, WEBP". */
export const LABEL_FORMAT_FOTO = FORMAT_FOTO.map((f) => f.label).join(", ");

/**
 * Huruf awal nama untuk foto yang belum ada.
 *
 * Dipakai bersama oleh bilah ujian, kartu identitas, dan pemilih foto, jadi
 * lingkaran penggantinya selalu menampilkan huruf yang sama persis di mana pun
 * ia muncul. Maksimal dua huruf: "Muhammad Farras Fatih" -> "MF".
 */
export function inisialNama(nama: string): string {
  const kata = nama
    .trim()
    .split(/\s+/)
    .filter((k) => /[A-Za-z]/.test(k));
  if (kata.length === 0) return "?";
  const huruf = kata.slice(0, 2).map((k) => k[0]!.toUpperCase());
  return huruf.join("");
}
