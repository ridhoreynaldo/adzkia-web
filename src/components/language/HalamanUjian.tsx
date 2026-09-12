import Link from "next/link";

import { HeaderLanguage } from "@/components/language/HeaderLanguage";
import { UJIAN, type UjianBahasa } from "@/lib/ielts/language-konstanta";

/**
 * Kerangka halaman satu ujian (IELTS / TOEFL).
 *
 * Isinya belum ada — tahap ini baru sampai pintu masuk dan pemilihan ujian
 * (permintaan pengelola 9 September 2026: "itu aja dulu"). Halaman ini tetap
 * dibuat supaya kartu pilihan tidak menjatuhkan siswa ke 404, dan supaya
 * bagian-bagian ujiannya sudah berdiri sebagai tempat menaruh soal nanti.
 */
export function HalamanUjian({ kode }: { kode: UjianBahasa }) {
  const u = UJIAN[kode];
  const lain = kode === "ielts" ? UJIAN.toefl : UJIAN.ielts;

  return (
    <>
      <HeaderLanguage />

      <main className="flex-1 px-4 pb-20 pt-10 sm:pt-14">
        <div className="masuk-language mx-auto max-w-4xl">
          <p className="text-sm">
            <Link
              href="/language/pilih"
              className="font-semibold text-muted underline-offset-4 hover:text-brand hover:underline"
            >
              ← Pilih ujian lain
            </Link>
          </p>

          <div className="mt-6 text-center">
            <span className="inline-flex items-center rounded-full bg-brand-soft px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand">
              {u.skala}
            </span>
            <h1 className="mt-5 text-[2.4rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              {u.nama}
            </h1>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {u.panjang}
            </p>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
              {u.ringkas}
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {u.bagian.map((b, i) => (
              <div key={b} className="card p-5">
                <span className="text-[11px] font-bold text-muted">Bagian {i + 1}</span>
                <h2 className="mt-1 text-lg font-extrabold tracking-tight">{b}</h2>
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
                  Soal belum dimuat
                </p>
              </div>
            ))}
          </div>

          <div className="card mt-8 p-7 text-center">
            <h2 className="text-xl font-extrabold tracking-tight">Ruang latihannya sedang dibangun</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted">
              Sampai di sini dulu tahap pertamanya: pintu masuk dan pemilihan ujian sudah jadi.
              Soal, timer, dan penilaian {u.nama} menyusul di tahap berikutnya.
            </p>
            <Link href={`/language/${lain.kode}`} className="btn btn-ghost mt-5 font-semibold">
              Lihat {lain.nama}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
