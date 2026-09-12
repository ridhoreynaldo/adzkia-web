import { angka } from "./format";

export interface TitikPerkembangan {
  label: string;   // nama/kode paket
  tanggal: string; // sudah diformat, mis. "26 Agu 26"
  skor: number;
}

const LEBAR = 720;
const TINGGI = 280;
const KIRI = 46;
const KANAN = 14;
const ATAS = 16;
const BAWAH = 48;
const PLOT_L = LEBAR - KIRI - KANAN;
const PLOT_T = TINGGI - ATAS - BAWAH;

/** Grafik garis perkembangan skor antar tryout — SVG murni, tanpa pustaka grafik. */
export function GrafikPerkembangan({ titik }: { titik: TitikPerkembangan[] }) {
  if (titik.length === 0) return null;

  const x = (i: number) =>
    titik.length === 1 ? KIRI + PLOT_L / 2 : KIRI + (PLOT_L * i) / (titik.length - 1);
  const y = (skor: number) => ATAS + PLOT_T * (1 - Math.max(0, Math.min(1000, skor)) / 1000);

  const garis = titik.map((t, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(t.skor).toFixed(1)}`).join(" ");
  const area =
    titik.length > 1
      ? `${garis} L ${x(titik.length - 1).toFixed(1)} ${y(0)} L ${x(0).toFixed(1)} ${y(0)} Z`
      : "";

  const pertama = titik[0].skor;
  const terakhir = titik[titik.length - 1].skor;
  const beda = terakhir - pertama;
  const tertinggi = Math.max(...titik.map((t) => t.skor));
  const rata = Math.round(titik.reduce((a, t) => a + t.skor, 0) / titik.length);

  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">Perkembangan Skor</h2>
          <p className="text-sm text-muted">
            Skor total dari tryout terlama ke terbaru. Perhatikan arah garisnya, bukan satu titik saja.
          </p>
        </div>
        <div className="flex gap-4 text-xs">
          <Statistik judul="Rata-rata" nilai={angka(rata)} />
          <Statistik judul="Tertinggi" nilai={angka(tertinggi)} />
          <Statistik
            judul="Perubahan"
            nilai={`${beda >= 0 ? "+" : "−"}${angka(Math.abs(beda))}`}
            warna={beda >= 0 ? "text-success" : "text-danger"}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${LEBAR} ${TINGGI}`}
          className="h-auto w-full min-w-[520px]"
          role="img"
          aria-label="Grafik garis perkembangan skor total antar tryout"
        >
          {[0, 250, 500, 750, 1000].map((v) => (
            <g key={v}>
              <line
                x1={KIRI}
                x2={LEBAR - KANAN}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--border)"
                strokeWidth={1}
                strokeDasharray={v === 0 ? undefined : "3 4"}
              />
              <text x={KIRI - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">
                {angka(v)}
              </text>
            </g>
          ))}

          {area && <path d={area} fill="var(--brand)" opacity={0.09} />}
          {titik.length > 1 && (
            <path d={garis} fill="none" stroke="var(--brand)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          )}

          {titik.map((t, i) => (
            <g key={`${t.label}-${i}`}>
              <circle cx={x(i)} cy={y(t.skor)} r={5} fill="var(--surface)" stroke="var(--brand)" strokeWidth={2.5} />
              <text
                x={x(i)}
                y={y(t.skor) - 12}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill="var(--brand-strong)"
              >
                {angka(t.skor)}
              </text>
              <text
                x={x(i)}
                y={TINGGI - BAWAH + 20}
                textAnchor="middle"
                fontSize={10}
                fontWeight={600}
                fill="var(--foreground)"
              >
                {t.label.length > 16 ? `${t.label.slice(0, 15)}…` : t.label}
              </text>
              <text
                x={x(i)}
                y={TINGGI - BAWAH + 34}
                textAnchor="middle"
                fontSize={10}
                fill="var(--muted)"
              >
                {t.tanggal}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function Statistik({ judul, nilai, warna = "" }: { judul: string; nilai: string; warna?: string }) {
  return (
    <div className="text-right">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{judul}</p>
      <p className={`text-base font-extrabold ${warna}`}>{nilai}</p>
    </div>
  );
}
