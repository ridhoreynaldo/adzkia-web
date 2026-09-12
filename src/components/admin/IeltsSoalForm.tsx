"use client";

import { useState } from "react";

import { hapusSoalIeltsAction, simpanSoalIeltsAction, ubahSoalIeltsAction } from "@/app/admin/ielts/actions";
import { TombolKonfirmasi } from "@/components/admin/TombolKonfirmasi";
import {
  HURUF_PG,
  LABEL_TIPE,
  OPSI_TFNG,
  TIPE_SOAL_IELTS,
  type TipeSoalIelts,
} from "@/lib/ielts/ielts-konstanta";

export interface SoalAwal {
  id: number;
  nomor: number;
  tipe: TipeSoalIelts;
  pertanyaan: string;
  opsi: string[];
  kunci: string;
  catatan: string | null;
  seksiId: number | null;
}

/**
 * Editor satu butir IELTS.
 *
 * Satu komponen untuk dua pekerjaan — menambah dan mengubah — karena isiannya
 * persis sama; yang berbeda hanya aksi tujuan dan tombolnya. Bentuk isian
 * berubah mengikuti tipe butir, dan itulah alasan komponen ini harus hidup di
 * peramban: admin memilih "True/False/Not Given" lalu kolom pilihan A-D lenyap
 * seketika, tanpa memuat ulang halaman di tengah mengetik soal.
 */
export function IeltsSoalForm({
  paketId,
  subtes,
  seksi,
  tipeBawaan,
  nomorBawaan,
  awal,
  batalHref,
}: {
  paketId: number;
  subtes: string;
  seksi: { id: number; label: string }[];
  tipeBawaan: TipeSoalIelts;
  nomorBawaan: number;
  awal?: SoalAwal;
  batalHref?: string;
}) {
  const [tipe, setTipe] = useState<TipeSoalIelts>(awal?.tipe ?? tipeBawaan);
  const ubah = Boolean(awal);

  return (
    <>
      <form action={ubah ? ubahSoalIeltsAction : simpanSoalIeltsAction} className="space-y-4">
        {ubah ? (
          <input type="hidden" name="id" value={awal!.id} />
        ) : (
          <>
            <input type="hidden" name="paketId" value={paketId} />
            <input type="hidden" name="subtes" value={subtes} />
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="nomor">
              Nomor
            </label>
            <input
              className="input"
              id="nomor"
              name="nomor"
              type="number"
              min={1}
              defaultValue={awal?.nomor ?? nomorBawaan}
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="tipe">
              Bentuk soal
            </label>
            <select
              className="input"
              id="tipe"
              name="tipe"
              value={tipe}
              onChange={(e) => setTipe(e.target.value as TipeSoalIelts)}
            >
              {TIPE_SOAL_IELTS.map((t) => (
                <option key={t} value={t}>
                  {LABEL_TIPE[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="seksiId">
              Bagian
            </label>
            <select className="input" id="seksiId" name="seksiId" defaultValue={awal?.seksiId ?? 0}>
              <option value={0}>— belum ditentukan —</option>
              {seksi.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="pertanyaan">
            Pertanyaan
          </label>
          <textarea
            className="input min-h-24"
            id="pertanyaan"
            name="pertanyaan"
            defaultValue={awal?.pertanyaan ?? ""}
            placeholder={
              tipe === "IS"
                ? "The tour starts at ________ in the morning. (NO MORE THAN TWO WORDS)"
                : "Tulis pertanyaannya di sini."
            }
            required
          />
        </div>

        {tipe === "PG" && (
          <div className="grid gap-3 sm:grid-cols-2">
            {HURUF_PG.map((huruf, i) => (
              <div key={huruf}>
                <label className="label" htmlFor={`opsi${i}`}>
                  Pilihan {huruf}
                </label>
                <input
                  className="input"
                  id={`opsi${i}`}
                  name={`opsi${i}`}
                  defaultValue={awal?.opsi[i] ?? ""}
                />
              </div>
            ))}
          </div>
        )}

        {tipe !== "ESAI" && (
          <div>
            <label className="label" htmlFor="kunci">
              Kunci jawaban
            </label>
            {tipe === "TFNG" ? (
              <select className="input" id="kunci" name="kunci" defaultValue={awal?.kunci ?? "TRUE"}>
                {OPSI_TFNG.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : tipe === "PG" ? (
              <select className="input" id="kunci" name="kunci" defaultValue={awal?.kunci ?? "A"}>
                {HURUF_PG.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input
                  className="input"
                  id="kunci"
                  name="kunci"
                  defaultValue={awal?.kunci ?? ""}
                  placeholder="nine thirty|9.30"
                />
                <p className="mt-1.5 text-xs text-muted">
                  Beberapa jawaban yang sama-sama benar dipisah garis tegak (|). Huruf besar-kecil
                  dan spasi berlebih diabaikan saat menilai, tetapi ejaan tetap dihitung — sama
                  seperti IELTS asli.
                </p>
              </>
            )}
          </div>
        )}

        {tipe === "ESAI" && (
          <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted">
            Butir esai tidak dinilai mesin. Jawaban siswa disimpan utuh untuk dinilai guru dengan
            kriteria resmi IELTS.
          </p>
        )}

        <div>
          <label className="label" htmlFor="catatan">
            Catatan untuk pemeriksa (opsional)
          </label>
          <input
            className="input"
            id="catatan"
            name="catatan"
            defaultValue={awal?.catatan ?? ""}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-primary" type="submit">
            {ubah ? "Simpan Perubahan" : "Tambah Soal"}
          </button>
          {ubah && batalHref && (
            <a className="btn btn-ghost" href={batalHref}>
              Batal
            </a>
          )}
        </div>

      </form>

      {/* Formulir hapus berdiri SENDIRI, bukan di dalam formulir di atas:
          form bersarang bukan HTML yang sah, dan peramban akan membuang yang
          di dalam beserta tombolnya. */}
      {ubah && <HapusSoal id={awal!.id} nomor={awal!.nomor} />}
    </>
  );
}

/** Tombol hapus butir, dipisah supaya susunan formulirnya terbaca. */
function HapusSoal({ id, nomor }: { id: number; nomor: number }) {
  return (
    <div className="border-t border-line pt-4">
      <form action={hapusSoalIeltsAction}>
        <input type="hidden" name="id" value={id} />
        <TombolKonfirmasi
          pesan={`Hapus soal nomor ${nomor}? Jawaban siswa untuk butir ini ikut terhapus.`}
          className="btn btn-ghost !px-3 !py-1.5 text-xs text-danger"
        >
          Hapus soal ini
        </TombolKonfirmasi>
      </form>
    </div>
  );
}
