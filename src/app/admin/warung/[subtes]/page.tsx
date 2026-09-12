import Link from "next/link";
import { notFound } from "next/navigation";

import { siapkanKerangkaWarungAction } from "@/app/admin/actions";
import { PesanFlash } from "@/components/admin/AdminUI";
import { Badge, PageHeader } from "@/components/ui";
import { IkonKategori, IkonSubtes } from "@/components/warung/Ikon";
import { type ParamsQuery, satuParam } from "@/lib/admin/admin";
import { requireAdmin } from "@/lib/auth/auth";
import { getSubtes } from "@/lib/tryout/snbt";
import { KATEGORI, KOMPOSISI, PAKET_PER_SUBTES, daftarPaket, keSubtes } from "@/lib/warung/warung";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ subtes: string }> }) {
  const { subtes } = await params;
  const s = keSubtes(subtes);
  return { title: s ? `Warung Soal — ${getSubtes(s)?.namaPendek}` : "Warung Soal" };
}

/** Daftar 30 paket satu subtes untuk pengelola. */
export default async function PaketSubtesAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ subtes: string }>;
  searchParams: Promise<ParamsQuery>;
}) {
  await requireAdmin();
  const { subtes: mentah } = await params;
  const kode = keSubtes(mentah);
  if (!kode) notFound();

  const sp = await searchParams;
  const info = getSubtes(kode)!;
  const komposisi = KOMPOSISI[kode];
  const paket = await daftarPaket(kode);

  return (
    <>
      <PageHeader
        title={info.nama}
        subtitle={`${komposisi.total} soal tiap paket · ${info.durasiMenit} menit · ${komposisi.pg} pilihan ganda, ${komposisi.pgk} benar/salah, ${komposisi.is} isian singkat`}
        action={
          <Link className="btn btn-ghost" href="/admin/warung">
            ← Semua subtes
          </Link>
        }
      />

      <PesanFlash pesan={satuParam(sp.pesan)} galat={satuParam(sp.galat)} />

      <p className="mb-5 rounded-xl border border-line bg-surface-muted/60 px-4 py-3 text-sm text-muted">
        Paket bertanda <strong className="text-success">Siap</strong> otomatis tersedia bagi siswa —
        tidak ada tombol terbitkan. Siswa membukanya berurutan: Paket 1 lebih dulu, lalu paket
        berikutnya setelah paket sebelumnya ia tuntaskan.
      </p>

      {paket.length < PAKET_PER_SUBTES && (
        <form
          action={siapkanKerangkaWarungAction}
          className="card mb-6 flex flex-wrap items-center gap-4 p-5"
        >
          <input type="hidden" name="subtes" value={kode} />
          <p className="min-w-56 flex-1 text-sm text-muted">
            Subtes ini baru punya {paket.length} dari {PAKET_PER_SUBTES} paket.
          </p>
          <button className="btn btn-primary" type="submit">
            Lengkapi jadi {PAKET_PER_SUBTES} paket
          </button>
        </form>
      )}

      {KATEGORI.map((kat) => {
        const isi = paket.filter((p) => p.nomor >= kat.dari && p.nomor <= kat.sampai);
        if (isi.length === 0) return null;
        return (
          <section key={kat.kode} className="mb-8">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span
                className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-widest"
                style={{ background: kat.warnaLembut, color: kat.warna }}
              >
                <IkonKategori kategori={kat.kode} className="h-4 w-4" />
                {kat.nama}
              </span>
              <span className="text-xs text-muted">
                Paket {kat.dari}&ndash;{kat.sampai} · {kat.poin} poin per jawaban benar
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {isi.map((p) => {
                const penuh = p.jumlahSoal >= komposisi.total;
                return (
                  <Link
                    key={p.id}
                    href={`/admin/warung/paket/${p.id}`}
                    className="card flex flex-col gap-2 p-4 transition-colors hover:bg-surface-muted"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-extrabold">Paket {p.nomor}</span>
                      {penuh ? (
                        <Badge tone="success">Siap</Badge>
                      ) : p.jumlahSoal > 0 ? (
                        <Badge tone="warning">Disiapkan</Badge>
                      ) : (
                        <Badge tone="muted">Kosong</Badge>
                      )}
                    </div>

                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        penuh ? "text-success" : p.jumlahSoal > 0 ? "text-warning" : "text-muted"
                      }`}
                    >
                      {p.jumlahSoal}/{komposisi.total} soal
                    </span>

                    <span className="mt-auto flex items-center gap-1.5 text-[11px] text-muted">
                      <IkonSubtes kode={kode} className="h-3.5 w-3.5" />
                      {p.judul ?? `${kode} — Paket ${p.nomor}`}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
