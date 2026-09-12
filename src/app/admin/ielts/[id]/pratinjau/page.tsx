import Link from "next/link";
import { notFound } from "next/navigation";

import { TombolCetak } from "@/components/hasil/TombolCetak";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { requireAdminIelts } from "@/lib/auth/auth";
import { wajibFiturLanguage } from "@/lib/ielts/language";
import {
  HURUF_PG,
  KODE_SUBTES_IELTS,
  LABEL_TIPE,
  OPSI_TFNG,
  keSubtesIelts,
  paketById,
  seksiPerSubtes,
  soalPerSubtes,
  subtesIelts,
  type SoalIelts,
} from "@/lib/ielts/ielts";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await paketById(Number(id));
  return { title: p ? `Pratinjau soal ${p.kode}` : "Pratinjau Soal IELTS" };
}

const SEMUA = "SEMUA";

/** Pilihan yang dibaca peserta untuk satu butir. */
function pilihan(s: SoalIelts): string[] {
  if (s.tipe === "TFNG") return OPSI_TFNG;
  if (s.tipe !== "PG") return [];
  try {
    const v = JSON.parse(s.opsi);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * Butir yang belum layak diujikan.
 *
 * Sengaja hanya memuat cacat yang PASTI — bukan dugaan: butir tanpa kunci
 * jawaban dinilai salah untuk semua orang, dan pilihan ganda tanpa opsi tidak
 * bisa dijawab sama sekali. Tuduhan yang meleset membuat pengelola berhenti
 * membaca daftar ini.
 */
function masalahButir(s: SoalIelts): string[] {
  const m: string[] = [];
  if (!s.pertanyaan.trim()) m.push("Pertanyaannya kosong.");
  if (s.tipe !== "ESAI" && !s.kunci.trim()) {
    m.push("Belum ada kunci jawaban — butir ini akan dinilai salah untuk semua peserta.");
  }
  if (s.tipe === "PG") {
    const o = pilihan(s);
    if (o.length < 2) m.push("Pilihan gandanya kurang dari dua opsi.");
    if (s.kunci.trim() && !HURUF_PG.slice(0, Math.max(o.length, 1)).includes(s.kunci.trim().toUpperCase())) {
      m.push(`Kuncinya "${s.kunci}" tidak menunjuk salah satu opsi yang ada.`);
    }
  }
  if (s.tipe === "TFNG" && s.kunci.trim() && !OPSI_TFNG.includes(s.kunci.trim().toUpperCase())) {
    m.push(`Kuncinya "${s.kunci}" bukan TRUE, FALSE, maupun NOT GIVEN.`);
  }
  return m;
}

/**
 * PRATINJAU SOAL IELTS — sepadan `/admin/paket/[id]/pratinjau` di portal
 * tryout.
 *
 * Menjawab pertanyaan "apakah naskah yang barusan diimpor benar?": seluruh
 * butir satu paket berderet apa adanya, beserta bagian, instruksi, teks
 * bacaan, dan KUNCINYA. Bukan untuk merasakan ujiannya — itu tugas
 * `/admin/ielts/[id]/simulasi`.
 *
 * Kunci tampil secara bawaan karena itulah gunanya halaman ini. `?kunci=0`
 * mematikannya, supaya lembarannya bisa dicetak untuk ditelaah guru tanpa
 * jawabannya ikut terbaca.
 */
export default async function PratinjauIeltsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ subtes?: string; kunci?: string }>;
}) {
  await wajibFiturLanguage();
  await requireAdminIelts();

  const { id } = await params;
  const sp = await searchParams;

  const paket = await paketById(Number(id));
  if (!paket) notFound();

  const diminta = String(sp.subtes ?? "").toUpperCase();
  const aktif: string = diminta === SEMUA ? SEMUA : (keSubtesIelts(diminta) ?? SEMUA);
  const tampilKunci = sp.kunci !== "0";

  // Seluruh butir dikumpulkan lebih dulu supaya lencana pada tab bisa
  // menyebutkan berapa butir dan berapa yang bermasalah tanpa membuka tabnya.
  //
  // DUA query, bukan delapan. Bentuk lamanya memanggil `soalSubtes()` dan
  // `seksiSubtes()` DI DALAM `.map()` — satu pasang query untuk tiap subtes,
  // padahal keempatnya milik paket yang sama dan bisa diambil sekali jalan.
  const seksiPeta = await seksiPerSubtes(paket.id);
  const soalPeta = await soalPerSubtes(paket.id);

  const perSubtes = KODE_SUBTES_IELTS.map((kode) => {
    const soal = soalPeta.get(kode) ?? [];
    return {
      kode,
      def: subtesIelts(kode)!,
      seksi: seksiPeta.get(kode) ?? [],
      soal,
      masalah: soal.reduce((n, s) => n + (masalahButir(s).length ? 1 : 0), 0),
    };
  });

  const totalButir = perSubtes.reduce((n, s) => n + s.soal.length, 0);
  const totalMasalah = perSubtes.reduce((n, s) => n + s.masalah, 0);
  const ditampilkan = aktif === SEMUA ? perSubtes : perSubtes.filter((s) => s.kode === aktif);

  const tautan = (kode: string, kunci = tampilKunci) =>
    `/admin/ielts/${paket.id}/pratinjau?subtes=${kode}${kunci ? "" : "&kunci=0"}`;

  return (
    <>
      <p className="no-print mb-4 text-sm">
        <Link href={`/admin/ielts/${paket.id}`} className="font-semibold text-muted hover:text-brand">
          ← {paket.nama}
        </Link>
      </p>

      <PageHeader
        title={`Pratinjau soal ${paket.kode}`}
        subtitle={`${paket.nama} — bagian, instruksi, butir, dan kuncinya dalam satu lembar`}
        action={
          <div className="no-print flex flex-wrap gap-2">
            <Link className="btn btn-ghost" href={tautan(aktif, !tampilKunci)}>
              {tampilKunci ? "Sembunyikan kunci" : "Tampilkan kunci"}
            </Link>
            <TombolCetak label="Cetak" />
            <Link className="btn btn-ghost" href={`/admin/ielts/${paket.id}/simulasi`}>
              Pratinjau ujian
            </Link>
          </div>
        }
      />

      {/* --------------------------- RINGKASAN --------------------------- */}
      <div className="card mb-6 flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Butir tersimpan</p>
          <p className="mt-1 text-lg font-extrabold tabular-nums">{totalButir}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Butir bermasalah</p>
          <p
            className={`mt-1 text-lg font-extrabold tabular-nums ${
              totalMasalah ? "text-danger" : "text-success"
            }`}
          >
            {totalMasalah}
          </p>
        </div>
        <p className="ml-auto max-w-sm text-xs text-muted">
          Yang ditandai hanya cacat yang pasti — butir tanpa kunci, atau kunci yang tidak menunjuk
          opsi mana pun. Keduanya membuat butir itu salah untuk seluruh peserta.
        </p>
      </div>

      {/* ---------------------------- TAB SUBTES ---------------------------- */}
      <div className="no-print -mx-4 mb-6 overflow-x-auto px-4">
        <div className="flex min-w-max gap-2">
          {[SEMUA as string, ...KODE_SUBTES_IELTS].map((kode) => {
            const on = kode === aktif;
            const s = perSubtes.find((x) => x.kode === kode);
            const jumlah = kode === SEMUA ? totalButir : (s?.soal.length ?? 0);
            const masalah = kode === SEMUA ? totalMasalah : (s?.masalah ?? 0);
            return (
              <Link
                key={kode}
                href={tautan(kode)}
                aria-current={on ? "page" : undefined}
                className={`rounded-xl border px-4 py-2.5 transition-colors ${
                  on ? "border-brand bg-brand-soft" : "border-line bg-surface hover:bg-surface-muted"
                }`}
              >
                <div className="flex items-baseline gap-2">
                  <span className={`text-sm font-extrabold ${on ? "text-brand" : ""}`}>
                    {kode === SEMUA ? "Semua" : (s?.def.nama ?? kode)}
                  </span>
                  <span className="text-xs font-bold tabular-nums text-muted">{jumlah}</span>
                </div>
                {masalah > 0 && (
                  <p className="mt-0.5 text-[0.7rem] font-semibold text-danger">
                    {masalah} bermasalah
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ----------------------------- DAFTAR ----------------------------- */}
      {totalButir === 0 ? (
        <EmptyState
          title="Paket ini belum berisi butir"
          description="Impor naskah Word atau PDF tiap subtes dulu, lalu kembali ke sini untuk memeriksanya butir demi butir."
          action={
            <Link className="btn btn-primary" href={`/admin/ielts/${paket.id}/listening`}>
              Kelola soal
            </Link>
          }
        />
      ) : (
        <div className="space-y-10">
          {ditampilkan.map((s) => (
            <section key={s.kode}>
              <div className="mb-3 flex flex-wrap items-baseline gap-3 border-b border-line pb-2">
                <h2 className="text-lg font-extrabold tracking-tight">{s.def.nama}</h2>
                <span className="text-xs font-semibold text-muted">
                  {s.soal.length} / {s.def.jumlahSoal} butir
                </span>
                <Link
                  className="no-print ml-auto text-xs font-semibold text-brand hover:underline"
                  href={`/admin/ielts/${paket.id}/${s.kode.toLowerCase()}`}
                >
                  Kelola soal {s.def.nama} →
                </Link>
              </div>

              {s.soal.length === 0 ? (
                <p className="rounded-xl bg-surface-muted px-4 py-5 text-sm text-muted">
                  Belum ada butir {s.def.nama} pada paket ini.
                </p>
              ) : (
                <div className="space-y-6">
                  {s.seksi.map((k) => {
                    const butir = s.soal.filter((x) => x.seksi_id === k.id);
                    if (butir.length === 0) return null;
                    return (
                      <div key={k.id} className="card p-5">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <Badge tone="brand">
                            {k.judul || `${s.def.labelSeksi} ${k.nomor}`}
                          </Badge>
                          <span className="text-xs text-muted">{butir.length} butir</span>
                          {s.def.pakaiAudio && (
                            <Badge tone={k.audio_url ? "success" : "warning"}>
                              {k.audio_url ? "🎧 rekaman ada" : "🎧 rekaman kosong"}
                            </Badge>
                          )}
                        </div>

                        {k.instruksi && (
                          <p className="mb-3 whitespace-pre-wrap rounded-xl bg-surface-muted px-4 py-3 text-sm italic">
                            {k.instruksi}
                          </p>
                        )}
                        {k.bacaan && (
                          <div className="mb-4 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line px-4 py-3 text-sm leading-relaxed">
                            {k.bacaan}
                          </div>
                        )}
                        {/* Transkrip hanya ditampilkan saat kunci ditampilkan:
                            lembar cetak tanpa kunci dipakai menelaah soal, dan
                            naskah rekaman di dalamnya sama saja dengan kunci. */}
                        {tampilKunci && k.transkrip && (
                          <details className="mb-4 rounded-xl border border-line px-4 py-2 text-sm">
                            <summary className="cursor-pointer font-semibold text-muted">
                              Naskah rekaman
                            </summary>
                            <p className="mt-2 whitespace-pre-wrap leading-relaxed">{k.transkrip}</p>
                          </details>
                        )}

                        <ol className="space-y-4">
                          {butir.map((b) => (
                            <Butir
                              key={b.id}
                              soal={b}
                              tampilKunci={tampilKunci}
                              ubahHref={`/admin/ielts/${paket.id}/${s.kode.toLowerCase()}?edit=${b.id}#editor`}
                            />
                          ))}
                        </ol>
                      </div>
                    );
                  })}

                  {/* Butir yang tidak terikat bagian mana pun. Bukan keadaan
                      normal — biasanya sisa impor yang bagiannya gagal dikenali
                      — jadi sengaja dikumpulkan sendiri supaya kelihatan. */}
                  {(() => {
                    const lepas = s.soal.filter((x) => x.seksi_id === null);
                    if (lepas.length === 0) return null;
                    return (
                      <div className="card border-warning p-5">
                        <Badge tone="warning">Tanpa {s.def.labelSeksi.toLowerCase()}</Badge>
                        <p className="mt-2 mb-3 text-xs text-muted">
                          {lepas.length} butir belum terikat {s.def.labelSeksi.toLowerCase()} mana
                          pun. Peserta tetap membacanya, tetapi tanpa instruksi maupun bacaan
                          bagiannya.
                        </p>
                        <ol className="space-y-4">
                          {lepas.map((b) => (
                            <Butir
                              key={b.id}
                              soal={b}
                              tampilKunci={tampilKunci}
                              ubahHref={`/admin/ielts/${paket.id}/${s.kode.toLowerCase()}?edit=${b.id}#editor`}
                            />
                          ))}
                        </ol>
                      </div>
                    );
                  })()}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function Butir({
  soal,
  tampilKunci,
  ubahHref,
}: {
  soal: SoalIelts;
  tampilKunci: boolean;
  ubahHref: string;
}) {
  const opsi = pilihan(soal);
  const masalah = masalahButir(soal);
  const kunci = soal.kunci.trim();

  return (
    <li className="border-t border-line pt-4 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-sm font-extrabold tabular-nums text-brand">{soal.nomor}.</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          {LABEL_TIPE[soal.tipe]}
        </span>
        {masalah.length > 0 && <Badge tone="danger">Bermasalah</Badge>}
        <Link
          className="no-print ml-auto text-xs font-semibold text-brand hover:underline"
          href={ubahHref}
        >
          Ubah butir ini →
        </Link>
      </div>

      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{soal.pertanyaan}</p>

      {opsi.length > 0 && (
        <ul className="mt-2 space-y-1">
          {opsi.map((o, i) => {
            const huruf = soal.tipe === "TFNG" ? o : HURUF_PG[i];
            const benar =
              tampilKunci &&
              kunci.toUpperCase() === String(huruf).toUpperCase();
            return (
              <li
                key={`${soal.id}-${i}`}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  benar ? "bg-success-soft font-semibold text-success" : ""
                }`}
              >
                {soal.tipe === "TFNG" ? (
                  <span>{o}</span>
                ) : (
                  <>
                    <span className="font-bold">{HURUF_PG[i] ?? "?"}.</span> {o}
                  </>
                )}
                {benar && <span className="ml-2 text-xs font-bold">← kunci</span>}
              </li>
            );
          })}
        </ul>
      )}

      {tampilKunci && (
        <p className="mt-2 text-xs">
          {soal.tipe === "ESAI" ? (
            <span className="text-muted">Dinilai guru — tidak berkunci.</span>
          ) : (
            <>
              <span className="font-semibold uppercase tracking-wide text-muted">Kunci: </span>
              <span className="font-extrabold text-success">{kunci || "—"}</span>
              {kunci.includes("|") && (
                <span className="ml-2 text-muted">
                  ({kunci.split("|").length} jawaban sama-sama sah)
                </span>
              )}
            </>
          )}
        </p>
      )}

      {tampilKunci && soal.catatan && (
        <p className="mt-1 text-xs italic text-muted">{soal.catatan}</p>
      )}

      {masalah.length > 0 && (
        <ul className="mt-2 space-y-1 rounded-xl border border-line bg-surface-muted/60 p-3 text-xs">
          {masalah.map((m) => (
            <li key={m} className="font-semibold text-danger">
              • {m}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
