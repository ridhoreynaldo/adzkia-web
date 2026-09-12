import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import {
  IkonGrafik,
  IkonLembar,
  IkonMedali,
  IkonPiala,
  IkonUnduh,
} from "@/components/dashboard/IkonBeranda";
import { KartuAngka, PemilihJalur, SampulSiswa } from "@/components/dashboard/SampulSiswa";
import { Badge, Card, EmptyState } from "@/components/ui";
import {
  GrafikPerkembangan,
  type TitikPerkembangan,
} from "@/components/hasil/GrafikPerkembangan";
import { angka, predikatSkor, tanggal, tanggalSingkat, warnaSkor } from "@/components/hasil/format";
import { requireUser } from "@/lib/auth/auth";
import { Tema } from "@/components/Tema";
import { rekapTahunSiswa, type JalurRekap } from "@/lib/laporan/rekap";
import { namaSubtes } from "@/lib/tryout/snbt";
import { NILAI_MAKS_SKD } from "@/lib/tryout/skd";

const BASIS = "/rankup";

export const metadata = { title: "Capaianku" };
export const dynamic = "force-dynamic";

/**
 * Capaianku — rekam jejak satu tahun penuh milik siswa yang sedang masuk:
 * setiap tryout yang pernah ia selesaikan, skor per subtes, peringkatnya, dan
 * perkembangannya. Bisa diunduh sebagai .xlsx untuk wali kelas atau orang tua.
 */
export default async function RankUpPage({
  searchParams,
}: {
  searchParams: Promise<{ jalur?: string }>;
}) {
  const user = await requireUser();
  const { jalur: jalurQuery } = await searchParams;
  const jalur: JalurRekap = jalurQuery === "skd" ? "skd" : "utbk";
  const rekap = await rekapTahunSiswa(user.id, jalur);

  const titik: TitikPerkembangan[] = rekap.kronologis.map((b) => ({
    label: b.paketKode || b.paketNama,
    tanggal: tanggalSingkat(b.selesaiAt),
    skor: b.totalSkor,
  }));

  const periode = `${rekap.rentang.mulai.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })} – ${rekap.rentang.selesai.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;

  const skd = jalur === "skd";
  const naik = rekap.perubahanSkor != null && rekap.perubahanSkor > 0;
  const turun = rekap.perubahanSkor != null && rekap.perubahanSkor < 0;

  return (
    <Tema jalur={jalur} className="flex min-h-dvh flex-col">
      {/* Tanpa baris jalur — lihat keterangan di components/Navbar.tsx. */}
      <Navbar jalur="siswa" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <SampulSiswa
          kicker={periode}
          judul="Capaianku"
          keterangan={`Rekam jejak ${user.nama} selama satu tahun terakhir — setiap tryout yang kamu tuntaskan, skor tiap subtes, dan perkembangannya.`}
          lencana={[
            `${rekap.jumlahTryout} tryout setahun`,
            ...(rekap.peringkatTerbaik ? [`Peringkat terbaik #${rekap.peringkatTerbaik}`] : []),
            skd ? "SKD Kedinasan" : "UTBK-SNBT",
          ]}
          tombol={[
            { href: `/to-pekan-ini?jalur=${jalur}`, label: "TOAdzkia Pekan Ini", utama: true },
            { href: "/dashboard", label: "Beranda" },
          ]}
        />

        {/* Nilai UTBK dan SKD memakai skala berbeda, jadi tidak pernah
            dicampur dalam satu tabel. */}
        <div className="mt-6 mb-6">
          <PemilihJalur basis={BASIS} jalur={jalur} />
        </div>

        {rekap.jumlahTryout === 0 ? (
          <EmptyState
            title="Belum ada tryout yang selesai dalam setahun terakhir"
            description="Begitu kamu menuntaskan satu tryout, rekam jejaknya langsung muncul di sini beserta peringkat dan perkembangan skormu."
            action={
              <Link href="/dashboard" className="btn btn-primary">
                Lihat tryout yang tersedia
              </Link>
            }
          />
        ) : (
          <>
            {/* Ringkasan setahun */}
            <section aria-label="Ringkasan setahun" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KartuAngka
                ikon={<IkonLembar />}
                label="Tryout diikuti"
                nilai={angka(rekap.jumlahTryout)}
                keterangan="Dalam 12 bulan terakhir"
              />
              <KartuAngka
                ikon={<IkonGrafik />}
                sorot
                label={skd ? "Nilai rata-rata" : "Skor rata-rata"}
                nilai={angka(rekap.rataSkor)}
                keterangan={
                  skd ? `dari ${NILAI_MAKS_SKD} poin` : predikatSkor(rekap.rataSkor ?? 0)
                }
                warna={skd ? "text-brand" : warnaSkor(rekap.rataSkor ?? 0)}
              />
              <KartuAngka
                ikon={<IkonPiala />}
                label={skd ? "Nilai tertinggi" : "Skor tertinggi"}
                nilai={angka(rekap.skorTertinggi)}
                keterangan={`Terendah ${angka(rekap.skorTerendah)}`}
                warna={skd ? "text-brand" : warnaSkor(rekap.skorTertinggi ?? 0)}
              />
              <KartuAngka
                ikon={<IkonMedali />}
                label="Peringkat terbaik"
                nilai={rekap.peringkatTerbaik ? `#${rekap.peringkatTerbaik}` : "—"}
                keterangan={
                  rekap.perubahanSkor == null
                    ? "Ikuti tryout lagi untuk melihat perkembangan"
                    : `Skor ${naik ? "naik" : turun ? "turun" : "tetap"} ${Math.abs(
                        rekap.perubahanSkor,
                      )} poin sejak tryout pertama`
                }
                warna={naik ? "text-success" : turun ? "text-danger" : "text-brand"}
              />
            </section>

            {/* Unduh */}
            <div className="card kartu-angkat mt-6 flex flex-wrap items-center gap-4 border-accent/30 bg-accent-soft/60 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-white">
                <IkonUnduh />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold tracking-tight text-accent">
                  Rekap setahun penuh
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  Berisi tanggal, paket, skor tiap subtes, skor total, dan peringkatmu di setiap
                  tryout. Bisa ditunjukkan ke wali kelas atau orang tua.
                </p>
              </div>
              <a
                href={`/api/rankup/unduh?jalur=${jalur}`}
                download
                className="btn btn-accent shrink-0"
              >
                Unduh .xlsx
              </a>
            </div>

            {/* Grafik perkembangan */}
            {titik.length > 1 && (
              <section className="mt-8">
                <h2 className="mb-3 text-lg font-extrabold tracking-tight">Perkembangan Skor</h2>
                <Card>
                  <GrafikPerkembangan titik={titik} />
                </Card>
              </section>
            )}

            {/* Tabel per tryout */}
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-extrabold tracking-tight">
                Riwayat per Tryout ({rekap.jumlahTryout})
              </h2>
              <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[52rem] text-sm">
                    <caption className="sr-only">
                      Riwayat tryout satu tahun terakhir beserta skor per subtes dan peringkat
                    </caption>
                    <thead>
                      <tr className="border-b border-line bg-surface-muted text-left text-xs uppercase tracking-wide text-muted">
                        <th scope="col" className="px-4 py-2.5 font-semibold">Tanggal</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Paket</th>
                        {rekap.kolomSubtes.map((k) => (
                          <th
                            key={k}
                            scope="col"
                            className="px-2 py-2.5 text-right font-semibold"
                            title={namaSubtes(k)}
                          >
                            {k}
                          </th>
                        ))}
                        <th scope="col" className="px-3 py-2.5 text-right font-semibold">Total</th>
                        <th scope="col" className="px-3 py-2.5 text-center font-semibold">Peringkat</th>
                        <th scope="col" className="px-4 py-2.5 text-right font-semibold">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rekap.baris.map((b) => (
                        <tr key={b.attemptId} className="border-b border-line/70 last:border-0">
                          <td className="whitespace-nowrap px-4 py-3 text-muted">
                            {tanggal(b.selesaiAt)}
                          </td>
                          <td className="px-3 py-3">
                            <span className="block font-semibold">{b.paketNama}</span>
                            <span className="block text-xs text-muted">
                              {b.paketKode}
                              {b.jalur === "susulan" && " · susulan"}
                            </span>
                          </td>
                          {rekap.kolomSubtes.map((k) => (
                            <td key={k} className="px-2 py-3 text-right tabular-nums">
                              {b.skorSubtes[k] ?? "—"}
                            </td>
                          ))}
                          <td
                            className={`px-3 py-3 text-right text-base font-extrabold tabular-nums ${
                              skd ? "text-brand" : warnaSkor(b.totalSkor)
                            }`}
                          >
                            {angka(b.totalSkor)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {b.peringkat ? (
                              <>
                                <Badge tone={b.peringkat <= 3 ? "success" : "muted"}>
                                  #{b.peringkat}
                                </Badge>
                                <span className="mt-1 block text-[11px] text-muted">
                                  dari {b.jumlahPeserta} · rata {b.rataPaket}
                                </span>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/hasil/${b.attemptId}`}
                              className="text-xs font-semibold text-brand hover:underline"
                            >
                              Lihat hasil →
                            </Link>
                          </td>
                        </tr>
                      ))}
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
