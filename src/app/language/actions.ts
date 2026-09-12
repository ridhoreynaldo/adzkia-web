"use server";

import { redirect } from "next/navigation";

import { destroySession } from "@/lib/auth/auth";

/**
 * Keluar dari Language Skill dan kembali ke pintu masuknya sendiri — bukan ke
 * login tryout, sama seperti pola Warung Soal.
 */
export async function keluarLanguageAction(): Promise<void> {
  await destroySession();
  redirect("/language/login");
}
