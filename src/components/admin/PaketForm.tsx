"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { simpanPaketAction } from "@/app/admin/actions";
import { Alert } from "@/components/ui";

export interface NilaiAwalPaket {
  id?: number;
  kode: string;
  nama: string;
  jalur: string;
  deskripsi: string;
  status: string;
  /** Format `datetime-local`: YYYY-MM-DDTHH:MM */
  mulai_at: string;
  selesai_at: string;
  acak_soal: boolean;
  tampil_pembahasan: boolean;
}

const KOSONG: NilaiAwalPaket = {
  kode: "",
  nama: "",
  jalur: "utbk",
  deskripsi: "",
  status: "draft",
  mulai_at: "",
  selesai_at: "",
  acak_soal: false,
  tampil_pembahasan: true,
};

export function PaketForm({ awal }: { awal?: NilaiAwalPaket }) {
  const nilai = awal ?? KOSONG;
  const [state, action, pending] = useActionState(simpanPaketAction, {});
  const [kode, setKode] = useState(nilai.kode);

  return (
    <form action={action} className="space-y-5">
      {nilai.id ? <input type="hidden" name="id" value={nilai.id} /> : null}
      {state.error && <Alert tone="danger">{state.error}</Alert>}

      <div className="card space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="kode">
              Kode paket
            </label>
            <input
              className="input font-mono uppercase"
              id="kode"
              name="kode"
              required
              maxLength={24}
              value={kode}
              onChange={(e) => setKode(e.target.value.toUpperCase().replace(/\s+/g, "-"))}
              placeholder="TO-01"
            />
            <p className="mt-1 text-xs text-muted">Otomatis huruf besar, harus unik.</p>
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="nama">
              Nama paket
            </label>
            <input
              className="input"
              id="nama"
              name="nama"
              required
              defaultValue={nilai.nama}
              placeholder="Tryout Real UTBK-SNBT Tahap 1"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="jalur">
            Jalur latihan
          </label>
          <select className="input" id="jalur" name="jalur" defaultValue={nilai.jalur}>
            <option value="utbk">Tryout Real UTBK-SNBT — 7 subtes, timer per subtes, nilai IRT</option>
            <option value="skd">SKD Kedinasan — TWK/TIU/TKP, satu sesi 100 menit, poin resmi</option>
          </select>
          <p className="mt-1.5 text-xs text-muted">
            Menentukan struktur subtes, cara menilai, dan warna tampilan yang dilihat siswa.
            Jangan diubah setelah ada peserta mengerjakan paket ini.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="deskripsi">
            Deskripsi <span className="font-normal text-muted">(opsional)</span>
          </label>
          <textarea
            className="input min-h-24"
            id="deskripsi"
            name="deskripsi"
            defaultValue={nilai.deskripsi}
            placeholder="Ceritakan singkat isi paket ini supaya siswa tahu apa yang akan dikerjakan."
          />
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <h2 className="text-sm font-bold">Jadwal &amp; status</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="status">
              Status
            </label>
            <select className="input" id="status" name="status" defaultValue={nilai.status}>
              <option value="draft">Draf — belum terlihat siswa</option>
              <option value="published">Terbit — bisa dikerjakan</option>
              <option value="closed">Ditutup — hanya hasil</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="mulai_at">
              Mulai
            </label>
            <input
              className="input"
              type="datetime-local"
              id="mulai_at"
              name="mulai_at"
              defaultValue={nilai.mulai_at}
            />
          </div>
          <div>
            <label className="label" htmlFor="selesai_at">
              Selesai
            </label>
            <input
              className="input"
              type="datetime-local"
              id="selesai_at"
              name="selesai_at"
              defaultValue={nilai.selesai_at}
            />
          </div>
        </div>
        <p className="text-xs text-muted">
          Kosongkan jadwal bila paket boleh dikerjakan kapan saja.
        </p>
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="text-sm font-bold">Pengaturan pengerjaan</h2>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="acak_soal"
            defaultChecked={nilai.acak_soal}
            className="mt-0.5 size-4 accent-[var(--brand)]"
          />
          <span>
            <span className="font-semibold">Acak urutan soal</span>
            <span className="block text-xs text-muted">
              Setiap siswa menerima urutan soal berbeda di dalam tiap subtes.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="tampil_pembahasan"
            defaultChecked={nilai.tampil_pembahasan}
            className="mt-0.5 size-4 accent-[var(--brand)]"
          />
          <span>
            <span className="font-semibold">Tampilkan pembahasan setelah selesai</span>
            <span className="block text-xs text-muted">
              Siswa bisa membaca kunci dan pembahasan di halaman hasil.
            </span>
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : nilai.id ? "Simpan perubahan" : "Buat paket"}
        </button>
        <Link className="btn btn-ghost" href="/admin/paket">
          Batal
        </Link>
      </div>
    </form>
  );
}
