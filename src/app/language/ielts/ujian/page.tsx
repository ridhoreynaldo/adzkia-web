import Link from "next/link";
import { redirect } from "next/navigation";

import { HeaderLanguage } from "@/components/language/HeaderLanguage";
import { LayarGagalIelts } from "@/components/language/LayarGagalIelts";
import { Alert } from "@/components/ui";
import { getSession } from "@/lib/auth/auth";
import { wajibFiturLanguage } from "@/lib/ielts/language";
import {
  paketById,
  pengerjaanBerjalan,
  pengerjaanTerakhir,
  statusPortalIelts,
  statusSemuaSubtes,
} from "@/lib/ielts/ielts";

import { bukaSubtesAction } from "../actions";

export const metadata = { title: "Test Sections — IELTS" };
export const dynamic = "force-dynamic";

/** Menit:detik dari sisa waktu, untuk lencana subtes yang sedang berjalan. */
function jam(detik: number): string {
  const m = Math.floor(detik / 60);
  const d = detik % 60;
  return `${m}:${String(d).padStart(2, "0")}`;
}

/**
 * Papan pilih subtes.
 *
 * Subtes dibuka BERURUTAN — Listening, Reading, Writing, Speaking — dan yang
 * berikutnya baru terbuka setelah yang sekarang ditutup. Urutannya ditegakkan
 * di server (`bukaSubtes`), bukan sekadar disembunyikan di layar: alamat ruang
 * ujian bisa diketik langsung.
 */
export default async function PapanUjianPage({
  searchParams,
}: {
  searchParams: Promise<{ pesan?: string; galat?: string }>;
}) {
  await wajibFiturLanguage();
  const user = await getSession();
  if (!user) redirect("/language/login?next=%2Flanguage%2Fielts%2Fujian");
  if ((await statusPortalIelts()).terkunci && user.role !== "admin") redirect("/language/ielts");

  // Peserta yang ujiannya dihentikan harus MEMBACA sebabnya di sini, bukan
  // dilempar diam-diam ke halaman jalur.
  const terakhir = await pengerjaanTerakhir(user.id);
  if (terakhir?.status === "gugur") {
    return (
      <LayarGagalIelts
        pesan={terakhir.alasan_gugur ?? "Ujian IELTS kamu dihentikan karena pelanggaran."}
        namaPaket={(await paketById(terakhir.paket_id))?.nama}
        waktu={terakhir.digugurkan_at}
      />
    );
  }

  const p = await pengerjaanBerjalan(user.id);
  if (!p) redirect("/language/ielts");
  if (!p.setuju_at) redirect(`/language/ielts/rules?paket=${p.paket_id}`);

  const { pesan, galat } = await searchParams;
  const paket = await paketById(p.paket_id);
  const daftar = await statusSemuaSubtes(p);
  const tuntas = daftar.every((s) => s.keadaan === "selesai");

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
              Your <span className="sorot-language">test sections</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
              Kerjakan berurutan dari atas. Subtes berikutnya terbuka sendiri begitu yang sekarang
              kamu tutup — dan subtes yang sudah ditutup tidak bisa dibuka lagi.
            </p>
          </div>

          {(pesan || galat) && (
            <div className="mx-auto mt-8 max-w-xl space-y-3">
              {galat && <Alert tone="danger">{galat}</Alert>}
              {pesan && <Alert tone="success">{pesan}</Alert>}
            </div>
          )}

          <div className="mt-10 space-y-4">
            {daftar.map((s) => {
              const nomor = s.kode === "LISTENING" ? 1 : s.kode === "READING" ? 2 : s.kode === "WRITING" ? 3 : 4;
              return (
                <div
                  key={s.kode}
                  className={`kartu-language p-6 ${s.keadaan === "terkunci" || s.keadaan === "kosong" ? "opacity-60" : ""}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                      <span
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-extrabold ${
                          s.keadaan === "selesai"
                            ? "bg-success-soft text-success"
                            : s.keadaan === "berjalan"
                              ? "bg-brand text-white"
                              : "bg-surface-muted text-muted"
                        }`}
                      >
                        {s.keadaan === "selesai" ? "✓" : nomor}
                      </span>

                      <div className="min-w-0">
                        <h2 className="text-xl font-extrabold tracking-tight">{s.nama}</h2>
                        <p className="mt-0.5 text-[13px] text-muted">
                          {s.menit} minutes · {s.jumlahSoal} questions
                          {s.terjawab > 0 && s.keadaan !== "kosong"
                            ? ` · ${s.terjawab} terjawab`
                            : ""}
                        </p>
                        <p className="mt-2 max-w-md text-[13px] leading-snug text-muted">
                          {s.ringkas}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {s.keadaan === "selesai" && (
                        <span className="inline-flex items-center rounded-full bg-success-soft px-4 py-2 text-xs font-extrabold text-success">
                          Submitted
                        </span>
                      )}

                      {s.keadaan === "berjalan" && (
                        <Link
                          href={`/language/ielts/ujian/${s.kode.toLowerCase()}`}
                          className="btn btn-primary font-extrabold"
                        >
                          Lanjutkan · {jam(s.sisaDetik)} →
                        </Link>
                      )}

                      {s.keadaan === "siap" && (
                        <form action={bukaSubtesAction}>
                          <input type="hidden" name="subtes" value={s.kode} />
                          <button className="btn btn-primary font-extrabold" type="submit">
                            Start {s.nama} →
                          </button>
                        </form>
                      )}

                      {s.keadaan === "terkunci" && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-surface-muted px-4 py-2 text-xs font-bold text-muted">
                          🔒 Terkunci
                        </span>
                      )}

                      {s.keadaan === "kosong" && (
                        <span className="inline-flex items-center rounded-full bg-warning-soft px-4 py-2 text-xs font-bold text-warning">
                          Soal belum diisi
                        </span>
                      )}
                    </div>
                  </div>

                  {s.keadaan === "siap" && (
                    <p className="mt-4 rounded-xl bg-surface-muted px-4 py-2.5 text-xs text-muted">
                      Timer {s.menit} menit menyala begitu tombol ini ditekan dan tidak berhenti
                      walau halaman ditutup. Pastikan kamu siap.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {tuntas && (
            <div className="card mt-8 p-7 text-center">
              <h2 className="text-xl font-extrabold tracking-tight">Semua subtes selesai</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Listening dan Reading sudah dinilai mesin. Writing dan Speaking menunggu penilaian
                guru dengan kriteria resmi IELTS.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link href="/language/ielts/hasil" className="btn btn-primary font-extrabold">
                  Lihat hasil →
                </Link>
                <Link href="/language/ielts/pembahasan" className="btn btn-ghost font-semibold">
                  Pembahasan soal
                </Link>
              </div>
            </div>
          )}

          <p className="mt-10 text-center text-sm">
            <Link
              href="/language/ielts"
              className="font-semibold text-muted underline-offset-4 hover:text-brand hover:underline"
            >
              ← Halaman IELTS
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
