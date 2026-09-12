/**
 * TIDAK DIPAKAI LAGI sejak 11 September 2026.
 *
 * Halaman /utbk dan /skd ditata ulang mengikuti rupa halaman awal, dan
 * rangkanya pindah ke `components/landing/RangkaJalur.tsx` — satu berkas untuk
 * kedua jalur, bukan dua salinan yang lambat-laun berbeda sendiri.
 * Penggantinya: `AjakanJalur` di RangkaJalur.tsx.
 *
 * Berkasnya disimpan, bukan dihapus, karena proyek ini tidak memakai kendali
 * versi — sekali dihapus, bentuknya hilang untuk selamanya.
 */

import Link from "next/link";
import { SUBTES } from "@/lib/tryout/snbt";

export function CtaAkhir() {
  return (
    <section className="px-4 py-14 sm:py-20">
      <div
        className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-12 sm:py-16"
        style={{ background: "var(--brand)" }}
      >
        {/* Ornamen garis lengkung, murni SVG */}
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
          <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
            Coba satu tryout, lalu lihat sendiri posisimu.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-white/85">
            Masuk lewat akunmu, kerjakan {SUBTES.length} subtes dengan aturan hari-H, dan dapatkan
            laporan skor IRT beserta rekomendasi kampus di hari yang sama.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/login"
              className="btn w-full bg-white text-brand hover:bg-white/90 sm:w-auto"
            >
              MULAI TRYOUT REAL UTBK-SNBT
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
