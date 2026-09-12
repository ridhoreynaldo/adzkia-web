import { index, integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { attempts } from "./attempts";
import { questions } from "./questions";

/**
 * Jawaban peserta. SATU baris per (sesi, butir) — dijamin kunci unik di bawah,
 * dan itulah yang membuat autosave idempoten: kiriman ulang dari peramban yang
 * mencoba lagi hanya menimpa baris yang sama, tidak pernah menggandakannya.
 *
 * `ragu` bertipe `integer` 0/1, warisan SQLite yang dipertahankan.
 */
export const answers = pgTable(
  "answers",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    attemptId: integer("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    jawaban: text("jawaban"),
    ragu: integer("ragu").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    // Kunci autosave. Dipakai `ON CONFLICT` di `AnswerRepository.simpanBanyak`.
    unique("answers_attempt_id_question_id_key").on(t.attemptId, t.questionId),
    // Arah sebaliknya — "jawaban mana yang menunjuk butir ini" — dipakai saat
    // pengelola menghapus atau mengganti sebuah soal.
    index("idx_ans_soal").on(t.questionId),
  ],
);
