import Link from "next/link";

import { siapkanKerangkaWarungAction } from "@/app/admin/actions";
import { BarKelengkapan, PesanFlash } from "@/components/admin/AdminUI";
import { PageHeader } from "@/components/ui";
import { IkonSubtes } from "@/components/warung/Ikon";
import { type ParamsQuery, satuParam } from "@/lib/admin/admin";
import { requireAdmin } from "@/lib/auth/auth";
import { SUBTES } from "@/lib/tryout/snbt";
import { KOMPOSISI, PAKET_PER_SUBTES, daftarPaket } from "@/lib/warung/warung";

export const metadata = { title: "Warung Soal" };
export const dynamic = "force-dynamic";

/**
 * Ikhtisar Warung Soal: tujuh subtes, masing-masing 30 paket.
 *
 * Halaman ini hanya membaca; kerangka paket baru dibuat ketika pengelola
 * menekan tombolnya sendiri, supaya membuka panel admin tidak diam-diam
 * menulis 210 baris ke database.
 */
export default async function HalamanWarungAdmin({
  searchParams,
}: {
  searchParams: Promise<ParamsQuery>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const ringkas = await Promise.all(SUBTES.map(async (s) => {
    const paket = await daftarPaket(s.kode);
    return {
      subtes: s,
      komposisi: KOMPOSISI[s.kode],
      jumlahPaket: paket.length,
      terisi: paket.filter((p) => p.jumlahSoal > 0).length,
      siap: paket.filter((p) => p.jumlahSoal >= KOMPOSISI[s.kode].total).length,
      soal: paket.reduce((a, p) => a + p.jumlahSoal, 0),
    };
  }));

  const belumBerkerangka = ringkas.filter((r) => r.jumlahPaket < PAKET_PER_SUBTES).length;

  return (
    <>
      <PageHeader
        title="Warung Soal"
        subtitle={`Latihan harian per subtes. Tiap subtes berisi ${PAKET_PER_SUBTES} paket: 1-10 Easy, 11-20 Medium, 21-30 Hard.`}
      />

      <PesanFlash pesan={satuParam(sp.pesan)} galat={satuParam(sp.galat)} />

      {belumBerkerangka > 0 && (
        <form
          action={siapkanKerangkaWarungAction}
          className="card mb-6 flex flex-wrap items-center gap-4 p-5"
        >
          <p className="min-w-56 flex-1 text-sm">
            <strong className="block">Kerangka paket belum lengkap.</strong>
            <span className="text-muted">
              {belumBerkerangka} subtes belum punya {PAKET_PER_SUBTES} paket. Tombol ini membuat
              baris paket yang kurang, semuanya masih kosong.
            </span>
          </p>
          <button className="btn btn-primary" type="submit">
            Siapkan kerangka 30 paket
          </button>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ringkas.map((r) => (
          <Link
            key={r.subtes.kode}
            href={`/admin/warung/${r.subtes.kode}`}
            className="card block p-5 transition-colors hover:bg-surface-muted"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <IkonSubtes kode={r.subtes.kode} className="h-6 w-6" />
              </span>
              <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted">
                {r.subtes.kode}
              </span>
            </div>

            <h2 className="mt-3 text-base font-extrabold leading-tight">{r.subtes.namaPendek}</h2>
            <p className="text-xs text-muted">
              {r.komposisi.total} soal/paket · {r.komposisi.pg} PG, {r.komposisi.pgk} PGK,{" "}
              {r.komposisi.is} isian
            </p>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted">Paket tersentuh</span>
                <BarKelengkapan terisi={r.terisi} target={PAKET_PER_SUBTES} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Lengkap &amp; siap dipakai</span>
                <span className="font-semibold tabular-nums">{r.siap} paket</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Total soal tersimpan</span>
                <span className="font-semibold tabular-nums">{r.soal}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <section className="card mt-6 p-5">
        <h2 className="text-sm font-extrabold uppercase tracking-wide">Cara kerjanya</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
          <li>
            <strong className="text-foreground">Tidak ada tombol terbitkan.</strong> Paket terbuka
            sendiri begitu jumlah soalnya lengkap sesuai target subtes — tugas pengelola hanya
            mengisi soal.
          </li>
          <li>
            <strong className="text-foreground">Siswa membukanya dengan kemajuannya sendiri:</strong>{" "}
            Paket 1 selalu terbuka, dan paket berikutnya terbuka setelah paket sebelumnya ia
            tuntaskan.
          </li>
          <li>
            <strong className="text-foreground">Satu paket = satu sesi berjangka waktu</strong>{" "}
            sepanjang durasi resmi subtesnya, dan boleh diulang siswa sebanyak-banyaknya.
          </li>
          <li>
            <strong className="text-foreground">Papan peringkat memakai nilai terbaik</strong> tiap
            paket, jadi mengulang paket yang sama tidak menumpuk poin.
          </li>
          <li>
            Poin per jawaban benar mengikuti tingkat paket:{" "}
            <strong className="text-foreground">Easy 10, Medium 20, Hard 35</strong>.
          </li>
        </ul>
      </section>
    </>
  );
}
