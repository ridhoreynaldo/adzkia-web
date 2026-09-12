import Link from "next/link";
import { redirect } from "next/navigation";

import { Alert } from "@/components/ui";
import { HeaderWarung } from "@/components/warung/HeaderWarung";
import {
  IkonBintang,
  IkonKoin,
  IkonPiala,
  IkonSasaran,
  IkonSubtes,
} from "@/components/warung/Ikon";
import { getSession } from "@/lib/auth/auth";
import { waktuIndo } from "@/lib/core/tampilan";
import {
  PAKET_PER_SUBTES,
  type RingkasSubtes,
  kategoriPaket,
  ringkasanLobi,
  riwayatSaya,
  totalPoinSiswa,
} from "@/lib/warung/warung";

export const metadata = { title: "Warung Soal" };
// Poin, peringkat, dan jumlah paket terbuka berubah tiap saat.
export const dynamic = "force-dynamic";

/**
 * Lobi Warung Soal: memilih subtes.
 *
 * Satu keputusan saja di layar ini — siswa datang untuk berlatih subtes
 * tertentu, dan tingkat kesulitan baru dipilih di dalam, saat ia melihat 30
 * paket subtes itu.
 */
export default async function LobiWarung({
  searchParams,
}: {
  searchParams: Promise<{ galat?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/warung/login");

  const { galat } = await searchParams;
  const daftar = await ringkasanLobi(user.id);
  const riwayat = await riwayatSaya(user.id, 5);
  const poin = await totalPoinSiswa(user.id);
  const paketSelesai = daftar.reduce((a, s) => a + s.paketSelesai, 0);
  const peringkatTerbaik = daftar
    .map((s) => s.peringkat)
    .filter((p): p is number => p != null)
    .sort((a, b) => a - b)[0];

  return (
    <>
      <HeaderWarung />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {galat && (
          <div className="mb-6">
            <Alert tone="danger">{galat}</Alert>
          </div>
        )}

        <section className="masuk-warung">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            Halo, {user.nama.split(" ")[0]} 👋
          </p>
          <h1 className="mt-1.5 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Mau latihan <span className="teks-neon">subtes apa</span> hari ini?
          </h1>
          <p className="mt-2 text-sm text-muted">
            Tiap subtes berisi {PAKET_PER_SUBTES} paket bertingkat — Paket 1&ndash;10 Easy,
            11&ndash;20 Medium, 21&ndash;30 Hard. Paket terbuka satu per satu: tuntaskan satu
            paket, paket berikutnya langsung terbuka.
          </p>
        </section>

        {/* ---------- Tiga angka ringkas ---------- */}
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <Statistik
            ikon={<IkonKoin className="h-5 w-5" />}
            label="Total poin"
            nilai={poin.toLocaleString("id-ID")}
            warna="var(--accent)"
          />
          <Statistik
            ikon={<IkonSasaran className="h-5 w-5" />}
            label="Paket tuntas"
            nilai={String(paketSelesai)}
            warna="var(--success)"
          />
          <Statistik
            ikon={<IkonPiala className="h-5 w-5" />}
            label="Peringkat terbaik"
            nilai={peringkatTerbaik ? `#${peringkatTerbaik}` : "—"}
            warna="var(--warning)"
          />
        </section>

        {/* ---------- Tujuh subtes ---------- */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {daftar.map((s) => (
            <KartuSubtes key={s.subtes.kode} ringkas={s} />
          ))}
        </section>

        {/* ---------- Riwayat ---------- */}
        {riwayat.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-muted">
              Latihan terakhirmu
            </h2>
            <ul className="mt-3 space-y-2">
              {riwayat.map((r) => {
                const kat = kategoriPaket(r.nomor);
                return (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-line/70 bg-surface/60 px-4 py-3 text-sm"
                  >
                    <span className="flex items-center gap-2 font-bold">
                      <IkonSubtes kode={r.subtes} className="h-4.5 w-4.5 text-accent" />
                      {r.subtes} · Paket {r.nomor}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                      style={{ background: kat.warnaLembut, color: kat.warna }}
                    >
                      {kat.nama}
                    </span>
                    {r.status === "finished" ? (
                      <>
                        <span className="ml-auto flex items-center gap-1.5 font-semibold text-accent">
                          <IkonKoin className="h-4 w-4" />
                          {r.poin} poin
                        </span>
                        <span className="text-muted">
                          {r.benar}/{r.jumlahSoal} benar
                        </span>
                        <span className="hidden text-xs text-muted sm:inline">
                          {waktuIndo(r.selesai_at)}
                        </span>
                        <Link
                          href={`/warung/main/${r.id}`}
                          className="text-xs font-bold text-accent underline underline-offset-2"
                        >
                          Pembahasan
                        </Link>
                      </>
                    ) : (
                      <Link
                        href={`/warung/main/${r.id}`}
                        className="ml-auto text-xs font-bold text-warning underline underline-offset-2"
                      >
                        Lanjutkan yang belum selesai →
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/warung/peringkat" className="btn btn-ghost">
            <IkonPiala className="h-5 w-5 text-warning" />
            Papan Peringkat
          </Link>
          <Link href="/" className="btn btn-ghost">
            ← Kembali ke Halaman Utama
          </Link>
        </div>
      </main>

      <footer className="border-t border-line/60 px-4 py-6 text-center text-xs text-muted">
        Warung Soal · ADZKIA SMART · SMA Islam Plus Adzkia
      </footer>
    </>
  );
}

function Statistik({
  ikon,
  label,
  nilai,
  warna,
}: {
  ikon: React.ReactNode;
  label: string;
  nilai: string;
  warna: string;
}) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
        style={{ background: "rgba(255,255,255,0.05)", color: warna }}
      >
        {ikon}
      </span>
      <span>
        <span className="block text-[11px] font-semibold uppercase tracking-widest text-muted">
          {label}
        </span>
        <span className="block text-xl font-extrabold tabular-nums">{nilai}</span>
      </span>
    </div>
  );
}

/** Satu kartu subtes di lobi. */
function KartuSubtes({ ringkas }: { ringkas: RingkasSubtes }) {
  const { subtes, paketSiap, paketSelesai, paketBerikutnya, poin, peringkat } = ringkas;
  const kosong = paketSiap === 0;

  return (
    <Link
      href={`/warung/${subtes.kode}`}
      className="kartu-neon flex flex-col p-5"
      style={{ ["--warna-level" as string]: "var(--accent)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent">
          <IkonSubtes kode={subtes.kode} className="h-7 w-7" />
        </span>
        <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted">
          {subtes.kelompok}
        </span>
      </div>

      <h2 className="mt-4 text-lg font-extrabold leading-tight tracking-tight">
        {subtes.namaPendek}
      </h2>
      <p className="text-xs text-muted">{subtes.nama}</p>

      <p className="mt-3 text-xs text-muted">
        {subtes.jumlahSoal} soal · {subtes.durasiMenit} menit tiap paket
      </p>

      {paketBerikutnya && (
        <p className="mt-2 text-xs font-bold text-accent">
          {paketSelesai > 0 ? "Lanjut ke" : "Mulai dari"} Paket {paketBerikutnya} →
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line/60 pt-3 text-xs">
        {kosong ? (
          <span className="text-muted">Belum ada paket yang dibuka</span>
        ) : (
          <>
            <span className="font-semibold text-success">{paketSiap} paket siap</span>
            <span className="text-muted">{paketSelesai} tuntas</span>
            {poin > 0 && (
              <span className="ml-auto flex items-center gap-1 font-bold text-accent">
                <IkonKoin className="h-3.5 w-3.5" />
                {poin}
              </span>
            )}
            {peringkat && (
              <span className="flex items-center gap-1 font-bold text-warning">
                <IkonBintang className="h-3.5 w-3.5" />#{peringkat}
              </span>
            )}
          </>
        )}
      </div>
    </Link>
  );
}
