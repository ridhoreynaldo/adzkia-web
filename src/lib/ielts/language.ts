import "server-only";

import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { bolehLanguageSkills } from "@/lib/ielts/language-konstanta";

export * from "@/lib/ielts/language-konstanta";

/**
 * Gerbang fitur LANGUAGE SKILL.
 *
 * Fitur ini masih dibangun dan atas permintaan pengelola tidak boleh terlihat
 * di pintarbersamaadzkia.com — cukup di komputer pengembang. Yang diperiksa
 * adalah ALAMAT yang diketik peramban, bukan NODE_ENV, karena `next build` di
 * laptop pun berjalan sebagai "production"; penjelasan lengkapnya ada di
 * `language-konstanta.ts`.
 *
 * Setiap pemanggilan membaca header, jadi halaman yang memakainya otomatis
 * dirender per permintaan — tidak ada versi statis yang bisa "membeku" dalam
 * keadaan tampil lalu ikut terkirim ke server.
 */
export async function fiturLanguageAktif(): Promise<boolean> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return bolehLanguageSkills(host, process.env.ADZKIA_LANGUAGE_SKILLS);
}

/**
 * Dipanggil di awal setiap halaman /language.
 *
 * Di server produksi hasilnya 404 biasa — bukan halaman "fitur dimatikan" —
 * supaya dari luar tidak ada tanda bahwa rutenya pernah ada.
 */
export async function wajibFiturLanguage(): Promise<void> {
  if (!(await fiturLanguageAktif())) notFound();
}
