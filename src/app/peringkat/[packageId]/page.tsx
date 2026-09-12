import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { angka, desimal, tanggalSingkat, warnaSkor } from "@/components/hasil/format";
import { requireUser } from "@/lib/auth/auth";
import { jagaPortal } from "@/lib/admin/portal";
import { all, one } from "@/lib/core/db";
import { peringkatPeserta, statistikPaket, type BarisPeringkat } from "@/lib/tryout/irt";
import { URUTAN_SUBTES, namaSubtes } from "@/lib/tryout/snbt";

export const metadata = { title: "Papan Peringkat" };

const BATAS_TOP = 25;

interface PaketRow {
  id: number;
  kode: string;
  nama: string;
  status: string;
  jalur: string;
}

export default async function HalamanPeringkat({
  params,
}: {
  params: Promise<{ packageId: string }>;
}) {
  const { packageId: rawId } = await params;
  const packageId = Number(rawId);
  if (!Number.isFinite(packageId) || packageId <= 0) notFound();

  const user = await requireUser();

  const paket = await one<PaketRow>(
    "SELECT id, kode, nama, status, jalur FROM packages WHERE id = ?",
    packageId,
  );
  if (!paket) notFound();

  // Portal jalur ini ditutup pengelola: siswa tidak boleh masuk lebih jauh.
  await jagaPortal(paket.jalur === "skd" ? "skd" : "utbk");
  // Paket yang masih draft hanya boleh diintip admin.
  if (paket.status === "draft" && user.role !== "admin") notFound();

  const papan = await peringkatPeserta(packageId);
  const stat = await statistikPaket(packageId);

  // Subtes yang benar-benar ada datanya, dalam urutan resmi UTBK.
  const kolomSubtes = URUTAN_SUBTES.filter((k) => stat.perSubtes.some((s) => s.subtes === k));

  const attemptSaya = await one<{ id: number }>(
    "SELECT id FROM attempts WHERE user_id = ? AND package_id = ?",
    user.id,
    packageId,
  );
  const barisSaya = papan.find((r) => r.userId === user.id) ?? null;
  const diLuarTop = barisSaya != null && barisSaya.peringkat > BATAS_TOP;
  const top = papan.slice(0, BATAS_TOP);

  // Dipakai untuk mencari attempt milik user walau ia tidak masuk papan (mis. belum selesai).
  const belumSelesai = (await all<{ status: string }>(
    "SELECT status FROM attempts WHERE user_id = ? AND package_id = ?",
    user.id,
    packageId,
  )).some((a) => a.status !== "finished");

  return (
    <>
      <Navbar jalur={paket.jalur === "skd" ? "skd" : "utbk"} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <PageHeader
          title="Papan Peringkat"
          subtitle={`${paket.nama} · ${angka(stat.jumlahPeserta)} peserta sudah menyelesaikan paket ini.`}
          action={
            <div className="flex flex-wrap gap-2">
              <Link href="/riwayat" className="btn btn-ghost">
                Riwayat
              </Link>
              {barisSaya && (
                <Link href={`/hasil/${barisSaya.attemptId}`} className="btn btn-primary">
                  Hasilku
                </Link>
              )}
              {!barisSaya && attemptSaya && belumSelesai && (
                <Link href="/dashboard" className="btn btn-primary">
                  Lanjutkan tryout
                </Link>
              )}
            </div>
          }
        />

        {papan.length === 0 ? (
          <EmptyState
            title="Belum ada peserta yang selesai"
            description="Papan peringkat muncul setelah minimal satu peserta menuntaskan seluruh subtes paket ini."
            action={
              <Link href="/dashboard" className="btn btn-primary">
                Kembali ke Beranda
              </Link>
            }
          />
        ) : (
          <div className="space-y-5">
            {/* Ringkasan paket */}
            <div className="grid gap-3 sm:grid-cols-4">
              <Ringkas judul="Peserta" nilai={angka(stat.jumlahPeserta)} />
              <Ringkas judul="Rata-rata" nilai={angka(stat.rataTotal)} />
              <Ringkas judul="Tertinggi" nilai={angka(stat.tertinggiTotal)} warna="text-success" />
              <Ringkas judul="Terendah" nilai={angka(stat.terendahTotal)} warna="text-muted" />
            </div>

            {/* Rata-rata per subtes */}
            <div className="card p-5 sm:p-6">
              <h2 className="text-lg font-extrabold tracking-tight">Rata-rata per Subtes</h2>
              <p className="text-sm text-muted">
                Angka acuan untuk membaca posisimu di tiap bagian ujian.
              </p>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {stat.perSubtes.map((s) => {
                  const skorSaya = barisSaya?.skorSubtes[s.subtes];
                  return (
                    <div key={s.subtes} className="rounded-xl border border-line bg-surface-muted/50 p-3.5">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                        {s.subtes}
                      </p>
                      <p className="text-xs leading-4 text-muted">{s.nama}</p>
                      <p className="mt-1.5 text-2xl font-extrabold tracking-tight">{angka(s.rata)}</p>
                      <p className="text-[11px] text-muted">
                        tertinggi {angka(s.tertinggi)} · rerata {desimal(s.rataBenar, 1)}/
                        {angka(s.jumlahSoal)} benar
                      </p>
                      {skorSaya != null && (
                        <p
                          className={`mt-1 text-[11px] font-bold ${
                            skorSaya >= s.rata ? "text-success" : "text-danger"
                          }`}
                        >
                          Skormu {angka(skorSaya)} ({skorSaya >= s.rata ? "+" : "−"}
                          {angka(Math.abs(skorSaya - s.rata))})
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tabel peringkat */}
            <div className="card overflow-hidden">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-5 py-4">
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight">
                    Top {angka(Math.min(BATAS_TOP, papan.length))} Peserta
                  </h2>
                  <p className="text-sm text-muted">
                    Diurutkan dari skor total tertinggi. Barismu ditandai warna.
                  </p>
                </div>
                <Badge tone="brand">{paket.kode}</Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="border-b border-line bg-surface-muted/60 text-left text-xs uppercase tracking-wide text-muted">
                      <th className="px-4 py-2.5 text-center font-semibold">#</th>
                      <th className="px-3 py-2.5 font-semibold">Nama</th>
                      <th className="px-3 py-2.5 font-semibold">Asal Sekolah</th>
                      {kolomSubtes.map((k) => (
                        <th key={k} className="px-2 py-2.5 text-center font-semibold" title={namaSubtes(k)}>
                          {k}
                        </th>
                      ))}
                      <th className="px-4 py-2.5 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top.map((r) => (
                      <BarisTabel
                        key={r.attemptId}
                        baris={r}
                        kolom={kolomSubtes}
                        milikku={r.userId === user.id}
                        bisaBuka={r.userId === user.id || user.role === "admin"}
                      />
                    ))}

                    {diLuarTop && barisSaya && (
                      <>
                        <tr>
                          <td
                            colSpan={4 + kolomSubtes.length}
                            className="px-4 py-2 text-center text-xs text-muted"
                          >
                            ⋯ {angka(barisSaya.peringkat - BATAS_TOP - 1)} peserta lain ⋯
                          </td>
                        </tr>
                        <BarisTabel
                          baris={barisSaya}
                          kolom={kolomSubtes}
                          milikku
                          bisaBuka
                        />
                      </>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-line bg-surface-muted/60 text-xs font-bold">
                      <td className="px-4 py-2.5" colSpan={3}>
                        Rata-rata seluruh peserta
                      </td>
                      {kolomSubtes.map((k) => {
                        const s = stat.perSubtes.find((x) => x.subtes === k);
                        return (
                          <td key={k} className="px-2 py-2.5 text-center text-muted">
                            {angka(s?.rata ?? 0)}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2.5 text-right">{angka(stat.rataTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {!barisSaya && (
              <p className="card p-4 text-sm text-muted">
                Kamu belum menyelesaikan paket ini, jadi belum masuk papan peringkat. Selesaikan
                dulu ya — hasilnya langsung terhitung.
              </p>
            )}
          </div>
        )}
      </main>
    </>
  );
}

function BarisTabel({
  baris,
  kolom,
  milikku,
  bisaBuka,
}: {
  baris: BarisPeringkat;
  kolom: string[];
  milikku: boolean;
  bisaBuka: boolean;
}) {
  const medali = baris.peringkat === 1 ? "🥇" : baris.peringkat === 2 ? "🥈" : baris.peringkat === 3 ? "🥉" : null;
  return (
    <tr
      className={`border-b border-line/70 last:border-0 ${
        milikku ? "bg-brand-soft font-semibold" : ""
      }`}
    >
      <td
        className={`px-4 py-2.5 text-center ${milikku ? "border-l-4 border-brand" : ""}`}
      >
        <span className="inline-flex items-center gap-1 font-extrabold">
          {medali ?? baris.peringkat}
        </span>
      </td>
      <td className="px-3 py-2.5">
        {bisaBuka ? (
          <Link href={`/hasil/${baris.attemptId}`} className="font-semibold text-brand hover:underline">
            {baris.nama}
          </Link>
        ) : (
          <span className="font-semibold">{baris.nama}</span>
        )}
        {milikku && <span className="ml-2 text-[11px] font-bold text-brand">(kamu)</span>}
        <span className="ml-2 text-[11px] text-muted">{tanggalSingkat(baris.selesaiAt)}</span>
      </td>
      <td className="px-3 py-2.5 text-muted">{baris.asalSekolah || "—"}</td>
      {kolom.map((k) => (
        <td key={k} className="px-2 py-2.5 text-center tabular-nums">
          {baris.skorSubtes[k] != null ? angka(baris.skorSubtes[k]) : "—"}
        </td>
      ))}
      <td className={`px-4 py-2.5 text-right text-base font-extrabold ${warnaSkor(baris.totalSkor)}`}>
        {angka(baris.totalSkor)}
      </td>
    </tr>
  );
}

function Ringkas({ judul, nilai, warna = "" }: { judul: string; nilai: string; warna?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{judul}</p>
      <p className={`mt-0.5 text-2xl font-extrabold tracking-tight ${warna}`}>{nilai}</p>
    </div>
  );
}
