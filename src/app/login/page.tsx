import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/Brand";
import { LoginForm } from "@/components/LoginForm";
import { getSession } from "@/lib/auth/auth";
import { jagaPortal } from "@/lib/admin/portal";

export const metadata = { title: "Mulai TryOut Real UTBK-SNBT" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await jagaPortal("utbk");

  const user = await getSession();
  const { next } = await searchParams;
  const diminta = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  const tujuan = diminta ?? "/mulai?jalur=utbk";

  if (user) redirect(user.role === "admin" ? "/admin" : tujuan);

  return (
    <main className="flex-1 grid place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Brand size="lg" />
        </div>
        <div className="card p-7">
          <span className="inline-flex rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand">
            Mulai TryOut Real UTBK-SNBT
          </span>
          <h1 className="mt-3 text-xl font-extrabold tracking-tight">
            Masuk dengan NISN kamu
          </h1>
          <p className="mt-1 mb-6 text-sm text-muted">
            Kerjakan 7 subtes UTBK-SNBT, lalu terima skor IRT dan pembahasannya begitu ujian selesai.
          </p>
          <LoginForm jalur="utbk" next={tujuan} />
          <p className="mt-5 text-center text-xs text-muted">
            Akun peserta dibuatkan pengelola. Lupa NISN atau kata sandi? Hubungi pengawas atau
            pengajar Adzkia.
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/skd/login"
            className="text-sm font-semibold text-muted hover:text-brand"
          >
            Mau SKD Kedinasan? Masuk di sini →
          </Link>
        </div>
      </div>
    </main>
  );
}
