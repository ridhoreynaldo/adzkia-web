"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { imporSoalAction, type ImporState } from "@/app/admin/actions";
import { TabelScroll, TD, TH } from "@/components/admin/AdminUI";
import { Alert, Badge } from "@/components/ui";
import { SUBTES_SKD } from "@/lib/tryout/skd";
import { SUBTES } from "@/lib/tryout/snbt";

function ringkas(teks: string, panjang = 70): string {
  const v = (teks ?? "").replace(/\s+/g, " ").trim();
  if (!v) return "—";
  return v.length > panjang ? `${v.slice(0, panjang)}…` : v;
}

/**
 * Tiga cara menomori soal yang masuk.
 *
 * Bawaannya "lanjut", karena naskah dari guru datang bertahap dan hampir selalu
 * kembali bernomor 1 di tiap berkas. Dua mode lainnya tetap ada untuk berkas
 * Excel yang penomorannya memang sudah benar dan untuk memperbaiki soal lama.
 */
const MODE_IMPOR = [
  {
    nilai: "lanjut",
    judul: "Tambahkan sebagai lanjutan",
    ket:
      "Nomor di berkas diabaikan; tiap soal mengisi nomor kosong terkecil di subtesnya. " +
      "Pakai ini untuk mengunggah satu subtes secara bertahap — 20 soal PU dulu, 10 sisanya menyusul. " +
      "Soal yang isinya sudah ada di paket otomatis dilewati, jadi berkas yang keunggah dua kali tidak menggandakan soal.",
  },
  {
    nilai: "berkas",
    judul: "Ikuti nomor di berkas",
    ket: "Nomor diambil apa adanya. Nomor yang sudah terpakai dilewati.",
  },
  {
    nilai: "timpa",
    judul: "Ikuti nomor berkas & timpa",
    ket: "Sama seperti di atas, tetapi soal lama dengan nomor yang sama ditulis ulang. Untuk membetulkan naskah yang sudah telanjur masuk.",
  },
] as const;

export function ImporForm({ packageId, kodePaket }: { packageId: number; kodePaket: string }) {
  const [state, action, pending] = useActionState<ImporState, FormData>(imporSoalAction, {});
  const [adaBerkas, setAdaBerkas] = useState(false);
  const [mode, setMode] = useState<string>(state.mode ?? "lanjut");

  const hasil = state.hasil;
  const bisaSimpan = !!hasil && !state.selesai && hasil.jumlahValid > 0;
  const modeLanjut = hasil?.modeNomor === "lanjut";
  const rekap = (hasil?.rekapSubtes ?? []).filter((r) => r.kuota > 0);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="package_id" value={packageId} />

      <div className="card space-y-4 p-5">
        <div className="flex flex-wrap gap-3">
          <a className="btn btn-ghost" href="/api/admin/template" download>
            ⬇ Unduh template .xlsx
          </a>
          <a className="btn btn-ghost" href={`/api/admin/export/${packageId}`} download>
            ⬆ Ekspor soal paket {kodePaket}
          </a>
        </div>
        <p className="text-xs text-muted">
          Template berisi sheet <strong>Soal</strong> (judul kolom + satu baris contoh) dan sheet{" "}
          <strong>Petunjuk</strong>. Hapus baris contoh sebelum mengunggah.
        </p>
        <p className="rounded-xl bg-brand-soft px-4 py-3 text-xs leading-relaxed text-brand-strong">
          <strong className="block">Punya naskah Word? Unggah langsung.</strong>
          Berkas <strong>.docx</strong> dibaca apa adanya — judul subtes, penomoran soal, pilihan
          A&ndash;E, baris <em>Kunci:</em> dan <em>Pembahasan:</em> dikenali sendiri, termasuk
          gambar yang menempel di soal. Aturan penulisannya ada di panel sebelah.
        </p>
      </div>

      <div className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="berkas">
            Berkas soal (.docx, .xlsx, atau .csv)
          </label>
          <input
            className="input file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand"
            id="berkas"
            name="berkas"
            type="file"
            accept=".docx,.xlsx,.csv,.txt"
            required
            onChange={(e) => setAdaBerkas((e.target.files?.length ?? 0) > 0)}
          />
        </div>

        <div>
          <label className="label" htmlFor="subtes_bawaan">
            Subtes naskah Word ini
          </label>
          <select
            className="input"
            id="subtes_bawaan"
            name="subtes_bawaan"
            defaultValue={state.subtesBawaan ?? ""}
          >
            <option value="">Ikuti judul di dalam naskah</option>
            <optgroup label="UTBK-SNBT">
              {SUBTES.map((x) => (
                <option key={x.kode} value={x.kode}>
                  {x.kode} — {x.namaPendek}
                </option>
              ))}
            </optgroup>
            <optgroup label="SKD Kedinasan">
              {SUBTES_SKD.map((x) => (
                <option key={x.kode} value={x.kode}>
                  {x.kode} — {x.nama}
                </option>
              ))}
            </optgroup>
          </select>
          <p className="mt-1 text-xs text-muted">
            Untuk naskah per guru yang seluruhnya berisi satu subtes dan tidak memuat judul bagian.
            Judul yang ada <em>di dalam</em> naskah tetap menang. Berkas Excel/CSV tidak terpengaruh.
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="label">Penomoran soal</legend>
          {MODE_IMPOR.map((m) => (
            <label
              key={m.nilai}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${
                mode === m.nilai ? "border-brand bg-brand-soft" : "border-line"
              }`}
            >
              <input
                type="radio"
                name="mode"
                value={m.nilai}
                checked={mode === m.nilai}
                onChange={(e) => setMode(e.target.value)}
                className="mt-0.5 size-4 accent-[var(--brand)]"
              />
              <span>
                <span className="font-semibold">{m.judul}</span>
                <span className="block text-xs text-muted">{m.ket}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <button className="btn btn-primary" type="submit" disabled={pending || !adaBerkas}>
          {pending ? "Memproses…" : "Baca & pratinjau"}
        </button>
      </div>

      {state.error && <Alert tone="danger">{state.error}</Alert>}

      {(hasil?.catatan?.length ?? 0) > 0 && (
        <Alert tone="warning">
          <p className="font-semibold">Perlu kamu periksa sendiri</p>
          <ul className="mt-1.5 space-y-1 text-xs">
            {hasil?.catatan?.slice(0, 12).map((c, i) => (
              <li key={i}>&bull; {c}</li>
            ))}
            {(hasil?.catatan?.length ?? 0) > 12 && (
              <li className="opacity-70">&bull; …dan {(hasil?.catatan?.length ?? 0) - 12} catatan lain.</li>
            )}
          </ul>
        </Alert>
      )}
      {state.pesan && !state.error && (
        <Alert tone={state.selesai ? "success" : "brand"}>{state.pesan}</Alert>
      )}

      {state.selesai && (
        <div className="flex flex-wrap gap-3">
          <Link className="btn btn-primary" href={`/admin/paket/${packageId}/soal`}>
            Lihat bank soal
          </Link>
        </div>
      )}

      {hasil && hasil.baris.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
            <h2 className="text-sm font-bold">
              Pratinjau {state.namaFile ? `— ${state.namaFile}` : ""}
            </h2>
            <div className="flex flex-wrap gap-2">
              <Badge tone="success">{hasil.jumlahValid} baris siap</Badge>
              {hasil.jumlahGalat > 0 && <Badge tone="danger">{hasil.jumlahGalat} bermasalah</Badge>}
              {hasil.jumlahKembar > 0 && (
                <Badge tone="warning">{hasil.jumlahKembar} sudah ada di paket</Badge>
              )}
              {hasil.jumlahBentrok > 0 && (
                <Badge tone="warning">{hasil.jumlahBentrok} nomor sudah terpakai</Badge>
              )}
            </div>

            {rekap.length > 0 && (
              <div className="w-full space-y-1.5 rounded-xl bg-surface-muted p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Kelengkapan subtes sesudah disimpan
                </p>
                <div className="flex flex-wrap gap-2">
                  {rekap.map((r) => {
                    const total = r.sudahAda + r.ditambah;
                    const kurang = r.kuota - total;
                    return (
                      <span
                        key={r.subtes}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold tabular-nums ${
                          kurang === 0
                            ? "bg-success-soft text-success"
                            : kurang > 0
                              ? "bg-warning-soft text-warning"
                              : "bg-danger-soft text-danger"
                        }`}
                      >
                        {r.subtes} {r.sudahAda} + {r.ditambah} = {total}/{r.kuota}
                        {kurang > 0 ? ` · kurang ${kurang}` : kurang === 0 ? " · lengkap" : ""}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {modeLanjut && (
              <p className="w-full rounded-lg bg-brand-soft px-3 py-2 text-xs text-brand-strong">
                Mode <strong>lanjutan</strong>: nomor di berkas diabaikan dan tiap soal mengisi nomor
                kosong terkecil di subtesnya. Periksa kolom <strong>No</strong> — di situlah nomor
                yang benar-benar akan tersimpan.
              </p>
            )}

            <p className="w-full text-xs text-muted">
              Kolom <strong>Kunci</strong> boleh kamu isi atau betulkan langsung di sini — berguna
              untuk naskah yang kuncinya tidak tertulis di berkas. Tekan{" "}
              <strong>Baca &amp; pratinjau</strong> lagi untuk memeriksa hasilnya, lalu Simpan.
              Isian ini bertahan selama berkasnya tidak diganti.
            </p>
          </div>

          <div className="max-h-[32rem] overflow-y-auto">
            <TabelScroll>
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 bg-surface-muted">
                  <tr>
                    <th className={TH}>{state.hasil?.sumber === "naskah-word" ? "Urutan" : "Baris"}</th>
                    <th className={TH}>Subtes</th>
                    <th className={TH}>No</th>
                    <th className={TH}>Tipe</th>
                    <th className={TH}>Level</th>
                    <th className={TH}>Pertanyaan</th>
                    <th className={TH}>Kunci</th>
                    <th className={TH}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {hasil.baris.map((b) => {
                    const rusak = b.galat.length > 0 && !b.kembar;
                    return (
                      <tr
                        key={b.baris}
                        className={`border-t border-line ${
                          rusak ? "bg-danger-soft/40" : b.kembar ? "bg-warning-soft/30" : ""
                        }`}
                      >
                        <td className={`${TD} tabular-nums text-muted`}>{b.baris}</td>
                        <td className={`${TD} font-semibold`}>{b.subtes || "—"}</td>
                        <td className={`${TD} tabular-nums`}>
                          {b.nomor || "—"}
                          {b.dinomoriUlang && b.nomorBerkas > 0 && (
                            <span className="block text-[11px] font-normal text-muted">
                              berkas: {b.nomorBerkas}
                            </span>
                          )}
                        </td>
                        <td className={TD}>{b.tipe}</td>
                        <td className={TD}>{b.level}</td>
                        <td className={`${TD} max-w-sm`}>{ringkas(b.pertanyaan)}</td>
                        <td className={TD}>
                          <input
                            className="input w-24 px-2! py-1! text-center font-mono text-xs"
                            name={`kunci_${b.baris}`}
                            defaultValue={state.kunciManual?.[b.baris] ?? b.kunciMentah ?? ""}
                            placeholder="mis. C"
                            aria-label={`Kunci jawaban baris ${b.baris}`}
                            title={
                              "PG: satu huruf (C) · PGK: beberapa huruf dipisah koma (A,C) · " +
                              "Isian singkat: tulis jawabannya"
                            }
                          />
                        </td>
                        <td className={TD}>
                          {b.kembar ? (
                            <span className="text-xs font-semibold text-warning">
                              Dilewati — {b.galat[0] ?? "soal ini sudah ada."}
                            </span>
                          ) : rusak ? (
                            <ul className="space-y-0.5 text-xs text-danger">
                              {b.galat.map((g, i) => (
                                <li key={i}>• {g}</li>
                              ))}
                            </ul>
                          ) : b.sudahAda ? (
                            <span className="text-xs font-semibold text-warning">
                              Sudah ada — {state.timpa ? "akan ditimpa" : "akan dilewati"}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-success">Siap disimpan</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TabelScroll>
          </div>

          {bisaSimpan && (
            <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4">
              <button
                className="btn btn-primary"
                type="submit"
                name="konfirmasi"
                value="1"
                disabled={pending}
              >
                {pending ? "Menyimpan…" : `Simpan ${hasil.jumlahValid} soal ke paket`}
              </button>
              <p className="text-xs text-muted">
                Baris bermasalah otomatis dilewati. Isi kuncinya di kolom Kunci lalu tekan Baca &amp;
                pratinjau lagi, atau perbaiki berkasnya dan unggah ulang.
              </p>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
