/**
 * TIDAK DIPAKAI LAGI sejak 11 September 2026.
 *
 * Halaman /utbk dan /skd ditata ulang mengikuti rupa halaman awal, dan
 * rangkanya pindah ke `components/landing/RangkaJalur.tsx` — satu berkas untuk
 * kedua jalur, bukan dua salinan yang lambat-laun berbeda sendiri.
 * Penggantinya: `SampulJalur` di RangkaJalur.tsx.
 *
 * Berkasnya disimpan, bukan dihapus, karena proyek ini tidak memakai kendali
 * versi — sekali dihapus, bentuknya hilang untuk selamanya.
 */

import Link from "next/link";
import { ScoreMockup } from "./ScoreMockup";
import { TOTAL_MENIT, TOTAL_SOAL, SUBTES } from "@/lib/tryout/snbt";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Latar lembut ber-brand, digambar dengan CSS murni */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1100px 420px at 12% -10%, var(--brand-soft) 0%, transparent 60%), radial-gradient(700px 320px at 95% 0%, var(--accent-soft) 0%, transparent 55%)",
        }}
        aria-hidden
      />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:py-20 lg:grid-cols-2 lg:gap-10">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-brand">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
            Tryout Real UTBK-SNBT · SMA Islam Plus Adzkia
          </span>

          <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Latihan UTBK yang rasanya{" "}
            <span className="text-brand">persis hari-H</span>.
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            ADZKIA SMART menghadirkan tryout dengan aturan yang sama seperti UTBK asli:{" "}
            {SUBTES.length} subtes berurutan, timer terpisah tiap subtes, dan penilaian IRT.
            Disusun oleh tim guru <strong className="font-semibold text-foreground">SMA Islam Plus Adzkia</strong>{" "}
            supaya kamu tahu posisi nilaimu jauh sebelum hari ujian.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="btn btn-primary w-full sm:w-auto">
              MULAI TRYOUT REAL UTBK-SNBT
            </Link>
          </div>

          {/*
            Tombol "HASIL TO REAL UTBK SECARA LIVE" ke /admin/live dicabut
            31 Agustus 2026: rutenya milik panel admin, jadi siswa yang
            mengekliknya terlempar ke halaman login admin — persis pintu yang
            sedang disembunyikan. Pengelola membukanya dari Panel Admin ->
            Skor Live (`AdminNav`), tempat mereka memang sudah berada.
          */}
          <p className="mt-4 text-sm text-muted">
            {TOTAL_SOAL} soal · {TOTAL_MENIT} menit · hasil keluar otomatis.
          </p>
        </div>

        <div className="lg:pl-6">
          <ScoreMockup />
        </div>
      </div>
    </section>
  );
}
