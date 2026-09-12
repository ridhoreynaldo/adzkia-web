import Link from "next/link";
import type { HasilSeleksiPilihan, PilihanDinilai, StatusSeleksi } from "@/lib/rujukan/kampus";
import { angka, desimal } from "./format";

/**
 * Seleksi Pilihan 1-4 pada halaman hasil UTBK.
 *
 * Aturannya meniru SNBT nasional: pilihan dinilai BERURUTAN, dan begitu
 * peserta diterima di satu pilihan, pilihan sesudahnya tidak diproses lagi —
 * satu peserta hanya mendapat satu kursi. Karena itu vonisnya tegas
 * LULUS / TIDAK LULUS, bukan gambaran jarak skor.
 */

const GAYA_STATUS: Record<StatusSeleksi, { label: string; teks: string; latar: string }> = {
  LULUS: { label: "LULUS", teks: "text-success", latar: "bg-success-soft" },
  TIDAK_LULUS: { label: "TIDAK LULUS", teks: "text-danger", latar: "bg-danger-soft" },
  TIDAK_DIPROSES: { label: "TIDAK DIPROSES", teks: "text-muted", latar: "bg-surface-muted" },
  TANPA_DATA: { label: "BELUM ADA DATA", teks: "text-muted", latar: "bg-surface-muted" },
};

export function PilihanProdi({
  hasil,
  totalSkor,
}: {
  hasil: HasilSeleksiPilihan;
  totalSkor: number;
}) {
  const { pilihan, diterimaDi } = hasil;
  if (pilihan.length === 0) return null;

  const diterima = diterimaDi != null ? pilihan.find((p) => p.urutan === diterimaDi) : null;

  return (
    <div className="card halaman-baru p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-extrabold tracking-tight">Seleksi Pilihan Program Studi</h2>
        <p className="text-sm text-muted">
          Pilihan yang kamu tulis sebelum ujian, diseleksi berurutan dengan aturan SNBT memakai
          skor total <strong>{angka(totalSkor)}</strong>.
        </p>
      </div>

      {/* ---------- Vonis akhir ---------- */}
      <div
        className={`hindari-pecah mb-5 rounded-xl border p-4 ${
          diterima
            ? "border-success/30 bg-success-soft"
            : "border-danger/30 bg-danger-soft"
        }`}
      >
        {diterima ? (
          <>
            <p className="text-xs font-bold uppercase tracking-widest text-success">
              Diterima di Pilihan {diterima.urutan}
            </p>
            <p className="mt-1 text-lg font-extrabold leading-snug tracking-tight">
              {diterima.prodiNama}
            </p>
            <p className="text-sm font-semibold text-muted">{diterima.ptn}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Karena sudah diterima di sini, pilihan sesudahnya tidak diproses lagi — persis
              seperti SNBT: satu peserta hanya mendapat satu kursi.
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-widest text-danger">
              Belum diterima di pilihan mana pun
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Skormu belum menyentuh ancar-ancar keempat pilihan. Lihat Rekomendasi Kampus di bawah
              untuk prodi yang sudah masuk jangkauan skormu sekarang.
            </p>
          </>
        )}
      </div>

      <ol className="divide-y divide-line">
        {pilihan.map((p) => (
          <BarisPilihan key={p.urutan} pilihan={p} diterimaDi={diterimaDi} />
        ))}
      </ol>

      <p className="mt-5 rounded-lg bg-warning-soft px-3.5 py-2.5 text-[11px] leading-4 text-warning">
        <strong>Cara membacanya:</strong> seleksi memakai ancar-ancar skor tiap prodi — perkiraan
        skor peserta terakhir yang diterima, yang lahir dari perbandingan daya tampung terhadap
        jumlah peminat. Angka-angka itu estimasi, bukan data resmi SNPMB, dan peringkat di sini
        hanya di antara peserta tryout Adzkia, bukan peringkat nasional. Pakai sebagai latihan
        menyusun pilihan, bukan jaminan kelulusan.
      </p>
    </div>
  );
}

function BarisPilihan({
  pilihan: p,
  diterimaDi,
}: {
  pilihan: PilihanDinilai;
  diterimaDi: number | null;
}) {
  const gaya = GAYA_STATUS[p.status];

  return (
    <li className="hindari-pecah py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
        <div className="min-w-0 flex-1">
          <span className="mb-1 inline-block rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
            Pilihan {p.urutan}
          </span>
          <p className="text-base font-extrabold leading-snug tracking-tight">{p.prodiNama}</p>
          <p className="text-sm text-muted">{p.ptn}</p>
        </div>

        <span
          className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-extrabold uppercase tracking-wide ${gaya.latar} ${gaya.teks}`}
        >
          {gaya.label}
        </span>
      </div>

      {p.status === "TIDAK_DIPROSES" && (
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Tidak diproses karena kamu sudah diterima di Pilihan {diterimaDi}.
        </p>
      )}

      {p.status === "TANPA_DATA" ? (
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Prodi ini belum ada di basis data ancar-ancar skor Adzkia, jadi belum bisa diseleksi.
          Lihat prodi serupa di Rekomendasi Kampus di bawah.
        </p>
      ) : (
        p.ancar && (
          <dl className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs">
            <div className="flex gap-1.5">
              <dt className="text-muted">Ancar-ancar skor</dt>
              <dd className="font-bold tabular-nums">{angka(p.ancar.skorMin)}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-muted">Daya tampung</dt>
              <dd className="font-bold tabular-nums text-brand">
                {p.ancar.dayaTampung == null ? "—" : angka(p.ancar.dayaTampung)}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-muted">Peminat</dt>
              <dd className="font-bold tabular-nums text-brand">
                {p.ancar.peminat == null ? "—" : angka(p.ancar.peminat)}
              </dd>
            </div>
            {p.ancar.keketatan != null && (
              <div className="flex gap-1.5">
                <dt className="text-muted">Keketatan</dt>
                <dd className="font-bold tabular-nums">1 : {desimal(p.ancar.keketatan, 1)}</dd>
              </div>
            )}
            {p.peringkat != null && p.pesaing > 1 && (
              <div className="flex gap-1.5">
                <dt className="text-muted">Di antara peserta Adzkia</dt>
                <dd className="font-bold tabular-nums">
                  ke-{p.peringkat} dari {angka(p.pesaing)} pemilih
                </dd>
              </div>
            )}
          </dl>
        )
      )}

      <div className="no-print mt-3">
        <Link href="#rekomendasi-kampus" className="btn btn-primary !px-4 !py-2 text-sm">
          Rekomendasi Prodi
        </Link>
      </div>
    </li>
  );
}
