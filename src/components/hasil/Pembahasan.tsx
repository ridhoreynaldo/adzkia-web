"use client";

import { useMemo, useState } from "react";
import { LABEL_OPSI } from "@/lib/tryout/snbt";
import { TeksSoal } from "@/components/TeksSoal";

/** Bentuk data butir yang dikirim server (cerminan ButirPembahasan di src/lib/irt.ts). */
export interface ButirItem {
  id: number;
  subtes: string;
  nomor: number;
  tipe: string;
  level: string;
  stimulus: string | null;
  pertanyaan: string;
  gambarUrl: string | null;
  opsi: string[];
  kunci: string;
  pembahasan: string | null;
  jawaban: string | null;
  benar: boolean;
  kosong: boolean;
  pBenar: number;
}

export interface KelompokPembahasan {
  subtes: string;
  nama: string;
  butir: ButirItem[];
}

function bacaDaftar(nilai: string | null): string[] {
  if (!nilai) return [];
  try {
    const p: unknown = JSON.parse(nilai);
    if (Array.isArray(p)) return p.map(String);
  } catch {
    /* bukan JSON, lanjut ke pemisahan koma */
  }
  return nilai.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Ubah nilai jawaban/kunci jadi teks yang enak dibaca siswa. */
function tampilJawaban(tipe: string, nilai: string | null, opsi: string[]): string {
  if (nilai == null || nilai === "") return "(kosong)";
  if (tipe === "IS") return nilai;
  if (tipe === "BS") {
    const v = bacaDaftar(nilai);
    if (v.length === 0) return "(kosong)";
    return v
      .map((x, i) => `${i + 1}. ${x === "B" ? "Benar" : x === "S" ? "Salah" : "—"}`)
      .join("  |  ");
  }
  const label = tipe === "PGK" ? bacaDaftar(nilai) : [nilai.trim().toUpperCase()];
  return label
    .map((l) => {
      const idx = LABEL_OPSI.indexOf(l as (typeof LABEL_OPSI)[number]);
      const teks = idx >= 0 ? opsi[idx] : undefined;
      return teks ? `${l}. ${teks}` : l;
    })
    .join("  |  ");
}

/**
 * Daftar pembahasan seluruh butir.
 *
 * `tanpaSubtes` dipakai jalur SKD: di sana peserta memang tidak pernah
 * diberi tahu sebuah soal masuk TWK, TIU, atau TKP — sama seperti SKD
 * Kedinasan nasional — sehingga penyaring subtes dan judul pengelompokannya
 * disembunyikan dan seluruh soal disajikan sebagai satu deret bernomor urut.
 * Nilai per subtes tetap ditampilkan di bagian skor, karena ambang batasnya
 * memang dihitung per subtes.
 */
export function Pembahasan({
  kelompok,
  tanpaSubtes = false,
}: {
  kelompok: KelompokPembahasan[];
  tanpaSubtes?: boolean;
}) {
  const [hanyaSalah, setHanyaSalah] = useState(false);
  const [subtesAktif, setSubtesAktif] = useState<string>("SEMUA");
  const [terbuka, setTerbuka] = useState<Record<number, boolean>>({});

  const tersaring = useMemo(() => {
    return kelompok
      .filter((k) => subtesAktif === "SEMUA" || k.subtes === subtesAktif)
      .map((k) => ({
        ...k,
        butir: hanyaSalah ? k.butir.filter((b) => !b.benar) : k.butir,
      }))
      .filter((k) => k.butir.length > 0);
  }, [kelompok, hanyaSalah, subtesAktif]);

  const jumlahTampil = tersaring.reduce((a, k) => a + k.butir.length, 0);
  const semuaTerbuka = jumlahTampil > 0 && tersaring.every((k) => k.butir.every((b) => terbuka[b.id]));

  function bukaTutupSemua() {
    const baru: Record<number, boolean> = {};
    if (!semuaTerbuka) {
      for (const k of tersaring) for (const b of k.butir) baru[b.id] = true;
    }
    setTerbuka(baru);
  }

  return (
    <div className="card halaman-baru p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">Pembahasan Soal</h2>
          <p className="text-sm text-muted">
            Klik nomor soal untuk membuka pembahasannya. {jumlahTampil} soal ditampilkan.
          </p>
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
          <button type="button" className="btn btn-ghost !py-2 !px-3 text-sm" onClick={bukaTutupSemua}>
            {semuaTerbuka ? "Tutup semua" : "Buka semua"}
          </button>
        </div>
      </div>

      {/* Penyaring subtes — disembunyikan pada jalur yang menyembunyikan subtes. */}
      {!tanpaSubtes && (
        <div className="no-print mb-4 flex flex-wrap gap-2">
          <ChipSubtes
            label="Semua subtes"
            aktif={subtesAktif === "SEMUA"}
            onClick={() => setSubtesAktif("SEMUA")}
          />
          {kelompok.map((k) => (
            <ChipSubtes
              key={k.subtes}
              label={k.subtes}
              aktif={subtesAktif === k.subtes}
              onClick={() => setSubtesAktif(k.subtes)}
            />
          ))}
        </div>
      )}

      {jumlahTampil === 0 ? (
        <p className="rounded-xl bg-success-soft px-4 py-6 text-center text-sm font-semibold text-success">
          Mantap! Tidak ada soal yang salah pada penyaringan ini.
        </p>
      ) : (
        <div className="space-y-6">
          {tersaring.map((k) => (
            <section key={k.subtes}>
              {!tanpaSubtes && (
                <h3 className="mb-2 border-b border-line pb-1.5 text-sm font-extrabold uppercase tracking-wide text-brand">
                  {k.nama} ({k.subtes})
                </h3>
              )}
              <div className="space-y-2">
                {k.butir.map((b) => (
                  <KartuButir
                    key={b.id}
                    butir={b}
                    terbuka={!!terbuka[b.id]}
                    onToggle={() => setTerbuka((s) => ({ ...s, [b.id]: !s[b.id] }))}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ChipSubtes({ label, aktif, onClick }: { label: string; aktif: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
        aktif ? "bg-brand text-white" : "bg-surface-muted text-muted hover:bg-brand-soft hover:text-brand"
      }`}
    >
      {label}
    </button>
  );
}

function KartuButir({
  butir,
  terbuka,
  onToggle,
}: {
  butir: ButirItem;
  terbuka: boolean;
  onToggle: () => void;
}) {
  const status = butir.kosong ? "kosong" : butir.benar ? "benar" : "salah";
  const gaya =
    status === "benar"
      ? "border-success/30 bg-success-soft/50"
      : status === "salah"
        ? "border-danger/30 bg-danger-soft/50"
        : "border-line bg-surface-muted/60";

  return (
    <div className={`hindari-pecah rounded-xl border ${gaya}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={terbuka}
        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface text-xs font-extrabold">
          {butir.nomor}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-1 block text-sm font-medium">
            {butir.pertanyaan.replace(/<[^>]*>/g, " ").slice(0, 110)}
          </span>
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
          {status === "benar" ? "Benar" : status === "salah" ? "Salah" : "Kosong"}
        </span>
        <span className="shrink-0 text-xs font-bold text-muted">{butir.tipe}</span>
        <span className="no-print shrink-0 text-muted" aria-hidden="true">
          {terbuka ? "▾" : "▸"}
        </span>
      </button>

      <div className={`isi-lipat border-t border-line/70 px-3.5 py-3.5 ${terbuka ? "" : "hidden"}`}>
        {butir.stimulus && (
          <TeksSoal
            className="prose-adzkia mb-3 rounded-lg bg-surface p-3 text-sm"
            html={butir.stimulus}
          />
        )}

        <TeksSoal className="text-sm font-medium" html={butir.pertanyaan} />

        {butir.gambarUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={butir.gambarUrl}
            alt={`Gambar soal nomor ${butir.nomor}`}
            className="mt-3 max-h-64 w-auto rounded-lg border border-line"
          />
        )}

        {butir.tipe === "BS" && butir.opsi.length > 0 && (
          <ol className="mt-3 space-y-1.5 text-sm">
            {butir.opsi.map((o, i) => {
              const kunciBS = bacaDaftar(butir.kunci)[i];
              const jawabBS = bacaDaftar(butir.jawaban ?? "")[i];
              const cocok = jawabBS && kunciBS && jawabBS === kunciBS;
              return (
                <li
                  key={`${butir.id}-bs-${i}`}
                  className="flex flex-col gap-1 rounded-lg bg-surface px-2.5 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                >
                  <span className="flex min-w-0 gap-2">
                    <span className="font-bold">{i + 1}.</span>
                    <TeksSoal as="span" html={o} />
                  </span>
                  <span className="flex shrink-0 gap-2 text-xs font-bold">
                    <span className={cocok ? "text-success" : "text-danger"}>
                      Jawabanmu: {jawabBS === "B" ? "Benar" : jawabBS === "S" ? "Salah" : "—"}
                    </span>
                    <span className="text-success">
                      Kunci: {kunciBS === "B" ? "Benar" : kunciBS === "S" ? "Salah" : "—"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {butir.tipe !== "BS" && butir.opsi.length > 0 && (
          <ol className="mt-3 space-y-1 text-sm">
            {butir.opsi.map((o, i) => {
              const label = LABEL_OPSI[i] ?? String(i + 1);
              const kunciSet = butir.tipe === "PGK" ? bacaDaftar(butir.kunci) : [butir.kunci.trim().toUpperCase()];
              const jawabSet = butir.tipe === "PGK" ? bacaDaftar(butir.jawaban) : [(butir.jawaban ?? "").trim().toUpperCase()];
              const iniKunci = kunciSet.includes(label);
              const iniJawab = jawabSet.includes(label);
              return (
                <li
                  key={`${butir.id}-${label}`}
                  className={`flex gap-2 rounded-lg px-2.5 py-1.5 ${
                    iniKunci
                      ? "bg-success-soft font-semibold text-success"
                      : iniJawab
                        ? "bg-danger-soft font-semibold text-danger"
                        : ""
                  }`}
                >
                  <span className="w-5 shrink-0 font-bold">{label}.</span>
                  <TeksSoal as="span" className="flex-1" html={o} />
                  {iniKunci && <span className="shrink-0 text-[11px] font-bold">KUNCI</span>}
                  {iniJawab && !iniKunci && <span className="shrink-0 text-[11px] font-bold">JAWABANMU</span>}
                </li>
              );
            })}
          </ol>
        )}

        <dl className="mt-3 grid gap-2 rounded-lg border border-line bg-surface p-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">Jawabanmu</dt>
            <dd className={butir.benar ? "font-semibold text-success" : "font-semibold text-danger"}>
              <TeksSoal as="span" html={tampilJawaban(butir.tipe, butir.jawaban, butir.opsi)} />
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">Kunci</dt>
            <dd className="font-semibold text-success">
              <TeksSoal as="span" html={tampilJawaban(butir.tipe, butir.kunci, butir.opsi)} />
            </dd>
          </div>
        </dl>

        <div className="mt-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Pembahasan</p>
          {butir.pembahasan ? (
            <TeksSoal
              className="mt-1 text-sm"
              html={butir.pembahasan}
            />
          ) : (
            <p className="mt-1 text-sm text-muted">Pembahasan belum tersedia untuk soal ini.</p>
          )}
        </div>

        <p className="mt-3 text-[11px] text-muted">
          Level {butir.level} ·{" "}
          {butir.pBenar > 0
            ? `${Math.round(butir.pBenar * 100)}% peserta menjawab benar`
            : "belum ada data peserta lain"}
          {butir.pBenar > 0 && butir.pBenar < 0.35 ? " · butir tergolong sulit" : ""}
        </p>
      </div>
    </div>
  );
}
