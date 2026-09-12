import Link from "next/link";

import { KartuStat, PesanFlash, TabelScroll, TD, TH } from "@/components/admin/AdminUI";
import { EmptyState, PageHeader } from "@/components/ui";
import {
  type ParamsQuery,
  pengerjaanTerbaru,
  satuParam,
  statistikDasbor,
  tanggalIndo,
} from "@/lib/admin/admin";
import { requireAdmin } from "@/lib/auth/auth";
import { TOTAL_SOAL } from "@/lib/tryout/snbt";
import { identitasPeserta } from "@/lib/core/tampilan";

export const metadata = { title: "Dasbor Admin" };

const PINTASAN = [
  {
    href: "/admin/paket/baru",
    judul: "Buat paket tryout",
    isi: "Siapkan kode, jadwal, dan pengaturan pengerjaan.",
  },
  {
    href: "/admin/paket",
    judul: "Kelola bank soal",
    isi: "Isi 160 butir per paket, pantau kelengkapan tiap subtes.",
  },
  {
    href: "/admin/peserta",
    judul: "Data peserta",
    isi: "Cari siswa, lihat riwayat tryout, atur peran admin.",
  },
];

export default async function DasborAdminPage({
  searchParams,
}: {
  searchParams: Promise<ParamsQuery>;
}) {
  const admin = await requireAdmin();
  const sp = await searchParams;

  const stat = await statistikDasbor();
  const terbaru = await pengerjaanTerbaru(5);

  return (
    <>
      <PageHeader
        title={`Halo, ${admin.nama.split(" ")[0]} 👋`}
        subtitle="Ringkasan singkat kondisi tryout ADZKIA SMART hari ini."
        action={
          <Link className="btn btn-primary" href="/admin/paket/baru">
            + Paket baru
          </Link>
        }
      />

      <PesanFlash pesan={satuParam(sp.pesan)} galat={satuParam(sp.galat)} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KartuStat label="Paket tryout" nilai={stat.totalPaket} keterangan="Seluruh paket" href="/admin/paket" />
        <KartuStat
          label="Paket terbit"
          nilai={stat.paketTerbit}
          keterangan="Bisa dikerjakan siswa"
          href="/admin/paket"
        />
        <KartuStat
          label="Butir soal"
          nilai={stat.totalSoal}
          keterangan={`Setara ${(stat.totalSoal / TOTAL_SOAL).toFixed(1)} paket penuh`}
        />
        <KartuStat
          label="Peserta terdaftar"
          nilai={stat.totalPeserta}
          keterangan="Akun berperan siswa"
          href="/admin/peserta"
        />
        <KartuStat
          label="Pengerjaan selesai"
          nilai={stat.pengerjaanSelesai}
          keterangan="Tryout yang sudah dinilai"
        />
        <KartuStat
          label="Rata-rata skor"
          nilai={stat.pengerjaanSelesai ? stat.rataSkor : "—"}
          keterangan="Skala 0–1000 (IRT)"
        />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-bold tracking-tight">Pengerjaan terbaru</h2>
          <Link className="text-sm font-semibold text-brand hover:underline" href="/admin/peserta">
            Lihat semua peserta →
          </Link>
        </div>

        {terbaru.length === 0 ? (
          <EmptyState
            title="Belum ada pengerjaan"
            description="Begitu siswa mulai mengerjakan paket yang sudah terbit, aktivitasnya muncul di sini."
            action={
              <Link className="btn btn-primary" href="/admin/paket">
                Kelola paket
              </Link>
            }
          />
        ) : (
          <div className="card overflow-hidden">
            <TabelScroll>
              <table className="min-w-full border-collapse">
                <thead className="bg-surface-muted">
                  <tr>
                    <th className={TH}>Peserta</th>
                    <th className={TH}>Paket</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Waktu</th>
                    <th className={TH}>Skor</th>
                    <th className={TH}></th>
                  </tr>
                </thead>
                <tbody>
                  {terbaru.map((p) => (
                    <tr key={p.id} className="border-t border-line">
                      <td className={TD}>
                        <Link
                          className="font-semibold text-brand hover:underline"
                          href={`/admin/peserta/${p.user_id}`}
                        >
                          {p.nama}
                        </Link>
                        <span className="block text-xs text-muted">{identitasPeserta(p.email)}</span>
                      </td>
                      <td className={TD}>
                        <span className="font-mono text-xs font-semibold">{p.kode}</span>
                        <span className="block text-xs text-muted">{p.paket_nama}</span>
                      </td>
                      <td className={TD}>
                        <span
                          className={`text-xs font-semibold ${
                            p.status === "finished"
                              ? "text-success"
                              : p.status === "gugur"
                                ? "text-danger"
                                : "text-warning"
                          }`}
                        >
                          {p.status === "finished"
                            ? "Selesai"
                            : p.status === "gugur"
                              ? "GAGAL"
                              : "Sedang dikerjakan"}
                        </span>
                      </td>
                      <td className={`${TD} whitespace-nowrap text-xs text-muted`}>
                        {tanggalIndo(p.finished_at ?? p.started_at)}
                      </td>
                      <td className={`${TD} font-bold tabular-nums`}>
                        {p.total_skor != null ? Math.round(p.total_skor) : "—"}
                      </td>
                      <td className={TD}>
                        {p.status === "finished" && (
                          <Link
                            className="text-xs font-semibold text-brand hover:underline"
                            href={`/hasil/${p.id}`}
                          >
                            Lihat hasil
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabelScroll>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold tracking-tight">Pintasan</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PINTASAN.map((p) => (
            <Link key={p.href} href={p.href} className="card p-5 transition-colors hover:bg-surface-muted">
              <p className="font-bold">{p.judul}</p>
              <p className="mt-1 text-sm text-muted">{p.isi}</p>
              <span className="mt-3 inline-block text-sm font-semibold text-brand">Buka →</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
