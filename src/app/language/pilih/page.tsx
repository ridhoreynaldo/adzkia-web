import Link from "next/link";
import { redirect } from "next/navigation";

import { HeaderLanguage } from "@/components/language/HeaderLanguage";
import { getSession } from "@/lib/auth/auth";
import { DAFTAR_UJIAN, wajibFiturLanguage } from "@/lib/ielts/language";

export const metadata = { title: "Pilih Ujian — Language Skill" };
export const dynamic = "force-dynamic";

/**
 * Satu keputusan saja di halaman ini: IELTS atau TOEFL.
 *
 * Sengaja tidak ada apa-apa lagi di sini — tidak ada daftar paket, tidak ada
 * peringkat — supaya siswa yang baru masuk tidak perlu memilih dua kali
 * sebelum sampai ke latihannya.
 */
export default async function PilihUjianPage() {
  await wajibFiturLanguage();

  const user = await getSession();
  if (!user) redirect("/language/login?next=%2Flanguage%2Fpilih");

  return (
    <>
      <HeaderLanguage />

      <main className="flex-1 px-4 pb-20 pt-10 sm:pt-14">
        <div className="masuk-language mx-auto max-w-5xl">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-[11px] font-bold text-foreground shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
              Halo, {user.nama.split(" ")[0]}
            </span>

            <h1 className="mt-6 text-[2rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
              Mau berlatih <span className="sorot-language">yang mana</span> hari ini?
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
              Dua ujian, dua cara penilaian yang berbeda. Pilih satu untuk melihat bagian-bagiannya
              — pilihanmu tidak mengikat, kamu boleh berpindah kapan saja.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {DAFTAR_UJIAN.map((u) => (
              <Link key={u.kode} href={`/language/${u.kode}`} className="kartu-language block p-7">
                {/* Angka besar samar di sudut: penanda diam supaya dua kartu ini
                    tetap gampang dibedakan sekilas walau isinya sama panjang. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-3 -top-6 text-[6rem] font-extrabold leading-none text-surface-muted"
                >
                  {u.kode === "ielts" ? "9" : "120"}
                </span>

                <div className="relative">
                  <span className="inline-flex items-center rounded-full bg-brand-soft px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand">
                    {u.skala}
                  </span>

                  <h2 className="mt-4 text-3xl font-extrabold tracking-tight">{u.nama}</h2>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    {u.panjang}
                  </p>

                  <p className="mt-4 text-sm leading-relaxed text-muted">{u.ringkas}</p>

                  <ul className="mt-5 flex flex-wrap gap-2">
                    {u.bagian.map((b) => (
                      <li
                        key={b}
                        className="rounded-full border border-line bg-surface-muted px-3 py-1 text-[11px] font-semibold text-foreground"
                      >
                        {b}
                      </li>
                    ))}
                  </ul>

                  <span className="btn btn-primary mt-6 w-full font-bold">
                    Mulai {u.nama} →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <p className="mt-10 text-center text-sm">
            <Link
              href="/"
              className="font-semibold text-muted underline-offset-4 hover:text-brand hover:underline"
            >
              ← Kembali ke Halaman Utama ADZKIA SMART
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
