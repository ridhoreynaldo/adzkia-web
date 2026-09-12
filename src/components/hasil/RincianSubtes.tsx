import { angka, desimal, warnaSkor } from "./format";

export interface BarisSubtes {
  subtes: string;
  nama: string;
  namaPendek: string;
  benar: number;
  salah: number;
  kosong: number;
  jumlahSoal: number;
  skor: number;
  theta: number;
  rata: number;      // rata-rata skor seluruh peserta pada subtes ini
  tertinggi: number;
}

/* --- Tata letak grafik (koordinat SVG, bukan piksel layar) --- */
const L_KIRI = 46;
const L_KANAN = 8;
const A_ATAS = 14;
const A_BAWAH = 46;
const LEBAR = 720;
const TINGGI = 300;
const PLOT_LEBAR = LEBAR - L_KIRI - L_KANAN;
const PLOT_TINGGI = TINGGI - A_ATAS - A_BAWAH;

/**
 * Rincian per subtes: bar chart perbandingan skor peserta vs rata-rata
 * seluruh peserta (SVG murni, tanpa pustaka grafik) + tabel rinci.
 */
export function RincianSubtes({ baris }: { baris: BarisSubtes[] }) {
  const n = Math.max(1, baris.length);
  const lebarGrup = PLOT_LEBAR / n;
  const lebarBar = Math.min(30, lebarGrup * 0.3);
  const y = (skor: number) => A_ATAS + PLOT_TINGGI * (1 - Math.max(0, Math.min(1000, skor)) / 1000);

  return (
    <div className="card hindari-pecah p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">Rincian per Subtes</h2>
          <p className="text-sm text-muted">
            Batang gelap adalah skormu, batang terang rata-rata seluruh peserta paket ini.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-brand" /> Skor kamu
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-accent/45" /> Rata-rata peserta
          </span>
        </div>
      </div>

      {/* ---------- Grafik batang ---------- */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${LEBAR} ${TINGGI}`}
          className="h-auto w-full min-w-[520px]"
          role="img"
          aria-label="Perbandingan skor kamu dengan rata-rata peserta per subtes"
        >
          {/* Garis bantu & label sumbu Y */}
          {[0, 250, 500, 750, 1000].map((v) => (
            <g key={v}>
              <line
                x1={L_KIRI}
                x2={LEBAR - L_KANAN}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--border)"
                strokeWidth={1}
                strokeDasharray={v === 0 ? undefined : "3 4"}
              />
              <text
                x={L_KIRI - 8}
                y={y(v) + 4}
                textAnchor="end"
                fontSize={11}
                fill="var(--muted)"
              >
                {angka(v)}
              </text>
            </g>
          ))}

          {baris.map((b, i) => {
            const xGrup = L_KIRI + i * lebarGrup;
            const tengah = xGrup + lebarGrup / 2;
            const xSaya = tengah - lebarBar - 3;
            const xRata = tengah + 3;
            const tinggiSaya = Math.max(2, y(0) - y(b.skor));
            const tinggiRata = Math.max(2, y(0) - y(b.rata));
            return (
              <g key={b.subtes}>
                <rect
                  x={xSaya}
                  y={y(b.skor)}
                  width={lebarBar}
                  height={tinggiSaya}
                  rx={3}
                  fill="var(--brand)"
                />
                <rect
                  x={xRata}
                  y={y(b.rata)}
                  width={lebarBar}
                  height={tinggiRata}
                  rx={3}
                  fill="var(--accent)"
                  opacity={0.42}
                />
                <text
                  x={xSaya + lebarBar / 2}
                  y={y(b.skor) - 5}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill="var(--brand-strong)"
                >
                  {angka(b.skor)}
                </text>
                <text
                  x={tengah}
                  y={TINGGI - A_BAWAH + 20}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={700}
                  fill="var(--foreground)"
                >
                  {b.subtes}
                </text>
                <text
                  x={tengah}
                  y={TINGGI - A_BAWAH + 34}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--muted)"
                >
                  {b.benar}/{b.jumlahSoal} benar
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ---------- Tabel rinci ---------- */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pr-3 font-semibold">Subtes</th>
              <th className="py-2 px-2 text-center font-semibold">Benar</th>
              <th className="py-2 px-2 text-center font-semibold">Salah</th>
              <th className="py-2 px-2 text-center font-semibold">Kosong</th>
              <th className="py-2 px-2 text-right font-semibold">Skor</th>
              <th className="py-2 px-2 text-right font-semibold">Rata-rata</th>
              <th className="py-2 pl-2 text-right font-semibold">Selisih</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b) => {
              const selisih = b.skor - b.rata;
              return (
                <tr key={b.subtes} className="border-b border-line/70 last:border-0">
                  <td className="py-2.5 pr-3">
                    <span className="font-semibold">{b.nama}</span>
                    <span className="ml-2 text-xs text-muted">({b.subtes})</span>
                  </td>
                  <td className="px-2 text-center font-semibold text-success">{b.benar}</td>
                  <td className="px-2 text-center text-danger">{b.salah}</td>
                  <td className="px-2 text-center text-muted">{b.kosong}</td>
                  <td className={`px-2 text-right text-base font-extrabold ${warnaSkor(b.skor)}`}>
                    {angka(b.skor)}
                  </td>
                  <td className="px-2 text-right text-muted">{angka(b.rata)}</td>
                  <td
                    className={`pl-2 text-right font-semibold ${
                      selisih >= 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {selisih >= 0 ? "+" : "−"}
                    {angka(Math.abs(selisih))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted">
        Skor dihitung dengan model IRT Rasch (1PL): butir yang jarang dijawab benar oleh
        peserta lain bernilai lebih tinggi. Kemampuan laten (theta) kamu:{" "}
        {baris.map((b, i) => (
          <span key={b.subtes}>
            {i > 0 && " · "}
            {b.subtes} {desimal(b.theta, 2)}
          </span>
        ))}
        .
      </p>
    </div>
  );
}
