import type { ReactNode } from "react";

import { wajibFiturLanguage } from "@/lib/ielts/language";

export const metadata = {
  title: "Language Skill",
  description:
    "Latihan IELTS dan TOEFL ADZKIA SMART: masuk dengan NISN, pilih ujiannya, lalu berlatih empat keterampilan berbahasa Inggris.",
};

// Seluruh cabang /language dirender per permintaan. Bukan soal kecepatan:
// gerbangnya membaca alamat yang diketik peramban, dan halaman statis akan
// membekukan keputusan "tampil" dari komputer pengembang lalu membawanya ikut
// terbit ke server.
export const dynamic = "force-dynamic";

/**
 * Pembungkus LANGUAGE SKILL.
 *
 * Dua tugas: (1) menutup seluruh cabang ini di server produksi — satu gerbang
 * di sini menjaga semua halaman di bawahnya sekaligus, dan (2) memasang tema
 * kertas krem yang membuat .card/.btn/.input yang sama berganti rupa, pola
 * yang sama dipakai `tema-warung` dan `tema-skd`.
 */
export default async function LanguageLayout({ children }: { children: ReactNode }) {
  await wajibFiturLanguage();

  return (
    <div className="tema-language kertas-language flex min-h-dvh flex-1 flex-col">{children}</div>
  );
}
