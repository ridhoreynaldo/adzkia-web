"use client";

import { useState } from "react";

import { LABEL_OPSI, LABEL_TIPE, type TipeSoal } from "@/lib/tryout/snbt";
import type { RentangBacaan } from "@/lib/tryout/soal-tampilan";
import type { SoalUjian } from "./tipe";
import { TeksSoal } from "@/components/TeksSoal";
import { GambarSoal } from "./GambarSoal";

/** Jawaban PGK disimpan sebagai JSON array label, mis. `["A","C"]`. */
export function bacaPGK(nilai: string | null): string[] {
  if (!nilai) return [];
  try {
    const p: unknown = JSON.parse(nilai);
    if (Array.isArray(p)) return p.map((v) => String(v));
  } catch {
    return nilai
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Jawaban Benar/Salah disimpan sejajar dengan daftar pernyataan:
 * `["B","S","B"]`. Pernyataan yang belum dijawab berisi string kosong.
 */
export function bacaBS(nilai: string | null, jumlah: number): string[] {
  const kosong = Array(jumlah).fill("");
  if (!nilai) return kosong;
  try {
    const p: unknown = JSON.parse(nilai);
    if (Array.isArray(p)) {
      const v = p.map((x) => String(x).trim().toUpperCase());
      return kosong.map((_, i) => (v[i] === "B" || v[i] === "S" ? v[i] : ""));
    }
  } catch {
    /* format lama/tak terbaca: anggap belum dijawab */
  }
  return kosong;
}

function tulisBS(nilai: string[]): string | null {
  return nilai.some((v) => v === "B" || v === "S") ? JSON.stringify(nilai) : null;
}

function tulisPGK(labels: string[]): string | null {
  const urut = LABEL_OPSI.filter((l) => labels.includes(l));
  return urut.length === 0 ? null : JSON.stringify(urut);
}

interface Props {
  soal: SoalUjian;
  indeks: number;
  total: number;
  nilai: string | null;
  ragu: boolean;
  terkunci: boolean;
  /** Rentang soal yang berbagi bacaan ini; null bila bacaannya milik soal ini saja. */
  rentangBacaan?: RentangBacaan | null;
  onJawab: (nilai: string | null) => void;
  onRagu: (ragu: boolean) => void;
}

export function KartuSoal({
  soal,
  indeks,
  total,
  nilai,
  ragu,
  terkunci,
  rentangBacaan = null,
  onJawab,
  onRagu,
}: Props) {
  const namaGrup = `soal-${soal.id}`;
  // Bacaan yang BARU dibuka pada bacaannya; soal lanjutan yang memakai bacaan
  // sama langsung dibuka pada pertanyaannya, karena peserta baru saja
  // membacanya dan yang ia cari sekarang adalah soalnya.
  const [tab, setTab] = useState<"bacaan" | "soal">(
    rentangBacaan && !rentangBacaan.pertama ? "soal" : "bacaan",
  );
  const terpilihPGK = soal.tipe === "PGK" ? bacaPGK(nilai) : [];
  // Naskah soal berupa gambar: teks pilihan ada di dalam gambar, jadi yang
  // ditampilkan cukup tombol huruf A-E yang besar dan mudah ditekan.
  const pilihanDiGambar =
    !!soal.gambar_url && soal.opsi.length > 0 && soal.opsi.every((o) => !o.trim());
  const terpilihBS = soal.tipe === "BS" ? bacaBS(nilai, soal.opsi.length) : [];

  const badanSoal = (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-brand px-2 text-sm font-extrabold text-white">
            {soal.nomor}
          </span>
          <span className="text-xs font-semibold text-muted">
            Soal {indeks + 1} dari {total}
          </span>
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-muted">
            {LABEL_TIPE[soal.tipe as TipeSoal] ?? "Pilihan Ganda"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onRagu(!ragu)}
          disabled={terkunci}
          aria-pressed={ragu}
          className={`btn !py-1.5 !px-3 text-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
            ragu ? "btn-accent" : "btn-ghost"
          }`}
        >
          {ragu ? "★ Ditandai ragu-ragu" : "☆ Ragu-ragu"}
        </button>
      </div>

      <TeksSoal html={soal.pertanyaan} className="text-[15px]" />

      {soal.gambar_url && <GambarSoal src={soal.gambar_url} nomor={soal.nomor} />}

      <div className="mt-5">
        {soal.tipe === "BS" ? (
          <fieldset disabled={terkunci}>
            <legend className="sr-only">
              Tentukan Benar atau Salah untuk setiap pernyataan
            </legend>
            <p className="mb-2 text-xs font-semibold text-accent">
              Tentukan Benar atau Salah untuk SETIAP pernyataan.
            </p>
            <ul className="space-y-2">
              {soal.opsi.map((teks, i) => {
                const dipilih = terpilihBS[i] ?? "";
                return (
                  <li
                    key={`${namaGrup}-bs-${i}`}
                    className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                  >
                    <span className="flex min-w-0 gap-2">
                      <span className="font-bold text-brand">{i + 1}.</span>
                      <TeksSoal as="span" html={teks} />
                    </span>
                    <span className="flex shrink-0 gap-2" role="group" aria-label={`Pernyataan ${i + 1}`}>
                      {(["B", "S"] as const).map((v) => {
                        const id = `${namaGrup}-bs-${i}-${v}`;
                        const aktif = dipilih === v;
                        return (
                          <label
                            key={id}
                            htmlFor={id}
                            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-bold transition
                              has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand has-[:focus-visible]:ring-offset-2
                              ${
                                aktif
                                  ? v === "B"
                                    ? "border-success bg-success-soft text-success"
                                    : "border-danger bg-danger-soft text-danger"
                                  : "border-line bg-surface text-muted hover:bg-surface-muted"
                              }`}
                          >
                            <input
                              id={id}
                              name={`${namaGrup}-bs-${i}`}
                              type="radio"
                              className="sr-only"
                              checked={aktif}
                              onChange={() => {
                                const baru = [...terpilihBS];
                                baru[i] = v;
                                onJawab(tulisBS(baru));
                              }}
                              onClick={() => {
                                if (aktif) {
                                  const baru = [...terpilihBS];
                                  baru[i] = "";
                                  onJawab(tulisBS(baru));
                                }
                              }}
                            />
                            {v === "B" ? "Benar" : "Salah"}
                          </label>
                        );
                      })}
                    </span>
                  </li>
                );
              })}
            </ul>
            {soal.opsi.length === 0 && (
              <p className="text-sm text-danger">Pernyataan belum tersedia untuk soal ini.</p>
            )}
          </fieldset>
        ) : pilihanDiGambar ? (
          <fieldset disabled={terkunci}>
            <legend className="mb-2 text-xs font-semibold text-muted">
              Pilih jawaban sesuai huruf pada gambar soal di atas
            </legend>
            <div className="flex flex-wrap gap-2">
              {soal.opsi.map((_, i) => {
                const label = LABEL_OPSI[i] ?? String(i + 1);
                const id = `${namaGrup}-g-${label}`;
                const dipilih = nilai === label;
                return (
                  <label
                    key={id}
                    htmlFor={id}
                    aria-label={`Pilihan ${label}`}
                    className={`grid size-14 cursor-pointer place-items-center rounded-xl border text-lg font-extrabold transition
                      has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand has-[:focus-visible]:ring-offset-2
                      ${dipilih ? "border-brand bg-brand text-white" : "border-line bg-surface text-foreground hover:bg-surface-muted"}`}
                  >
                    <input
                      id={id}
                      name={namaGrup}
                      type="radio"
                      className="sr-only"
                      checked={dipilih}
                      onChange={() => onJawab(label)}
                      onClick={() => {
                        if (dipilih) onJawab(null);
                      }}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : soal.tipe === "IS" ? (
          <div>
            <label className="label" htmlFor={`${namaGrup}-isian`}>
              Jawaban singkat kamu
            </label>
            <input
              id={`${namaGrup}-isian`}
              type="text"
              inputMode="text"
              autoComplete="off"
              className="input max-w-sm"
              placeholder="Tulis jawabanmu di sini"
              value={nilai ?? ""}
              disabled={terkunci}
              onChange={(e) => onJawab(e.target.value === "" ? null : e.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted">
              Tulis angka atau kata saja, tanpa satuan dan tanpa kalimat.
            </p>
          </div>
        ) : (
          <fieldset disabled={terkunci}>
            <legend className="sr-only">
              {soal.tipe === "PGK"
                ? "Pilih satu atau lebih jawaban"
                : "Pilih satu jawaban"}
            </legend>
            {soal.tipe === "PGK" && (
              <p className="mb-2 text-xs font-semibold text-accent">
                Boleh pilih lebih dari satu jawaban.
              </p>
            )}
            <ul className="space-y-2">
              {soal.opsi.map((teks, i) => {
                const label = LABEL_OPSI[i] ?? String(i + 1);
                const id = `${namaGrup}-${label}`;
                const dipilih =
                  soal.tipe === "PGK" ? terpilihPGK.includes(label) : nilai === label;
                return (
                  <li key={id}>
                    <label
                      htmlFor={id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition
                        has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand has-[:focus-visible]:ring-offset-2
                        ${dipilih ? "border-brand bg-brand-soft" : "border-line bg-surface hover:bg-surface-muted"}`}
                    >
                      <input
                        id={id}
                        name={namaGrup}
                        type={soal.tipe === "PGK" ? "checkbox" : "radio"}
                        className="mt-1 h-4 w-4 accent-[var(--brand)]"
                        checked={dipilih}
                        onChange={(e) => {
                          if (soal.tipe === "PGK") {
                            const set = new Set(terpilihPGK);
                            if (e.target.checked) set.add(label);
                            else set.delete(label);
                            onJawab(tulisPGK([...set]));
                          } else {
                            onJawab(dipilih ? null : label);
                          }
                        }}
                        onClick={() => {
                          // Klik ulang pada radio yang sama = batalkan pilihan.
                          if (soal.tipe === "PG" && dipilih) onJawab(null);
                        }}
                      />
                      <span className="flex min-w-0 gap-2">
                        <span className="font-bold text-brand">{label}.</span>
                        <TeksSoal as="span" html={teks} />
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {soal.opsi.length === 0 && (
              <p className="text-sm text-danger">Opsi jawaban belum tersedia untuk soal ini.</p>
            )}
          </fieldset>
        )}
      </div>
    </div>
  );

  if (!soal.stimulus) {
    return <div className="card p-5 sm:p-6">{badanSoal}</div>;
  }

  const idBacaan = `bacaan-${soal.id}`;
  const idSoal = `soal-panel-${soal.id}`;

  return (
    <div>
      {/* ---------- Tab Bacaan | Soal (layar kecil saja) ----------
          Di ponsel, bacaan literasi bisa setinggi beberapa layar penuh, dan
          dulu pertanyaannya baru muncul sesudah semua itu digulung habis —
          untuk SETIAP soal yang memakai bacaan sama. Dua tab membuat keduanya
          sama-sama selebar layar dan selalu sejauh satu ketukan, tanpa gulir
          di dalam gulir. Layar besar tidak berubah: bacaan dan soal tetap
          berdampingan, jadi tab ini disembunyikan di sana. */}
      <div
        role="tablist"
        aria-label="Bagian soal"
        className="mb-3 flex gap-1 rounded-xl bg-surface-muted p-1 lg:hidden"
      >
        <button
          type="button"
          role="tab"
          id={`${idBacaan}-tab`}
          aria-selected={tab === "bacaan"}
          aria-controls={idBacaan}
          onClick={() => setTab("bacaan")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
            tab === "bacaan" ? "bg-surface text-brand shadow-sm" : "text-muted"
          }`}
        >
          Bacaan
        </button>
        <button
          type="button"
          role="tab"
          id={`${idSoal}-tab`}
          aria-selected={tab === "soal"}
          aria-controls={idSoal}
          onClick={() => setTab("soal")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
            tab === "soal" ? "bg-surface text-brand shadow-sm" : "text-muted"
          }`}
        >
          Pertanyaan
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        {/* Kedua panel tetap terpasang dan hanya disembunyikan lewat CSS, supaya
            berpindah tab tidak menyetel ulang gulirannya maupun jawaban yang
            sedang diketik, dan supaya markah server sama dengan markah klien.

            `min-w-0` pada KEDUA panel wajib ada. Anak sebuah grid berlebar
            `auto`, jadi tanpa itu tabel lebar di dalam bacaan tidak menggulung
            di dalam pembungkus `.tabel-soal` melainkan MELEBARKAN panelnya.
            Terukur 2 September 2026 pada PM nomor 9 di layar 375 px: panel
            bacaan melar jadi 731 px, halaman ikut meluap 368 px, dan bilah
            tombol bawah yang `fixed inset-x-0` ikut melar sampai 743 px —
            peserta harus menggeser mendatar untuk menemukan tombol jawabannya. */}
        <aside
          id={idBacaan}
          role="tabpanel"
          aria-labelledby={`${idBacaan}-tab`}
          className={`card min-w-0 p-5 sm:p-6 lg:max-h-[calc(100dvh-15rem)] lg:overflow-y-auto lg:block ${
            tab === "bacaan" ? "" : "hidden"
          }`}
        >
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
            Bacaan
            {rentangBacaan && (
              // Spasi sebelum <span> ditulis eksplisit: `ml-1.5` hanya memberi
              // jarak yang TERLIHAT, sedangkan pembaca layar membaca teksnya
              // menyatu menjadi "Bacaanuntuk soal 1-3".
              <>
                {" "}
                <span className="font-semibold normal-case tracking-normal text-brand">
                  untuk soal {rentangBacaan.dari}–{rentangBacaan.sampai}
                </span>
              </>
            )}
          </h3>
          <TeksSoal html={soal.stimulus} className="text-[15px]" />
        </aside>

        <div
          id={idSoal}
          role="tabpanel"
          aria-labelledby={`${idSoal}-tab`}
          className={`card min-w-0 p-5 sm:p-6 lg:max-h-[calc(100dvh-15rem)] lg:overflow-y-auto lg:block ${
            tab === "soal" ? "" : "hidden"
          }`}
        >
          {badanSoal}
        </div>
      </div>
    </div>
  );
}
