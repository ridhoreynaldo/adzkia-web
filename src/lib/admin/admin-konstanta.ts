/**
 * Tipe & konstanta admin yang MURNI (tanpa akses database).
 *
 * Dipisahkan dari `@/lib/admin` karena file itu memakai `server-only`:
 * komponen klien seperti AdminUI/ImporForm butuh label status, tetapi tidak
 * boleh ikut menarik kode database ke dalam bundel browser.
 */

export type PaketStatus = "draft" | "published" | "closed";
export type LevelSoal = "C3" | "C4";
export type PeranPengguna = "siswa" | "admin";

/** Jalur latihan sebuah paket. Menentukan struktur subtes dan cara menilai. */
export const JALUR_PAKET = ["utbk", "skd"] as const;
export type JalurPaketAdmin = (typeof JALUR_PAKET)[number];

export const LABEL_JALUR: Record<JalurPaketAdmin, string> = {
  utbk: "Tryout Real UTBK-SNBT",
  skd: "SKD Kedinasan",
};

export const STATUS_PAKET: PaketStatus[] = ["draft", "published", "closed"];

export const LABEL_STATUS: Record<PaketStatus, string> = {
  draft: "Draf",
  published: "Terbit",
  closed: "Ditutup",
};

/** Komposisi level sesuai juknis: C3 60%, C4 40%. */
export const TARGET_C3 = 0.6;
export const TARGET_C4 = 0.4;
/** Selisih maksimal yang masih dianggap wajar (10 poin persen). */
export const TOLERANSI_KOMPOSISI = 0.1;

/* ------------------------------------------------------------------ *
 * Alamat pintu masuk pengelola
 * ------------------------------------------------------------------ */

/**
 * Alamat halaman login admin. Ditetapkan pengguna 4 September 2026, menggantikan
 * `/login/admin` yang alamatnya terlalu mudah ditebak. Alamat lama SENGAJA
 * dimatikan (404) — membiarkannya hidup berdampingan membuat penggantian ini
 * tidak ada gunanya.
 *
 * Ditaruh di berkas ini, bukan di `@/lib/auth`, karena `PintuPengelola` adalah
 * komponen klien: mengimpor `auth.ts` dari sana akan menyeret kode database ke
 * bundel browser.
 *
 * Tetap PENYAMARAN, bukan pengamanan — yang benar-benar menjaga panel adalah
 * `requireAdmin()` beserta kata sandi admin.
 */
export const RUTE_LOGIN_ADMIN = "/ADZ-ADM4S";

/**
 * TIDAK ADA pintu masuk terpisah untuk pengelola IELTS — dan itu disengaja.
 *
 * `/IELTS-Globe-Adzkia` sempat berdiri sendiri (10 September 2026) lalu DIHAPUS
 * 11 September 2026 atas permintaan pengelola: dua pintu menuju panel yang
 * ternyata saling terhubung hanya menambah alamat yang harus diingat, tanpa
 * menambah penjagaan sedikit pun.
 *
 * Pengelola IELTS kini masuk lewat {@link RUTE_LOGIN_ADMIN} yang sama dengan
 * pengelola penuh, dan tetap mendarat di panel IELTS — `loginAdminAction`
 * menentukan tujuannya dari LINGKUP AKUN, bukan dari pintu yang dipakai, dan
 * `requireAdmin()` tetap menolak mereka di panel lain. Jangan membangun pintu
 * kedua lagi tanpa permintaan baru.
 */

/** Halaman pertama yang dilihat pengelola IELTS sesudah masuk. */
export const RUTE_PANEL_IELTS = "/admin/ielts";

/* ------------------------------------------------------------------ *
 * Akun demo / pengelola kelas
 * ------------------------------------------------------------------ */

/**
 * Awalan NISN yang menandai AKUN DEMO, bukan siswa sungguhan.
 *
 * Ditetapkan pengelola 11 September 2026: *"awalan nisn 0089 itu ga usah
 * dibuat kelas, tapi buat namanya 'akun demo'."*
 *
 * Isinya akun wali kelas, guru, dan akun coba-coba — 170 akun pada hari itu.
 * Sebagian di antaranya terlanjur memakai nama kelas sungguhan pada kolom
 * `kelas` (mis. "XII Oxford"), sehingga kalau dikelompokkan apa adanya mereka
 * menyusup ke daftar kelas yang seharusnya berisi siswa saja — dan jumlah
 * "peserta per kelas" yang dibaca pengelola menjadi keliru.
 *
 * Penandanya NISN, BUKAN kolom kelas, justru karena kolom kelas itulah yang
 * tidak bisa dipercaya.
 */
export const AWALAN_NISN_DEMO = "0089";

/** Nama kelompok yang menampung seluruh akun demo di halaman peserta. */
export const LABEL_KELAS_DEMO = "Akun Demo";

/** true bila NISN ini milik akun demo, bukan siswa sungguhan. */
export function akunDemo(nisn: string | null | undefined): boolean {
  return (nisn ?? "").trim().startsWith(AWALAN_NISN_DEMO);
}
