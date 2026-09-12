import Link from "next/link";

import { AutoSegar } from "@/components/admin/AutoSegar";
import { TabelScroll, TD, TH } from "@/components/admin/AdminUI";
import { EmptyState, PageHeader } from "@/components/ui";
import { type ParamsQuery, daftarPaket, satuParam, ujianTerbengkalai } from "@/lib/admin/admin";
import { requireAdmin } from "@/lib/auth/auth";
import { papanLive, ringkasLive } from "@/lib/admin/live";
import { SUBTES } from "@/lib/tryout/snbt";

export const metadata = { title: "Hasil TO Real UTBK Live" };
export const dynamic = "force-dynamic";

const MEDALI = ["🥇", "🥈", "🥉"];

function jam(nilai: string | null): string {
  if (!nilai) return "—";
  const m = /(\d{2}):(\d{2})/.exec(nilai);
  return m ? `${m[1]}.${m[2]}` : "—";
}

export default async function LivePage({ searchParams }: { searchParams: Promise<ParamsQuery> }) {
  // Penjaga ditulis di sini, bukan dititipkan ke tata letak panel: sejak ada
  // pengelola berlingkup IELTS, tata letak memakai penjaga yang MENERIMA
  // mereka. Halaman ini milik jalur UTBK, jadi ia menolaknya sendiri.
  await requireAdmin();
  const sp = await searchParams;
  const paketList = await daftarPaket();
  const dipilih = Number(satuParam(sp.paket)) || paketList[0]?.id || 0;
  const paket = paketList.find((p) => p.id === dipilih);

  const baris = paket ? await papanLive(paket.id) : [];
  const ringkas = ringkasLive(baris);
  // “Sedang Ujian” menghitung status `ongoing` apa adanya, termasuk pengerjaan
  // yang waktunya sudah habis berhari-hari lalu. Titik hijau berdenyut di
  // sebelahnya membuat keduanya terbaca sama — seolah ada peserta yang benar
  // benar sedang mengerjakan detik ini. Selisihnya disebutkan di sini supaya
  // pengawas tidak salah membaca angkanya.
  const terbengkalai = paket ? (await ujianTerbengkalai(paket.id)).length : 0;
  const subtesTampil = SUBTES.filter((s) =>
    baris.some((b) => b.skorSubtes[s.kode] !== undefined),
  );

  return (
    <>
      <PageHeader
        title="Hasil TO Real UTBK — Live"
        subtitle="Skor peserta diperbarui otomatis selama tryout berlangsung."
        action={<AutoSegar detik={10} />}
      />

      {paketList.length === 0 ? (
        <EmptyState
          title="Belum ada paket tryout"
          description="Buat paket tryout lebih dulu untuk memantau skor peserta secara langsung."
          action={
            <Link href="/admin/paket/baru" className="btn btn-primary">
              Buat paket
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {paketList.map((p) => (
              <Link
                key={p.id}
                href={`/admin/live?paket=${p.id}`}
                className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${
                  p.id === dipilih
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-line bg-surface text-muted hover:text-foreground"
                }`}
              >
                {p.kode}
              </Link>
            ))}
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Sedang Ujian</p>
              <p className="mt-1 flex items-center gap-2 text-3xl font-extrabold">
                {ringkas.sedangUjian > 0 && (
                  <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-success" aria-hidden />
                )}
                {ringkas.sedangUjian}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                Hanya yang timer subtesnya sedang berjalan.
              </p>
              {ringkas.timerMati > 0 && (
                <p className="mt-1.5 text-xs font-semibold leading-relaxed text-warning">
                  {ringkas.timerMati} peserta lain berstatus berjalan tetapi timernya sudah mati
                  {terbengkalai > 0 && (
                    <>
                      {" "}— {terbengkalai} di antaranya tidak bisa melanjutkan apa pun.{" "}
                      <Link
                        href={`/admin/pelanggaran?paket=${paket?.id ?? 0}`}
                        className="underline underline-offset-2"
                      >
                        Tutup &amp; nilai
                      </Link>
                    </>
                  )}
                  {terbengkalai === 0 && " — semuanya masih boleh kembali melanjutkan."}
                </p>
              )}
            </div>
            <div className="card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Selesai</p>
              <p className="mt-1 text-3xl font-extrabold">{ringkas.selesai}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Digugurkan</p>
              <p
                className={`mt-1 text-3xl font-extrabold ${
                  ringkas.digugurkan > 0 ? "text-danger" : ""
                }`}
              >
                {ringkas.digugurkan}
              </p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Rata-rata</p>
              <p className="mt-1 text-3xl font-extrabold">{ringkas.rataSelesai || "—"}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Tertinggi</p>
              <p className="mt-1 text-3xl font-extrabold text-brand">{ringkas.tertinggi || "—"}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Pelanggaran</p>
              <p
                className={`mt-1 text-3xl font-extrabold ${
                  ringkas.totalPelanggaran > 0 ? "text-danger" : ""
                }`}
              >
                {ringkas.totalPelanggaran}
              </p>
              {ringkas.totalPelanggaran > 0 && (
                <Link
                  href={`/admin/pelanggaran?paket=${dipilih}`}
                  className="mt-1 inline-block text-xs font-semibold text-danger hover:underline"
                >
                  Lihat rinciannya →
                </Link>
              )}
            </div>
          </div>

          {baris.length === 0 ? (
            <EmptyState
              title="Belum ada peserta yang membuka paket ini"
              description={`Begitu peserta menekan "Mulai Ujian" pada ${paket?.kode ?? "paket ini"}, namanya langsung muncul di papan ini.`}
            />
          ) : (
            <div className="card overflow-hidden p-0">
              <TabelScroll>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-surface-muted text-left">
                      <th className={TH}>#</th>
                      <th className={TH}>Peserta</th>
                      <th className={TH}>Status</th>
                      <th className={TH}>Progres</th>
                      {subtesTampil.map((s) => (
                        <th key={s.kode} className={TH} title={s.nama}>
                          {s.kode}
                        </th>
                      ))}
                      <th className={`${TH} text-right`}>Skor</th>
                      <th className={TH}>Langgar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {baris.map((b, i) => {
                      const persen = b.totalSoal
                        ? Math.round((b.dijawab / b.totalSoal) * 100)
                        : 0;
                      return (
                        <tr
                          key={b.attemptId}
                          className={`border-b border-line last:border-0 ${
                            b.status === "ongoing"
                              ? "bg-warning-soft/40"
                              : b.status === "gugur"
                                ? "bg-danger-soft/40"
                                : ""
                          }`}
                        >
                          <td className={`${TD} font-bold`}>
                            {b.status === "finished" ? (MEDALI[i] ?? i + 1) : b.status === "gugur" ? "✕" : "•"}
                          </td>
                          <td className={TD}>
                            <p className="font-semibold">{b.nama}</p>
                            <p className="text-xs text-muted">{b.asalSekolah ?? "—"}</p>
                          </td>
                          <td className={TD}>
                            {b.status === "finished" ? (
                              <span className="inline-flex rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
                                Selesai {jam(b.selesaiAt)}
                              </span>
                            ) : b.status === "gugur" ? (
                              <span className="inline-flex rounded-full bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger">
                                GAGAL — keluar halaman
                              </span>
                            ) : b.timerJalan ? (
                              // Benar-benar ada hitungan mundur yang menyala.
                              // Hanya keadaan inilah yang boleh berdenyut.
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-bold text-warning">
                                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-warning" aria-hidden />
                                {b.subtesAktif ?? "Mengerjakan"}
                              </span>
                            ) : b.menungguSoal ? (
                              // Paketnya belum berisi soal. Tidak ada yang bisa
                              // dikerjakan maupun dinilai; peserta menunggu.
                              <span className="inline-flex rounded-full bg-surface-muted px-2.5 py-1 text-xs font-bold text-muted">
                                Menunggu soal diunggah
                              </span>
                            ) : b.bisaLanjut ? (
                              // Timer mati, tetapi jendela paket masih terbuka dan
                              // masih ada subtes yang belum dibuka: peserta boleh
                              // kembali kapan saja. Bukan terbengkalai.
                              <span className="inline-flex rounded-full bg-surface-muted px-2.5 py-1 text-xs font-bold text-muted">
                                Jeda — boleh lanjut
                              </span>
                            ) : (
                              // Timer mati dan tidak ada lagi yang bisa
                              // dilanjutkan. Nilainya belum keluar sampai
                              // pengelola menutupnya.
                              <span className="inline-flex rounded-full bg-warning-soft px-2.5 py-1 text-xs font-bold text-warning">
                                Waktu habis — belum dinilai
                              </span>
                            )}
                          </td>
                          <td className={TD}>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-muted">
                                <div
                                  className={`h-full ${
                                    b.status === "finished"
                                      ? "bg-success"
                                      : b.status === "gugur"
                                        ? "bg-danger"
                                        : "bg-brand"
                                  }`}
                                  style={{ width: `${persen}%` }}
                                />
                              </div>
                              <span className="whitespace-nowrap text-xs text-muted">
                                {b.subtesSelesai}/{b.totalSubtes} subtes
                              </span>
                            </div>
                          </td>
                          {subtesTampil.map((s) => (
                            <td key={s.kode} className={`${TD} tabular-nums`}>
                              {b.skorSubtes[s.kode] ?? "—"}
                            </td>
                          ))}
                          <td className={`${TD} text-right`}>
                            <span
                              className={`text-lg font-extrabold tabular-nums ${
                                b.status === "finished" ? "text-brand" : "text-muted"
                              }`}
                            >
                              {b.status === "gugur" ? "—" : b.skor || "—"}
                            </span>
                            {b.sementara && b.skor > 0 && (
                              <span className="block text-[11px] font-semibold text-muted">
                                sementara
                              </span>
                            )}
                          </td>
                          <td className={TD}>
                            {b.pelanggaran > 0 ? (
                              <Link
                                href={`/admin/pelanggaran?paket=${dipilih}`}
                                className="inline-flex rounded-full bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger hover:underline"
                              >
                                {b.pelanggaran}×
                              </Link>
                            ) : (
                              <span className="text-xs text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TabelScroll>
            </div>
          )}

          <p className="mt-4 text-xs text-muted">
            Baris berlatar kuning = peserta masih mengerjakan. Skor mereka ditandai{" "}
            <strong>sementara</strong> karena hanya menghitung subtes yang sudah ditutup; skor final
            muncul setelah seluruh subtes selesai. Skor sementara tidak disimpan dan tidak
            memengaruhi peringkat resmi.
          </p>
        </>
      )}
    </>
  );
}
