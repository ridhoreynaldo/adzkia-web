import Link from "next/link";

import { TD, TH, TabelScroll } from "@/components/admin/AdminUI";
import { AutoSegar } from "@/components/admin/AutoSegar";
import { band } from "@/components/language/TabelBand";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireAdminIelts } from "@/lib/auth/auth";
import { BUDGET_PERGI_DETIK } from "@/lib/penjagaan/denyut";
import { SUBTES_IELTS, semuaPaket, paketById, type SubtesIeltsKode } from "@/lib/ielts/ielts";
import { kolomSubtesLive, papanLiveIelts, ringkasLiveIelts } from "@/lib/ielts/ielts-live";
import { wajibFiturLanguage } from "@/lib/ielts/language";

export const metadata = { title: "Skor Live IELTS" };
export const dynamic = "force-dynamic";

const MEDALI = ["🥇", "🥈", "🥉"];

function jam(nilai: string | null): string {
  if (!nilai) return "—";
  const m = /(\d{2}):(\d{2})/.exec(nilai);
  return m ? `${m[1]}.${m[2]}` : "—";
}

/**
 * SKOR LIVE IELTS — padanan `/admin/live` pada jalur UTBK-SNBT.
 *
 * Tata letaknya sengaja dijiplak dari papan UTBK sampai ke urutan kartunya:
 * pengawas yang berpindah antara dua jalur pada hari yang sama tidak boleh
 * harus belajar membaca dua papan.
 */
export default async function LiveIeltsPage({
  searchParams,
}: {
  searchParams: Promise<{ paket?: string }>;
}) {
  await wajibFiturLanguage();
  await requireAdminIelts();

  const { paket: paketMentah } = await searchParams;
  const daftar = await semuaPaket();
  const dipilih = Number(paketMentah) || daftar[0]?.id || 0;
  const paket = await paketById(dipilih);

  const baris = paket ? await papanLiveIelts(paket.id) : [];
  const ringkas = ringkasLiveIelts(baris);
  const kolom = kolomSubtesLive(baris);
  const namaSubtes = new Map(SUBTES_IELTS.map((s) => [s.kode, s.nama]));

  return (
    <>
      <PageHeader
        title="Skor Live IELTS"
        subtitle="Band peserta diperbarui sendiri selama ujian berlangsung."
        action={<AutoSegar detik={10} />}
      />

      {daftar.length === 0 ? (
        <EmptyState
          title="Belum ada paket IELTS"
          description="Buat paketnya lebih dulu di panel IELTS, lalu papan ini terisi begitu ada siswa yang membukanya."
          action={
            <Link href="/admin/ielts" className="btn btn-primary">
              Buka panel IELTS
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {daftar.map((p) => (
              <Link
                key={p.id}
                href={`/admin/ielts/live?paket=${p.id}`}
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

          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Sedang Ujian</p>
              <p className="mt-1 flex items-center gap-2 text-3xl font-extrabold">
                {ringkas.sedangUjian > 0 && (
                  <span
                    className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-success"
                    aria-hidden
                  />
                )}
                {ringkas.sedangUjian}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                Hanya yang timer subtesnya sedang berjalan.
              </p>
              {ringkas.timerMati > 0 && (
                <p className="mt-1.5 text-xs font-semibold leading-relaxed text-warning">
                  {ringkas.timerMati} peserta lain berstatus berjalan tetapi timernya sudah mati
                  {ringkas.terbengkalai > 0
                    ? ` — ${ringkas.terbengkalai} di antaranya tidak bisa melanjutkan apa pun.`
                    : " — semuanya masih boleh kembali melanjutkan."}
                </p>
              )}
            </div>
            <div className="card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Selesai</p>
              <p className="mt-1 text-3xl font-extrabold">{ringkas.selesai}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Dihentikan</p>
              <p
                className={`mt-1 text-3xl font-extrabold ${
                  ringkas.dihentikan > 0 ? "text-danger" : ""
                }`}
              >
                {ringkas.dihentikan}
              </p>
              {ringkas.dihentikan > 0 && (
                <Link
                  href={`/admin/ielts/keamanan?paket=${dipilih}`}
                  className="mt-1 inline-block text-xs font-semibold text-danger hover:underline"
                >
                  Tinjau &amp; buka sesi ulang →
                </Link>
              )}
            </div>
            <div className="card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Rata-rata band</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums">
                {band(ringkas.rataOverall)}
              </p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Band tertinggi</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums text-brand">
                {band(ringkas.tertinggi)}
              </p>
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
                  href={`/admin/ielts/keamanan?paket=${dipilih}`}
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
              description={`Begitu ada siswa yang menyetujui tata tertib pada ${paket?.kode ?? "paket ini"}, namanya langsung muncul di papan ini.`}
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
                      {kolom.map((k) => (
                        <th key={k} className={TH} title={namaSubtes.get(k)}>
                          {namaSubtes.get(k)?.slice(0, 4).toUpperCase()}
                        </th>
                      ))}
                      <th className={`${TH} text-right`}>Overall</th>
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
                          key={b.pengerjaanId}
                          className={`border-b border-line last:border-0 ${
                            b.status === "ongoing"
                              ? "bg-warning-soft/40"
                              : b.status === "gugur"
                                ? "bg-danger-soft/40"
                                : ""
                          }`}
                        >
                          <td className={`${TD} font-bold`}>
                            {b.status === "finished"
                              ? (MEDALI[i] ?? i + 1)
                              : b.status === "gugur"
                                ? "✕"
                                : "•"}
                          </td>
                          <td className={TD}>
                            <Link
                              href={`/admin/ielts/peserta/${b.pengerjaanId}`}
                              className="font-semibold text-brand hover:underline"
                            >
                              {b.nama}
                            </Link>
                            <p className="text-xs text-muted">
                              {b.nisn ? `NISN ${b.nisn}` : "—"}
                              {b.kelas ? ` · ${b.kelas}` : ""}
                              {b.ronde > 1 ? ` · ronde ${b.ronde}` : ""}
                            </p>
                          </td>
                          <td className={TD}>
                            {b.status === "finished" ? (
                              <span className="inline-flex rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
                                Selesai {jam(b.selesaiAt)}
                              </span>
                            ) : b.status === "gugur" ? (
                              <span className="inline-flex rounded-full bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger">
                                DIHENTIKAN
                              </span>
                            ) : b.timerJalan ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-bold text-warning">
                                <span
                                  className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-warning"
                                  aria-hidden
                                />
                                {b.subtesAktif
                                  ? (namaSubtes.get(b.subtesAktif as SubtesIeltsKode) ??
                                    b.subtesAktif)
                                  : "Mengerjakan"}
                              </span>
                            ) : b.menungguSoal ? (
                              <span className="inline-flex rounded-full bg-surface-muted px-2.5 py-1 text-xs font-bold text-muted">
                                Menunggu soal diunggah
                              </span>
                            ) : b.bisaLanjut ? (
                              <span className="inline-flex rounded-full bg-surface-muted px-2.5 py-1 text-xs font-bold text-muted">
                                Jeda — boleh lanjut
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-warning-soft px-2.5 py-1 text-xs font-bold text-warning">
                                Waktu habis — belum ditutup
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
                          {kolom.map((k) => (
                            <td key={k} className={`${TD} tabular-nums`}>
                              {b.band[k] == null ? "—" : band(b.band[k])}
                            </td>
                          ))}
                          <td className={`${TD} text-right`}>
                            <span
                              className={`text-lg font-extrabold tabular-nums ${
                                b.final ? "text-brand" : "text-muted"
                              }`}
                            >
                              {band(b.overall)}
                            </span>
                            {b.overall !== null && !b.final && (
                              <span className="block text-[11px] font-semibold text-muted">
                                sementara
                              </span>
                            )}
                          </td>
                          <td className={TD}>
                            {b.pelanggaran > 0 ? (
                              <Link
                                href={`/admin/ielts/keamanan?paket=${dipilih}`}
                                className="inline-flex rounded-full bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger hover:underline"
                              >
                                {b.pelanggaran}×
                              </Link>
                            ) : (
                              <span className="text-xs text-muted">—</span>
                            )}
                            {b.detikPergi > 0 && (
                              <p
                                className={`mt-0.5 text-[11px] tabular-nums ${
                                  b.detikPergi >= BUDGET_PERGI_DETIK
                                    ? "font-bold text-danger"
                                    : "text-muted"
                                }`}
                              >
                                {b.detikPergi}/{BUDGET_PERGI_DETIK} dtk
                              </p>
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

          <p className="mt-4 text-xs leading-relaxed text-muted">
            Baris berlatar kuning = peserta masih mengerjakan. Band yang ditandai{" "}
            <strong>sementara</strong> belum menghitung seluruh subtes yang diujikan — biasanya
            menunggu penilaian Writing atau Speaking. Band IELTS <strong>tidak pernah disimpan</strong>:
            papan ini menghitungnya ulang tiap kali dimuat, jadi membukanya tidak mengubah nilai
            siapa pun. Kolom <strong>dtk</strong> adalah jumlah waktu peserta di luar halaman ujian
            pada ronde berjalan, dibandingkan anggaran {BUDGET_PERGI_DETIK} detik.
          </p>
        </>
      )}
    </>
  );
}
