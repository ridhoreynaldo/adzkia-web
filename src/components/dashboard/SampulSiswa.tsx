import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Potongan bersama tiga halaman siswa: beranda, Capaianku, dan TOAdzkia Pekan
 * Ini.
 *
 * Dibuat 11 September 2026 saat kedua halaman terakhir diminta menyusul rupa
 * beranda. Disatukan di sini SEJAK AWAL, bukan disalin tiga kali: rupa yang
 * disalin akan berbeda sendiri pada perubahan berikutnya, dan siswa yang
 * berpindah antar-tiga halaman ini dalam satu menit akan langsung melihatnya.
 *
 * Warnanya seluruhnya dari `var(--brand)`/`var(--accent)`, jadi ketiga halaman
 * ikut berubah maroon di jalur SKD lewat `tema-skd` tanpa satu pun aturan
 * tambahan di sini.
 */

/* ==========================================================================
   Sampul
   ========================================================================== */

export interface TombolSampul {
  href: string;
  label: string;
  /** true untuk satu tombol utama — putih pekat di atas gradasi. */
  utama?: boolean;
}

export function SampulSiswa({
  kicker,
  judul,
  keterangan,
  lencana = [],
  tombol = [],
}: {
  /** Baris kecil di atas judul: tanggal hari ini atau rentang periode. */
  kicker: string;
  judul: ReactNode;
  keterangan: string;
  /** Angka keadaan yang perlu terbaca tanpa menggulung ke bawah. */
  lencana?: string[];
  tombol?: TombolSampul[];
}) {
  return (
    <section className="sampul-beranda px-6 py-8 sm:px-9 sm:py-10">
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
            {kicker}
          </p>

          <h1 className="mt-3 text-[1.75rem] font-extrabold leading-[1.15] tracking-tight sm:text-4xl">
            {judul}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-[15px]">{keterangan}</p>

          {lencana.length > 0 && (
            <p className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold">
              {lencana.map((l) => (
                <span key={l} className="rounded-full bg-white/15 px-3 py-1">
                  {l}
                </span>
              ))}
            </p>
          )}
        </div>

        {tombol.length > 0 && (
          /* Di layar sempit tombolnya dipaksa selebar induknya supaya tidak
             ragged — panjang tulisannya jauh berbeda, dan dua tombol
             bertingkat dengan lebar tak sama terbaca seperti kekeliruan. */
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            {tombol.map((t) => (
              <Link
                key={t.href + t.label}
                href={t.href}
                className={`btn flex-1 sm:flex-none ${
                  t.utama
                    ? "bg-white text-foreground hover:bg-white/90"
                    : "border border-white/40 bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ==========================================================================
   Kartu angka
   ========================================================================== */

export function KartuAngka({
  ikon,
  label,
  nilai,
  keterangan,
  warna = "",
  sorot = false,
}: {
  ikon: ReactNode;
  label: string;
  nilai: string;
  keterangan: string;
  /** Kelas warna untuk angkanya, mis. hasil `warnaSkor()`. */
  warna?: string;
  /** true untuk angka yang paling dicari siswa di halaman itu. */
  sorot?: boolean;
}) {
  return (
    <div
      className={`kartu-angkat card flex items-start gap-4 p-5 ${
        sorot ? "border-brand/30 bg-brand-soft/30" : ""
      }`}
    >
      <span
        className={`grid size-11 shrink-0 place-items-center rounded-2xl ${
          sorot ? "bg-brand text-white" : "bg-brand-soft text-brand"
        }`}
      >
        {ikon}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-bold uppercase tracking-wide text-muted">
          {label}
        </span>
        <span className={`mt-0.5 block text-3xl font-extrabold tracking-tight tabular-nums ${warna}`}>
          {nilai}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-muted">{keterangan}</span>
      </span>
    </div>
  );
}

/* ==========================================================================
   Pemilih jalur
   ========================================================================== */

/**
 * Pemilih UTBK ⇄ SKD.
 *
 * Nilai kedua jalur memakai skala yang berbeda — 0–1000 IRT dan 0–550 poin —
 * jadi keduanya tidak pernah dicampur dalam satu tabel, dan pemilih ini yang
 * memisahkannya.
 */
export function PemilihJalur({ basis, jalur }: { basis: string; jalur: "utbk" | "skd" }) {
  return (
    <div className="inline-flex rounded-2xl border border-line bg-surface p-1">
      {(
        [
          { kode: "utbk", label: "UTBK-SNBT" },
          { kode: "skd", label: "SKD Kedinasan" },
        ] as const
      ).map((t) => (
        <Link
          key={t.kode}
          href={`${basis}?jalur=${t.kode}`}
          aria-current={jalur === t.kode ? "page" : undefined}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
            jalur === t.kode ? "bg-brand text-white" : "text-muted hover:text-foreground"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
