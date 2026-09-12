import Link from "next/link";

import { SUBTES_IELTS, sebutanBand } from "@/lib/ielts/ielts-konstanta";
import type { BarisPeringkatIelts } from "@/lib/ielts/ielts-peringkat";

/** Band ditulis satu angka di belakang koma: 6 dan 6,5 adalah dua band berbeda. */
export function band(nilai: number | null | undefined): string {
  return nilai === null || nilai === undefined ? "—" : nilai.toFixed(1);
}

const MEDALI = ["🥇", "🥈", "🥉"];

/**
 * PAPAN SKOR BAND — dari band tertinggi ke terendah.
 *
 * Satu tabel dipakai dua halaman: papan pengelola (`/admin/ielts/[id]/peringkat`)
 * dan papan siswa (`/language/ielts/peringkat`). Yang membedakan hanya dua
 * saklar di bawah — dan itu memang harus satu tabel, karena angka yang dibaca
 * siswa dan angka yang dibaca gurunya tidak boleh bisa berbeda.
 *
 * Band yang belum final ditandai titik, bukan disembunyikan: peserta yang
 * Writing-nya belum dinilai guru tetap punya posisi, hanya belum pasti.
 */
export function TabelBand({
  papan,
  sorotUserId = null,
  tautanNilai = null,
  tampilKelas = true,
}: {
  papan: BarisPeringkatIelts[];
  /** Baris milik pembaca disorot; null untuk papan pengelola. */
  sorotUserId?: number | null;
  /**
   * Awalan alamat halaman penilaian, mis. "/admin/ielts/nilai". Bila diisi,
   * nama peserta menjadi tautan ke sana. Papan siswa tidak pernah mengisinya —
   * jawaban orang lain bukan urusan siswa.
   */
  tautanNilai?: string | null;
  tampilKelas?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-muted/60 text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-2.5 text-center font-semibold">#</th>
            <th className="px-3 py-2.5 font-semibold">Nama</th>
            {tampilKelas && <th className="px-3 py-2.5 font-semibold">Kelas</th>}
            {SUBTES_IELTS.map((s) => (
              <th key={s.kode} className="px-2 py-2.5 text-center font-semibold">
                {s.nama}
              </th>
            ))}
            <th className="px-4 py-2.5 text-right font-semibold">Overall</th>
          </tr>
        </thead>
        <tbody>
          {papan.map((r) => {
            const milikku = sorotUserId !== null && r.userId === sorotUserId;
            const medali = r.peringkat <= 3 ? MEDALI[r.peringkat - 1] : null;
            return (
              <tr
                key={r.pengerjaanId}
                className={`border-b border-line/70 last:border-0 ${
                  milikku ? "bg-brand-soft font-semibold" : ""
                }`}
              >
                <td
                  className={`px-4 py-2.5 text-center ${milikku ? "border-l-4 border-brand" : ""}`}
                >
                  <span className="font-extrabold">{medali ?? r.peringkat}</span>
                </td>
                <td className="px-3 py-2.5">
                  {tautanNilai ? (
                    <Link
                      href={`${tautanNilai}/${r.pengerjaanId}`}
                      className="font-semibold text-brand hover:underline"
                    >
                      {r.nama}
                    </Link>
                  ) : (
                    <span className="font-semibold">{r.nama}</span>
                  )}
                  {milikku && <span className="ml-2 text-[11px] font-bold text-brand">(kamu)</span>}
                  {!r.final && (
                    <span
                      className="ml-2 text-[11px] font-semibold text-warning"
                      title={
                        r.menunggu.length > 0
                          ? `Menunggu penilaian ${r.menunggu.join(" & ")}`
                          : "Band belum final"
                      }
                    >
                      · sementara
                    </span>
                  )}
                </td>
                {tampilKelas && <td className="px-3 py-2.5 text-muted">{r.kelas ?? "—"}</td>}
                {SUBTES_IELTS.map((s) => (
                  <td key={s.kode} className="px-2 py-2.5 text-center tabular-nums">
                    {band(r.band[s.kode])}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right">
                  <span className="text-base font-extrabold text-brand tabular-nums">
                    {band(r.overall)}
                  </span>
                  {r.final && r.overall !== null && (
                    <span className="ml-2 hidden text-[11px] text-muted lg:inline">
                      {sebutanBand(r.overall)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
