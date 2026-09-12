import { integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

/**
 * Peserta, pengelola, dan guru — satu tabel, dibedakan `role`.
 *
 * KENAPA `mode: "string"` PADA SETIAP KOLOM WAKTU. `src/lib/db.ts` memasang
 * penerjemah tipe yang memulangkan `timestamptz` sebagai teks
 * "YYYY-MM-DD HH:MM:SS" waktu Asia/Jakarta, bukan objek `Date`, karena kode di
 * atasnya menampilkan kolom waktu apa adanya di layar. Penerjemah itu berlaku
 * untuk SELURUH koneksi `pg` di proses ini — termasuk yang dipakai Drizzle.
 * Menyatakan `mode: "date"` di sini hanya akan membuat tipe TypeScript-nya
 * BERBOHONG tentang apa yang benar-benar datang dari basis data.
 */
export const users = pgTable(
  "users",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    nama: text("nama").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("siswa"),
    asalSekolah: text("asal_sekolah"),
    noHp: text("no_hp"),
    targetPtn: text("target_ptn"),
    targetProdi: text("target_prodi"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    namaLogin: text("nama_login"),
    nisn: text("nisn"),
    kelas: text("kelas"),
    tanggalLahir: text("tanggal_lahir"),
    foto: text("foto"),
    /**
     * Batas wewenang pengelola. NULL = penuh, 'ielts' = panel IELTS saja.
     * Selalu NULL untuk siswa.
     *
     * Nullable tanpa nilai bawaan, dan itu disengaja: nilai bawaan apa pun
     * selain NULL akan MENCABUT wewenang setiap pengelola yang sudah ada
     * dalam satu pernyataan migrasi. Lihat `db/05-samakan-produksi.sql`.
     */
    lingkup: text("lingkup"),
  },
  (t) => [unique("users_email_key").on(t.email)],
);

/**
 * Satu akun, satu perangkat. Kunci utamanya `user_id` — bukan `id` — karena
 * tabel ini memang hanya boleh memuat SATU baris per peserta: itulah yang
 * membuat login di perangkat kedua menendang yang pertama.
 */
export const pesertaSesi = pgTable("peserta_sesi", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  sid: text("sid").notNull(),
  alat: text("alat"),
  masukAt: timestamp("masuk_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  terakhirAt: timestamp("terakhir_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});
