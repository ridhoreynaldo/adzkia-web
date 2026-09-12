import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/auth";
import { wajibFiturLanguage } from "@/lib/ielts/language";

export const dynamic = "force-dynamic";

/**
 * Pintu /language hanya mengantar: yang sudah masuk langsung ke daftar ujian,
 * yang belum ke halaman masuk. Tidak ada isinya sendiri supaya tombol di
 * beranda cukup menunjuk satu alamat pendek.
 */
export default async function LanguagePage() {
  await wajibFiturLanguage();
  const user = await getSession();
  redirect(user ? "/language/pilih" : "/language/login");
}
