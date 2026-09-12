"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";

import { imporPesertaAction, type ImporPesertaState } from "@/app/admin/actions";
import { TabelScroll, TD, TH } from "@/components/admin/AdminUI";
import { Alert, Badge } from "@/components/ui";

/**
 * Impor daftar peserta dari Excel/CSV, dua langkah: baca & pratinjau dulu,
 * baru disimpan. Pratinjau menandai baris mana yang akan MEMPERBARUI akun lama
 * supaya pengelola tidak kaget kata sandi siswa berubah.
 *
 * Berkasnya disimpan di state React, bukan dibiarkan menempel di elemen input:
 * React mengosongkan isian formulir setiap kali sebuah form action selesai,
 * sehingga langkah "Simpan" akan kehilangan berkasnya bila kita mengandalkan
 * `<input type="file">` saja.
 */
export function ImporPesertaForm() {
  const [state, action, pending] = useActionState<ImporPesertaState, FormData>(
    imporPesertaAction,
    {},
  );
  const [berkas, setBerkas] = useState<File | null>(null);

  const hasil = state.hasil;
  const bisaSimpan = !!hasil && !state.selesai && hasil.jumlahValid > 0;

  const kirim = (konfirmasi: boolean) => {
    if (!berkas) return;
    const fd = new FormData();
    fd.set("berkas", berkas);
    if (konfirmasi) fd.set("konfirmasi", "1");
    startTransition(() => action(fd));
  };

  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-5">
        <div>
          <h2 className="text-sm font-bold">Susunan kolom berkas</h2>
          <p className="mt-1 text-sm text-muted">
            Baris pertama harus berisi judul kolom. Judul boleh huruf besar/kecil dan boleh pakai
            spasi.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead className="bg-surface-muted">
                <tr>
                  <th className="border border-line px-3 py-2 text-left font-bold">NISN *</th>
                  <th className="border border-line px-3 py-2 text-left font-bold">Nama *</th>
                  <th className="border border-line px-3 py-2 text-left font-bold">Kelas</th>
                  <th className="border border-line px-3 py-2 text-left font-bold">Kata Sandi *</th>
                  <th className="border border-line px-3 py-2 text-left font-bold">Tanggal Lahir</th>
                  <th className="border border-line px-3 py-2 text-left font-bold">Asal Sekolah</th>
                  <th className="border border-line px-3 py-2 text-left font-bold">No HP</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-muted">
                  <td className="border border-line px-3 py-2">0071234567</td>
                  <td className="border border-line px-3 py-2">Aisyah Nur Ramadhani</td>
                  <td className="border border-line px-3 py-2">XII IPA 1</td>
                  <td className="border border-line px-3 py-2">adzkia2026</td>
                  <td className="border border-line px-3 py-2">2008-05-17</td>
                  <td className="border border-line px-3 py-2">SMA Islam Plus Adzkia</td>
                  <td className="border border-line px-3 py-2">081200000001</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">
            Kolom bertanda <strong>*</strong> wajib ada. Siswa masuk memakai NISN + kata sandi pada
            baris itu, dan namanya muncul otomatis. <strong>Tanggal Lahir</strong> dipakai sebagai
            pemisah peringkat SKD ketika nilai peserta sama persis — boleh dikosongkan, tapi
            peserta tanpa tanggal lahir akan ditaruh di bawah saat terjadi seri. Simpan berkas ini
            baik-baik: kata sandi disimpan dalam bentuk terenkripsi, jadi sistem tidak bisa
            menampilkannya kembali.
          </p>
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="berkas">
            Berkas peserta (.xlsx atau .csv)
          </label>
          <input
            className="input file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand"
            id="berkas"
            name="berkas"
            type="file"
            accept=".xlsx,.csv,.txt"
            required
            onChange={(e) => setBerkas(e.target.files?.[0] ?? null)}
          />
          {berkas && (
            <p className="mt-1.5 text-xs text-muted">
              Berkas dipilih: <strong>{berkas.name}</strong>
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => kirim(false)}
            disabled={pending || !berkas}
          >
            {pending ? "Memproses…" : "Baca & pratinjau"}
          </button>
          {bisaSimpan && (
            <button
              className="btn btn-accent"
              type="button"
              onClick={() => kirim(true)}
              disabled={pending}
            >
              Simpan {hasil.jumlahValid} peserta
            </button>
          )}
        </div>
      </div>

      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.pesan && !state.error && (
        <Alert tone={state.selesai ? "success" : "brand"}>{state.pesan}</Alert>
      )}

      {state.selesai && (
        <Link className="btn btn-primary" href="/admin/peserta">
          Lihat daftar peserta
        </Link>
      )}

      {hasil && hasil.baris.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
            <h2 className="text-sm font-bold">
              Pratinjau {state.namaFile ? `— ${state.namaFile}` : ""}
            </h2>
            <div className="flex flex-wrap gap-2">
              <Badge tone="success">{hasil.jumlahValid} baris siap</Badge>
              {hasil.jumlahPerbarui > 0 && (
                <Badge tone="warning">{hasil.jumlahPerbarui} memperbarui akun lama</Badge>
              )}
              {hasil.jumlahGalat > 0 && <Badge tone="danger">{hasil.jumlahGalat} bermasalah</Badge>}
            </div>
          </div>

          <div className="max-h-[32rem] overflow-y-auto">
            <TabelScroll>
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 bg-surface-muted">
                  <tr>
                    <th className={TH}>Baris</th>
                    <th className={TH}>NISN</th>
                    <th className={TH}>Nama</th>
                    <th className={TH}>Kelas</th>
                    <th className={TH}>Lahir</th>
                    <th className={TH}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {hasil.baris.map((b) => {
                    const rusak = b.galat.length > 0;
                    return (
                      <tr
                        key={b.nomorBaris}
                        className={`border-t border-line ${rusak ? "bg-danger-soft/40" : ""}`}
                      >
                        <td className={`${TD} tabular-nums text-muted`}>{b.nomorBaris}</td>
                        <td className={`${TD} font-mono text-xs`}>{b.nisn || "—"}</td>
                        <td className={`${TD} font-semibold`}>{b.nama || "—"}</td>
                        <td className={TD}>{b.kelas || "—"}</td>
                        <td className={`${TD} whitespace-nowrap text-xs`}>
                          {b.tanggal_lahir || "—"}
                        </td>
                        <td className={TD}>
                          {rusak ? (
                            <ul className="space-y-0.5 text-xs text-danger">
                              {b.galat.map((g, i) => (
                                <li key={i}>• {g}</li>
                              ))}
                            </ul>
                          ) : b.sudahAda ? (
                            <span className="text-xs font-semibold text-warning">
                              Akun diperbarui
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-success">Akun baru</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TabelScroll>
          </div>
        </div>
      )}
    </div>
  );
}
