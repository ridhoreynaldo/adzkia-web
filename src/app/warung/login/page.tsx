import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/LoginForm";
import { HeaderWarung } from "@/components/warung/HeaderWarung";
import { IkonPiala, IkonWaktu, IkonWarung } from "@/components/warung/Ikon";
import { getSession } from "@/lib/auth/auth";

export const metadata = { title: "Masuk Warung Soal" };
export const dynamic = "force-dynamic";

/**
 * Pintu masuk Warung Soal.
 *
 * Akunnya sama persis dengan akun tryout — NISN dan kata sandi yang sudah
 * dibagikan pengelola — jadi tidak ada sandi kedua yang bisa lupa. Yang
 * berbeda hanya tujuannya sesudah masuk: langsung ke lobi Warung.
 *
 * Halaman ini sengaja TIDAK memajang tingkat kesulitan: tingkat baru relevan
 * di dalam, saat siswa sudah memilih subtes dan melihat 30 paketnya.
 */
export default async function LoginWarungPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getSession();
  const { next } = await searchParams;
  const diminta = next && next.startsWith("/warung") ? next : "/warung";
  if (user) redirect(diminta);

  return (
    <>
      <HeaderWarung ringkas />

      <main className="flex-1 px-4 py-10">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          {/* ---------- Sisi kiri: ajakan ---------- */}
          <section className="masuk-warung">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-accent">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden />
              Latihan harian ADZKIA SMART
            </span>

            <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
              <span className="teks-neon">Warung Soal</span>
            </h1>
            <p className="mt-3 max-w-md text-base leading-relaxed text-muted">
              Latihan harian per subtes UTBK-SNBT. Pilih subtesnya, pilih paketnya, kerjakan dengan
              waktu yang sama seperti ujian aslinya — lalu lihat namamu naik di papan peringkat.
            </p>

            <ul className="mt-6 space-y-3 text-sm text-muted">
              <li className="flex items-start gap-3">
                <IkonWarung className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span>
                  <strong className="text-foreground">Tujuh subtes, 30 paket tiap subtes.</strong>{" "}
                  Naik tingkat sesuai kesiapanmu sendiri.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <IkonWaktu className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span>
                  <strong className="text-foreground">Timer seperti UTBK asli.</strong> Sekalian
                  melatih pembagian waktu, bukan cuma menjawab.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <IkonPiala className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <span>
                  <strong className="text-foreground">Papan peringkat tiap subtes.</strong> Boleh
                  mengulang paket sepuasnya — yang dihitung nilai terbaikmu.
                </span>
              </li>
            </ul>
          </section>

          {/* ---------- Sisi kanan: formulir ---------- */}
          <section className="masuk-warung">
            <div className="card p-7">
              <h2 className="text-xl font-extrabold tracking-tight">Masuk dengan NISN kamu</h2>
              <p className="mt-1 mb-6 text-sm text-muted">
                Pakai NISN dan kata sandi yang sama dengan tryout. Tidak ada akun terpisah untuk
                Warung Soal.
              </p>

              <LoginForm jalur="utbk" next={diminta} labelTombol="Masuk & Latihan" />

              <p className="mt-5 text-center text-xs text-muted">
                Lupa NISN atau kata sandi? Hubungi pengawas atau pengajar Adzkia.
              </p>
            </div>

            {/*
              Tombol pulang dibuat sebagai tombol penuh, bukan tautan kecil:
              halaman ini gelap dan berdiri sendiri, sehingga tanpa jalan
              kembali yang kelihatan, siswa merasa terkunci di dalamnya.
            */}
            <Link href="/" className="btn btn-ghost mt-4 w-full font-semibold">
              ← Kembali ke Halaman Utama
            </Link>

            <p className="mt-3 text-center text-sm">
              <Link href="/login" className="font-semibold text-muted hover:text-accent">
                Mau tryout UTBK? Masuk di sini →
              </Link>
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
