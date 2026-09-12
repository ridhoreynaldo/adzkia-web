"use client";

import { useMemo, useState } from "react";

import { HURUF_PG } from "@/lib/ielts/ielts-konstanta";
import type {
  ButirPembahasan,
  KelompokPembahasanIelts,
  LembarPembahasan,
} from "@/lib/ielts/ielts-pembahasan";

/**
 * Lembar pembahasan IELTS — sisi peramban.
 *
 * Bentuknya sengaja mengikuti `<Pembahasan>` di jalur UTBK: satu baris per
 * butir yang bisa dibuka, penyaring "hanya yang salah", dan tombol buka/tutup
 * semua. Siswa yang sudah terbiasa membaca pembahasan tryout tidak perlu
 * belajar tata letak kedua.
 *
 * Yang BERBEDA, dan memang harus berbeda dari jalur UTBK:
 *
 *  · Butirnya dikelompokkan per BAGIAN (Recording 1-4, Passage 1-3), bukan
 *    hanya per subtes. Di IELTS satu bagian adalah satu bacaan atau satu
 *    rekaman, dan menelusuri jawaban tanpa tahu bagian mana yang sedang dibaca
 *    hampir mustahil.
 *  · Bacaan Reading dan NASKAH rekaman Listening ikut ditampilkan, dilipat.
 *    Selama ujian naskah itu tidak pernah dikirim ke peserta; sesudah subtesnya
 *    tutup justru naskah itulah yang menjelaskan jawabannya.
 *  · Writing dan Speaking tidak punya benar/salah. Yang diperlihatkan adalah
 *    karangan peserta sendiri — nilai gurunya sudah ada di halaman band.
 */
export function LembarPembahasanIelts({ lembar }: { lembar: LembarPembahasan }) {
  const [hanyaSalah, setHanyaSalah] = useState(false);
  const [subtesAktif, setSubtesAktif] = useState<string>("SEMUA");
  const [terbuka, setTerbuka] = useState<Record<number, boolean>>({});
  const [naskah, setNaskah] = useState<Record<number, boolean>>({});

  const terbukaSemuaSubtes = useMemo(
    () => lembar.kelompok.filter((k) => k.terbuka),
    [lembar.kelompok],
  );

  const tersaring = useMemo(() => {
    const lolos = (b: ButirPembahasan, k: KelompokPembahasanIelts) =>
      !hanyaSalah || k.dinilaiGuru || !b.benar;

    return terbukaSemuaSubtes
      .filter((k) => subtesAktif === "SEMUA" || k.kode === subtesAktif)
      .map((k) => ({
        ...k,
        bagian: k.bagian
          .map((g) => ({ ...g, butir: g.butir.filter((b) => lolos(b, k)) }))
          .filter((g) => g.butir.length > 0),
        lepas: k.lepas.filter((b) => lolos(b, k)),
      }))
      .filter((k) => k.bagian.length > 0 || k.lepas.length > 0);
  }, [terbukaSemuaSubtes, subtesAktif, hanyaSalah]);

  const semuaButir = useMemo(
    () => tersaring.flatMap((k) => [...k.bagian.flatMap((g) => g.butir), ...k.lepas]),
    [tersaring],
  );
  const semuaTerbuka = semuaButir.length > 0 && semuaButir.every((b) => terbuka[b.id]);

  function bukaTutupSemua() {
    const baru: Record<number, boolean> = {};
    if (!semuaTerbuka) for (const b of semuaButir) baru[b.id] = true;
    setTerbuka(baru);
  }

  /* ---------- keadaan yang tidak menggambar apa-apa ---------- */

  if (!lembar.dibuka) {
    return (
      <div className="card mt-9 p-8 text-center">
        <p className="text-sm font-semibold text-muted">
          Pembahasan paket ini belum dibuka pengajar. Begitu dibuka, jawabanmu beserta kuncinya
          muncul di halaman ini.
        </p>
      </div>
    );
  }

  const belumTutup = lembar.kelompok.filter((k) => !k.terbuka);

  if (terbukaSemuaSubtes.length === 0) {
    return (
      <div className="card mt-9 p-8 text-center">
        <p className="text-sm font-semibold text-muted">
          Belum ada subtes yang selesai kamu kerjakan. Pembahasan sebuah subtes baru terbuka
          sesudah subtes itu ditutup — kunci yang terbuka selagi ujiannya berjalan tidak adil bagi
          siapa pun.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-9 space-y-5">
      {/* ---------- Bilah alat ---------- */}
      <div className="card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">
              {semuaButir.length} butir ditampilkan
            </h2>
            <p className="text-sm text-muted">Ketuk sebuah butir untuk membuka pembahasannya.</p>
          </div>
          <div className="no-print flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--brand)]"
                checked={hanyaSalah}
                onChange={(e) => setHanyaSalah(e.target.checked)}
              />
              Hanya yang salah
            </label>
            <button
              type="button"
              className="btn btn-ghost !px-3 !py-2 text-sm"
              onClick={bukaTutupSemua}
            >
              {semuaTerbuka ? "Tutup semua" : "Buka semua"}
            </button>
          </div>
        </div>

        <div className="no-print mt-4 flex flex-wrap gap-2">
          <Chip
            label="Semua subtes"
            aktif={subtesAktif === "SEMUA"}
            onClick={() => setSubtesAktif("SEMUA")}
          />
          {terbukaSemuaSubtes.map((k) => (
            <Chip
              key={k.kode}
              label={
                k.dinilaiGuru ? k.nama : `${k.nama} · ${k.benar}/${k.jumlahSoal}`
              }
              aktif={subtesAktif === k.kode}
              onClick={() => setSubtesAktif(k.kode)}
            />
          ))}
        </div>

        {belumTutup.length > 0 && (
          <p className="mt-4 rounded-xl bg-surface-muted px-4 py-3 text-xs leading-relaxed text-muted">
            {belumTutup.map((k) => k.nama).join(" dan ")} belum ditutup, jadi pembahasannya masih
            ditahan. Ia muncul sendiri di sini begitu subtesnya selesai.
          </p>
        )}
      </div>

      {/* ---------- Isi ---------- */}
      {semuaButir.length === 0 ? (
        <p className="rounded-xl bg-success-soft px-4 py-6 text-center text-sm font-semibold text-success">
          Tidak ada butir yang salah pada penyaringan ini. Kerja bagus!
        </p>
      ) : (
        tersaring.map((k) => (
          <section key={k.kode} className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
              <h3 className="text-base font-extrabold tracking-tight">{k.nama}</h3>
              <p className="text-xs font-semibold text-muted">
                {k.dinilaiGuru
                  ? "Dinilai guru — tidak ada kunci jawaban"
                  : `${k.benar} benar dari ${k.jumlahSoal} butir`}
              </p>
            </div>

            <div className="mt-4 space-y-6">
              {k.bagian.map((g) => (
                <div key={g.id}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-extrabold uppercase tracking-wide text-brand">
                      {g.label}
                      {g.judul ? <span className="text-muted"> · {g.judul}</span> : null}
                    </p>
                    {(g.bacaan || g.transkrip) && (
                      <button
                        type="button"
                        className="no-print text-xs font-bold text-brand hover:underline"
                        aria-expanded={!!naskah[g.id]}
                        onClick={() => setNaskah((s) => ({ ...s, [g.id]: !s[g.id] }))}
                      >
                        {naskah[g.id]
                          ? "Sembunyikan"
                          : g.transkrip
                            ? "Baca naskah rekaman"
                            : "Baca bacaannya"}
                      </button>
                    )}
                  </div>

                  {(g.bacaan || g.transkrip) && naskah[g.id] && (
                    <div className="mb-3 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-surface-muted px-4 py-3 text-[13px] leading-relaxed">
                      {g.bacaan ?? g.transkrip}
                    </div>
                  )}

                  <div className="space-y-2">
                    {g.butir.map((b) => (
                      <KartuButirIelts
                        key={b.id}
                        butir={b}
                        dinilaiGuru={k.dinilaiGuru}
                        terbuka={!!terbuka[b.id]}
                        onToggle={() => setTerbuka((s) => ({ ...s, [b.id]: !s[b.id] }))}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {k.lepas.length > 0 && (
                <div className="space-y-2">
                  {k.lepas.map((b) => (
                    <KartuButirIelts
                      key={b.id}
                      butir={b}
                      dinilaiGuru={k.dinilaiGuru}
                      terbuka={!!terbuka[b.id]}
                      onToggle={() => setTerbuka((s) => ({ ...s, [b.id]: !s[b.id] }))}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function Chip({
  label,
  aktif,
  onClick,
}: {
  label: string;
  aktif: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
        aktif
          ? "bg-brand text-white"
          : "bg-surface-muted text-muted hover:bg-brand-soft hover:text-brand"
      }`}
    >
      {label}
    </button>
  );
}

/** Kunci isian singkat boleh memuat beberapa jawaban sah, dipisah garis tegak. */
function tampilKunci(tipe: string, kunci: string, opsi: string[]): string {
  if (!kunci.trim()) return "—";
  if (tipe === "PG") {
    const huruf = kunci.trim().toUpperCase();
    const isi = opsi[HURUF_PG.indexOf(huruf)];
    return isi ? `${huruf}. ${isi}` : huruf;
  }
  if (tipe === "IS") return kunci.split("|").map((x) => x.trim()).join("  atau  ");
  return kunci;
}

function KartuButirIelts({
  butir,
  dinilaiGuru,
  terbuka,
  onToggle,
}: {
  butir: ButirPembahasan;
  dinilaiGuru: boolean;
  terbuka: boolean;
  onToggle: () => void;
}) {
  const status = dinilaiGuru
    ? butir.kosong
      ? "kosong"
      : "esai"
    : butir.kosong
      ? "kosong"
      : butir.benar
        ? "benar"
        : "salah";

  const gaya =
    status === "benar"
      ? "border-success/30 bg-success-soft/50"
      : status === "salah"
        ? "border-danger/30 bg-danger-soft/50"
        : "border-line bg-surface-muted/60";

  const labelStatus =
    status === "benar"
      ? "Benar"
      : status === "salah"
        ? "Salah"
        : status === "esai"
          ? "Dijawab"
          : "Kosong";

  return (
    <div className={`hindari-pecah rounded-xl border ${gaya}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={terbuka}
        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface text-xs font-extrabold tabular-nums">
          {butir.nomor}
        </span>
        <span className="line-clamp-1 min-w-0 flex-1 text-sm font-medium">
          {butir.pertanyaan.replace(/<[^>]*>/g, " ").slice(0, 110)}
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
            status === "benar"
              ? "bg-success text-white"
              : status === "salah"
                ? "bg-danger text-white"
                : "bg-surface-muted text-muted"
          }`}
        >
          {labelStatus}
        </span>
        <span className="no-print shrink-0 text-muted" aria-hidden>
          {terbuka ? "▾" : "▸"}
        </span>
      </button>

      <div className={`border-t border-line/70 px-3.5 py-3.5 ${terbuka ? "" : "hidden"}`}>
        <p className="whitespace-pre-wrap text-sm font-medium">{butir.pertanyaan}</p>

        {butir.opsi.length > 0 && (
          <ul className="mt-3 space-y-1">
            {butir.opsi.map((o, i) => {
              const huruf = HURUF_PG[i] ?? String(i + 1);
              const iniKunci = butir.kunci.trim().toUpperCase() === huruf;
              const iniJawaban = butir.jawaban.trim().toUpperCase() === huruf;
              return (
                <li
                  key={i}
                  className={`rounded-lg px-3 py-1.5 text-[13px] ${
                    iniKunci
                      ? "bg-success-soft font-bold text-success"
                      : iniJawaban
                        ? "bg-danger-soft font-semibold text-danger"
                        : "text-muted"
                  }`}
                >
                  <span className="font-bold">{huruf}.</span> {o}
                  {iniKunci && <span className="ml-2 text-[11px] uppercase">kunci</span>}
                  {iniJawaban && !iniKunci && (
                    <span className="ml-2 text-[11px] uppercase">jawabanmu</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg bg-surface px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Jawabanmu</p>
            <p
              className={`mt-0.5 whitespace-pre-wrap text-sm font-semibold ${
                butir.kosong ? "text-muted" : dinilaiGuru || butir.benar ? "" : "text-danger"
              }`}
            >
              {butir.kosong ? "(kosong)" : butir.jawaban}
            </p>
          </div>
          {!dinilaiGuru && (
            <div className="rounded-lg bg-surface px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Kunci</p>
              <p className="mt-0.5 text-sm font-semibold text-success">
                {tampilKunci(butir.tipe, butir.kunci, butir.opsi)}
              </p>
            </div>
          )}
        </div>

        {butir.pembahasan && (
          <div className="mt-3 rounded-xl border border-line bg-surface px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Pembahasan</p>
            <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed">
              {butir.pembahasan}
            </p>
          </div>
        )}

        {!butir.pembahasan && !dinilaiGuru && (
          <p className="mt-3 text-xs italic text-muted">
            Pengajar belum menuliskan penjelasan untuk butir ini.
          </p>
        )}
      </div>
    </div>
  );
}
