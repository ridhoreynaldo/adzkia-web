import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/Brand";
import { LoginForm } from "@/components/LoginForm";
import { getSession } from "@/lib/auth/auth";
import { jagaPortal } from "@/lib/admin/portal";
import { AMBANG_TOTAL_SKD, TOTAL_MENIT_SKD, TOTAL_SOAL_SKD } from "@/lib/tryout/skd";

export const metadata = { title: "Masuk SKD Kedinasan" };

/**
 * Pintu masuk jalur SKD Kedinasan — sengaja terpisah dari halaman masuk UTBK.
 *
 * Kredensialnya sama (NISN + kata sandi dari sekolah); yang dibedakan adalah
 * warna, keterangan ujian, dan ke mana peserta diantar sesudah masuk, supaya
 * siswa tidak pernah ragu sedang membuka jalur yang mana.
 */
export default async function LoginSkdPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await jagaPortal("skd");

  const user = await getSession();
  const { next } = await searchParams;
  const diminta = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  const tujuan = diminta ?? "/mulai?jalur=skd";

  if (user) redirect(user.role === "admin" ? "/admin" : tujuan);

  return (
    <div className="tema-skd flex min-h-dvh flex-col bg-background">
      <main className="grid flex-1 place-items-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <Brand size="lg" href="/" keterangan="SKD Kedinasan" />
          </div>

          <div className="card overflow-hidden p-0">
            <div className="bg-brand px-7 py-5 text-white">
              <p className="text-xs font-bold uppercase tracking-widest opacity-90">
                SKD Kedinasan
              </p>
              <h1 className="mt-1 text-xl font-extrabold tracking-tight">
                Masuk dengan NISN kamu
              </h1>
              <p className="mt-1 text-sm opacity-90">
                {TOTAL_SOAL_SKD} soal · satu sesi {TOTAL_MENIT_SKD} menit · ambang kelulusan{" "}
                {AMBANG_TOTAL_SKD}
              </p>
            </div>

            <div className="p-7">
              <p className="mb-6 text-sm leading-relaxed text-muted">
                Kerjakan TWK, TIU, dan TKP dalam satu sesi utuh, lalu terima nilai per subtes
                beserta status kelulusanmu terhadap passing grade begitu ujian selesai.
              </p>

              <LoginForm jalur="skd" next={tujuan} />

              <p className="mt-5 text-center text-xs text-muted">
                Akun peserta dibuatkan pengelola — sama dengan akun untuk TryOut UTBK. Lupa NISN
                atau kata sandi? Hubungi pengawas atau pengajar Adzkia.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link href="/skd" className="font-semibold text-muted hover:text-brand">
              ← Kembali ke halaman SKD
            </Link>
            <Link href="/login" className="font-semibold text-muted hover:text-brand">
              Mau TryOut UTBK-SNBT? Masuk di sini →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
