import { doublePrecision, integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { packages } from "./packages";

/**
 * Butir soal.
 *
 * `opsi` dan `bobot_opsi` adalah JSON YANG DISIMPAN SEBAGAI TEKS, dan tetap
 * dibiarkan begitu. Bukan karena `jsonb` tidak lebih baik, melainkan karena
 * tidak ada satu pun query di aplikasi ini yang MENANYAI isi kedua kolom itu —
 * keduanya selalu diambil utuh lalu di-`JSON.parse` di JavaScript. Memindahkan
 * ke `jsonb` berarti migrasi 160 butir × puluhan paket demi nol query yang
 * lebih cepat.
 */
export const questions = pgTable(
  "questions",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    packageId: integer("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    subtes: text("subtes").notNull(),
    nomor: integer("nomor").notNull(),
    tipe: text("tipe").notNull().default("PG"),
    level: text("level").notNull().default("C3"),
    stimulus: text("stimulus"),
    pertanyaan: text("pertanyaan").notNull(),
    gambarUrl: text("gambar_url"),
    opsi: text("opsi").notNull().default("[]"),
    kunci: text("kunci").notNull(),
    pembahasan: text("pembahasan"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    bobotOpsi: text("bobot_opsi"),
  },
  (t) => [unique("questions_package_id_subtes_nomor_key").on(t.packageId, t.subtes, t.nomor)],
);

/** Parameter butir hasil kalibrasi IRT. Satu baris per soal. */
export const itemParams = pgTable("item_params", {
  questionId: integer("question_id")
    .primaryKey()
    .references(() => questions.id, { onDelete: "cascade" }),
  b: doublePrecision("b").notNull().default(0),
  pBenar: doublePrecision("p_benar").notNull().default(0),
  nPeserta: integer("n_peserta").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});
