import Link from "next/link";
import { notFound } from "next/navigation";

import { KartuStat, PesanFlash, TD, TH, TabelScroll } from "@/components/admin/AdminUI";
import { TombolKonfirmasi } from "@/components/admin/TombolKonfirmasi";
import { band } from "@/components/language/TabelBand";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { tanggalIndo } from "@/lib/admin/admin";
import { requireAdminIelts } from "@/lib/auth/auth";
import { AMBANG_KEMBALI_DETIK } from "@/lib/penjagaan/denyut";
import { LABEL_STATUS_IELTS, kriteriaSubtes, sebutanBand } from "@/lib/ielts/ielts";
import { rekapPesertaIelts } from "@/lib/ielts/ielts-rekap";
import { wajibFiturLanguage } from "@/lib/ielts/language";

import {
  bukaBlokirIeltsAction,
  bukaSesiUlangIeltsAction,
  hentikanIeltsAction,
} from "../../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await rekapPesertaIelts(Number(id));
  return { title: r ? `Rekap ${r.nama} — IELTS` : "Rekap Peserta IELTS" };
}

function durasi(detik: number | null): string {
  if (detik === null || detik === undefined) return "—";
  if (detik < 60) return `${detik} dtk`;
  const m = Math.floor(detik / 60);
  const s = detik % 60;
  return s === 0 ? `${m} mnt` : `${m} mnt ${s} dtk`;
}

/**
 * REKAP PER PESERTA IELTS — padanan `/admin/peserta/<id>` di jalur UTBK.
 *
 * Urutan bagiannya mengikuti urutan pertanyaan guru yang sebenarnya: siapa dia,
 * berapa bandnya, bagaimana tiap subtes dikerjakan, lalu apa saja yang tercatat
 * penjagaan. Tindakan yang merusak — menghentikan ujian — diletakkan paling
 * bawah, sama seperti di seluruh panel ini.
 */
export default async function RekapPesertaIeltsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pesan?: string; galat?: string }>;
}) {
  await wajibFiturLanguage();
  await requireAdminIelts();

  const { id } = await params;
  const { pesan, galat } = await searchParams;

  const r = await rekapPesertaIelts(Number(id));
  if (!r) notFound();

  const kembaliKe = `/admin/ielts/peserta/${r.pengerjaan.id}`;
  const beratLewat = r.totalDetikPergi >= r.budgetDetik;

  return (
    <>
      <p className="no-print mb-4 flex flex-wrap gap-4 text-sm">
        <Link href="/admin/ielts/peserta" className="font-semibold text-muted hover:text-brand">
          ← Daftar peserta IELTS
        </Link>
        <Link
          href={`/admin/ielts/live?paket=${r.paket.id}`}
          className="font-semibold text-muted hover:text-brand"
        >
          Skor Live {r.paket.kode}
        </Link>
      </p>

      <PageHeader
        title={r.nama}
        subtitle={[
          r.nisn ? `NISN ${r.nisn}` : null,
          r.kelas,
          r.asalSekolah,
          `${r.paket.nama} (${r.paket.kode})`,
        ]
          .filter(Boolean)
          .join(" · ")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              tone={
                r.pengerjaan.status === "finished"
                  ? "success"
                  : r.pengerjaan.status === "gugur"
                    ? "danger"
                    : "warning"
              }
            >
              {r.pengerjaan.status === "finished"
                ? "Selesai"
                : r.pengerjaan.status === "gugur"
                  ? "Dihentikan"
                  : "Berjalan"}
            </Badge>
            <Badge tone="muted">{LABEL_STATUS_IELTS[r.paket.status]}</Badge>
            {r.pengerjaan.ronde > 1 && <Badge tone="accent">Ronde {r.pengerjaan.ronde}</Badge>}
          </div>
        }
      />

      <PesanFlash pesan={pesan} galat={galat} />

      {/* ---------- Ringkasan ---------- */}
      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KartuStat
          label={r.final ? "Overall band" : "Band sementara"}
          nilai={band(r.overall)}
          keterangan={
            r.overall === null
              ? r.pengerjaan.status === "gugur"
                ? "Ujian dihentikan — tidak dinilai"
                : "Belum ada subtes yang berband"
              : r.final
                ? sebutanBand(r.overall)
                : `Menunggu ${r.menunggu.join(" & ")}`
          }
        />
        <KartuStat label="Mulai" nilai={tanggalIndo(r.pengerjaan.started_at)} />
        <KartuStat
          label="Selesai"
          nilai={tanggalIndo(r.pengerjaan.finished_at ?? r.pengerjaan.digugurkan_at)}
        />
        <KartuStat
          label="Waktu di luar halaman"
          nilai={`${r.totalDetikPergi} dtk`}
          keterangan={`${r.jumlahKepergian} kepergian · anggaran ${r.budgetDetik} detik`}
        />
      </section>

      {r.pengerjaan.status === "gugur" && (
        <section className="card mb-8 border-danger/40 p-5">
          <h2 className="text-sm font-extrabold tracking-tight text-danger">
            ⛔ Ujian ini dihentikan
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            {r.pengerjaan.alasan_gugur ?? "Tanpa keterangan."}
          </p>
          <p className="mt-1 text-xs text-muted">
            Tercatat {tanggalIndo(r.pengerjaan.digugurkan_at)}.
          </p>

          {/* Dua jalan pulang, dan memilih yang keliru merugikan peserta ke
              arah yang berlawanan. Keterangannya ditulis di sini — bukan cuma
              di dialog konfirmasi — supaya pengelola membacanya SEBELUM
              tangannya bergerak. */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface p-4">
              <h3 className="text-sm font-extrabold tracking-tight">Dibuka</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Peserta <strong>MELANJUTKAN</strong> dari subtes yang tadi terpotong. Jawaban yang
                sudah terisi tetap utuh, dan sisa waktu subtes itu dikembalikan sepanjang ia
                terhenti. Pilih ini bila ujiannya berhenti karena jaringan, layar padam, atau salah
                tangkap sistem.
              </p>
              <form action={bukaBlokirIeltsAction} className="mt-3">
                <input type="hidden" name="pengerjaanId" value={r.pengerjaan.id} />
                <input type="hidden" name="paketId" value={r.paket.id} />
                <input type="hidden" name="dari" value={kembaliKe} />
                <TombolKonfirmasi
                  className="btn btn-primary !px-4 !py-2 text-sm"
                  pesan={`Buka ujian ${r.nama}? Ia melanjutkan dari subtes yang tadi terpotong, jawabannya tidak dihapus, dan sisa waktunya dikembalikan.`}
                >
                  Dibuka
                </TombolKonfirmasi>
              </form>
            </div>

            <div className="rounded-xl border border-line bg-surface p-4">
              <h3 className="text-sm font-extrabold tracking-tight">Buka sesi ulang</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Peserta <strong>MENGULANG dari Listening</strong>. Jawaban lamanya dihapus — ini
                padanan &ldquo;Ujian Susulan&rdquo; di jalur TryOut. Catatan keamanan ronde lama
                tetap tersimpan sebagai bukti.
              </p>
              <form action={bukaSesiUlangIeltsAction} className="mt-3">
                <input type="hidden" name="pengerjaanId" value={r.pengerjaan.id} />
                <input type="hidden" name="paketId" value={r.paket.id} />
                <input type="hidden" name="dari" value={kembaliKe} />
                <TombolKonfirmasi
                  className="btn btn-ghost !px-4 !py-2 text-sm"
                  pesan={`Buka sesi ulang untuk ${r.nama}? Jawaban lamanya DIHAPUS dan ia mengulang dari Listening. Kalau yang kamu inginkan adalah melanjutkan, pakai tombol "Dibuka".`}
                >
                  Buka sesi ulang
                </TombolKonfirmasi>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* ---------- Subtes ---------- */}
      <h2 className="mb-3 text-lg font-bold tracking-tight">Rincian per subtes</h2>

      {r.subtes.length === 0 ? (
        <EmptyState
          title="Belum ada subtes yang dibuka"
          description="Peserta sudah menyetujui tata tertib, tetapi belum membuka satu subtes pun."
        />
      ) : (
        <div className="mb-8 space-y-4">
          {r.subtes.map((s) => (
            <div key={s.kode} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="flex items-center gap-2 text-base font-extrabold tracking-tight">
                    {s.nama}
                    {s.keadaan === "berjalan" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-0.5 text-[11px] font-bold text-warning">
                        <span
                          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-warning"
                          aria-hidden
                        />
                        berjalan
                      </span>
                    )}
                    {s.keadaan === "belum" && (
                      <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-bold text-muted">
                        belum dibuka
                      </span>
                    )}
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    Jatah {s.menit} menit
                    {s.dipakaiDetik !== null ? ` · terpakai ${durasi(s.dipakaiDetik)}` : ""}
                    {s.mulaiAt ? ` · dibuka ${tanggalIndo(s.mulaiAt)}` : ""}
                    {s.selesaiAt ? ` · ditutup ${tanggalIndo(s.selesaiAt)}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  {s.hasil.band === null ? (
                    <span className="inline-flex items-center rounded-full bg-surface-muted px-3 py-1.5 text-xs font-bold text-muted">
                      {s.hasil.dinilaiGuru ? "Menunggu guru" : "Belum berband"}
                    </span>
                  ) : (
                    <>
                      <p className="text-2xl font-extrabold tabular-nums text-brand">
                        {band(s.hasil.band)}
                      </p>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        band
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                <Angka label="Dijawab" nilai={`${s.dijawab}/${s.jumlahSoal}`} />
                {!s.hasil.dinilaiGuru && (
                  <>
                    <Angka label="Benar" nilai={String(s.hasil.benar)} warna="text-success" />
                    <Angka label="Salah" nilai={String(s.hasil.salah)} warna="text-danger" />
                    <Angka label="Kosong" nilai={String(s.hasil.kosong)} />
                  </>
                )}
                {s.hasil.dinilaiGuru && (
                  <Angka
                    label="Dinilai guru"
                    nilai={s.hasil.rincianGuru.length > 0 ? "Sudah" : "Belum"}
                    warna={s.hasil.rincianGuru.length > 0 ? "text-success" : "text-warning"}
                  />
                )}
                <Angka
                  label="Catatan keamanan"
                  nilai={String(s.pelanggaran)}
                  warna={s.pelanggaran > 0 ? "text-danger" : ""}
                />
              </div>

              {/* Kriteria IELTS per bagian — sama isinya dengan yang dibaca
                  siswa di halaman hasilnya, supaya guru dan siswa membahas
                  angka yang persis sama. */}
              {s.hasil.rincianGuru.length > 0 && (
                <div className="mt-4 space-y-3 border-t border-line pt-4">
                  {s.hasil.rincianGuru.map((n) => (
                    <div key={`${n.subtes}-${n.bagian}`}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-bold">
                          {n.subtes === "WRITING" ? `Task ${n.bagian}` : "Interview"}
                        </p>
                        {n.band !== null && (
                          <p className="text-sm font-extrabold text-brand">band {band(n.band)}</p>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {kriteriaSubtes(s.kode).map((k) => (
                          <div key={k.kode} className="rounded-lg bg-surface-muted px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                              {k.kode}
                            </p>
                            <p className="text-base font-extrabold tabular-nums">
                              {n.nilai[k.kode] === undefined ? "—" : n.nilai[k.kode].toFixed(1)}
                            </p>
                          </div>
                        ))}
                      </div>
                      {n.catatan && (
                        <p className="mt-2 whitespace-pre-wrap rounded-xl bg-surface-muted px-4 py-3 text-[13px] leading-relaxed">
                          {n.catatan}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {s.hasil.dinilaiGuru && (
                <Link
                  href={`/admin/ielts/nilai/${r.pengerjaan.id}`}
                  className="mt-4 inline-block text-xs font-semibold text-brand hover:underline"
                >
                  {s.hasil.rincianGuru.length > 0 ? "Ubah penilaian" : "Nilai sekarang"} →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ---------- Catatan keamanan ---------- */}
      <h2 className="mb-1 text-lg font-bold tracking-tight">Catatan keamanan</h2>
      <p className="mb-3 max-w-3xl text-sm text-muted">
        Seluruh kejadian yang tercatat penjagaan ruang ujian, terbaru di atas — termasuk ronde
        sebelumnya bila peserta ini pernah diberi sesi ulang. Baris <strong>merah</strong> adalah
        yang menghentikan ujian; sisanya bahan bicara, bukan hukuman. Satu kepergian lebih dari{" "}
        {AMBANG_KEMBALI_DETIK} detik menghentikan ujian, dan seluruh kepergian pada satu ronde
        dijumlahkan sampai {r.budgetDetik} detik.
      </p>

      {r.pelanggaran.length === 0 ? (
        <p className="mb-8 rounded-xl bg-success-soft px-4 py-3 text-sm font-semibold text-success">
          ✓ Tidak ada satu pun catatan keamanan untuk peserta ini.
        </p>
      ) : (
        <div className="card mb-8 overflow-hidden p-0">
          <TabelScroll>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-muted text-left">
                  <th className={TH}>Waktu</th>
                  <th className={TH}>Ronde</th>
                  <th className={TH}>Subtes</th>
                  <th className={TH}>Kejadian</th>
                  <th className={TH}>Lama</th>
                  <th className={TH}>Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {r.pelanggaran.map((v) => (
                  <tr key={v.id} className={v.berat ? "bg-danger-soft/40" : undefined}>
                    <td className={`${TD} whitespace-nowrap text-xs tabular-nums`}>{v.mulai_at}</td>
                    <td className={`${TD} text-xs tabular-nums`}>{v.ronde}</td>
                    <td className={`${TD} text-xs font-semibold`}>{v.subtes ?? "—"}</td>
                    <td className={TD}>
                      <span
                        className={`text-xs font-bold ${v.berat ? "text-danger" : "text-muted"}`}
                      >
                        {v.label}
                      </span>
                    </td>
                    <td className={`${TD} whitespace-nowrap text-xs tabular-nums`}>
                      {durasi(v.durasi_detik)}
                    </td>
                    <td className={`${TD} text-xs text-muted`}>{v.keterangan ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabelScroll>
        </div>
      )}

      {beratLewat && r.pengerjaan.status !== "gugur" && (
        <p className="mb-8 rounded-xl border border-warning bg-warning-soft px-4 py-3 text-sm font-semibold text-warning">
          Jumlah kepergiannya sudah menyentuh anggaran {r.budgetDetik} detik. Periksa baris
          terakhirnya sebelum menyimpulkan apa pun — jaringan yang tersendat dan layar yang meredup
          menghasilkan pola yang mirip.
        </p>
      )}

      {/* ---------- Pengerjaan lain ---------- */}
      {r.lainnya.length > 0 && (
        <section className="card mb-8 p-5">
          <h2 className="text-sm font-extrabold tracking-tight">
            Paket IELTS lain yang pernah dikerjakan
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {r.lainnya.map((l) => (
              <li key={l.pengerjaanId} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span className="text-sm">
                  <span className="font-mono text-xs font-bold">{l.kode}</span>{" "}
                  <span className="font-semibold">{l.nama}</span>
                </span>
                <Link
                  href={`/admin/ielts/peserta/${l.pengerjaanId}`}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Buka rekapnya →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- Tindakan pengawas ---------- */}
      {r.pengerjaan.status === "ongoing" && (
        <section className="card border-danger/40 p-5">
          <h2 className="text-sm font-extrabold tracking-tight text-danger">
            ⚠ Hentikan ujian peserta ini
          </h2>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted">
            Dipakai untuk yang TIDAK bisa dilihat halaman ujian: HP kedua, catatan kertas, dan teman
            di sebelah. Jawabannya tidak akan dinilai. Kalau ternyata salah tangkap, ada dua jalan
            pulang yang muncul di halaman ini: <strong>Dibuka</strong> mengembalikannya ke subtes
            yang tadi terpotong tanpa menghapus apa pun, dan <strong>Buka sesi ulang</strong> untuk
            yang memang harus mengulang dari awal.
          </p>
          <form action={hentikanIeltsAction} className="mt-4">
            <input type="hidden" name="pengerjaanId" value={r.pengerjaan.id} />
            <input type="hidden" name="paketId" value={r.paket.id} />
            <input type="hidden" name="dari" value={kembaliKe} />
            <TombolKonfirmasi
              className="btn btn-danger"
              pesan={`Hentikan ujian ${r.nama} sekarang? Jawabannya tidak akan dinilai.`}
            >
              Hentikan ujian
            </TombolKonfirmasi>
          </form>
        </section>
      )}
    </>
  );
}

function Angka({ label, nilai, warna = "" }: { label: string; nilai: string; warna?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-muted/50 px-3.5 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-0.5 text-lg font-extrabold tabular-nums ${warna}`}>{nilai}</p>
    </div>
  );
}
