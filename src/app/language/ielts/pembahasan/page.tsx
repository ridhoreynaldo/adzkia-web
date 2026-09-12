import Link from "next/link";
import { redirect } from "next/navigation";

import { HeaderLanguage } from "@/components/language/HeaderLanguage";
import { LembarPembahasanIelts } from "@/components/language/LembarPembahasanIelts";
import { TombolCetak } from "@/components/hasil/TombolCetak";
import { getSession } from "@/lib/auth/auth";
import { all } from "@/lib/core/db";
import { paketById, pengerjaanBerjalan, type PengerjaanIelts } from "@/lib/ielts/ielts";
import { pembahasanPengerjaan } from "@/lib/ielts/ielts-pembahasan";
import { wajibFiturLanguage } from "@/lib/ielts/language";

export const metadata = { title: "Answer review — IELTS" };
export const dynamic = "force-dynamic";

/**
 * PEMBAHASAN IELTS untuk siswa — padanan bagian "Pembahasan" pada halaman
 * `/hasil/<attempt>` di jalur UTBK-SNBT dan SKD.
 *
 * Halamannya berdiri sendiri, tidak ditempel ke bawah halaman hasil, karena
 * satu paket IELTS penuh berisi 80 butir beserta bacaan dan naskah rekamannya —
 * menyatukannya dengan kartu band membuat halaman yang harus digulung
 * berhalaman-halaman sebelum sampai ke angka yang paling dicari siswa.
 *
 * Aturan siapa boleh melihat apa seluruhnya diputuskan `pembahasanPengerjaan()`
 * di server; halaman ini hanya menggambar. Lihat catatannya di sana.
 */
export default async function PembahasanIeltsPage() {
  await wajibFiturLanguage();
  const user = await getSession();
  if (!user) redirect("/language/login?next=%2Flanguage%2Fielts%2Fpembahasan");

  // Pengerjaan yang sama dengan yang dibaca halaman hasil: yang sedang berjalan
  // lebih dulu, kalau tidak ada barulah yang paling akhir.
  const p =
    await pengerjaanBerjalan(user.id) ??
    (await all<PengerjaanIelts>(
      "SELECT * FROM ielts_pengerjaan WHERE user_id = ? ORDER BY started_at DESC LIMIT 1",
      user.id,
    ))[0];
  if (!p) redirect("/language/ielts");

  const paket = await paketById(p.paket_id);
  const lembar = await pembahasanPengerjaan(p);

  return (
    <>
      <HeaderLanguage />

      <main className="flex-1 px-4 pb-20 pt-10 sm:pt-14">
        <div className="masuk-language mx-auto max-w-4xl">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-[11px] font-bold text-foreground shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
              {paket?.nama ?? "IELTS"}
            </span>
            <h1 className="mt-6 text-[2rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
              Answer <span className="sorot-language">review</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
              Jawabanmu, kunci resminya, dan penjelasan pengajar untuk tiap butir. Naskah rekaman
              Listening dan bacaan Reading ikut dibuka di sini — keduanya sengaja ditahan selama
              ujian berlangsung.
            </p>
          </div>

          <LembarPembahasanIelts lembar={lembar} />

          <div className="no-print mt-10 flex flex-wrap justify-center gap-3">
            <TombolCetak label="Cetak" />
            <Link href="/language/ielts/hasil" className="btn btn-ghost font-semibold">
              Band score
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
