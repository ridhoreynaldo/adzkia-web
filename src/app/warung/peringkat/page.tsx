import Link from "next/link";
import { redirect } from "next/navigation";

import { HeaderWarung } from "@/components/warung/HeaderWarung";
import { IkonKoin, IkonPiala, IkonSasaran, IkonSubtes, IkonWaktu } from "@/components/warung/Ikon";
import { getSession } from "@/lib/auth/auth";
import { SUBTES, getSubtes } from "@/lib/tryout/snbt";
import { keSubtes, lamaIndo, papanSubtes } from "@/lib/warung/warung";

export const metadata = { title: "Papan Peringkat Warung Soal" };
export const dynamic = "force-dynamic";

/** Warna medali tiga besar. */
const MEDALI: Record<number, string> = { 1: "#fbbf24", 2: "#cbd5e1", 3: "#f59e0b" };

export default async function HalamanPeringkat({
  searchParams,
}: {
  searchParams: Promise<{ subtes?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/warung/login");

  const sp = await searchParams;
  const kode = keSubtes(sp.subtes) ?? "PU";
  const info = getSubtes(kode)!;
  const papan = await papanSubtes(kode);
  const saya = papan.find((p) => p.userId === user.id);

  return (
    <>
      <HeaderWarung ringkas />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2.5 text-3xl font-extrabold tracking-tight">
              <IkonPiala className="h-8 w-8 text-warning" />
              <span className="teks-neon">Papan Peringkat</span>
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              {info.nama} · poin dari <strong className="text-foreground">nilai terbaik</strong>{" "}
              tiap paket, dijumlahkan. Waktu tersingkat jadi penentu saat poin sama.
            </p>
          </div>
          <Link href={`/warung/${kode}`} className="btn btn-ghost">
            ← Paket {info.namaPendek}
          </Link>
        </div>

        {/* ---------- Pemilih subtes ---------- */}
        <nav className="mt-6 flex flex-wrap gap-2">
          {SUBTES.map((s) => {
            const on = s.kode === kode;
            return (
              <Link
                key={s.kode}
                href={`/warung/peringkat?subtes=${s.kode}`}
                aria-current={on ? "page" : undefined}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-extrabold uppercase tracking-wide transition-colors ${
                  on
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line text-muted hover:text-foreground"
                }`}
              >
                <IkonSubtes kode={s.kode} className="h-4 w-4" />
                {s.kode}
              </Link>
            );
          })}
        </nav>

        {/* ---------- Posisiku ---------- */}
        {saya && (
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-accent/50 bg-accent-soft p-4">
            <span className="text-2xl font-extrabold tabular-nums text-accent">
              #{saya.peringkat}
            </span>
            <span className="font-bold">Posisimu di {info.namaPendek}</span>
            <span className="ml-auto flex items-center gap-1.5 font-extrabold text-accent">
              <IkonKoin className="h-4.5 w-4.5" />
              {saya.poin} poin
            </span>
            <span className="flex items-center gap-1.5 text-sm text-muted">
              <IkonSasaran className="h-4 w-4" />
              {saya.paketSelesai} paket
            </span>
            <span className="hidden items-center gap-1.5 text-sm text-muted sm:flex">
              <IkonWaktu className="h-4 w-4" />
              {lamaIndo(saya.durasiDetik)}
            </span>
          </div>
        )}

        {/* ---------- Daftar ---------- */}
        {papan.length === 0 ? (
          <div className="card mt-6 p-10 text-center">
            <IkonPiala className="mx-auto h-10 w-10 text-muted" />
            <p className="mt-3 font-bold">Papan {info.namaPendek} masih kosong</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
              Belum ada yang menuntaskan satu paket pun di subtes ini. Jadilah yang pertama — namamu
              akan berdiri sendirian di puncak.
            </p>
            <Link href={`/warung/${kode}`} className="btn btn-primary mt-5">
              Kerjakan sekarang
            </Link>
          </div>
        ) : (
          <ol className="mt-6 space-y-2">
            {papan.map((b) => {
              const akuSendiri = b.userId === user.id;
              const medali = MEDALI[b.peringkat];
              return (
                <li
                  key={b.userId}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border px-4 py-3 ${
                    akuSendiri ? "border-accent bg-accent-soft" : "border-line/70 bg-surface/60"
                  }`}
                >
                  <span
                    className="w-9 shrink-0 text-center text-lg font-extrabold tabular-nums"
                    style={medali ? { color: medali } : { color: "var(--muted)" }}
                  >
                    {b.peringkat <= 3 ? "" : "#"}
                    {b.peringkat}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">
                      {b.nama}
                      {akuSendiri && (
                        <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-[#04121b]">
                          kamu
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-muted">
                      {b.kelas ? `${b.kelas} · ` : ""}
                      {b.paketSelesai} paket · {b.benar} jawaban benar
                    </span>
                  </span>

                  <span className="flex items-center gap-1.5 font-extrabold tabular-nums text-accent">
                    <IkonKoin className="h-4.5 w-4.5" />
                    {b.poin}
                  </span>
                  <span className="hidden w-24 items-center justify-end gap-1.5 text-xs text-muted sm:flex">
                    <IkonWaktu className="h-3.5 w-3.5" />
                    {lamaIndo(b.durasiDetik)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/warung" className="btn btn-ghost">
            Lobi Warung
          </Link>
          <Link href="/" className="btn btn-ghost">
            ← Kembali ke Halaman Utama
          </Link>
        </div>
      </main>
    </>
  );
}
