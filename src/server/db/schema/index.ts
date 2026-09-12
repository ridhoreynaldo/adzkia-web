/**
 * Skema Drizzle — JALUR UJIAN SAJA.
 *
 * Yang ada di sini adalah tabel yang disentuh saat peserta benar-benar
 * mengerjakan ujian: peserta, paket, butir soal, sesi, jawaban, timer, nilai,
 * dan pelanggaran. Tabel lain (IELTS, Warung, prodi, kampus, admin_sesi,
 * pengaturan) SENGAJA belum dipetakan — kode yang memakainya masih berjalan
 * lewat `src/lib/db.ts` dan tidak ada gunanya memindahkannya sebelum ada
 * alasannya.
 *
 * Bacalah ini sebagai potret basis data yang SUDAH ADA, bukan rancangan baru.
 * Sumber kebenarannya tetap `db/01-adzkia-postgres.sql` +
 * `db/04-indeks-konkurensi.sql`; berkas-berkas di sini harus mengikutinya,
 * bukan sebaliknya. `npm run cek:skema` membandingkan keduanya.
 */
export * from "./users";
export * from "./packages";
export * from "./questions";
export * from "./attempts";
export * from "./answers";
export * from "./results";
export * from "./violations";
