import Link from "next/link";
import { redirect } from "next/navigation";

import { HeaderLanguage } from "@/components/language/HeaderLanguage";
import { TabelBand, band } from "@/components/language/TabelBand";
import { EmptyState } from "@/components/ui";
import { getSession } from "@/lib/auth/auth";
import { all } from "@/lib/core/db";
import { wajibFiturLanguage } from "@/lib/ielts/language";
import {
  paketById,
  pengerjaanBerjalan,
  sebutanBand,
  statusPortalIelts,
  type PengerjaanIelts,
} from "@/lib/ielts/ielts";
import { peringkatIelts, statistikIelts } from "@/lib/ielts/ielts-peringkat";

export const metadata = { title: "Band score board — IELTS" };
export const dynamic = "force-dynamic";

const BATAS_TOP = 25;

/**
 * PAPAN SKOR BAND untuk siswa — dari band tertinggi ke terendah.
 *
 * Paketnya tidak dipilih lewat alamat melainkan diambil dari pengerjaan siswa
 * ini sendiri: siswa hanya boleh membaca papan paket yang ia ikuti. Tanpa itu,
 * `?paket=` menjadi cara membaca nilai seluruh angkatan pada paket mana pun.
 *
 * Yang ditampilkan angkanya saja — band tiap subtes dan band keseluruhan. Tidak
 * ada tautan ke jawaban siapa pun; halaman penilaian hanya ada di panel guru.
 */
export default async function PeringkatIeltsSiswaPage() {
  await wajibFiturLanguage();
  const user = await getSession();
  if (!user) redirect("/language/login?next=%2Flanguage%2Fielts%2Fperingkat");
  if ((await statusPortalIelts()).terkunci && user.role !== "admin") redirect("/language/ielts");

  // Pengerjaan terakhir siswa ini — yang berjalan lebih dulu, kalau tidak ada
  // baru yang paling akhir dimulai. Pola yang sama dipakai halaman hasil.
  const p =
    await pengerjaanBerjalan(user.id) ??
    (await all<PengerjaanIelts>(
      "SELECT * FROM ielts_pengerjaan WHERE user_id = ? ORDER BY started_at DESC LIMIT 1",
      user.id,
    ))[0];

  if (!p) redirect("/language/ielts");

  const paket = await paketById(p.paket_id);
  const papan = await peringkatIelts(p.paket_id);
  const stat = statistikIelts(papan);

  const barisSaya = papan.find((r) => r.userId === user.id) ?? null;
  const diLuarTop = barisSaya !== null && barisSaya.peringkat > BATAS_TOP;
  const tampil = diLuarTop && barisSaya ? [...papan.slice(0, BATAS_TOP), barisSaya] : papan.slice(0, BATAS_TOP);

  return (
    <>
      <HeaderLanguage />

      <main className="flex-1 px-4 pb-20 pt-10 sm:pt-14">
        <div className="masuk-language mx-auto max-w-5xl">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-[11px] font-bold text-foreground shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
              {paket?.nama ?? "IELTS"}
            </span>
            <h1 className="mt-6 text-[2rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
              Band score <span className="sorot-language">board</span>
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted">
              Diurutkan dari band keseluruhan tertinggi ke terendah. Peserta yang Writing atau
              Speaking-nya belum dinilai guru ditandai &ldquo;sementara&rdquo; — posisinya masih
              bisa berubah.
            </p>
          </div>

          {papan.length === 0 ? (
            <div className="mt-10">
              <EmptyState
                title="Papan band belum terisi"
                description="Papan ini muncul begitu ada peserta yang menuntaskan setidaknya satu subtes."
                action={
                  <Link href="/language/ielts/ujian" className="btn btn-primary">
                    Papan subtes
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="mt-9 space-y-5">
              <div className="grid gap-3 sm:grid-cols-4">
                <Ringkas judul="Peserta" nilai={String(stat.jumlahPeserta)} />
                <Ringkas judul="Tertinggi" nilai={band(stat.tertinggi)} />
                <Ringkas judul="Rata-rata" nilai={band(stat.rataOverall)} />
                <Ringkas
                  judul="Bandmu"
                  nilai={band(barisSaya?.overall ?? null)}
                  ket={
                    barisSaya?.final && barisSaya.overall !== null
                      ? sebutanBand(barisSaya.overall)
                      : barisSaya
                        ? "sementara"
                        : "belum ada"
                  }
                />
              </div>

              <div className="card overflow-hidden">
                <div className="border-b border-line px-5 py-4">
                  <h2 className="text-lg font-extrabold tracking-tight">
                    Top {Math.min(BATAS_TOP, papan.length)}
                  </h2>
                  <p className="text-sm text-muted">Barismu ditandai warna.</p>
                </div>

                <TabelBand papan={tampil} sorotUserId={user.id} tampilKelas={false} />

                {diLuarTop && barisSaya && (
                  <p className="border-t border-line px-5 py-3 text-center text-xs text-muted">
                    Barismu ditampilkan di bawah daftar sepuluh besar — peringkat{" "}
                    {barisSaya.peringkat} dari {papan.length} peserta.
                  </p>
                )}
              </div>

              {!barisSaya && (
                <p className="card p-4 text-sm text-muted">
                  Kamu belum punya band pada paket ini, jadi belum masuk papan. Selesaikan dulu
                  setidaknya satu subtes ya.
                </p>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/language/ielts/hasil" className="btn btn-ghost font-semibold">
              Hasilku
            </Link>
            <Link href="/language/ielts/ujian" className="btn btn-ghost font-semibold">
              Papan subtes
            </Link>
            <Link href="/language/pilih" className="btn btn-primary font-extrabold">
              Kembali ke Language Skill
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

function Ringkas({ judul, nilai, ket }: { judul: string; nilai: string; ket?: string }) {
  return (
    <div className="card p-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{judul}</p>
      <p className="mt-0.5 text-2xl font-extrabold tracking-tight tabular-nums">{nilai}</p>
      {ket && <p className="text-[11px] text-muted">{ket}</p>}
    </div>
  );
}
