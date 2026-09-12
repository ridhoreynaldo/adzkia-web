"use client";

import { useState } from "react";
import {
  INFO_ZONA,
  URUTAN_ZONA,
  type HasilRekomendasi,
  type ProdiRekomendasi,
  type ZonaPeluang,
} from "@/data/kampus";
import { angka, desimal } from "./format";

const BATAS_AWAL = 6;

export interface PaketRekomendasi {
  semua: HasilRekomendasi;
  saintek: HasilRekomendasi;
  soshum: HasilRekomendasi;
}

type Filter = "semua" | "saintek" | "soshum";

const LABEL_FILTER: Record<Filter, string> = {
  semua: "Semua",
  saintek: "Saintek",
  soshum: "Soshum",
};

export function RekomendasiKampus({ paket }: { paket: PaketRekomendasi }) {
  const [filter, setFilter] = useState<Filter>("semua");
  const data = paket[filter];

  return (
    <div id="rekomendasi-kampus" className="card halaman-baru scroll-mt-20 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">Rekomendasi Kampus</h2>
          <p className="text-sm text-muted">
            Berdasarkan skor total <strong>{angka(data.totalSkor)}</strong> · {angka(data.jumlahCocok)} prodi
            masuk jangkauanmu.
          </p>
        </div>
        <div className="no-print flex gap-2">
          {(Object.keys(LABEL_FILTER) as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                filter === f
                  ? "bg-brand text-white"
                  : "bg-surface-muted text-muted hover:bg-brand-soft hover:text-brand"
              }`}
            >
              {LABEL_FILTER[f]}
            </button>
          ))}
        </div>
      </div>

      {data.jumlahCocok === 0 && (
        <p className="mb-4 rounded-xl border border-accent/25 bg-accent-soft px-4 py-3.5 text-sm">
          Skormu belum menyentuh ancar-ancar prodi mana pun di basis data kami (prodi terendah ada
          di kisaran 576). Jangan berkecil hati — ini baru tryout. Fokus dulu ke subtes terlemah di
          bagian Analisis Singkat, lalu ulangi tryout berikutnya. Naik 100 poin dalam beberapa
          pekan itu sangat mungkin.
        </p>
      )}

      {/* ---------- Usulan susunan Pilihan 1-4 ---------- */}
      <div className="rounded-xl border border-line bg-surface-muted/50 p-4">
        <p className="text-sm font-extrabold">Usulan Susunan Pilihan SNBT</p>
        <p className="mt-0.5 text-xs text-muted">
          Strategi campuran: berani di Pilihan 1, makin aman di Pilihan 4.
        </p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {data.pilihan.map((p) => (
            <div
              key={p.urutan}
              className="hindari-pecah rounded-xl border border-line bg-surface p-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-brand text-[11px] font-extrabold text-white">
                  {p.urutan}
                </span>
                {p.prodi && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${INFO_ZONA[p.prodi.zona].kelasTeks}`}
                  >
                    {INFO_ZONA[p.prodi.zona].label.toUpperCase()}
                  </span>
                )}
              </div>
              {p.prodi ? (
                <>
                  <p className="mt-2 text-sm font-bold leading-snug">{p.prodi.prodi}</p>
                  <p className="text-xs text-muted">{p.prodi.ptn}</p>
                  <p className="mt-1.5 text-xs">
                    Ancar-ancar <strong>{angka(p.prodi.skor_min)}</strong>
                    {p.prodi.kurang > 0 ? (
                      <span className="text-danger"> · kurang {angka(p.prodi.kurang)} poin</span>
                    ) : (
                      <span className="text-success"> · sudah terpenuhi</span>
                    )}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  Belum ada prodi yang cocok di zona ini pada penyaringan sekarang.
                </p>
              )}
              <p className="mt-2 text-[11px] leading-4 text-muted">{p.strategi}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Kartu per zona ---------- */}
      <div className="mt-5 space-y-4">
        {URUTAN_ZONA.map((z) => (
          <SeksiZona key={z} zona={z} daftar={data.perZona[z]} />
        ))}
      </div>

      <p className="mt-5 rounded-lg bg-warning-soft px-3.5 py-2.5 text-[11px] leading-4 text-warning">
        <strong>Catatan:</strong> angka ancar-ancar di atas adalah estimasi yang disusun dari
        rentang yang umum beredar, bukan angka resmi SNPMB. Nilai sesungguhnya berubah tiap tahun
        mengikuti tingkat kesulitan soal, jumlah peminat, dan daya tampung. Pakai sebagai gambaran
        posisi, bukan jaminan lolos.
      </p>
    </div>
  );
}

function SeksiZona({ zona, daftar }: { zona: ZonaPeluang; daftar: ProdiRekomendasi[] }) {
  const [semua, setSemua] = useState(false);
  const info = INFO_ZONA[zona];
  const tampil = semua ? daftar : daftar.slice(0, BATAS_AWAL);

  return (
    <section className={`hindari-pecah rounded-xl border p-4 ${info.kelas}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${info.kelasTitik}`} />
          <h3 className={`text-sm font-extrabold uppercase tracking-wide ${info.kelasTeks}`}>
            Zona {info.label}
          </h3>
          <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold text-muted">
            {angka(daftar.length)} prodi
          </span>
        </div>
        {daftar.length > BATAS_AWAL && (
          <button
            type="button"
            className="no-print text-xs font-bold underline"
            onClick={() => setSemua((v) => !v)}
          >
            {semua ? "Tampilkan sedikit" : `Lihat semua ${angka(daftar.length)}`}
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">{info.ringkas}</p>

      {daftar.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Belum ada prodi pada zona ini.</p>
      ) : (
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {tampil.map((p) => (
            <article key={p.id} className="rounded-lg border border-line bg-surface p-3">
              <p className="text-sm font-bold leading-snug">{p.prodi}</p>
              <p className="text-xs text-muted">{p.ptn}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                <span className="font-semibold">
                  Ancar-ancar {angka(p.skor_min)}
                </span>
                <span className="rounded bg-surface-muted px-1.5 py-0.5 font-semibold text-muted">
                  {p.kelompok}
                </span>
                {p.kurang > 0 ? (
                  <span className="font-bold text-danger">kurang {angka(p.kurang)} poin</span>
                ) : (
                  <span className="font-bold text-success">+{angka(p.selisih)} poin di atas</span>
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                Daya tampung {angka(p.daya_tampung)} · peminat {angka(p.peminat)} · keketatan 1 :{" "}
                {desimal(p.keketatan, 1)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
