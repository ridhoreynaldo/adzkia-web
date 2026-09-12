"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { simpanSoalWarungAction } from "@/app/admin/actions";
import { UnggahGambar } from "@/components/admin/UnggahGambar";
import { Alert } from "@/components/ui";
import type { AksiState } from "@/lib/admin/admin";
import type { TipeSoalWarung } from "@/lib/warung/warung";

const HURUF = ["a", "b", "c", "d", "e", "f"] as const;

export interface SoalAwal {
  id: number;
  nomor: number;
  tipe: TipeSoalWarung;
  stimulus: string;
  pertanyaan: string;
  gambar_url: string;
  opsi: string[];
  /** PG: "A". PGK: ["B","S",...]. IS: teks jawaban. */
  kunci: string | string[];
  pembahasan: string;
}

/**
 * Formulir satu butir soal Warung.
 *
 * Satu formulir melayani tiga bentuk butir sekaligus — pilihan ganda, pilihan
 * ganda kompleks Benar/Salah, dan isian singkat — karena yang berbeda di
 * antara ketiganya hanya bagian pilihan dan kuncinya. Memisahkannya jadi tiga
 * layar akan memaksa admin memilih bentuk sebelum ia sempat menulis soalnya.
 *
 * Sesudah berhasil menambah, isian dikosongkan dan nomornya naik sendiri:
 * admin biasanya mengetik banyak soal berturut-turut.
 */
export function WarungSoalForm({
  paketId,
  nomorBerikutnya,
  awal,
}: {
  paketId: number;
  nomorBerikutnya: number;
  awal?: SoalAwal;
}) {
  const [state, action, pending] = useActionState<AksiState, FormData>(simpanSoalWarungAction, {});
  const [tipe, setTipe] = useState<TipeSoalWarung>(awal?.tipe ?? "PG");
  const formRef = useRef<HTMLFormElement>(null);
  const nomorRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.ok || awal) return;
    const nomorTerakhir = Number(nomorRef.current?.value ?? nomorBerikutnya);
    formRef.current?.reset();
    if (nomorRef.current) nomorRef.current.value = String(nomorTerakhir + 1);
    formRef.current?.querySelector<HTMLTextAreaElement>("#pertanyaan")?.focus();
  }, [state, awal, nomorBerikutnya]);

  const kunciPgk = Array.isArray(awal?.kunci) ? awal.kunci : [];
  const kunciTeks = typeof awal?.kunci === "string" ? awal.kunci : "";

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <input type="hidden" name="paket_id" value={paketId} />
      {awal && <input type="hidden" name="soal_id" value={awal.id} />}

      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.ok && state.pesan && <Alert tone="success">{state.pesan}</Alert>}

      <div className="grid gap-4 sm:grid-cols-[6rem_1fr]">
        <div>
          <label className="label" htmlFor="nomor">
            Nomor
          </label>
          <input
            ref={nomorRef}
            className="input"
            id="nomor"
            name="nomor"
            type="number"
            min={1}
            defaultValue={awal?.nomor ?? nomorBerikutnya}
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
            onChange={(e) => setTipe(e.target.value as TipeSoalWarung)}
          >
            <option value="PG">Pilihan Ganda (satu jawaban)</option>
            <option value="PGK">Pilihan Ganda Kompleks (Benar/Salah)</option>
            <option value="IS">Isian Singkat</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="stimulus">
          Bacaan / pengantar <span className="font-normal text-muted">(opsional)</span>
        </label>
        <textarea
          className="input min-h-20"
          id="stimulus"
          name="stimulus"
          defaultValue={awal?.stimulus ?? ""}
          placeholder="Teks bacaan, tabel, atau data yang mendahului pertanyaan."
        />
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
          placeholder="Boleh memakai <b>, <i>, <sup>, <sub>, dan <p>."
          required
        />
      </div>

      {/* Gambarnya diunggah lebih dulu lewat /api/admin/gambar-soal; yang ikut
          formulir ini cuma alamat hasilnya. Komponennya ikut dikosongkan saat
          formulir di-reset sesudah menambah butir — lihat UnggahGambar. */}
      <UnggahGambar paket={{ jenis: "warung", id: paketId }} nilaiAwal={awal?.gambar_url ?? ""} />

      {/* ---------- Pilihan / pernyataan ---------- */}
      {tipe === "IS" ? (
        <div>
          <label className="label" htmlFor="kunci_is">
            Kunci jawaban singkat
          </label>
          <input
            className="input max-w-xs"
            id="kunci_is"
            name="kunci_is"
            defaultValue={kunciTeks}
            placeholder="mis. 12,5"
          />
          <p className="mt-1.5 text-xs text-muted">
            Perbandingannya longgar: spasi diabaikan, huruf besar-kecil disamakan, dan koma desimal
            dianggap sama dengan titik.
          </p>
        </div>
      ) : (
        <fieldset className="space-y-2">
          <legend className="label mb-1">
            {tipe === "PGK" ? "Pernyataan Benar/Salah" : "Pilihan jawaban"}
          </legend>

          {HURUF.slice(0, tipe === "PGK" ? 6 : 5).map((h, i) => (
            <div key={h} className="flex items-start gap-2">
              <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-muted text-sm font-extrabold uppercase">
                {tipe === "PGK" ? i + 1 : h}
              </span>
              <input
                className="input"
                name={`opsi_${h}`}
                defaultValue={awal?.opsi[i] ?? ""}
                placeholder={
                  tipe === "PGK"
                    ? `Pernyataan ${i + 1}${i > 2 ? " (boleh dikosongkan)" : ""}`
                    : `Pilihan ${h.toUpperCase()}${i === 4 ? " (boleh dikosongkan)" : ""}`
                }
              />
              {tipe === "PGK" && (
                <select
                  className="input w-24 shrink-0"
                  name={`kunci_bs_${h}`}
                  defaultValue={kunciPgk[i] ?? "B"}
                  aria-label={`Kunci pernyataan ${i + 1}`}
                >
                  <option value="B">Benar</option>
                  <option value="S">Salah</option>
                </select>
              )}
            </div>
          ))}

          <p className="text-xs text-muted">
            {tipe === "PGK"
              ? "Minimal dua pernyataan; pernyataan yang dikosongkan di bawah otomatis diabaikan. Butir dinilai benar hanya bila SELURUH pernyataan tepat."
              : "Minimal dua pilihan; pilihan yang dikosongkan di bawah otomatis diabaikan."}
          </p>
        </fieldset>
      )}

      {tipe === "PG" && (
        <div>
          <label className="label" htmlFor="kunci">
            Kunci
          </label>
          <select
            className="input w-28"
            id="kunci"
            name="kunci"
            defaultValue={kunciTeks || "A"}
            required
          >
            {HURUF.slice(0, 5).map((h) => (
              <option key={h} value={h.toUpperCase()}>
                {h.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label" htmlFor="pembahasan">
          Pembahasan
        </label>
        <textarea
          className="input min-h-24"
          id="pembahasan"
          name="pembahasan"
          defaultValue={awal?.pembahasan ?? ""}
          placeholder="Muncul di halaman hasil sesudah siswa menuntaskan paket."
        />
      </div>

      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : awal ? "Simpan perubahan" : "Tambah soal"}
      </button>
    </form>
  );
}
