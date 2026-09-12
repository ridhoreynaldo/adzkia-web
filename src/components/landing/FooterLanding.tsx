/**
 * TIDAK DIPAKAI LAGI sejak 11 September 2026.
 *
 * Halaman /utbk dan /skd ditata ulang mengikuti rupa halaman awal, dan
 * rangkanya pindah ke `components/landing/RangkaJalur.tsx` — satu berkas untuk
 * kedua jalur, bukan dua salinan yang lambat-laun berbeda sendiri.
 * Penggantinya: `KakiJalur` di RangkaJalur.tsx.
 *
 * Berkasnya disimpan, bukan dihapus, karena proyek ini tidak memakai kendali
 * versi — sekali dihapus, bentuknya hilang untuk selamanya.
 */

import Link from "next/link";

import { PintuPengelola } from "@/components/PintuPengelola";
import { SUBTES, TOTAL_MENIT, TOTAL_SOAL } from "@/lib/tryout/snbt";

export function FooterLanding() {
  const tahun = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <span
                className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-sm font-extrabold text-white"
                aria-hidden
              >
                AS
              </span>
              <span className="leading-tight">
                <span className="block text-lg font-extrabold tracking-tight">
                  ADZKIA <span className="text-brand">SMART</span>
                </span>
                <span className="block text-xs text-muted">Tryout Real UTBK-SNBT</span>
              </span>
            </div>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
              Platform tryout resmi <strong className="font-semibold text-foreground">SMA Islam Plus Adzkia</strong>{" "}
              untuk menyiapkan siswa menghadapi UTBK-SNBT: {SUBTES.length} subtes, {TOTAL_SOAL} soal,{" "}
              {TOTAL_MENIT} menit, dan penilaian IRT.
            </p>
            <p className="mt-4 text-sm font-semibold text-brand">pintarbersamaadzkia.com</p>
          </div>

          <div>
            <p className="text-sm font-extrabold tracking-tight">Halaman</p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>
                <Link href="/login" className="hover:text-brand">Mulai TryOut</Link>
              </li>
              <li>
                <a href="#subtes" className="hover:text-brand">Struktur 7 subtes</a>
              </li>
              <li>
                <a href="#faq" className="hover:text-brand">Pertanyaan umum</a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-extrabold tracking-tight">Penyelenggara</p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>SMA Islam Plus Adzkia</li>
              <li>Program Persiapan UTBK-SNBT</li>
              <li>Bimbingan belajar &amp; tryout terjadwal</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <PintuPengelola>
            &copy; {tahun} ADZKIA SMART — SMA Islam Plus Adzkia. Semua hak dilindungi.
          </PintuPengelola>
          <p>pintarbersamaadzkia.com</p>
        </div>
      </div>
    </footer>
  );
}
