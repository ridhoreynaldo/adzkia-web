import { doublePrecision, integer, pgTable, text, unique } from "drizzle-orm/pg-core";

import { attempts } from "./attempts";

/**
 * Nilai per subtes. `theta` adalah kemampuan hasil IRT (Rasch/1PL); `skor`
 * adalah skala 0–1000 yang ditampilkan ke peserta.
 */
export const results = pgTable(
  "results",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    attemptId: integer("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    subtes: text("subtes").notNull(),
    benar: integer("benar").notNull().default(0),
    salah: integer("salah").notNull().default(0),
    kosong: integer("kosong").notNull().default(0),
    skor: doublePrecision("skor").notNull().default(0),
    theta: doublePrecision("theta").notNull().default(0),
  },
  (t) => [unique("results_attempt_id_subtes_key").on(t.attemptId, t.subtes)],
);
