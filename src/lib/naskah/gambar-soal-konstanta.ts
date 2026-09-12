/**
 * Aturan GAMBAR SOAL yang harus diketahui kedua sisi.
 *
 * Batas ukuran dan daftar format dipakai di peramban (memilih berkas,
 * mengecilkannya, menyusun pesan galat) DAN di server (menolak yang melanggar).
 * Keduanya wajib memakai angka yang sama, jadi angkanya tinggal di berkas murni
 * tanpa `server-only` ini — sama seperti `admin-konstanta.ts` terhadap
 * `admin.ts`. Bagian yang menyentuh disk ada di `gambar-soal.ts`.
 */

/** Batas ukuran satu gambar soal. Ditegakkan di peramban DAN di server. */
export const BATAS_GAMBAR_MB = 1;
export const BATAS_GAMBAR_BYTE = BATAS_GAMBAR_MB * 1024 * 1024;

/** Format yang diterima, beserta ekstensi bakunya. */
export const FORMAT_GAMBAR = [
  { mime: "image/png", ext: "png", label: "PNG" },
  { mime: "image/jpeg", ext: "jpg", label: "JPG" },
  { mime: "image/webp", ext: "webp", label: "WEBP" },
  { mime: "image/gif", ext: "gif", label: "GIF" },
] as const;

/** Nilai untuk atribut `accept` pada input berkas. */
export const ACCEPT_GAMBAR = FORMAT_GAMBAR.map((f) => f.mime).join(",");

/** Daftar format untuk kalimat bantuan, mis. "PNG, JPG, WEBP, GIF". */
export const LABEL_FORMAT_GAMBAR = FORMAT_GAMBAR.map((f) => f.label).join(", ");
