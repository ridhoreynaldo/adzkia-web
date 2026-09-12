import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { mulaiSesiAction } from "@/app/warung/actions";
import { Alert } from "@/components/ui";
import { HeaderWarung } from "@/components/warung/HeaderWarung";
import {
  IkonKategori,
  IkonKoin,
  IkonPiala,
  IkonSubtes,
  IkonWaktu,
} from "@/components/warung/Ikon";
import { GemboksKecil } from "@/components/portal/Gemboks";
import { getSession } from "@/lib/auth/auth";
import { getSubtes } from "@/lib/tryout/snbt";
import {
  KATEGORI,
  KOMPOSISI,
  type RingkasPaket,
  daftarPaketSiswa,
  keSubtes,
  papanSubtes,
} from "@/lib/warung/warung";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ subtes: string }> }) {
  const { subtes } = await params;
  const s = keSubtes(subtes);
  return { title: s ? `Warung Soal — ${getSubtes(s)?.namaPendek}` : "Warung Soal" };
}

/**
 * Daftar 30 paket satu subtes.
 *
 * Dikelompokkan per tingkat kesulitan supaya siswa bisa langsung menuju
 * kelompok yang sepadan dengan kesiapannya, dan tiap kartu menunjukkan nilai
 * terbaik yang pernah ia raih di paket itu — itulah angka yang masuk papan
 * peringkat, sehingga jelas mana paket yang masih layak diperbaiki.
 */
export default async function DaftarPaketSubtes({
  params,
  searchParams,
}: {
  params: Promise<{ subtes: string }>;
  searchParams: Promise<{ galat?: string }>;
}) {
  const user = await getSession();
  const { subtes: mentah } = await params;
  const kode = keSubtes(mentah);
  if (!kode) notFound();
  if (!user) redirect(`/warung/login?next=/warung/${kode}`);

  const { galat } = await searchParams;
  const info = getSubtes(kode)!;
  const komposisi = KOMPOSISI[kode];
  const daftar = await daftarPaketSiswa(kode, user.id);
  const papan = await papanSubtes(kode);
  const posisi = papan.find((p) => p.userId === user.id);

  return (
    <>
      <HeaderWarung />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {galat && (
          <div className="mb-6">
            <Alert tone="danger">{galat}</Alert>
          </div>
        )}

        {/* ---------- Kepala ---------- */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
              <IkonSubtes kode={kode} className="h-8 w-8" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{info.nama}</h1>
              <p className="mt-1 text-sm text-muted">
                {komposisi.total} soal tiap paket · {info.durasiMenit} menit · {komposisi.pg} pilihan
                ganda, {komposisi.pgk} benar/salah, {komposisi.is} isian singkat
              </p>
            </div>
          </div>
          <Link href="/warung" className="btn btn-ghost">
            ← Semua subtes
          </Link>
        </div>

        {/* ---------- Posisiku ---------- */}
        {posisi && (
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-accent/50 bg-accent-soft p-4">
            <span className="text-2xl font-extrabold tabular-nums text-accent">
              #{posisi.peringkat}
            </span>
            <span className="font-bold">Peringkatmu di subtes ini</span>
            <span className="ml-auto flex items-center gap-1.5 font-extrabold text-accent">
              <IkonKoin className="h-4.5 w-4.5" />
              {posisi.poin} poin
            </span>
            <span className="text-sm text-muted">{posisi.paketSelesai} paket tuntas</span>
            <Link
              href={`/warung/peringkat?subtes=${kode}`}
              className="text-xs font-bold text-accent underline underline-offset-2"
            >
              Lihat papan
            </Link>
          </div>
        )}

        {/* ---------- Cara paket terbuka ---------- */}
        <p className="mt-5 rounded-xl border border-line/70 bg-surface/60 px-4 py-3 text-sm text-muted">
          Paket terbuka <strong className="text-foreground">satu per satu</strong>: begitu kamu
          menuntaskan sebuah paket, paket berikutnya langsung terbuka. Tidak perlu menunggu
          dibukakan pengajar.
        </p>

        {/* ---------- Tiga kelompok paket ---------- */}
        {KATEGORI.map((kat) => {
          const isi = daftar.filter((d) => d.paket.nomor >= kat.dari && d.paket.nomor <= kat.sampai);
          return (
            <section key={kat.kode} className="mt-8">
              <div className="flex flex-wrap items-center gap-3">
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
              <p className="mt-1.5 text-sm text-muted">{kat.keterangan}</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {isi.map((d) => (
                  <KartuPaket key={d.paket.id} ringkas={d} subtes={kode} />
                ))}
              </div>
            </section>
          );
        })}

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href={`/warung/peringkat?subtes=${kode}`} className="btn btn-ghost">
            <IkonPiala className="h-5 w-5 text-warning" />
            Papan peringkat {info.namaPendek}
          </Link>
          <Link href="/" className="btn btn-ghost">
            ← Kembali ke Halaman Utama
          </Link>
        </div>
      </main>
    </>
  );
}

function KartuPaket({ ringkas, subtes }: { ringkas: RingkasPaket; subtes: string }) {
  const { paket, kategori, keadaan, terbaik, berjalanId, percobaan } = ringkas;
  const terbuka = keadaan === "terbuka";

  return (
    <article
      className={`kartu-neon flex flex-col p-4 ${terbuka ? "" : "opacity-70"}`}
      style={{ ["--warna-level" as string]: kategori.warna }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-base font-extrabold">
          {keadaan === "terkunci" && <GemboksKecil terkunci className="text-muted" />}
          Paket {paket.nomor}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
          style={{ background: kategori.warnaLembut, color: kategori.warna }}
        >
          {kategori.nama}
        </span>
      </div>

      {terbuka ? (
        <>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <IkonWaktu className="h-3.5 w-3.5" />
            {paket.jumlahSoal} soal
            {percobaan > 0 ? ` · ${percobaan}× dikerjakan` : ""}
          </p>

          {terbaik ? (
            <p className="mt-3 rounded-lg bg-success-soft px-3 py-2 text-xs font-semibold text-success">
              Nilai terbaik: {terbaik.poin} poin · {terbaik.benar}/{terbaik.total} benar
            </p>
          ) : (
            <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted">
              Belum pernah dikerjakan
            </p>
          )}

          <div className="mt-auto pt-4">
            {berjalanId ? (
              <Link
                href={`/warung/main/${berjalanId}`}
                className="btn btn-accent w-full font-extrabold uppercase tracking-wide"
              >
                Lanjutkan
              </Link>
            ) : (
              <form action={mulaiSesiAction}>
                <input type="hidden" name="paket_id" value={paket.id} />
                <input type="hidden" name="subtes" value={subtes} />
                <button
                  type="submit"
                  className="btn w-full font-extrabold uppercase tracking-wide text-white"
                  style={{ background: kategori.warna }}
                >
                  {terbaik ? "Ulangi" : "Kerjakan"}
                </button>
              </form>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted">
            {keadaan === "terkunci"
              ? `Terbuka setelah Paket ${paket.nomor - 1} tuntas`
              : keadaan === "disiapkan"
                ? `Sedang disiapkan pengajar (${paket.jumlahSoal} soal)`
                : "Soalnya belum tersedia"}
          </p>
          {terbaik && (
            <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted">
              Nilai terbaikmu: {terbaik.poin} poin
            </p>
          )}
          <div className="mt-auto pt-4">
            <span className="btn btn-ghost w-full cursor-not-allowed">
              {keadaan === "terkunci" ? "Terkunci" : "Segera"}
            </span>
          </div>
        </>
      )}
    </article>
  );
}
