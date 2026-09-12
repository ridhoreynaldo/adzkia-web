"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { imporWarungAction, type ImporWarungState } from "@/app/admin/actions";
import { TabelScroll, TD, TH } from "@/components/admin/AdminUI";
import { Alert, Badge } from "@/components/ui";

function ringkas(teks: string, panjang = 70): string {
  const v = (teks ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!v) return "—";
  return v.length > panjang ? `${v.slice(0, panjang)}…` : v;
}

/**
 * Unggah naskah soal Warung, tinjau, lalu simpan.
 *
 * Alurnya dua langkah dengan formulir yang sama seperti impor bank soal tryout:
 * unggahan pertama hanya membaca dan menampilkan pratinjau, tombol simpan
 * mengirim ulang berkas yang sama disertai penanda konfirmasi. Berkasnya
 * memang dibaca dua kali, dan itu disengaja — tidak ada naskah setengah
 * tersimpan di server selagi admin masih menimbang.
 */
export function WarungImporForm({
  paketId,
  kembaliKe,
}: {
  paketId: number;
  /** Alamat panel paket, dituju sesudah impor berhasil. */
  kembaliKe: string;
}) {
  const [state, action, pending] = useActionState<ImporWarungState, FormData>(
    imporWarungAction,
    {},
  );
  const [adaBerkas, setAdaBerkas] = useState(false);

  const hasil = state.hasil;
  const bisaSimpan = !!hasil && !state.selesai && hasil.jumlahValid > 0;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="paket_id" value={paketId} />

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

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="timpa"
            defaultChecked={state.timpa ?? false}
            className="mt-0.5 size-4 accent-[var(--brand)]"
          />
          <span>
            <span className="font-semibold">Timpa soal dengan nomor yang sama</span>
            <span className="block text-xs text-muted">
              Tanpa ini, nomor yang sudah dipakai di paket ini akan dilewati.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" type="submit" disabled={pending || !adaBerkas}>
            {pending ? "Memproses…" : "Baca & pratinjau"}
          </button>
          <a className="btn btn-ghost" href="/api/admin/warung-template" download>
            ⬇ Unduh contoh .csv
          </a>
        </div>
      </div>

      {state.error && <Alert tone="danger">{state.error}</Alert>}

      {(hasil?.catatan?.length ?? 0) > 0 && (
        <Alert tone="warning">
          <p className="font-semibold">Perlu kamu periksa sendiri</p>
          <ul className="mt-1.5 space-y-1 text-xs">
            {hasil?.catatan?.slice(0, 10).map((c, i) => (
              <li key={i}>&bull; {c}</li>
            ))}
          </ul>
        </Alert>
      )}

      {state.pesan && !state.error && (
        <Alert tone={state.selesai ? "success" : "brand"}>{state.pesan}</Alert>
      )}

      {state.selesai && (
        <div className="flex flex-wrap gap-3">
          <Link className="btn btn-primary" href={kembaliKe}>
            Lihat isi paket
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
              <Badge tone="success">{hasil.jumlahValid} soal siap</Badge>
              {hasil.jumlahGalat > 0 && <Badge tone="danger">{hasil.jumlahGalat} bermasalah</Badge>}
              <Badge tone="muted">
                {hasil.sumber === "naskah-word" ? "Naskah Word" : "Tabel"}
              </Badge>
            </div>
          </div>

          <div className="max-h-[32rem] overflow-y-auto">
            <TabelScroll>
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 bg-surface-muted">
                  <tr>
                    <th className={TH}>Baris</th>
                    <th className={TH}>No</th>
                    <th className={TH}>Tipe</th>
                    <th className={TH}>Pertanyaan</th>
                    <th className={TH}>Opsi</th>
                    <th className={TH}>Kunci</th>
                    <th className={TH}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {hasil.baris.map((b, i) => {
                    const rusak = b.masalah.length > 0;
                    return (
                      <tr
                        key={`${b.asal}-${i}`}
                        className={`border-t border-line ${rusak ? "bg-danger-soft/40" : ""}`}
                      >
                        <td className={`${TD} tabular-nums text-muted`}>{b.asal}</td>
                        <td className={`${TD} tabular-nums`}>{b.nomor ?? "—"}</td>
                        <td className={`${TD} font-semibold`}>{b.tipe}</td>
                        <td className={`${TD} max-w-sm`}>{ringkas(b.pertanyaan)}</td>
                        <td className={`${TD} tabular-nums text-muted`}>{b.opsi.length || "—"}</td>
                        <td className={`${TD} font-mono text-xs`}>{b.kunci || "—"}</td>
                        <td className={TD}>
                          {rusak ? (
                            <ul className="space-y-0.5 text-xs text-danger">
                              {b.masalah.map((g, j) => (
                                <li key={j}>• {g}</li>
                              ))}
                            </ul>
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
                Soal bermasalah otomatis dilewati. Perbaiki berkasnya lalu unggah ulang bila perlu.
              </p>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
