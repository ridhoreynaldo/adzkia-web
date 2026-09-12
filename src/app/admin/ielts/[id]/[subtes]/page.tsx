import Link from "next/link";
import { notFound } from "next/navigation";

import { BarKelengkapan, PesanFlash, TabelScroll, TD, TH } from "@/components/admin/AdminUI";
import { IeltsSoalForm } from "@/components/admin/IeltsSoalForm";
import { ImporIeltsForm } from "@/components/admin/ImporIeltsForm";
import { TombolKonfirmasi } from "@/components/admin/TombolKonfirmasi";
import { Badge, PageHeader } from "@/components/ui";
import { wajibFiturLanguage } from "@/lib/ielts/language";
import {
  ACCEPT_AUDIO,
  BATAS_AUDIO_MB,
  LABEL_FORMAT_AUDIO,
  LABEL_TIPE,
  keSubtesIelts,
  menitPaket,
  nomorBerikut,
  paketById,
  pastikanSeksi,
  soalById,
  soalSubtes,
  subtesIelts,
} from "@/lib/ielts/ielts";

import { lepasAudioAction, simpanSeksiAction, unggahAudioAction } from "../../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; subtes: string }>;
}) {
  const { subtes } = await params;
  const s = subtesIelts(subtes);
  return { title: s ? `${s.nama} — IELTS` : "IELTS" };
}

/**
 * Isi satu subtes: bagian-bagiannya (rekaman / bacaan / tugas) lalu butirnya.
 *
 * Bagian dan butir sengaja berada di SATU halaman. Nomor soal Listening
 * mengikuti bagiannya — Recording 1 memegang nomor 1-10, Recording 2 nomor
 * 11-20, dan seterusnya — jadi admin perlu melihat keduanya sekaligus untuk
 * tahu di mana ia sedang bekerja.
 */
export default async function SubtesIeltsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; subtes: string }>;
  searchParams: Promise<{ pesan?: string; galat?: string; edit?: string }>;
}) {
  await wajibFiturLanguage();
  const { id, subtes: subtesMentah } = await params;
  const { pesan, galat, edit } = await searchParams;

  const paket = await paketById(Number(id));
  const kode = keSubtesIelts(subtesMentah);
  if (!paket || !kode) notFound();

  const def = subtesIelts(kode)!;
  const seksi = await pastikanSeksi(paket.id, kode);
  const soal = await soalSubtes(paket.id, kode);
  const jalan = `/admin/ielts/${paket.id}/${kode.toLowerCase()}`;
  const menit = (await menitPaket(paket))[kode];

  // Butir yang sedang diubah, bila admin menekan "Ubah" di daftar.
  const sedangUbah = edit ? await soalById(Number(edit)) : undefined;
  const soalDiubah =
    sedangUbah && sedangUbah.paket_id === paket.id && sedangUbah.subtes === kode
      ? sedangUbah
      : undefined;

  const pilihanSeksi = seksi.map((s) => ({
    id: s.id,
    label: s.judul || `${def.labelSeksi} ${s.nomor}`,
  }));
  const namaSeksi = new Map(pilihanSeksi.map((s) => [s.id, s.label]));

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href={`/admin/ielts/${paket.id}`} className="font-semibold text-muted hover:text-brand">
          ← {paket.nama}
        </Link>
      </p>

      <PageHeader
        title={def.nama}
        subtitle={`${menit} menit · target ${def.jumlahSoal} butir · ${def.jumlahSeksi} ${def.labelSeksi}`}
        action={<BarKelengkapan terisi={soal.length} target={def.jumlahSoal} />}
      />

      <PesanFlash pesan={pesan} galat={galat} />

      <p className="mb-6 rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted">{def.ringkas}</p>

      {/* ================= Bagian ================= */}
      <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-muted">
        {def.labelSeksi} 1–{def.jumlahSeksi}
        {def.soalPerSeksi ? ` · ${def.soalPerSeksi} butir tiap bagian` : ""}
      </h2>

      <div className="grid gap-4 lg:grid-cols-2">
        {seksi.map((s) => {
          const butirSeksi = soal.filter((x) => x.seksi_id === s.id).length;
          return (
            <section key={s.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-extrabold tracking-tight">
                  {def.labelSeksi} {s.nomor}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge tone={butirSeksi > 0 ? "brand" : "muted"}>{butirSeksi} butir</Badge>
                  {def.pakaiAudio &&
                    (s.audio_url ? (
                      <Badge tone="success">🎧 ada</Badge>
                    ) : (
                      <Badge tone="warning">🎧 kosong</Badge>
                    ))}
                </div>
              </div>

              {/* ---- Rekaman (Listening) ---- */}
              {def.pakaiAudio && (
                <div className="mt-4 rounded-xl border border-line bg-surface-muted/60 p-4">
                  {s.audio_url ? (
                    <>
                      <audio className="w-full" controls preload="none" src={s.audio_url}>
                        Peramban ini tidak bisa memutar rekaman.
                      </audio>
                      <p className="mt-2 truncate text-xs text-muted" title={s.audio_nama ?? ""}>
                        {s.audio_nama ?? s.audio_url}
                      </p>
                      <form action={lepasAudioAction} className="mt-2">
                        <input type="hidden" name="seksiId" value={s.id} />
                        <TombolKonfirmasi
                          pesan={`Lepas rekaman dari ${def.labelSeksi} ${s.nomor}? Berkasnya tetap tersimpan di server.`}
                          className="btn btn-ghost !px-3 !py-1.5 text-xs text-danger"
                        >
                          Lepas rekaman
                        </TombolKonfirmasi>
                      </form>
                    </>
                  ) : (
                    <form action={unggahAudioAction} className="space-y-2">
                      <input type="hidden" name="seksiId" value={s.id} />
                      <label className="label" htmlFor={`audio-${s.id}`}>
                        Unggah rekaman
                      </label>
                      <input
                        className="input !px-3 !py-2 text-sm"
                        id={`audio-${s.id}`}
                        name="audio"
                        type="file"
                        accept={ACCEPT_AUDIO}
                        required
                      />
                      <p className="text-xs text-muted">
                        {LABEL_FORMAT_AUDIO}, maksimal {BATAS_AUDIO_MB} MB. Diputar sekali saja saat
                        ujian.
                      </p>
                      <button className="btn btn-primary !px-3 !py-1.5 text-xs" type="submit">
                        Unggah
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* ---- Judul, instruksi, bacaan ---- */}
              <form action={simpanSeksiAction} className="mt-4 space-y-3">
                <input type="hidden" name="seksiId" value={s.id} />
                <div>
                  <label className="label" htmlFor={`judul-${s.id}`}>
                    Judul bagian
                  </label>
                  <input
                    className="input"
                    id={`judul-${s.id}`}
                    name="judul"
                    defaultValue={s.judul ?? ""}
                    placeholder={`${def.labelSeksi} ${s.nomor}`}
                  />
                </div>
                <div>
                  <label className="label" htmlFor={`instruksi-${s.id}`}>
                    Instruksi untuk siswa
                  </label>
                  <textarea
                    className="input min-h-16"
                    id={`instruksi-${s.id}`}
                    name="instruksi"
                    defaultValue={s.instruksi ?? ""}
                    placeholder="Questions 1–10. Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer."
                  />
                </div>
                {kode === "READING" && (
                  <div>
                    <label className="label" htmlFor={`bacaan-${s.id}`}>
                      Teks bacaan
                    </label>
                    <textarea
                      className="input min-h-40"
                      id={`bacaan-${s.id}`}
                      name="bacaan"
                      defaultValue={s.bacaan ?? ""}
                      placeholder="Tempel teks passage di sini."
                    />
                  </div>
                )}
                {kode !== "READING" && <input type="hidden" name="bacaan" value={s.bacaan ?? ""} />}

                {/* Transkrip hanya untuk Listening: gunanya supaya rekaman bisa
                    dibacakan guru di depan kelas ketika berkas suaranya belum
                    sempat dibuat — dan supaya naskahnya tidak tercecer. */}
                {def.pakaiAudio && (
                  <div>
                    <label className="label" htmlFor={`transkrip-${s.id}`}>
                      Naskah rekaman <span className="font-normal text-muted">(tidak dilihat siswa)</span>
                    </label>
                    <textarea
                      className="input min-h-32"
                      id={`transkrip-${s.id}`}
                      name="transkrip"
                      defaultValue={s.transkrip ?? ""}
                      placeholder="Tempel transkrip rekaman di sini. Bisa dibacakan pengawas kalau berkas suaranya belum ada."
                    />
                  </div>
                )}
                {!def.pakaiAudio && (
                  <input type="hidden" name="transkrip" value={s.transkrip ?? ""} />
                )}
                <button className="btn btn-ghost !px-3 !py-1.5 text-xs" type="submit">
                  Simpan bagian
                </button>
              </form>
            </section>
          );
        })}
      </div>

      {/* ================= Impor naskah ================= */}
      <section className="card mt-10 p-6">
        <h2 className="text-lg font-extrabold tracking-tight">Impor naskah {def.nama}</h2>
        <p className="mt-1 mb-5 text-sm text-muted">
          Unggah naskah Word atau PDF berisi soal {def.nama} — bagian, instruksi, teks bacaan,
          transkrip, butir, dan kuncinya dikenali sendiri. Isinya ditampilkan lebih dulu sebagai
          pratinjau; tidak ada yang masuk ke bank soal sebelum kamu menekan simpan.
        </p>
        <ImporIeltsForm
          paketId={paket.id}
          subtes={kode}
          namaSubtes={def.nama}
          labelSeksi={def.labelSeksi}
        />
      </section>

      {/* ================= Butir ================= */}
      <h2 className="mb-3 mt-10 text-sm font-extrabold uppercase tracking-wide text-muted">
        Butir soal ({soal.length}/{def.jumlahSoal})
      </h2>

      {soal.length === 0 ? (
        <p className="card p-6 text-center text-sm text-muted">
          Belum ada butir. Tambahkan lewat formulir di bawah.
        </p>
      ) : (
        <TabelScroll>
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-line">
                <th className={TH}>No</th>
                <th className={TH}>Bentuk</th>
                <th className={TH}>Pertanyaan</th>
                <th className={TH}>Bagian</th>
                <th className={TH}>Kunci</th>
                <th className={TH} />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {soal.map((b) => (
                <tr
                  key={b.id}
                  className={b.id === soalDiubah?.id ? "bg-brand-soft/60" : "hover:bg-surface-muted/60"}
                >
                  <td className={`${TD} font-semibold tabular-nums`}>{b.nomor}</td>
                  <td className={TD}>
                    <Badge tone="muted">{LABEL_TIPE[b.tipe]}</Badge>
                  </td>
                  <td className={`${TD} max-w-md`}>
                    <p className="line-clamp-2 text-sm">{b.pertanyaan}</p>
                  </td>
                  <td className={`${TD} text-xs text-muted`}>
                    {b.seksi_id ? (namaSeksi.get(b.seksi_id) ?? "—") : "—"}
                  </td>
                  <td className={`${TD} text-xs font-semibold`}>
                    {b.tipe === "ESAI" ? (
                      <span className="text-muted">dinilai guru</span>
                    ) : (
                      b.kunci
                    )}
                  </td>
                  <td className={TD}>
                    <Link
                      href={`${jalan}?edit=${b.id}#editor`}
                      className="btn btn-ghost !px-3 !py-1.5 text-xs"
                    >
                      Ubah
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabelScroll>
      )}

      {/* ================= Editor ================= */}
      <section id="editor" className="card mt-8 p-6">
        <h2 className="text-lg font-extrabold tracking-tight">
          {soalDiubah ? `Ubah soal nomor ${soalDiubah.nomor}` : "Tambah butir baru"}
        </h2>
        <p className="mt-1 mb-5 text-sm text-muted">
          Nomor berjalan di dalam subtes ini saja, mulai dari 1
          {def.soalPerSeksi
            ? ` — ${def.labelSeksi} 1 memegang nomor 1–${def.soalPerSeksi}, ${def.labelSeksi} 2 nomor ${def.soalPerSeksi + 1}–${def.soalPerSeksi * 2}, dan seterusnya.`
            : "."}
        </p>

        <IeltsSoalForm
          paketId={paket.id}
          subtes={kode}
          seksi={pilihanSeksi}
          tipeBawaan={def.tipeBawaan}
          nomorBawaan={await nomorBerikut(paket.id, kode)}
          batalHref={jalan}
          awal={
            soalDiubah
              ? {
                  id: soalDiubah.id,
                  nomor: soalDiubah.nomor,
                  tipe: soalDiubah.tipe,
                  pertanyaan: soalDiubah.pertanyaan,
                  opsi: (() => {
                    try {
                      const v = JSON.parse(soalDiubah.opsi);
                      return Array.isArray(v) ? v.map(String) : [];
                    } catch {
                      return [];
                    }
                  })(),
                  kunci: soalDiubah.kunci,
                  catatan: soalDiubah.catatan,
                  seksiId: soalDiubah.seksi_id,
                }
              : undefined
          }
        />
      </section>
    </>
  );
}
