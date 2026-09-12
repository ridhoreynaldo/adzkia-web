import Link from "next/link";
import { redirect } from "next/navigation";

import { HeaderLanguage } from "@/components/language/HeaderLanguage";
import { getSession } from "@/lib/auth/auth";
import { wajibFiturLanguage } from "@/lib/ielts/language";
import {
  bandKeseluruhan,
  bandLengkap,
  hasilPengerjaan,
  kriteriaSubtes,
  paketById,
  pengerjaanBerjalan,
  sebutanBand,
  subtesBelumBerband,
  subtesTidakDiujikan,
  type PengerjaanIelts,
} from "@/lib/ielts/ielts";
import { all } from "@/lib/core/db";

export const metadata = { title: "Your result — IELTS" };
export const dynamic = "force-dynamic";

/**
 * Hasil IELTS.
 *
 * Listening dan Reading dinilai mesin dan langsung berubah jadi band 0-9 lewat
 * tabel konversi resmi. Writing dan Speaking menunggu guru: bandnya baru muncul
 * sesudah keempat kriteria IELTS diisi di panel penilaian, dan sampai saat itu
 * halaman ini SENGAJA menulis "menunggu guru" alih-alih angka. Menampilkan
 * angka yang belum ada akan menyesatkan siswa tentang kesiapannya.
 *
 * Band keseluruhan pun ditandai "sementara" selama masih ada subtes yang belum
 * berband — rata-rata dari dua subtes bukanlah overall band IELTS.
 */
export default async function HasilIeltsPage() {
  await wajibFiturLanguage();
  const user = await getSession();
  if (!user) redirect("/language/login?next=%2Flanguage%2Fielts");

  // Pengerjaan terakhir milik siswa ini — yang sedang berjalan lebih dulu,
  // kalau tidak ada baru yang paling akhir selesai.
  const p =
    await pengerjaanBerjalan(user.id) ??
    (await all<PengerjaanIelts>(
      "SELECT * FROM ielts_pengerjaan WHERE user_id = ? ORDER BY started_at DESC LIMIT 1",
      user.id,
    ))[0];

  if (!p) redirect("/language/ielts");

  const paket = await paketById(p.paket_id);
  const hasil = await hasilPengerjaan(p);
  const band = bandKeseluruhan(hasil);
  const lengkap = bandLengkap(hasil);
  const belum = subtesBelumBerband(hasil);
  // Subtes yang memang TIDAK diujikan pada paket ini — bukan yang menunggu
  // nilai guru. Keduanya sama-sama tanpa band, tetapi hanya yang kedua yang
  // masih akan datang, dan hanya yang kedua yang boleh membuat band ditandai
  // "sementara".
  const tidakDiuji = subtesTidakDiujikan(hasil);

  return (
    <>
      <HeaderLanguage />

      <main className="flex-1 px-4 pb-20 pt-10 sm:pt-14">
        <div className="masuk-language mx-auto max-w-3xl">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-[11px] font-bold text-foreground shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
              {paket?.nama ?? "IELTS"}
            </span>
            <h1 className="mt-6 text-[2rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
              Your <span className="sorot-language">band score</span>
            </h1>
          </div>

          {/* ---------- Band keseluruhan ---------- */}
          <div className="card mt-9 p-8 text-center">
            <p className="text-xs font-extrabold uppercase tracking-widest text-muted">
              {lengkap ? "Overall band" : "Band sementara"}
            </p>
            <p className="mt-3 text-6xl font-extrabold tracking-tight text-brand">
              {band === null ? "—" : band.toFixed(1)}
            </p>
            {band !== null && lengkap && (
              <p className="mt-1 text-sm font-bold text-foreground">{sebutanBand(band)}</p>
            )}
            <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-muted">
              {lengkap ? (
                <>
                  Rata-rata band{" "}
                  {tidakDiuji.length > 0
                    ? `${hasil.length - tidakDiuji.length} subtes yang diujikan pada paket ini`
                    : "keempat subtes"}
                  , dibulatkan ke setengah band terdekat sesuai aturan IELTS — rata-rata yang
                  berakhiran ,25 naik ke setengah band berikutnya dan yang berakhiran ,75 naik ke
                  band bulat berikutnya.
                  {tidakDiuji.length > 0 && (
                    <> {tidakDiuji.join(" dan ")} tidak diujikan pada paket ini.</>
                  )}
                </>
              ) : (
                <>
                  Angka ini belum final: {belum.join(" dan ")} belum punya band, jadi belum ikut
                  dirata-rata. Overall band muncul sesudah keempat subtes dinilai.
                </>
              )}
            </p>
          </div>

          {/* ---------- Rincian ---------- */}
          <div className="mt-6 space-y-4">
            {hasil.map((h) => (
              <div key={h.kode} className="card p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold tracking-tight">{h.nama}</h2>
                    <p className="mt-1 text-[13px] text-muted">
                      {!h.diujikan ? (
                        <>Tidak diujikan pada paket ini.</>
                      ) : h.dinilaiGuru ? (
                        <>Dinilai guru dengan kriteria resmi IELTS.</>
                      ) : (
                        <>
                          {h.benar} benar · {h.salah} salah · {h.kosong} kosong dari {h.jumlahSoal}{" "}
                          soal
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    {/* Subtes yang soalnya belum diisi pengelola tidak diberi
                        angka: band 0.0 di sini terbaca sebagai "kamu gagal",
                        padahal tidak ada yang pernah dikerjakan. */}
                    {!h.diujikan ? (
                      <span className="inline-flex items-center rounded-full bg-surface-muted px-4 py-2 text-xs font-bold text-muted">
                        Tidak diujikan
                      </span>
                    ) : h.band === null ? (
                      <span className="inline-flex items-center rounded-full bg-surface-muted px-4 py-2 text-xs font-bold text-muted">
                        Menunggu guru
                      </span>
                    ) : (
                      <>
                        <p className="text-3xl font-extrabold tracking-tight text-brand">
                          {h.band.toFixed(1)}
                        </p>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                          band
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {!h.dinilaiGuru && h.jumlahSoal > 0 && (
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${(h.benar / h.jumlahSoal) * 100}%` }}
                    />
                  </div>
                )}

                {/* Rincian kriteria: bukan sekadar angka akhirnya, melainkan di
                    mana siswa kuat dan di mana ia harus berlatih. */}
                {h.rincianGuru.length > 0 && (
                  <div className="mt-5 space-y-4 border-t border-line pt-4">
                    {h.rincianGuru.map((n) => (
                      <div key={`${n.subtes}-${n.bagian}`}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-bold">
                            {n.subtes === "WRITING" ? `Task ${n.bagian}` : "Interview"}
                          </p>
                          {n.band !== null && (
                            <p className="text-sm font-extrabold text-brand">
                              band {n.band.toFixed(1)}
                            </p>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {kriteriaSubtes(h.kode).map((k) => (
                            <div key={k.kode} className="rounded-lg bg-surface-muted px-3 py-2">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                                {k.kode}
                              </p>
                              <p className="text-base font-extrabold tabular-nums">
                                {n.nilai[k.kode] === undefined
                                  ? "—"
                                  : n.nilai[k.kode].toFixed(1)}
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
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {/* Pembahasan berdiri sebagai halaman sendiri: satu paket penuh
                berisi 80 butir beserta bacaan dan naskah rekamannya, dan
                menempelkannya di bawah kartu band membuat angka yang paling
                dicari siswa tenggelam berhalaman-halaman ke bawah. */}
            <Link href="/language/ielts/pembahasan" className="btn btn-ghost font-semibold">
              Pembahasan soal
            </Link>
            <Link href="/language/ielts/peringkat" className="btn btn-ghost font-semibold">
              Papan band
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
