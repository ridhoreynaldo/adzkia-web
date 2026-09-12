import Link from "next/link";
import { redirect } from "next/navigation";

import { HeaderLanguage } from "@/components/language/HeaderLanguage";
import { Alert } from "@/components/ui";
import { getSession } from "@/lib/auth/auth";
import { wajibFiturLanguage } from "@/lib/ielts/language";
import {
  RULES_IELTS,
  SUBTES_IELTS,
  TEKS_SETUJU,
  menitPaket,
  TOTAL_SOAL_IELTS,
  paketById,
  pengerjaan,
  statusPortalIelts,
} from "@/lib/ielts/ielts";

import { setujuRulesAction } from "../actions";

export const metadata = { title: "Test Rules — IELTS" };
export const dynamic = "force-dynamic";

/**
 * Tata tertib IELTS — dibaca sekali, di depan ujian, dan harus dicentang.
 *
 * Seluruh isinya berbahasa Inggris atas permintaan pengelola: peserta IELTS
 * sungguhan menerima aturannya dalam bahasa Inggris, dan membiasakan siswa
 * dengan kalimat itu adalah bagian dari latihannya sendiri. Kalimat pengantar
 * di sekitarnya tetap bahasa Indonesia supaya tidak ada siswa yang salah
 * paham tentang APA yang sedang ia setujui.
 *
 * Persetujuannya disimpan sebagai waktu di `ielts_pengerjaan.setuju_at`, dan
 * tanpa itu `bukaSubtes()` menolak membuka subtes mana pun.
 */
export default async function RulesIeltsPage({
  searchParams,
}: {
  searchParams: Promise<{ paket?: string; galat?: string }>;
}) {
  await wajibFiturLanguage();
  const user = await getSession();
  if (!user) redirect("/language/login?next=%2Flanguage%2Fielts");

  const { paket: paketMentah, galat } = await searchParams;
  const paket = await paketById(Number(paketMentah));
  if (!paket) redirect("/language/ielts");
  if ((await statusPortalIelts()).terkunci && user.role !== "admin") redirect("/language/ielts");

  // Lama tiap subtes milik PAKET ini, bukan angka bawaan aplikasi: siswa
  // menyetujui aturan yang menyebut menitnya, jadi yang tertulis di sini harus
  // angka yang benar-benar akan dijalankan servernya.
  const menit = await menitPaket(paket);

  // Yang sudah menyetujui tidak perlu membaca dua kali.
  const milikku = await pengerjaan(user.id, paket.id);
  if (milikku?.setuju_at && milikku.status === "ongoing") redirect("/language/ielts/ujian");

  return (
    <>
      <HeaderLanguage ringkas />

      <main className="flex-1 px-4 pb-20 pt-10 sm:pt-14">
        <div className="masuk-language mx-auto max-w-3xl">
          <p className="text-sm">
            <Link
              href="/language/ielts"
              className="font-semibold text-muted underline-offset-4 hover:text-brand hover:underline"
            >
              ← Kembali ke daftar paket
            </Link>
          </p>

          <div className="mt-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-[11px] font-bold text-foreground shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
              {paket.nama}
            </span>
            <h1 className="mt-6 text-[2.1rem] font-extrabold leading-[1.07] tracking-tight sm:text-5xl">
              Read the <span className="sorot-language">rules</span> before you start
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted">
              Aturan di bawah ini memakai bahasa dan standar IELTS internasional. Baca sampai habis
              — kamu tidak bisa membuka soal sebelum mencentang persetujuan.
            </p>
          </div>

          {galat && (
            <div className="mt-8">
              <Alert tone="danger">{galat}</Alert>
            </div>
          )}

          {/* ---------- Susunan ujian ---------- */}
          <section className="card mt-9 overflow-hidden">
            <div className="border-b border-line px-6 py-4">
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-muted">
                Test format
              </h2>
            </div>
            <ul className="divide-y divide-line">
              {SUBTES_IELTS.map((s) => (
                <li key={s.kode} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <p className="font-extrabold tracking-tight">
                      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-muted text-[11px] font-bold text-muted">
                        {s.urutan}
                      </span>
                      {s.nama}
                    </p>
                    <p className="mt-1 pl-8 text-[13px] leading-snug text-muted">{s.ringkas}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand px-3 py-1.5 text-xs font-extrabold text-white">
                    {menit[s.kode]} min
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-line bg-surface-muted px-6 py-3 text-xs font-bold uppercase tracking-wide text-muted">
              <span>Total</span>
              <span>
                {TOTAL_SOAL_IELTS} questions ·{" "}
                {SUBTES_IELTS.reduce((n, s) => n + menit[s.kode], 0)} minutes
              </span>
            </div>
          </section>

          {/* ---------- Pasal-pasal ---------- */}
          <div className="mt-6 space-y-4">
            {RULES_IELTS.map((pasal) => (
              <section key={pasal.judul} className="card p-6">
                <h2 className="text-base font-extrabold tracking-tight">{pasal.judul}</h2>
                <ul className="mt-3 space-y-2.5">
                  {pasal.butir.map((b) => (
                    <li key={b} className="flex gap-3 text-sm leading-relaxed text-muted">
                      <span
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                        aria-hidden
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {/* ---------- Persetujuan ---------- */}
          <form
            action={setujuRulesAction}
            className="card mt-6 border-2 border-brand/30 p-6 shadow-[0_30px_60px_-40px_rgba(228,18,63,0.6)]"
          >
            <input type="hidden" name="paketId" value={paket.id} />

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name="setuju"
                value="1"
                required
                className="mt-1 h-5 w-5 shrink-0 accent-[color:var(--brand)]"
              />
              <span className="text-sm font-semibold leading-relaxed">{TEKS_SETUJU}</span>
            </label>

            <p className="mt-4 text-xs leading-relaxed text-muted">
              Waktu persetujuanmu dicatat. Sesudah ini kamu masuk ke ruang ujian dan bisa memilih
              subtes pertama — timer baru menyala saat subtesnya kamu buka, bukan sekarang.
            </p>

            <button className="btn btn-primary mt-5 w-full font-extrabold" type="submit">
              I agree — continue to the test →
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
