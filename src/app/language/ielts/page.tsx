import Link from "next/link";
import { redirect } from "next/navigation";

import { HeaderLanguage } from "@/components/language/HeaderLanguage";
import { Alert } from "@/components/ui";
import { getSession } from "@/lib/auth/auth";
import { wajibFiturLanguage } from "@/lib/ielts/language";
import {
  KODE_SUBTES_IELTS,
  SUBTES_IELTS,
  TOTAL_SOAL_IELTS,
  menitPaket,
  paketTersedia,
  subtesIelts,
  pengerjaan,
  statusPortalIelts,
} from "@/lib/ielts/ielts";
import { UJIAN as PROFIL } from "@/lib/ielts/language-konstanta";

import { mulaiIeltsAction } from "./actions";

export const metadata = { title: "IELTS — Language Skill" };
export const dynamic = "force-dynamic";

/**
 * Halaman jalur IELTS: satu keputusan — paket mana yang mau dikerjakan.
 *
 * Susunannya sengaja sama dengan halaman depan Language Skill (kertas krem,
 * kapsul hitam, satu kata disorot merah) supaya terasa satu rumah, bukan dua
 * aplikasi yang ditempel.
 */
export default async function IeltsPage({
  searchParams,
}: {
  searchParams: Promise<{ galat?: string; pesan?: string }>;
}) {
  await wajibFiturLanguage();
  const user = await getSession();
  if (!user) redirect("/language/login?next=%2Flanguage%2Fielts");

  const { galat, pesan } = await searchParams;
  const portal = await statusPortalIelts();
  const terkunci = portal.terkunci && user.role !== "admin";
  const paket = terkunci ? [] : await paketTersedia();
  const profil = PROFIL.ielts;

  return (
    <>
      <HeaderLanguage />

      <main className="flex-1 px-4 pb-20 pt-10 sm:pt-14">
        <div className="masuk-language mx-auto max-w-4xl">
          <p className="text-sm">
            <Link
              href="/language/pilih"
              className="font-semibold text-muted underline-offset-4 hover:text-brand hover:underline"
            >
              ← Pilih ujian lain
            </Link>
          </p>

          <div className="mt-6 text-center">
            <span className="inline-flex items-center rounded-full bg-brand-soft px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand">
              {profil.skala}
            </span>
            <h1 className="mt-5 text-[2.4rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              IELTS
            </h1>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {profil.panjang}
            </p>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
              Empat subtes berurutan, {TOTAL_SOAL_IELTS} butir. Timernya berjalan di server —
              sama seperti ujian sungguhan. Lama tiap subtes ditetapkan per paket; lihat angkanya
              pada kartu paket di bawah.
            </p>
          </div>

          {(galat || pesan) && (
            <div className="mx-auto mt-8 max-w-xl space-y-3">
              {galat && <Alert tone="danger">{galat}</Alert>}
              {pesan && <Alert tone="success">{pesan}</Alert>}
            </div>
          )}

          {/* ---------- Empat subtes ---------- */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SUBTES_IELTS.map((s) => (
              <div key={s.kode} className="card p-5">
                <span className="text-[11px] font-bold text-muted">Section {s.urutan}</span>
                <h2 className="mt-1 text-lg font-extrabold tracking-tight">{s.nama}</h2>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand">
                  {s.jumlahSoal} {s.jumlahSoal === 1 ? "question" : "questions"}
                </p>
                <p className="mt-3 text-[11px] leading-snug text-muted">{s.ringkas}</p>
              </div>
            ))}
          </div>

          {/* ---------- Paket ---------- */}
          <h2 className="mt-12 text-sm font-extrabold uppercase tracking-widest text-muted">
            Paket yang tersedia
          </h2>

          {terkunci ? (
            <div className="card mt-4 p-7 text-center">
              <p className="text-lg font-extrabold tracking-tight">Portal IELTS sedang dikunci</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Pengelola menutup jalur ini untuk sementara. Coba lagi nanti atau tanyakan ke
                pengawas.
              </p>
            </div>
          ) : paket.length === 0 ? (
            <div className="card mt-4 p-7 text-center">
              <p className="text-lg font-extrabold tracking-tight">Belum ada paket terbit</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Soal IELTS belum dibuka pengelola. Halaman ini akan terisi sendiri begitu paketnya
                diterbitkan.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {await Promise.all(paket.map(async (p) => {
                const milikku = await pengerjaan(user.id, p.id);
                const lanjut = Boolean(milikku?.setuju_at) && milikku?.status === "ongoing";
                const selesai = milikku?.status === "finished";
                return (
                  <div key={p.id} className="kartu-language p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-xl font-extrabold tracking-tight">{p.nama}</h3>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">
                          {p.kode}
                          {p.selesai_at ? ` · ditutup ${p.selesai_at}` : ""}
                        </p>
                        {p.deskripsi && <p className="mt-2 text-sm text-muted">{p.deskripsi}</p>}
                        {/* Menit diambil dari PAKET, bukan dari konstanta:
                            tiap paket boleh punya waktunya sendiri, dan siswa
                            harus tahu yang mana sebelum menekan mulai. */}
                        <p className="mt-2 text-xs font-semibold text-muted">
                          {(async () => {
                            const menit = await menitPaket(p);
                            const total = KODE_SUBTES_IELTS.reduce((n, k) => n + menit[k], 0);
                            return `${KODE_SUBTES_IELTS.map(
                              (k) => `${subtesIelts(k)?.nama} ${menit[k]}′`,
                            ).join(" · ")} — total ${total} menit`;
                          })()}
                        </p>
                      </div>

                      {selesai ? (
                        <Link href="/language/ielts/hasil" className="btn btn-ghost font-bold">
                          Lihat hasil →
                        </Link>
                      ) : lanjut ? (
                        <Link href="/language/ielts/ujian" className="btn btn-primary font-bold">
                          Lanjutkan ujian →
                        </Link>
                      ) : (
                        <form action={mulaiIeltsAction}>
                          <input type="hidden" name="paketId" value={p.id} />
                          <button className="btn btn-primary font-bold" type="submit">
                            Baca aturan &amp; mulai →
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              }))}
            </div>
          )}

          <p className="mt-10 text-center text-sm">
            <Link
              href="/language/toefl"
              className="font-semibold text-muted underline-offset-4 hover:text-brand hover:underline"
            >
              Lihat {PROFIL.toefl.nama} →
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
