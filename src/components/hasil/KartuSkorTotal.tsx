import { Badge } from "@/components/ui";
import { angka, predikatSkor, warnaSkor } from "./format";

/** Kartu skor total besar + peringkat + persentil. */
export function KartuSkorTotal({
  totalSkor,
  peringkat,
  jumlahPeserta,
  persentil,
  rataTotal,
  tertinggiTotal,
}: {
  totalSkor: number;
  peringkat: number;
  jumlahPeserta: number;
  persentil: number;
  rataTotal: number;
  tertinggiTotal: number;
}) {
  const persenSkor = Math.max(0, Math.min(100, (totalSkor / 1000) * 100));
  const persenRata = Math.max(0, Math.min(100, (rataTotal / 1000) * 100));

  return (
    <div className="card hindari-pecah overflow-hidden">
      <div className="grid gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:p-7">
        {/* Skor total */}
        <div className="text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            Skor Total UTBK
          </p>
          <p className={`mt-1 text-6xl font-extrabold leading-none tracking-tight ${warnaSkor(totalSkor)}`}>
            {angka(totalSkor)}
          </p>
          <p className="mt-1 text-sm text-muted">dari skala 0–1.000</p>
          <div className="mt-3 flex justify-center sm:justify-start">
            <Badge tone={totalSkor >= 650 ? "success" : totalSkor >= 500 ? "brand" : "warning"}>
              {predikatSkor(totalSkor)}
            </Badge>
          </div>

          {/* Batang posisi skor terhadap rata-rata seluruh peserta */}
          <div className="mt-5">
            <div className="relative h-3 w-full rounded-full bg-surface-muted">
              <div
                className="h-3 rounded-full bg-brand"
                style={{ width: `${persenSkor}%` }}
              />
              <div
                className="absolute top-[-4px] h-5 w-0.5 bg-accent"
                style={{ left: `${persenRata}%` }}
                title={`Rata-rata peserta: ${angka(rataTotal)}`}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted">
              <span>0</span>
              <span className="font-semibold text-accent">
                | rata-rata {angka(rataTotal)}
              </span>
              <span>1.000</span>
            </div>
          </div>
        </div>

        {/* Ringkasan posisi */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Kotak
            judul="Peringkat"
            nilai={peringkat > 0 ? `ke-${angka(peringkat)}` : "-"}
            keterangan={jumlahPeserta > 0 ? `dari ${angka(jumlahPeserta)} peserta` : "belum ada pembanding"}
          />
          <Kotak
            judul="Persentil"
            nilai={`${angka(persentil)}%`}
            keterangan={
              persentil >= 50
                ? `unggul dari ${angka(persentil)}% peserta`
                : "masih banyak ruang naik"
            }
          />
          <Kotak
            judul="Rata-rata peserta"
            nilai={angka(rataTotal)}
            keterangan={
              totalSkor >= rataTotal
                ? `kamu ${angka(totalSkor - rataTotal)} poin di atas`
                : `kamu ${angka(rataTotal - totalSkor)} poin di bawah`
            }
          />
          <Kotak
            judul="Skor tertinggi"
            nilai={angka(tertinggiTotal)}
            keterangan={
              totalSkor >= tertinggiTotal && tertinggiTotal > 0
                ? "kamu pemegang skor tertinggi"
                : `selisih ${angka(Math.max(0, tertinggiTotal - totalSkor))} poin`
            }
          />
        </div>
      </div>
    </div>
  );
}

function Kotak({ judul, nilai, keterangan }: { judul: string; nilai: string; keterangan: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-muted/60 p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{judul}</p>
      <p className="mt-0.5 text-xl font-extrabold tracking-tight">{nilai}</p>
      <p className="mt-0.5 text-[11px] leading-4 text-muted">{keterangan}</p>
    </div>
  );
}
