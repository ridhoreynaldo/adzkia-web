import Link from "next/link";
import { notFound } from "next/navigation";

import { geserSoalAction, hapusSoalAction, setNomorSoalAction } from "@/app/admin/actions";
import {
  BarKelengkapan,
  LencanaStatus,
  PesanFlash,
  TabelScroll,
  TD,
  TH,
} from "@/components/admin/AdminUI";
import { TombolAksi, TombolKonfirmasi } from "@/components/admin/TombolKonfirmasi";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import {
  TARGET_C3,
  TARGET_C4,
  type ParamsQuery,
  ambilPaketRingkas,
  daftarSoal,
  labelKunci,
  masalahSoal,
  potongTeks,
  ringkasanSubtes,
  satuParam,
} from "@/lib/admin/admin";
import { requireAdmin } from "@/lib/auth/auth";
import { namaSubtes, subtesJalur, totalSoalJalur } from "@/lib/tryout/snbt";

export const metadata = { title: "Bank Soal" };

function persen(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export default async function BankSoalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<ParamsQuery>;
}) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;

  const paketId = Number.parseInt(id, 10);
  const paket = Number.isInteger(paketId) ? await ambilPaketRingkas(paketId) : undefined;
  if (!paket) notFound();

  // Paket SKD punya tiga subtesnya sendiri (TWK/TIU/TKP); tanpa ini butirnya
  // tidak pernah muncul di Bank Soal karena tab yang dipasang selalu tab UTBK.
  const daftar = subtesJalur(paket.jalur);
  const kuotaJalur = totalSoalJalur(paket.jalur);
  const ringkas = await ringkasanSubtes(paket.id, paket.jalur);
  const diminta = satuParam(sp.subtes);
  const aktif = daftar.some((s) => s.kode === diminta) ? (diminta as string) : daftar[0].kode;
  const info = ringkas.find((r) => r.kode === aktif);
  const soal = await daftarSoal(paket.id, aktif);

  const totalBermasalah = ringkas.reduce((a, r) => a + r.bermasalah, 0);

  return (
    <>
      <PageHeader
        title={`Bank soal ${paket.kode}`}
        subtitle={paket.nama}
        action={
          <div className="flex flex-wrap gap-2">
            <Link className="btn btn-primary" href={`/admin/paket/${paket.id}/soal/baru?subtes=${aktif}`}>
              + Tambah soal
            </Link>
            <Link className="btn btn-ghost" href={`/admin/paket/${paket.id}/pratinjau?subtes=${aktif}`}>
              Pratinjau soal
            </Link>
            <Link className="btn btn-ghost" href={`/admin/paket/${paket.id}/simulasi`}>
              Pratinjau ujian
            </Link>
            <Link className="btn btn-ghost" href={`/admin/paket/${paket.id}/import`}>
              Impor massal
            </Link>
            <Link className="btn btn-ghost" href={`/admin/paket/${paket.id}/edit`}>
              Edit paket
            </Link>
          </div>
        }
      />

      <PesanFlash pesan={satuParam(sp.pesan)} galat={satuParam(sp.galat)} />

      <div className="card mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Status paket</p>
          <div className="mt-1">
            <LencanaStatus status={paket.status} />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Kelengkapan total</p>
          <div className="mt-1.5">
            <BarKelengkapan terisi={paket.jumlah_soal} target={kuotaJalur} />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Butir bermasalah</p>
          <p
            className={`mt-1 text-lg font-extrabold ${
              totalBermasalah ? "text-danger" : "text-success"
            }`}
          >
            {totalBermasalah}
          </p>
        </div>
        <div className="ml-auto text-xs text-muted">
          Target juknis komposisi level: <strong>C3 {persen(TARGET_C3)}</strong> ·{" "}
          <strong>C4 {persen(TARGET_C4)}</strong>
        </div>
      </div>

      {/* ---------------------------- TAB SUBTES ---------------------------- */}
      <div className="-mx-4 mb-6 overflow-x-auto px-4">
        <div className="flex min-w-max gap-2">
          {ringkas.map((r) => {
            const on = r.kode === aktif;
            return (
              <Link
                key={r.kode}
                href={`/admin/paket/${paket.id}/soal?subtes=${r.kode}`}
                aria-current={on ? "page" : undefined}
                className={`min-w-40 rounded-xl border p-3 transition-colors ${
                  on ? "border-brand bg-brand-soft" : "border-line bg-surface hover:bg-surface-muted"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-sm font-extrabold ${on ? "text-brand" : ""}`}>{r.kode}</span>
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      r.terisi >= r.target ? "text-success" : "text-muted"
                    }`}
                  >
                    {r.terisi}/{r.target}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[0.7rem] text-muted">{r.namaPendek}</p>
                <p
                  className={`mt-1 text-[0.7rem] font-semibold ${
                    r.komposisiMelenceng ? "text-danger" : "text-muted"
                  }`}
                >
                  C3 {persen(r.persenC3)} · C4 {persen(r.persenC4)}
                  {r.komposisiMelenceng ? " ⚠" : ""}
                </p>
                {r.bermasalah > 0 && (
                  <p className="mt-0.5 text-[0.7rem] font-semibold text-danger">
                    {r.bermasalah} butir belum lengkap
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* -------------------------- RINGKASAN AKTIF -------------------------- */}
      {info && (
        <div className="card mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
          <span className="font-bold">{namaSubtes(aktif)}</span>
          <span className="text-muted">
            Terisi <strong className="text-foreground">{info.terisi}</strong> dari {info.target} soal
          </span>
          <span className={info.komposisiMelenceng ? "font-semibold text-danger" : "text-muted"}>
            C3 {info.c3} butir ({persen(info.persenC3)}) · C4 {info.c4} butir ({persen(info.persenC4)})
          </span>
          {info.komposisiMelenceng && (
            <Badge tone="danger">Komposisi melenceng dari 60/40</Badge>
          )}
          {info.bermasalah > 0 && <Badge tone="warning">{info.bermasalah} butir belum lengkap</Badge>}
        </div>
      )}

      {/* ------------------------------ TABEL ------------------------------ */}
      {soal.length === 0 ? (
        <EmptyState
          title={`Belum ada soal ${aktif}`}
          description="Tambahkan butir satu per satu, atau impor sekaligus dari berkas Excel."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link className="btn btn-primary" href={`/admin/paket/${paket.id}/soal/baru?subtes=${aktif}`}>
                + Tambah soal
              </Link>
              <Link className="btn btn-ghost" href={`/admin/paket/${paket.id}/import`}>
                Impor dari Excel
              </Link>
            </div>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <TabelScroll>
            <table className="min-w-full border-collapse">
              <thead className="bg-surface-muted">
                <tr>
                  <th className={TH}>Nomor</th>
                  <th className={TH}>Pertanyaan</th>
                  <th className={TH}>Tipe</th>
                  <th className={TH}>Level</th>
                  <th className={TH}>Kunci</th>
                  <th className={TH}>Kelengkapan</th>
                  <th className={TH}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {soal.map((s) => {
                  const masalah = masalahSoal(s);
                  return (
                    <tr key={s.id} className="border-t border-line align-top">
                      <td className={TD}>
                        <div className="flex items-center gap-1">
                          <form action={geserSoalAction}>
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="package_id" value={paket.id} />
                            <input type="hidden" name="subtes" value={aktif} />
                            <input type="hidden" name="arah" value="naik" />
                            <TombolAksi className="btn btn-ghost px-2! py-1! text-xs" title="Naikkan nomor">
                              ▲
                            </TombolAksi>
                          </form>
                          <form action={setNomorSoalAction} className="flex items-center gap-1">
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="package_id" value={paket.id} />
                            <input type="hidden" name="subtes" value={aktif} />
                            <input
                              className="input w-16! px-2! py-1! text-center text-sm tabular-nums"
                              type="number"
                              name="nomor"
                              min={1}
                              defaultValue={s.nomor}
                              aria-label={`Nomor soal ${s.nomor}`}
                            />
                            <TombolAksi className="btn btn-ghost px-2! py-1! text-xs" title="Pindah ke nomor ini">
                              ↵
                            </TombolAksi>
                          </form>
                          <form action={geserSoalAction}>
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="package_id" value={paket.id} />
                            <input type="hidden" name="subtes" value={aktif} />
                            <input type="hidden" name="arah" value="turun" />
                            <TombolAksi className="btn btn-ghost px-2! py-1! text-xs" title="Turunkan nomor">
                              ▼
                            </TombolAksi>
                          </form>
                        </div>
                      </td>

                      <td className={`${TD} min-w-64 max-w-lg`}>
                        <Link
                          className="font-medium text-brand hover:underline"
                          href={`/admin/paket/${paket.id}/soal/${s.id}`}
                        >
                          {potongTeks(s.pertanyaan, 110)}
                        </Link>
                        {s.stimulus && (
                          <span className="mt-0.5 block text-xs text-muted">
                            Bacaan:{" "}
                            {s.stimulus.includes("<img")
                              ? "gambar naskah asli"
                              : potongTeks(s.stimulus, 70)}
                          </span>
                        )}
                        {s.gambar_url && (
                          <span className="mt-0.5 block text-xs text-muted">Naskah soal berupa gambar</span>
                        )}
                      </td>

                      <td className={TD}>
                        <Badge tone={s.tipe === "IS" ? "accent" : "brand"}>{s.tipe}</Badge>
                      </td>
                      <td className={TD}>
                        <Badge tone={s.level === "C4" ? "warning" : "muted"}>{s.level}</Badge>
                      </td>
                      <td className={`${TD} font-mono text-xs font-bold`}>
                        {labelKunci(s.tipe, s.kunci)}
                      </td>

                      <td className={TD}>
                        {masalah.length === 0 ? (
                          <span className="text-xs font-semibold text-success">Lengkap</span>
                        ) : (
                          <ul className="space-y-0.5 text-xs font-semibold text-danger">
                            {masalah.map((m) => (
                              <li key={m}>• {m}</li>
                            ))}
                          </ul>
                        )}
                      </td>

                      <td className={TD}>
                        <div className="flex flex-col items-start gap-1">
                          <Link
                            className="text-xs font-semibold text-brand hover:underline"
                            href={`/admin/paket/${paket.id}/soal/${s.id}`}
                          >
                            Ubah
                          </Link>
                          <form action={hapusSoalAction}>
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="package_id" value={paket.id} />
                            <input type="hidden" name="subtes" value={aktif} />
                            <TombolKonfirmasi
                              className="text-xs font-semibold text-danger hover:underline"
                              pesan={`Hapus soal ${aktif} nomor ${s.nomor}? Jawaban peserta untuk butir ini ikut terhapus.`}
                            >
                              Hapus
                            </TombolKonfirmasi>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TabelScroll>
        </div>
      )}
    </>
  );
}
