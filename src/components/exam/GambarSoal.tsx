"use client";

import { useEffect, useState } from "react";

/**
 * Gambar pendukung soal, bisa diketuk untuk diperbesar.
 *
 * Sebagian naskah (PU 21-30, PK, PM) ditampilkan sebagai potongan gambar
 * halaman PDF karena rumusnya rusak bila diekstrak menjadi teks. Lebar aslinya
 * sekitar 700 piksel, jadi di layar ponsel gambar itu menyusut sampai separuh
 * dan angkanya nyaris tidak terbaca. Lapisan perbesar ini yang menutup celah
 * tersebut — tanpa perlu peserta mencubit-zoom seluruh halaman ujian.
 */
export function GambarSoal({ src, nomor }: { src: string; nomor: number }) {
  const [besar, setBesar] = useState(false);

  // Tombol Esc menutup lapisan; peserta ujian terbiasa memakainya.
  useEffect(() => {
    if (!besar) return;
    const onTombol = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBesar(false);
    };
    window.addEventListener("keydown", onTombol);
    return () => window.removeEventListener("keydown", onTombol);
  }, [besar]);

  return (
    <>
      <button
        type="button"
        onClick={() => setBesar(true)}
        className="group mt-4 block w-full cursor-zoom-in overflow-hidden rounded-xl border border-line bg-surface focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        aria-label={`Perbesar gambar soal nomor ${nomor}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`Gambar pendukung soal nomor ${nomor}`}
          className="w-full"
        />
        <span className="block border-t border-line bg-surface-muted px-3 py-1.5 text-center text-[11px] font-semibold text-muted">
          Ketuk gambar untuk memperbesar
        </span>
      </button>

      {besar && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Gambar soal nomor ${nomor} diperbesar`}
          className="fixed inset-0 z-[80] flex flex-col bg-foreground/95"
          onClick={() => setBesar(false)}
        >
          <div className="aman-atas flex shrink-0 items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm font-semibold text-background">Gambar soal nomor {nomor}</p>
            <button
              type="button"
              className="rounded-lg bg-background/15 px-3 py-1.5 text-sm font-bold text-background"
              onClick={() => setBesar(false)}
            >
              Tutup ✕
            </button>
          </div>
          {/* Gambar ditampilkan pada lebar aslinya dan dibiarkan menggulung ke
              samping, supaya angka dan rumusnya terbaca utuh di layar sempit. */}
          <div className="aman-bawah flex-1 overflow-auto px-3 pb-3" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Gambar pendukung soal nomor ${nomor}, tampilan diperbesar`}
              className="mx-auto max-w-none rounded-lg bg-white"
            />
          </div>
        </div>
      )}
    </>
  );
}
