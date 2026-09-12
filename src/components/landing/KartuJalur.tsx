import Link from "next/link";
import type { ReactNode } from "react";
import { DeretKampus } from "./LencanaKampus";
import { GemboksKecil } from "@/components/portal/Gemboks";

/**
 * Kartu pilihan jalur di halaman awal.
 *
 * TIDAK DIPAKAI LAGI sejak 11 September 2026. Pengelola meminta dua kartu ini
 * dicabut dari halaman awal: tombol "TryOut UTBK-SNBT" dan "SKD Kedinasan"
 * terbit terlalu sering dalam satu layar. Angka subtes/soal/menit dan lencana
 * "Dikunci" yang dulu di sini sudah pindah ke bagian berselang di
 * `src/app/page.tsx`; deret medali kampusnya tetap hidup di `SeksiKampus`
 * pada halaman /utbk dan /skd.
 *
 * Berkasnya disimpan, bukan dihapus, karena proyek ini tidak memakai kendali
 * versi — sekali dihapus, bentuknya hilang untuk selamanya. Kalau kelak
 * dipasang kembali, ingat bahwa halaman awal sudah punya dua tombol jalur di
 * bilah kapsul sampul.
 *
 * Sengaja dibuat besar dan bisa ditekan seluruh permukaannya — halaman ini
 * dibuka siswa lewat HP beberapa menit sebelum ujian, jadi sasaran sentuhnya
 * harus lebar dan pilihannya jelas terbaca sekali lihat.
 */
export function KartuJalur({
  href,
  kicker,
  judul,
  ringkas,
  poin,
  cta,
  tema,
  ikon,
  terkunci = false,
}: {
  href: string;
  kicker: string;
  judul: string;
  ringkas: string;
  poin: { label: string; nilai: string }[];
  cta: string;
  /** "utbk" memakai tema tosca bawaan; "skd" memakai maroon–oranye. */
  tema: "utbk" | "skd";
  ikon: ReactNode;
  /** Portal jalur ini sedang ditutup pengelola. */
  terkunci?: boolean;
}) {
  const skd = tema === "skd";

  return (
    <Link
      href={href}
      aria-disabled={terkunci || undefined}
      className={`group relative flex flex-col overflow-hidden rounded-3xl border-2 bg-surface p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 sm:p-8 ${
        terkunci ? "opacity-70 saturate-50" : ""
      } ${
        skd
          ? "tema-skd border-[#7f1d1d]/25 hover:border-[#7f1d1d] focus-visible:ring-[#7f1d1d]/40"
          : "border-brand/25 hover:border-brand focus-visible:ring-brand/40"
      }`}
    >
      {/* Cahaya lembut yang menguat saat kartu disentuh */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "var(--brand-soft)" }}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white shadow-lg"
          style={{ background: "var(--brand)" }}
          aria-hidden
        >
          {ikon}
        </div>
        {terkunci ? (
          <span className="flex items-center gap-1.5 rounded-full bg-danger px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white">
            <GemboksKecil terkunci />
            Dikunci
          </span>
        ) : (
          <span
            className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest"
            style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
          >
            {kicker}
          </span>
        )}
      </div>

      <h2 className="relative mt-5 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
        {judul}
      </h2>
      <p className="relative mt-2 text-sm leading-relaxed text-muted">{ringkas}</p>

      <dl className="relative mt-6 grid grid-cols-3 gap-3 border-y border-line py-4">
        {poin.map((p) => (
          <div key={p.label}>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              {p.label}
            </dt>
            <dd
              className="mt-0.5 text-lg font-extrabold tabular-nums"
              style={{ color: "var(--brand)" }}
            >
              {p.nilai}
            </dd>
          </div>
        ))}
      </dl>

      <div className="relative mt-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {skd ? "Sekolah kedinasan yang disiapkan" : "Kampus yang jadi tujuan"}
        </p>
        <div className="mt-2">
          <DeretKampus jalur={tema} />
        </div>
      </div>

      <span
        className="relative mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold text-white transition-transform group-hover:gap-3"
        style={{ background: "var(--brand)" }}
      >
        {cta}
        <span aria-hidden>→</span>
      </span>
    </Link>
  );
}
