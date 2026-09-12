import { integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { users } from "./users";

/**
 * Paket tryout. `jalur` memisahkan UTBK-SNBT dari SKD Kedinasan; keduanya
 * memakai mesin ujian yang sama dan hanya berbeda urutan subtes serta rumus
 * nilainya.
 *
 * `acak_soal` dan `tampil_pembahasan` bertipe `integer` 0/1, BUKAN `boolean`.
 * Itu warisan SQLite yang SENGAJA dipertahankan: kolomnya dibaca apa adanya
 * oleh puluhan tempat di `src/lib` dan oleh berkas seed, dan mengubahnya jadi
 * boolean adalah migrasi data yang tidak dibutuhkan siapa pun hari ini.
 */
export const packages = pgTable(
  "packages",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    kode: text("kode").notNull(),
    nama: text("nama").notNull(),
    deskripsi: text("deskripsi"),
    status: text("status").notNull().default("draft"),
    mulaiAt: timestamp("mulai_at", { withTimezone: true, mode: "string" }),
    selesaiAt: timestamp("selesai_at", { withTimezone: true, mode: "string" }),
    acakSoal: integer("acak_soal").notNull().default(0),
    tampilPembahasan: integer("tampil_pembahasan").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    jalur: text("jalur").notNull().default("utbk"),
    siklus: text("siklus"),
  },
  (t) => [unique("packages_kode_key").on(t.kode)],
);

/**
 * Pembatas peserta. ATURAN YANG MENENTUKAN: paket yang TIDAK punya satu pun
 * baris di `paket_kelas` MAUPUN `paket_peserta` terbuka untuk semua peserta.
 * Begitu salah satunya terisi, paket menjadi tertutup — dan itu pernah membuat
 * peserta tidak bisa masuk tanpa pesan galat apa pun.
 */
export const paketKelas = pgTable(
  "paket_kelas",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    packageId: integer("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    kelas: text("kelas").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (t) => [unique("paket_kelas_package_id_kelas_key").on(t.packageId, t.kelas)],
);

export const paketPeserta = pgTable(
  "paket_peserta",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    packageId: integer("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (t) => [unique("paket_peserta_package_id_user_id_key").on(t.packageId, t.userId)],
);

/** Izin ujian susulan, satu per peserta per paket. */
export const susulan = pgTable(
  "susulan",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    packageId: integer("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    diberikanOleh: integer("diberikan_oleh").references(() => users.id, { onDelete: "set null" }),
    catatan: text("catatan"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    dipakaiAt: timestamp("dipakai_at", { withTimezone: true, mode: "string" }),
  },
  (t) => [unique("susulan_user_id_package_id_key").on(t.userId, t.packageId)],
);
