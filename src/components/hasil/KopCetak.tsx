import { tanggalLengkap } from "./format";

/** Kop surat "ADZKIA SMART" — hanya tampil di kertas (kelas `.cetak-saja`). */
export function KopCetak({
  namaPeserta,
  asalSekolah,
  namaPaket,
  kodePaket,
  dikerjakanAt,
}: {
  namaPeserta: string;
  asalSekolah?: string | null;
  namaPaket: string;
  kodePaket?: string | null;
  dikerjakanAt?: string | null;
}) {
  return (
    <div className="cetak-saja mb-5">
      <div className="flex items-start justify-between gap-4 border-b-2 border-brand pb-3">
        <div>
          <p className="text-xl font-extrabold tracking-tight text-brand">ADZKIA SMART</p>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            Tryout Real UTBK-SNBT · SMA Islam Plus Adzkia
          </p>
          <p className="text-[11px] text-muted">pintarbersamaadzkia.com</p>
        </div>
        <div className="text-right text-[11px] leading-5">
          <p className="font-bold">LAPORAN HASIL TRYOUT</p>
          <p className="text-muted">{namaPaket}</p>
          {kodePaket && <p className="text-muted">Kode paket: {kodePaket}</p>}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-muted">Nama peserta</dt>
          <dd className="font-semibold">: {namaPeserta}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-muted">Asal sekolah</dt>
          <dd className="font-semibold">: {asalSekolah || "-"}</dd>
        </div>
        <div className="col-span-2 flex gap-2">
          <dt className="w-28 shrink-0 text-muted">Waktu selesai</dt>
          <dd className="font-semibold">: {tanggalLengkap(dikerjakanAt)}</dd>
        </div>
      </dl>
    </div>
  );
}
