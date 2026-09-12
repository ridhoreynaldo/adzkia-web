import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/auth";
import { daftarPaketSiswa } from "@/lib/tryout/exam";
import { jagaPortal, portalTertutupUntuk } from "@/lib/admin/portal";

export const dynamic = "force-dynamic";

/**
 * Persimpangan sesudah login siswa.
 *
 * Jalur yang dipilih di halaman depan dibawa serta lewat `?jalur=`, sehingga
 * peserta yang masuk lewat pintu SKD tidak pernah mendarat di paket UTBK.
 * Kalau pada jalur itu hanya ada SATU tryout yang bisa dikerjakan — keadaan
 * biasa pada hari-H — peserta langsung diantar ke sana tanpa mampir ke beranda.
 */
export default async function MulaiPage({
  searchParams,
}: {
  searchParams: Promise<{ jalur?: string }>;
}) {
  const user = await requireUser();
  if (user.role === "admin") redirect("/admin");

  const { jalur: jalurQuery } = await searchParams;
  const jalur = jalurQuery === "skd" ? "skd" : jalurQuery === "utbk" ? "utbk" : null;

  // Jalur yang diminta tegas: kalau portalnya dikunci, berhenti di sini.
  if (jalur) await jagaPortal(jalur);

  const paket = await daftarPaketSiswa(user.id);
  // Perulangan, bukan `.filter()`: syarat terakhirnya menanyai basis data.
  const bisaDikerjakan = [];
  for (const p of paket) {
    if (p.attempt_status !== null && p.attempt_status !== "ongoing") continue;
    if (jalur !== null && p.jalur !== jalur) continue;
    // Tanpa `?jalur=`, paket dari portal yang terkunci tidak boleh ikut
    // terpilih otomatis dan mengantar siswa ke jalur yang sedang ditutup.
    if (await portalTertutupUntuk(p.jalur === "skd" ? "skd" : "utbk", user)) continue;
    bisaDikerjakan.push(p);
  }

  if (bisaDikerjakan.length === 1) {
    const p = bisaDikerjakan[0];
    // SKD melewati pemilihan program studi.
    redirect(p.jalur === "skd" ? `/tryout/${p.id}` : `/tryout/${p.id}/jurusan`);
  }

  redirect(jalur ? `/dashboard?jalur=${jalur}` : "/dashboard");
}
