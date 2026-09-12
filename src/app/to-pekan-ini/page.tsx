import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { IkonGrafik, IkonOrang, IkonPiala } from "@/components/dashboard/IkonBeranda";
import { KartuAngka, PemilihJalur, SampulSiswa } from "@/components/dashboard/SampulSiswa";
import { EmptyState } from "@/components/ui";
import { angka, tanggalSingkat, warnaSkor } from "@/components/hasil/format";
import { requireUser } from "@/lib/auth/auth";
import { Tema } from "@/components/Tema";
import { papanPekanIni, type JalurRekap } from "@/lib/laporan/rekap";
import { namaSubtes } from "@/lib/tryout/snbt";

const BASIS = "/to-pekan-ini";

export const metadata = { title: "TOAdzkia Pekan Ini" };
export const dynamic = "force-dynamic";

const MEDALI = ["🥇", "🥈", "🥉"];

function tanggalPanjang(d: Date): string {
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Papan peringkat tryout pekan berjalan (Senin–Minggu). Tryout Adzkia digelar
 * tiap Jumat, jadi biasanya satu pekan berisi tepat satu paket; bila ternyata
 * ada lebih dari satu (misalnya susulan paket lain), skor peserta dirata-rata.
 */
export default async function PekanIniPage({
  searchParams,
}: {
  searchParams: Promise<{ jalur?: string }>;
}) {
  const user = await requireUser();
  const { jalur: jalurQuery } = await searchParams;
  const jalur: JalurRekap = jalurQuery === "skd" ? "skd" : "utbk";
  const papan = await papanPekanIni(jalur);

  const akhirPekan = new Date(papan.rentang.selesai);
  akhirPekan.setDate(akhirPekan.getDate() - 1);
  const periode = `${tanggalPanjang(papan.rentang.mulai)} – ${tanggalPanjang(akhirPekan)}`;

  const barisSaya = papan.baris.find((b) => b.userId === user.id) ?? null;

  return (
    <Tema jalur={jalur} className="flex min-h-dvh flex-col">
      {/* Tanpa baris jalur — lihat keterangan di components/Navbar.tsx. */}
      <Navbar jalur="siswa" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <SampulSiswa
          kicker={periode}
          judul="TOAdzkia Pekan Ini"
          keterangan={
            barisSaya
              ? `Kamu berada di peringkat #${barisSaya.peringkat} dari ${papan.jumlahPeserta} peserta pekan ini.`
              : `Peringkat ${jalur === "skd" ? "SKD Kedinasan" : "Tryout Real UTBK"} pekan berjalan. Tryout Adzkia digelar setiap hari Jumat.`
          }
          lencana={[
            `${papan.jumlahPeserta} peserta`,
            ...(papan.paket.length ? [papan.paket.map((p) => p.kode).join(" · ")] : []),
          ]}
          tombol={[
            { href: `/rankup?jalur=${jalur}`, label: "Capaianku", utama: true },
            { href: "/dashboard", label: "Beranda" },
          ]}
        />

        {/* Nilai UTBK dan SKD memakai skala berbeda, jadi tidak pernah
            dicampur dalam satu tabel. */}
        <div className="mt-6 mb-6">
          <PemilihJalur basis={BASIS} jalur={jalur} />
        </div>

        {papan.baris.length === 0 ? (
          <EmptyState
            title="Belum ada hasil tryout pekan ini"
            description="Peringkat muncul otomatis begitu peserta pertama menuntaskan tryout pekan ini. Tryout Adzkia digelar setiap hari Jumat."
            action={
              <Link href={`/rankup?jalur=${jalur}`} className="btn btn-accent">
                Lihat Capaianku
              </Link>
            }
          />
        ) : (
          <>
            <section aria-label="Ringkasan pekan" className="grid gap-4 sm:grid-cols-3">
              <KartuAngka
                ikon={<IkonOrang />}
                label="Peserta"
                nilai={angka(papan.jumlahPeserta)}
                keterangan={papan.paket.map((p) => p.kode).join(" · ") || "Pekan berjalan"}
              />
              <KartuAngka
                ikon={<IkonGrafik />}
                label="Rata-rata"
                nilai={angka(papan.rataSkor)}
                keterangan={jalur === "skd" ? "Poin SKD 0–550" : "Skala IRT 0–1000"}
              />
              <KartuAngka
                ikon={<IkonPiala />}
                sorot
                label="Skor tertinggi"
                nilai={angka(papan.skorTertinggi)}
                keterangan={papan.baris[0]?.nama ?? "—"}
              />
            </section>

            {barisSaya && (
              <div className="card kartu-angkat mt-6 flex flex-wrap items-center gap-4 border-accent/40 bg-accent-soft/60 p-5">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent text-xl font-extrabold tabular-nums text-white">
                  #{barisSaya.peringkat}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold tracking-tight">Posisimu pekan ini</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Skor {angka(barisSaya.totalSkor)} dari {papan.jumlahPeserta} peserta.
                  </p>
                </div>
                <Link href={`/rankup?jalur=${jalur}`} className="btn btn-ghost shrink-0">
                  Lihat rekam jejakku
                </Link>
              </div>
            )}

            <section className="mt-8">
              <h2 className="mb-3 text-lg font-extrabold tracking-tight">
                Peringkat Lengkap ({papan.jumlahPeserta} peserta)
              </h2>
              <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[48rem] text-sm">
                    <caption className="sr-only">
                      Peringkat peserta tryout pekan ini dari nilai tertinggi ke terendah
                    </caption>
                    <thead>
                      <tr className="border-b border-line bg-surface-muted text-left text-xs uppercase tracking-wide text-muted">
                        <th scope="col" className="px-4 py-2.5 font-semibold">#</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Peserta</th>
                        {papan.kolomSubtes.map((k) => (
                          <th
                            key={k}
                            scope="col"
                            className="px-2 py-2.5 text-right font-semibold"
                            title={namaSubtes(k)}
                          >
                            {k}
                          </th>
                        ))}
                        <th scope="col" className="px-4 py-2.5 text-right font-semibold">Skor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {papan.baris.map((b) => {
                        const saya = b.userId === user.id;
                        return (
                          <tr
                            key={b.userId}
                            className={`border-b border-line/70 last:border-0 ${
                              saya ? "bg-accent-soft/60" : ""
                            }`}
                          >
                            <td className="px-4 py-3 text-lg font-extrabold tabular-nums">
                              {MEDALI[b.peringkat - 1] ?? b.peringkat}
                            </td>
                            <td className="px-3 py-3">
                              <span className="block font-semibold">
                                {b.nama}
                                {saya && (
                                  <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white">
                                    kamu
                                  </span>
                                )}
                              </span>
                              <span className="block text-xs text-muted">
                                {b.kelas ?? b.asalSekolah ?? "—"}
                                {b.jumlahTryout > 1 && ` · rata-rata ${b.jumlahTryout} tryout`}
                                {` · ${tanggalSingkat(b.selesaiAt)}`}
                              </span>
                            </td>
                            {papan.kolomSubtes.map((k) => (
                              <td key={k} className="px-2 py-3 text-right tabular-nums text-muted">
                                {b.skorSubtes[k] ?? "—"}
                              </td>
                            ))}
                            <td
                              className={`px-4 py-3 text-right text-base font-extrabold tabular-nums ${warnaSkor(
                                b.totalSkor,
                              )}`}
                            >
                              {angka(b.totalSkor)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </Tema>
  );
}
