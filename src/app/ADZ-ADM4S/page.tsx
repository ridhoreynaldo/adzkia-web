import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/Brand";
import { LoginForm } from "@/components/LoginForm";
import { getSession } from "@/lib/auth/auth";

/**
 * Pintu masuk pengelola.
 *
 * Alamatnya dipindah dari `/login/admin` ke `/ADZ-ADM4S` pada 4 September 2026
 * atas permintaan pengelola. Alamat lama DIHAPUS, bukan dialihkan: membiarkan
 * `/login/admin` tetap menjawab membuat penggantian alamat ini tidak ada
 * gunanya sama sekali. Konstantanya ada di `RUTE_LOGIN_ADMIN`
 * (`src/lib/admin-konstanta.ts`) — ubah di sana bila alamatnya diganti lagi,
 * lalu ganti pula nama folder ini.
 */

// Jangan sampai halaman ini muncul di hasil pencarian Google — percuma
// mencabut tautannya dari situs kalau mesin pencari yang menuntun ke sini.
export const metadata = {
  title: "Login Admin",
  robots: { index: false, follow: false },
};

export default async function LoginAdminPage() {
  const user = await getSession();
  if (user) redirect(user.role === "admin" ? "/admin" : "/dashboard");

  return (
    <main className="flex-1 grid place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Brand size="lg" />
        </div>
        <div className="card p-7">
          <span className="inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent">
            Login Admin
          </span>
          <h1 className="mt-3 text-xl font-extrabold tracking-tight">Masuk ke panel pengelola</h1>
          <p className="mt-1 mb-6 text-sm text-muted">
            Menyusun paket tryout, memasukkan soal dan kunci jawaban, memantau keamanan ujian, serta
            melihat skor peserta secara live.
          </p>
          <LoginForm mode="admin" />
          <p className="mt-5 text-center text-xs text-muted">
            Satu akun pengelola hanya bisa dipakai di satu perangkat pada satu waktu.
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link href="/login" className="text-sm font-semibold text-muted hover:text-brand">
            ← Kamu peserta tryout? Masuk lewat Mulai TryOut Real UTBK-SNBT
          </Link>
        </div>
      </div>
    </main>
  );
}
