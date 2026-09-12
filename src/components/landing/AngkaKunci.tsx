/**
 * TIDAK DIPAKAI LAGI sejak 11 September 2026.
 *
 * Halaman /utbk dan /skd ditata ulang mengikuti rupa halaman awal, dan
 * rangkanya pindah ke `components/landing/RangkaJalur.tsx` — satu berkas untuk
 * kedua jalur, bukan dua salinan yang lambat-laun berbeda sendiri.
 * Penggantinya: bilah angka di dalam `SampulJalur`.
 *
 * Berkasnya disimpan, bukan dihapus, karena proyek ini tidak memakai kendali
 * versi — sekali dihapus, bentuknya hilang untuk selamanya.
 */

import { SUBTES, TOTAL_MENIT, TOTAL_SOAL } from "@/lib/tryout/snbt";

const ANGKA = [
  { nilai: String(SUBTES.length), satuan: "subtes", ket: "Sesuai struktur resmi UTBK-SNBT" },
  { nilai: String(TOTAL_SOAL), satuan: "soal", ket: "Jumlah butir satu paket penuh" },
  { nilai: String(TOTAL_MENIT), satuan: "menit", ket: "Total waktu pengerjaan" },
  { nilai: "IRT", satuan: "penilaian", ket: "Bobot soal ikut menentukan skor" },
];

export function AngkaKunci() {
  return (
    <div className="border-y border-line bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 lg:grid-cols-4">
        {ANGKA.map((a) => (
          <div key={a.satuan} className="px-2 py-7 sm:px-4">
            <p className="text-3xl font-extrabold tracking-tight text-brand sm:text-4xl">
              {a.nilai}
            </p>
            <p className="mt-0.5 text-sm font-bold">{a.satuan}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{a.ket}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
