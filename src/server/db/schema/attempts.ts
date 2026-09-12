import { sql } from "drizzle-orm";
import { doublePrecision, index, integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { packages } from "./packages";
import { users } from "./users";

/**
 * Satu sesi pengerjaan peserta atas satu paket.
 *
 * `UNIQUE (user_id, package_id)` BUKAN sekadar kerapian skema — itulah yang
 * membuat "Mulai" aman ditekan berkali-kali, ditekan dari dua tab sekaligus,
 * atau diulang oleh peramban yang mencoba lagi sesudah jaringan putus. Tanpa
 * batasan itu, dua permintaan yang tiba bersamaan menghasilkan dua sesi dan
 * peserta kehilangan jawabannya di salah satunya. Lihat `ExamService.mulai()`.
 *
 * `denyut_at` / `denyut_aktif` adalah nadi ruang ujian: peramban mengirimnya
 * tiap 5 detik, dan jeda yang terlalu panjang menggugurkan peserta.
 */
export const attempts = pgTable(
  "attempts",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    packageId: integer("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("ongoing"),
    subtesAktif: text("subtes_aktif"),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "string" }),
    totalSkor: doublePrecision("total_skor"),
    jalur: text("jalur").notNull().default("utama"),
    ronde: integer("ronde").notNull().default(1),
    digugurkanAt: timestamp("digugurkan_at", { withTimezone: true, mode: "string" }),
    alasanGugur: text("alasan_gugur"),
    denyutAt: timestamp("denyut_at", { withTimezone: true, mode: "string" }),
    denyutAktif: integer("denyut_aktif").notNull().default(0),
  },
  (t) => [
    unique("attempts_user_id_package_id_key").on(t.userId, t.packageId),
    // Kunci uniknya hanya membantu pencarian yang DIMULAI dari user_id;
    // seluruh panel pengelola bertanya ke arah sebaliknya, "siapa saja yang
    // mengerjakan paket ini".
    index("idx_att_paket").on(t.packageId),
    // Indeks parsial: sebesar jumlah peserta yang sedang ujian, bukan sebesar
    // seluruh riwayat, sehingga muat di memori sepanjang hari-H.
    index("idx_att_ongoing")
      .on(t.packageId, t.denyutAt)
      .where(sql`status = 'ongoing'`),
  ],
);

/**
 * Timer per subtes. `deadline_at` ditetapkan SEKALI saat subtes dibuka dan
 * tidak pernah diperpanjang — itulah sebabnya `mulaiSubtes` idempoten.
 */
export const attemptSubtes = pgTable(
  "attempt_subtes",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    attemptId: integer("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    subtes: text("subtes").notNull(),
    mulaiAt: timestamp("mulai_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    deadlineAt: timestamp("deadline_at", { withTimezone: true, mode: "string" }).notNull(),
    selesaiAt: timestamp("selesai_at", { withTimezone: true, mode: "string" }),
  },
  (t) => [unique("attempt_subtes_attempt_id_subtes_key").on(t.attemptId, t.subtes)],
);
