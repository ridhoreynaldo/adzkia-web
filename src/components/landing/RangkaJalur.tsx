import Link from "next/link";
import type { ReactNode } from "react";

import { Brand } from "@/components/Brand";
import { PintuPengelola } from "@/components/PintuPengelola";
import { SlideKampus } from "./SlideKampus";
import { logoutAction } from "@/lib/auth/auth-actions";
import type { SessionUser } from "@/lib/auth/auth";

/**
 * Rangka bersama halaman jalur /utbk dan /skd.
 *
 * Dibuat 11 September 2026 ketika pengelola meminta kedua halaman itu menyusul
 * rupa halaman awal: kertas krem, sampul berupa foto bersudut membulat, bilah
 * angka yang menindih sampulnya, dan tombol kapsul.
 *
 * Disatukan di sini SEJAK AWAL, bukan disalin dua kali. Sebelum ini /utbk dan
 * /skd memang dua salinan yang lambat-laun berbeda sendiri — /skd sudah punya
 * kaki halaman sendiri yang jauh lebih ringkas daripada /utbk tanpa alasan.
 * Siswa berpindah antar-keduanya lewat satu tombol, jadi bedanya langsung
 * terlihat.
 *
 * Warnanya seluruhnya dari `var(--brand)`/`var(--accent)`: halaman SKD cukup
 * memasang `tema-skd` pada pembungkusnya dan seluruh rangka ini ikut maroon.
 */

/* ==========================================================================
   Navigasi
   ========================================================================== */

export function NavJalur({
  jalur,
  user,
  tujuanMulai,
  labelMulai,
}: {
  jalur: "utbk" | "skd";
  user: SessionUser | null;
  /** Ke mana tombol utama mengantar — sudah memperhitungkan sesi yang ada. */
  tujuanMulai: string;
  labelMulai: string;
}) {
  const lawan = jalur === "skd" ? { href: "/utbk", label: "UTBK-SNBT" } : { href: "/skd", label: "SKD Kedinasan" };

  return (
    <header>
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-5">
        <div className="min-w-0 shrink">
          <Brand
            href={user ? (user.role === "admin" ? "/admin" : "/dashboard") : "/"}
            keterangan={jalur === "skd" ? "SKD Kedinasan" : "Tryout Real UTBK-SNBT"}
          />
        </div>

        {/*
          Tautan tengah baru digambar mulai lebar lg — sama seperti halaman
          awal. Di bawah itu isinya sudah terwakili tombol di dalam sampul.
        */}
        <nav className="hidden flex-1 justify-center gap-1 text-sm font-semibold lg:flex">
          {[
            { href: "#subtes", label: "Struktur ujian" },
            { href: "#kampus", label: jalur === "skd" ? "Sekolah kedinasan" : "Kampus tujuan" },
            { href: "#alur", label: "Cara kerja" },
            lawan,
          ].map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="rounded-full px-3.5 py-2 text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {/*
          Di layar HP hanya tersisa SATU tombol. Sebelumnya nama pengguna,
          tombol utama, dan "Keluar" berdiri bersama-sama di sini: pada 410
          piksel ketiganya menabrak logo dan memaksa seluruh halaman bergeser
          mendatar. "Keluar" tetap ada di Beranda, jadi tidak ada yang hilang.
        */}
        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
          {user && (
            <span className="hidden text-sm text-muted md:inline">{user.nama.split(" ")[0]}</span>
          )}
          <Link href={tujuanMulai} className="btn btn-primary !px-4 !py-2.5 text-sm whitespace-nowrap">
            {labelMulai}
          </Link>
          {user && (
            <form action={logoutAction} className="hidden sm:block">
              <button type="submit" className="btn btn-ghost !px-4 !py-2.5 text-sm">
                Keluar
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}

/* ==========================================================================
   Sampul + bilah angka
   ========================================================================== */

export interface AngkaJalur {
  nilai: string;
  label: string;
  ket: string;
}

/**
 * Sampul bergambar dan bilah angka yang menindihnya.
 *
 * Ketiga alas bawahnya harus tetap berurutan seperti di halaman awal: tulisan
 * sampul berhenti di `pb-36`, baris nama kampus milik SlideKampus di `pb-20`,
 * lalu bilah angka naik 64 piksel. Mengubah salah satunya saja membuat
 * ketiganya saling menutupi.
 */
export function SampulJalur({
  jalur,
  kicker,
  judul,
  keterangan,
  tombol,
  angka,
}: {
  jalur: "utbk" | "skd";
  kicker: string;
  judul: ReactNode;
  keterangan: ReactNode;
  tombol: { href: string; label: string; utama?: boolean }[];
  angka: AngkaJalur[];
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4">
      <section className="sampul-landing">
        <SlideKampus gaya="tengah" jalur={jalur} />

        <div className="relative z-10 px-5 pb-36 pt-16 text-center sm:px-10 sm:pt-24">
          {/* Tanda "Dikunci" tidak perlu di sini: `jagaPortal()` sudah
              melemparkan pengunjung ke /terkunci sebelum halaman ini sempat
              digambar, jadi yang membacanya pasti portalnya sedang terbuka. */}
          <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden />
            {kicker}
          </p>

          {/* `text-balance` membagi barisnya sendiri. Judul jalur lebih
              panjang daripada judul halaman awal, dan pemenggalan manual
              menyisakan suku kata tunggal di baris terakhir pada layar HP. */}
          <h1 className="mx-auto mt-5 max-w-3xl text-balance text-[1.75rem] font-extrabold leading-[1.12] tracking-tight text-white drop-shadow-sm sm:text-5xl sm:leading-[1.06] lg:text-6xl lg:leading-[1.04]">
            {judul}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-white/85 sm:text-lg">
            {keterangan}
          </p>

          <div className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-2 rounded-3xl bg-white/95 p-2 shadow-2xl backdrop-blur sm:flex-row sm:rounded-full">
            {tombol.map((t) => (
              <Link
                key={t.href + t.label}
                href={t.href}
                className={`btn flex-1 !py-3 text-[15px] font-extrabold ${
                  t.utama
                    ? "btn-primary"
                    : "text-foreground hover:bg-surface-muted"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-label="Angka pokok ujian"
        className="bilah-mengambang relative z-10 -mt-16 mx-2 grid grid-cols-2 gap-5 p-5 sm:mx-8 sm:p-6 lg:grid-cols-4"
      >
        {angka.map((a) => (
          <div key={a.label}>
            <p
              className="text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl"
              style={{ color: "var(--brand)" }}
            >
              {a.nilai}
            </p>
            <p className="mt-0.5 text-sm font-bold">{a.label}</p>
            <p className="mt-0.5 text-xs leading-snug text-muted">{a.ket}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

/* ==========================================================================
   Judul bagian
   ========================================================================== */

export function JudulBagian({
  kicker,
  judul,
  isi,
}: {
  kicker: string;
  judul: string;
  isi?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">{kicker}</p>
      <h2 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight sm:text-[2rem]">
        {judul}
      </h2>
      {isi && <p className="mt-3 text-[15px] leading-relaxed text-muted">{isi}</p>}
    </div>
  );
}

/* ==========================================================================
   Ajakan penutup
   ========================================================================== */

export function AjakanJalur({
  judul,
  isi,
  tombol,
}: {
  judul: string;
  isi: string;
  tombol: { href: string; label: string };
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
      <div
        className="relative overflow-hidden rounded-[2rem] px-6 py-14 text-center sm:px-12"
        style={{ background: "var(--brand)" }}
      >
        {/* Ornamen garis lengkung, murni SVG — tidak ada berkas yang diunduh. */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
          viewBox="0 0 800 300"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d="M-50 250 Q 200 120 450 220 T 900 140" stroke="#fff" strokeWidth="2" fill="none" />
          <path d="M-50 300 Q 250 180 500 270 T 900 200" stroke="#fff" strokeWidth="2" fill="none" />
          <circle cx="700" cy="60" r="90" stroke="#fff" strokeWidth="2" fill="none" />
        </svg>

        <div className="relative">
          <h2 className="mx-auto max-w-3xl text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            {judul}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-white/85">{isi}</p>
          <div className="mt-8 flex justify-center">
            <Link
              href={tombol.href}
              className="btn w-full bg-white text-foreground hover:bg-white/90 sm:w-auto"
            >
              {tombol.label}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Kaki halaman
   ========================================================================== */

export function KakiJalur({
  jalur,
  ringkas,
}: {
  jalur: "utbk" | "skd";
  /** Satu kalimat yang menyebut angka jalurnya. */
  ringkas: string;
}) {
  const skd = jalur === "skd";

  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <Brand href="/" keterangan={skd ? "SKD Kedinasan" : "Tryout Real UTBK-SNBT"} />
            <p className="mt-3 text-sm leading-relaxed text-muted">{ringkas}</p>
          </div>

          <nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
            {[
              { href: "#subtes", label: "Struktur ujian" },
              { href: "#kampus", label: skd ? "Sekolah kedinasan" : "Kampus tujuan" },
              { href: "#alur", label: "Cara kerja" },
              { href: skd ? "/utbk" : "/skd", label: skd ? "UTBK-SNBT" : "SKD Kedinasan" },
              { href: "/", label: "Ganti jalur" },
              { href: "/warung", label: "Warung Soal" },
            ].map((t) => (
              <Link key={t.href} href={t.href} className="text-muted hover:text-brand">
                {t.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 border-t border-line pt-5 text-sm text-muted">
          <PintuPengelola>
            © {new Date().getFullYear()} SMA Islam Plus Adzkia · pintarbersamaadzkia.com
          </PintuPengelola>
        </div>
      </div>
    </footer>
  );
}
