import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/LoginForm";
import { HeaderLanguage } from "@/components/language/HeaderLanguage";
import { HiasanLanguage } from "@/components/language/Hiasan";
import { getSession } from "@/lib/auth/auth";
import { DAFTAR_UJIAN, wajibFiturLanguage } from "@/lib/ielts/language";

export const metadata = { title: "Masuk Language Skill" };
export const dynamic = "force-dynamic";

/**
 * Pintu masuk LANGUAGE SKILL.
 *
 * Akunnya sama persis dengan akun tryout — NISN dan kata sandi yang sudah
 * dibagikan pengelola — jadi tidak ada sandi ketiga yang bisa lupa, sama
 * seperti Warung Soal. Yang berbeda hanya tujuan sesudah masuk: daftar ujian
 * IELTS dan TOEFL.
 *
 * Tata letaknya mengikuti rujukan yang diberikan pengelola: judul raksasa di
 * tengah kertas krem, satu kata disorot merah, dan kartu-kartu kecil mengintip
 * di tepi layar lebar.
 */
export default async function LoginLanguagePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await wajibFiturLanguage();

  const user = await getSession();
  const { next } = await searchParams;
  // Hanya alamat di dalam cabang ini yang diterima, supaya tautan login tidak
  // bisa dipakai melempar siswa ke bagian aplikasi lain — apalagi ke luar.
  const diminta = next && next.startsWith("/language") ? next : "/language/pilih";
  if (user) redirect(diminta);

  return (
    <>
      <HeaderLanguage ringkas />

      <main className="relative flex-1 px-4 pb-20 pt-10 sm:pt-14">
        <HiasanLanguage />

        <div className="masuk-language relative mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-[11px] font-bold text-foreground shadow-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" aria-hidden />
            Latihan bahasa Inggris ADZKIA SMART
          </span>

          {/* Kata yang disorot merah sengaja satu saja — "paspormu" — supaya
              matanya berhenti di janji fiturnya, bukan di nama alatnya. */}
          <h1 className="mt-6 text-[2.15rem] font-extrabold leading-[1.06] tracking-tight sm:text-6xl sm:leading-[1.04]">
            Latih IELTS &amp; TOEFL,
            <br />
            jadikan bahasa Inggris
            <br />
            <span className="sorot-language">paspormu</span> ke dunia
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base">
            Simulasi penuh empat keterampilan berbahasa Inggris, dinilai otomatis lengkap dengan
            perkiraan skor, titik lemah, dan apa yang harus diperbaiki lebih dulu.
            <br className="hidden sm:block" /> Masuk dengan NISN kamu untuk memulai.
          </p>

          {/* ---------- Kartu masuk ---------- */}
          <div className="card mx-auto mt-9 max-w-md p-6 text-left shadow-[0_30px_60px_-40px_rgba(23,17,14,0.55)] sm:p-7">
            <h2 className="text-lg font-extrabold tracking-tight">Masuk dengan NISN kamu</h2>
            <p className="mt-1 mb-5 text-sm text-muted">
              Pakai NISN dan kata sandi yang sama dengan tryout. Tidak ada akun terpisah untuk
              Language Skill.
            </p>

            <LoginForm jalur="utbk" next={diminta} labelTombol="Masuk & Mulai Latihan →" />

            <p className="mt-4 text-center text-xs text-muted">
              Lupa NISN atau kata sandi? Hubungi pengawas atau pengajar Adzkia.
            </p>
          </div>

          {/* ---------- Dua ujian yang menanti di dalam ---------- */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm">
            <span className="flex -space-x-2">
              {DAFTAR_UJIAN.map((u) => (
                <span
                  key={u.kode}
                  className="grid h-8 w-8 place-items-center rounded-full border-2 border-background bg-foreground text-[10px] font-extrabold uppercase text-white"
                >
                  {u.kode === "ielts" ? "IE" : "TO"}
                </span>
              ))}
            </span>
            <span className="font-semibold text-foreground">
              IELTS &amp; TOEFL{" "}
              <span className="font-normal text-muted">— pilih sesudah masuk</span>
            </span>
          </div>

          <p className="mt-8 text-sm">
            <Link href="/" className="font-semibold text-muted underline-offset-4 hover:text-brand hover:underline">
              ← Kembali ke Halaman Utama ADZKIA SMART
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
