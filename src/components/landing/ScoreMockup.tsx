import { SUBTES } from "@/lib/tryout/snbt";

/**
 * Mockup kartu hasil tryout — digambar sepenuhnya dengan HTML/CSS/SVG.
 * Angkanya contoh (bukan data asli), hanya untuk menggambarkan tampilan laporan.
 */
const CONTOH_SKOR: Record<string, number> = {
  PU: 762,
  PPU: 705,
  PBM: 728,
  PK: 690,
  LBIND: 781,
  LBING: 744,
  PM: 712,
};

const RATA_RATA = Math.round(
  SUBTES.reduce((a, s) => a + (CONTOH_SKOR[s.kode] ?? 0), 0) / SUBTES.length,
);

/** Panjang batang: 0–1000 dipetakan ke 0–100%, dengan dasar 40% agar tetap terbaca. */
function lebar(skor: number) {
  return `${Math.round(40 + (skor / 1000) * 60)}%`;
}

export function ScoreMockup() {
  return (
    <div className="relative" aria-hidden>
      {/* Ornamen geometris ber-brand di belakang kartu */}
      <svg
        className="pointer-events-none absolute -top-10 -right-6 h-56 w-56 opacity-70 sm:h-72 sm:w-72"
        viewBox="0 0 200 200"
        fill="none"
      >
        <circle cx="100" cy="100" r="94" stroke="var(--brand)" strokeOpacity="0.18" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="70" stroke="var(--brand)" strokeOpacity="0.28" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="46" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="1.5" />
        <path
          d="M100 6 A94 94 0 0 1 194 100"
          stroke="var(--accent)"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
      <svg
        className="pointer-events-none absolute -bottom-8 -left-8 h-40 w-40 opacity-60"
        viewBox="0 0 120 120"
        fill="none"
      >
        <g stroke="var(--brand)" strokeOpacity="0.25" strokeWidth="1.5">
          {[0, 1, 2, 3, 4].map((r) =>
            [0, 1, 2, 3, 4].map((c) => (
              <circle key={`${r}-${c}`} cx={12 + c * 24} cy={12 + r * 24} r="2.5" fill="var(--brand)" fillOpacity="0.35" />
            )),
          )}
        </g>
      </svg>

      {/* Kartu hasil */}
      <div className="card relative overflow-hidden p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Laporan Hasil</p>
            <p className="text-base font-extrabold tracking-tight">Tryout Real UTBK-SNBT #1</p>
          </div>
          <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
            Selesai
          </span>
        </div>

        <div className="mt-5 flex items-end gap-4 rounded-2xl bg-brand-soft px-4 py-4">
          <div>
            <p className="text-xs font-semibold text-brand">Skor rata-rata (IRT)</p>
            <p className="text-4xl font-extrabold leading-none tracking-tight text-brand">{RATA_RATA}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs font-semibold text-muted">Peringkat</p>
            <p className="text-lg font-extrabold leading-tight">12 <span className="text-sm font-semibold text-muted">/ 240</span></p>
          </div>
        </div>

        <ul className="mt-5 space-y-2.5">
          {SUBTES.map((s) => (
            <li key={s.kode} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-[11px] font-semibold text-muted sm:w-32 sm:text-xs">
                {s.namaPendek}
              </span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: lebar(CONTOH_SKOR[s.kode] ?? 0),
                    background: s.kelompok === "TPS" ? "var(--brand)" : "var(--accent)",
                  }}
                />
              </span>
              <span className="w-9 shrink-0 text-right text-xs font-bold tabular-nums">
                {CONTOH_SKOR[s.kode]}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 rounded-2xl border border-line p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Rekomendasi kampus</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold leading-tight">Teknik Informatika</p>
              <p className="text-xs text-muted">Universitas Negeri pilihan pertama</p>
            </div>
            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
              Peluang besar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
