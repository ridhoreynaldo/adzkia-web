import Link from "next/link";
import { notFound } from "next/navigation";

import { PesanFlash } from "@/components/admin/AdminUI";
import { Badge, PageHeader } from "@/components/ui";
import { one } from "@/lib/core/db";
import { wajibFiturLanguage } from "@/lib/ielts/language";
import {
  KRITERIA_SPEAKING,
  KRITERIA_WRITING,
  bagianNilai,
  bandKeseluruhan,
  bandLengkap,
  hasilPengerjaan,
  jawabanEsai,
  kriteriaSubtes,
  labelBagianNilai,
  nilaiGuruPengerjaan,
  paketById,
  pengerjaanById,
  sebutanBand,
  subtesBelumBerband,
} from "@/lib/ielts/ielts";

import { hapusNilaiGuruAction, simpanNilaiGuruAction } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Penilaian Writing & Speaking — IELTS" };

/** Pilihan band yang boleh diberikan guru: 0 sampai 9, setengah demi setengah. */
const PILIHAN_BAND = Array.from({ length: 19 }, (_, i) => i / 2);

/**
 * Penilaian guru untuk Writing dan Speaking milik satu peserta.
 *
 * Dua subtes ini tidak punya kunci jawaban, jadi bandnya harus datang dari
 * manusia. Halaman ini menaruh jawaban siswa dan empat kriteria resmi IELTS
 * berdampingan, supaya guru menilai sambil membaca — bukan mengingat.
 *
 * Angka yang diketik guru adalah band TIAP KRITERIA (0-9, boleh setengah).
 * Band bagiannya dihitung aplikasi sebagai rata-rata keempatnya, dan band
 * Writing menggabungkan Task 1 dan Task 2 dengan bobot 1 : 2 seperti IELTS
 * asli. Guru tidak pernah diminta menghitung apa pun.
 */
export default async function NilaiIeltsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pesan?: string; galat?: string }>;
}) {
  await wajibFiturLanguage();
  const { id } = await params;
  const { pesan, galat } = await searchParams;

  const p = await pengerjaanById(Number(id));
  if (!p) notFound();
  const paket = await paketById(p.paket_id);
  const siswa = await one<{ nama: string; nisn: string | null; kelas: string | null }>(
    "SELECT nama, nisn, kelas FROM users WHERE id = ?",
    p.user_id,
  );

  const hasil = await hasilPengerjaan(p);
  const nilai = await nilaiGuruPengerjaan(p.id);
  const band = bandKeseluruhan(hasil);
  const lengkap = bandLengkap(hasil);
  const belum = subtesBelumBerband(hasil);

  const petaNilai = new Map(nilai.map((n) => [`${n.subtes}#${n.bagian}`, n]));

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={`/admin/ielts/${p.paket_id}`}
          className="font-semibold text-muted hover:text-brand"
        >
          ← {paket?.nama ?? "Paket IELTS"}
        </Link>
      </p>

      <PageHeader
        title={siswa?.nama ?? `Peserta #${p.user_id}`}
        subtitle={[siswa?.nisn, siswa?.kelas, paket?.kode].filter(Boolean).join(" · ")}
        action={
          <div className="text-right">
            <p className="text-3xl font-extrabold tracking-tight text-brand">
              {band === null ? "—" : band.toFixed(1)}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              {lengkap ? "Overall band" : "Band sementara"}
            </p>
          </div>
        }
      />

      <PesanFlash pesan={pesan} galat={galat} />

      {/* ---------- Empat subtes sekilas ---------- */}
      <section className="card mb-8 p-5">
        <div className="grid gap-3 sm:grid-cols-4">
          {hasil.map((h) => (
            <div key={h.kode} className="rounded-xl bg-surface-muted px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{h.nama}</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">
                {h.band === null ? "—" : h.band.toFixed(1)}
              </p>
              <p className="text-[11px] text-muted">
                {h.dinilaiGuru
                  ? h.band === null
                    ? "menunggu penilaian"
                    : sebutanBand(h.band)
                  : `${h.benar}/${h.jumlahSoal} benar`}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">
          {lengkap ? (
            <>
              Keempat subtes sudah punya band. Overall band {band?.toFixed(1)} —{" "}
              {sebutanBand(band)} — dihitung dari rata-rata keempatnya, dibulatkan ke setengah band
              terdekat sesuai aturan IELTS.
            </>
          ) : (
            <>
              Overall band masih sementara: {belum.join(" dan ")} belum punya band, jadi belum ikut
              dirata-rata.
            </>
          )}
        </p>
      </section>

      {/* ---------- Writing & Speaking ---------- */}
      {await Promise.all((["WRITING", "SPEAKING"] as const).map(async (subtes) => {
        const jawaban = await jawabanEsai(p, subtes);
        const kriteria = kriteriaSubtes(subtes);
        const h = hasil.find((x) => x.kode === subtes)!;

        return (
          <section key={subtes} className="mb-10">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold tracking-tight">{h.nama}</h2>
              <Badge tone={h.band === null ? "warning" : "success"}>
                {h.band === null ? "Belum dinilai" : `Band ${h.band.toFixed(1)}`}
              </Badge>
            </div>

            {jawaban.length === 0 ? (
              <p className="card p-6 text-center text-sm text-muted">
                Soal {h.nama} belum diisi pengelola, jadi tidak ada yang bisa dinilai.
              </p>
            ) : (
              <div className="space-y-5">
                {bagianNilai(subtes).map((bagian) => {
                  const n = petaNilai.get(`${subtes}#${bagian}`);
                  // Writing dinilai per task, jadi hanya jawaban task itu yang
                  // ditampilkan. Speaking dinilai sekaligus: seluruh part-nya
                  // tampil bersama satu set kriteria.
                  const butir =
                    subtes === "WRITING"
                      ? jawaban.filter((j) => (j.seksiNomor ?? j.nomor) === bagian)
                      : jawaban;

                  return (
                    <div key={bagian} className="card p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-base font-extrabold tracking-tight">
                          {labelBagianNilai(subtes, bagian)}
                          {subtes === "WRITING" && (
                            <span className="ml-2 text-xs font-semibold text-muted">
                              bobot {bagian === 2 ? "2×" : "1×"}
                            </span>
                          )}
                        </h3>
                        {n?.band != null && (
                          <Badge tone="brand">Band bagian ini {n.band.toFixed(1)}</Badge>
                        )}
                      </div>

                      {/* Jawaban siswa */}
                      <div className="mt-4 space-y-4">
                        {butir.map((j) => (
                          <div key={j.nomor}>
                            <p className="text-sm font-semibold">
                              {j.nomor}. {j.pertanyaan}
                            </p>
                            <div className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-surface-muted/50 p-4 text-sm leading-relaxed">
                              {j.jawaban.trim() || (
                                <span className="text-muted">— tidak dijawab —</span>
                              )}
                            </div>
                            <p className="mt-1 text-[11px] text-muted">
                              {j.jawaban.trim() ? j.jawaban.trim().split(/\s+/).length : 0} kata
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Kriteria */}
                      <form action={simpanNilaiGuruAction} className="mt-6 border-t border-line pt-5">
                        <input type="hidden" name="pengerjaanId" value={p.id} />
                        <input type="hidden" name="subtes" value={subtes} />
                        <input type="hidden" name="bagian" value={bagian} />

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          {kriteria.map((k) => (
                            <div key={k.kode}>
                              <label className="label" htmlFor={`${subtes}-${bagian}-${k.kode}`}>
                                {k.nama}
                              </label>
                              <select
                                className="input"
                                id={`${subtes}-${bagian}-${k.kode}`}
                                name={`nilai_${k.kode}`}
                                defaultValue={n?.nilai[k.kode]?.toString() ?? ""}
                              >
                                <option value="">— belum —</option>
                                {PILIHAN_BAND.map((b) => (
                                  <option key={b} value={b}>
                                    {b.toFixed(1)}
                                  </option>
                                ))}
                              </select>
                              <p className="mt-1 text-[11px] leading-snug text-muted">{k.ket}</p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4">
                          <label className="label" htmlFor={`catatan-${subtes}-${bagian}`}>
                            Catatan untuk siswa
                          </label>
                          <textarea
                            className="input min-h-20"
                            id={`catatan-${subtes}-${bagian}`}
                            name="catatan"
                            defaultValue={n?.catatan ?? ""}
                            placeholder="Misalnya: paragrafnya sudah runtut, tetapi contohnya kurang. Perbaiki bentuk lampau."
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <button className="btn btn-primary" type="submit">
                            Simpan penilaian
                          </button>
                          {n && (
                            <span className="text-xs text-muted">
                              Terakhir disimpan {n.diperbarui_at}
                              {n.oleh_nama ? ` oleh ${n.oleh_nama}` : ""}
                            </span>
                          )}
                        </div>
                      </form>

                      {n && (
                        <form action={hapusNilaiGuruAction} className="mt-3">
                          <input type="hidden" name="pengerjaanId" value={p.id} />
                          <input type="hidden" name="subtes" value={subtes} />
                          <input type="hidden" name="bagian" value={bagian} />
                          <button className="btn btn-ghost !px-3 !py-1.5 text-xs text-danger" type="submit">
                            Hapus penilaian bagian ini
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      }))}

      {/* ---------- Pengingat kriteria ---------- */}
      <section className="card p-6">
        <h2 className="text-sm font-extrabold tracking-tight">Kriteria resmi IELTS</h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted">Writing</h3>
            <ul className="mt-2 space-y-1.5 text-xs">
              {KRITERIA_WRITING.map((k) => (
                <li key={k.kode}>
                  <span className="font-semibold">{k.nama}</span> — {k.ket}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted">
              Band Writing = (Task 1 + 2 × Task 2) ÷ 3, dibulatkan ke setengah band.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted">Speaking</h3>
            <ul className="mt-2 space-y-1.5 text-xs">
              {KRITERIA_SPEAKING.map((k) => (
                <li key={k.kode}>
                  <span className="font-semibold">{k.nama}</span> — {k.ket}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted">
              Speaking dinilai sekali untuk seluruh wawancara, sama seperti IELTS asli.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
