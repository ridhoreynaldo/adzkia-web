import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { attempts } from "./attempts";
import { packages } from "./packages";
import { users } from "./users";

/**
 * Catatan kepergian peserta dari layar ujian.
 *
 * TIDAK punya kunci unik, dan itu disengaja: satu peserta memang boleh punya
 * banyak catatan, dan tiap catatan adalah kejadian tersendiri. `ronde`
 * memisahkan catatan ujian utama dari ujian susulan — saat sesi yang gugur
 * disetel ulang, jawaban dan nilainya dihapus tetapi pelanggarannya
 * DIPERTAHANKAN sebagai riwayat.
 *
 * `durasi_detik` diisi saat peserta kembali; baris yang `kembali_at`-nya masih
 * NULL berarti peserta belum kembali.
 */
export const violations = pgTable(
  "violations",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    attemptId: integer("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    packageId: integer("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    subtes: text("subtes"),
    jenis: text("jenis").notNull().default("keluar_tab"),
    urutan: integer("urutan").notNull().default(1),
    mulaiAt: timestamp("mulai_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    kembaliAt: timestamp("kembali_at", { withTimezone: true, mode: "string" }),
    durasiDetik: integer("durasi_detik"),
    keterangan: text("keterangan"),
    ronde: integer("ronde").notNull().default(1),
    kejadian: text("kejadian"),
  },
  // Dipakai saat akun peserta dihapus (ON DELETE CASCADE menelusuri user_id).
  (t) => [index("idx_vio_user").on(t.userId)],
);
