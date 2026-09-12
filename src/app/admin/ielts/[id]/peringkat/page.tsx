import Link from "next/link";
import { notFound } from "next/navigation";

import { PesanFlash } from "@/components/admin/AdminUI";
import { TombolKonfirmasi } from "@/components/admin/TombolKonfirmasi";
import { TabelBand, band } from "@/components/language/TabelBand";
import { TombolCetak } from "@/components/hasil/TombolCetak";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { requireAdminIelts } from "@/lib/auth/auth";
import { wajibFiturLanguage } from "@/lib/ielts/language";
import { LABEL_STATUS_IELTS, paketById, sebutanBand } from "@/lib/ielts/ielts";
import { peringkatIelts, statistikIelts } from "@/lib/ielts/ielts-peringkat";

import { hitungUlangIeltsAction } from "../../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await paketById(Number(id));
  return { title: p ? `Peringkat band ${p.kode}` : "Peringkat Band IELTS" };
}

/**
 * PERINGKAT SKOR BAND — papan pengelola, dari band tertinggi ke terendah.
 *
 * Angkanya tidak pernah bisa berbeda dari yang dibaca siswa di halaman
 * hasilnya: keduanya memanggil `hasilPengerjaan()` yang sama, dan band IELTS
 * memang tidak disimpan di mana pun (lihat `ielts-peringkat.ts`).
 */
export default async function PeringkatIeltsPage({
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

  const paket = await paketById(Number(id));
  if (!paket) notFound();

  const papan = await peringkatIelts(paket.id);
  const stat = statistikIelts(papan);

  return (
    <>
      <p className="no-print mb-4 text-sm">
        <Link href={`/admin/ielts/${paket.id}`} className="font-semibold text-muted hover:text-brand">
          ← {paket.nama}
        </Link>
      </p>

      <PageHeader
        title="Peringkat skor band"
        subtitle={`${paket.nama} (${paket.kode}) — diurutkan dari band tertinggi ke terendah`}
        action={
          <div className="no-print flex flex-wrap items-center gap-2">
            <Badge
              tone={
                paket.status === "published"
                  ? "success"
                  : paket.status === "closed"
                    ? "danger"
                    : "warning"
              }
            >
              {LABEL_STATUS_IELTS[paket.status]}
            </Badge>
            <a className="btn btn-ghost" href={`/api/admin/ielts/hasil/${paket.id}`} download>
              Unduh .xlsx
            </a>
            <TombolCetak label="Cetak" />
          </div>
        }
      />

      <PesanFlash pesan={pesan} galat={galat} />

      {papan.length === 0 ? (
        <EmptyState
          title="Belum ada peserta berband"
          description="Papan ini terisi begitu ada peserta yang menuntaskan setidaknya satu subtes yang dinilai mesin, atau yang Writing/Speaking-nya sudah dinilai guru."
        />
      ) : (
        <div className="space-y-5">
          {/* ---------- Ringkasan ---------- */}
          <div className="grid gap-3 sm:grid-cols-4">
            <Ringkas judul="Peserta berband" nilai={String(stat.jumlahPeserta)} />
            <Ringkas judul="Band tertinggi" nilai={band(stat.tertinggi)} warna="text-success" />
            <Ringkas judul="Rata-rata" nilai={band(stat.rataOverall)} />
            <Ringkas judul="Band terendah" nilai={band(stat.terendah)} warna="text-muted" />
          </div>

          {stat.jumlahFinal < stat.jumlahPeserta && (
            <p className="rounded-xl border border-warning bg-warning-soft px-4 py-3 text-sm font-semibold text-warning">
              {stat.jumlahPeserta - stat.jumlahFinal} dari {stat.jumlahPeserta} peserta band
              keseluruhannya masih <strong>sementara</strong> — biasanya menunggu penilaian Writing
              atau Speaking. Urutan di bawah masih bisa berubah setelah guru selesai menilai.
            </p>
          )}

          {/* ---------- Rata-rata per subtes ---------- */}
          <div className="card p-5">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted">
              Rata-rata band per subtes
            </h2>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {stat.perSubtes.map((s) => (
                <div key={s.kode} className="rounded-xl border border-line bg-surface-muted/50 p-3.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">{s.nama}</p>
                  <p className="mt-1.5 text-2xl font-extrabold tracking-tight tabular-nums">
                    {band(s.rata)}
                  </p>
                  <p className="text-[11px] text-muted">
                    {s.jumlah === 0
                      ? "belum ada yang berband"
                      : `${s.jumlah} peserta · tertinggi ${band(s.tertinggi)}`}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ---------- Tabel ---------- */}
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight">
                  {papan.length} peserta
                </h2>
                <p className="text-sm text-muted">
                  Nama peserta membuka halaman penilaian Writing &amp; Speaking-nya.
                </p>
              </div>
              {papan[0]?.overall !== null && (
                <p className="text-xs text-muted">
                  Puncak: <strong>{papan[0].nama}</strong> — band {band(papan[0].overall)}{" "}
                  {papan[0].final ? `(${sebutanBand(papan[0].overall)})` : "(sementara)"}
                </p>
              )}
            </div>
            <TabelBand papan={papan} tautanNilai="/admin/ielts/nilai" />
          </div>
        </div>
      )}

      {/* ---------- Hitung ulang ---------- */}
      <section className="no-print card mt-8 p-6">
        <h2 className="text-sm font-extrabold tracking-tight">Hitung ulang nilai</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Band IELTS <strong>tidak disimpan</strong> — ia dihitung ulang tiap kali dibaca, jadi
          membetulkan satu kunci jawaban langsung mengubah nilai semua peserta tanpa menekan apa
          pun. Yang dikerjakan tombol ini adalah dua hal yang tidak bisa terjadi sendiri: menutup
          subtes yang tenggatnya sudah lewat tetapi pesertanya tidak pernah kembali, dan
          menuntaskan pengerjaan yang seluruh subtesnya sudah tutup tetapi statusnya masih
          berjalan. Aman dijalankan berkali-kali.
        </p>
        <form action={hitungUlangIeltsAction} className="mt-4">
          <input type="hidden" name="id" value={paket.id} />
          <input type="hidden" name="dari" value={`/admin/ielts/${paket.id}/peringkat`} />
          <TombolKonfirmasi
            className="btn btn-primary"
            pesan={`Periksa ulang seluruh pengerjaan paket ${paket.kode}? Subtes yang waktunya sudah habis akan ditutup, dan pengerjaan yang sudah tuntas akan ditandai selesai.`}
          >
            Hitung ulang nilai
          </TombolKonfirmasi>
        </form>
      </section>
    </>
  );
}

function Ringkas({ judul, nilai, warna = "" }: { judul: string; nilai: string; warna?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{judul}</p>
      <p className={`mt-0.5 text-2xl font-extrabold tracking-tight tabular-nums ${warna}`}>
        {nilai}
      </p>
    </div>
  );
}
