"use client";

import { useActionState, useState } from "react";

import { imporProdiAction, type ImporProdiState } from "@/app/admin/actions";
import { Alert } from "@/components/ui";

/**
 * Impor katalog program studi SNBT. Sekali jalan: berkas dibaca, baris yang
 * punya nama prodi + universitas langsung disimpan. Prodi yang sudah ada
 * diperbarui, bukan digandakan.
 */
export function ImporProdiForm() {
  const [state, action, pending] = useActionState<ImporProdiState, FormData>(imporProdiAction, {});
  const [adaBerkas, setAdaBerkas] = useState(false);
  const [hapusDulu, setHapusDulu] = useState(false);

  return (
    <form action={action} className="space-y-6">
      <div className="card space-y-4 p-5">
        <div>
          <h2 className="text-sm font-bold">Susunan kolom berkas</h2>
          <p className="mt-1 text-sm text-muted">
            Baris pertama berisi judul kolom. Yang wajib hanya dua kolom pertama, tetapi{" "}
            <strong className="text-foreground">Jenjang sebaiknya diisi</strong>: peserta memilih S1
            di Pilihan 1-2 dan D3/D4 di Pilihan 3-4, sehingga prodi tanpa jenjang tidak akan muncul
            di kotak pencarian mereka.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead className="bg-surface-muted">
                <tr>
                  <th className="border border-line px-3 py-2 text-left font-bold">
                    Program Studi *
                  </th>
                  <th className="border border-line px-3 py-2 text-left font-bold">
                    Universitas *
                  </th>
                  <th className="border border-line px-3 py-2 text-left font-bold">Jenjang</th>
                  <th className="border border-line px-3 py-2 text-left font-bold">Kelompok</th>
                </tr>
              </thead>
              <tbody className="text-muted">
                <tr>
                  <td className="border border-line px-3 py-2">PENDIDIKAN DOKTER</td>
                  <td className="border border-line px-3 py-2">UNIVERSITAS SUMATERA UTARA</td>
                  <td className="border border-line px-3 py-2">S1</td>
                  <td className="border border-line px-3 py-2">Saintek</td>
                </tr>
                <tr>
                  <td className="border border-line px-3 py-2">BAHASA INGGRIS</td>
                  <td className="border border-line px-3 py-2">POLITEKNIK NEGERI PADANG</td>
                  <td className="border border-line px-3 py-2">D4</td>
                  <td className="border border-line px-3 py-2">Soshum</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">
            Nama kolom lain yang ikut dikenali: <em>Prodi</em>, <em>Nama Prodi</em>, <em>PTN</em>,{" "}
            <em>Kampus</em>, <em>Perguruan Tinggi</em>.
          </p>
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="berkas-prodi">
            Berkas katalog prodi (.xlsx atau .csv)
          </label>
          <input
            className="input file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand"
            id="berkas-prodi"
            name="berkas"
            type="file"
            accept=".xlsx,.csv,.txt"
            required
            onChange={(e) => setAdaBerkas((e.target.files?.length ?? 0) > 0)}
          />
        </div>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="hapus_dulu"
            checked={hapusDulu}
            onChange={(e) => setHapusDulu(e.target.checked)}
            className="mt-0.5 size-4 accent-[var(--brand)]"
          />
          <span>
            <span className="font-semibold">Ganti seluruh katalog</span>
            <span className="block text-xs text-muted">
              Katalog lama dihapus dulu, lalu diisi ulang dari berkas ini. Pilihan jurusan yang
              sudah disimpan peserta tetap aman karena nama prodinya ikut tersalin.
            </span>
          </span>
        </label>

        <button className="btn btn-primary" type="submit" disabled={pending || !adaBerkas}>
          {pending ? "Mengimpor…" : hapusDulu ? "Ganti katalog sekarang" : "Impor & perbarui"}
        </button>
      </div>

      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.pesan && !state.error && <Alert tone="success">{state.pesan}</Alert>}

      {state.contoh && state.contoh.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-bold">Contoh baris yang terbaca</h2>
          <ul className="mt-3 space-y-2">
            {state.contoh.map((c, i) => (
              <li key={i} className="text-sm">
                <span className="block font-semibold uppercase leading-tight">{c.nama}</span>
                <span className="block text-xs uppercase text-muted">{c.ptn}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
