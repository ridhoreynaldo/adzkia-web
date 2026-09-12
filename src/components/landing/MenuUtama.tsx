"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

/**
 * MENU UTAMA — tombol tiga garis di halaman awal.
 *
 * Diminta pengelola 11 September 2026: *"buatkan bar garis 3 gitu, seperti icon,
 * kemudian di bawahnya halaman Masuk, UTBK-SNBT, SKD Kedinasan, Warung Soal,
 * Language Skill. Fitur ini ada di segala device."*
 *
 * "Di segala device" itu yang menentukan bentuknya: menu ini TIDAK disembunyikan
 * pada lebar tertentu. Sebelumnya deretan tautan hanya digambar mulai lebar
 * 1024 piksel, sehingga pemakai HP dan tablet tidak pernah melihat Warung Soal
 * maupun Language Skill dari halaman awal sama sekali. Satu tombol yang sama di
 * semua lebar juga berarti pengelola bisa menerangkan letaknya lewat telepon
 * tanpa bertanya lebih dulu siswanya memakai apa.
 *
 * EMPAT HAL YANG MEMBUATNYA TETAP BISA DIPAKAI SIAPA SAJA:
 *
 *  1. Ditutup oleh ketukan di luar DAN oleh Escape, dengan fokus dikembalikan
 *     ke tombolnya — pemakai papan ketik tidak terlempar ke awal halaman.
 *  2. Menutup sendiri begitu salah satu tautannya ditekan. Navigasi di Next.js
 *     tidak memuat ulang halaman, jadi tanpa ini panelnya akan tetap
 *     menggantung terbuka di atas halaman tujuan.
 *  3. `aria-expanded` dan `aria-controls` terpasang, dan tiga garisnya berubah
 *     jadi silang saat terbuka — status terbuka/tertutup terbaca tanpa warna.
 *  4. Sasaran sentuhnya 44 piksel, ukuran minimum yang nyaman di layar sentuh.
 *
 * SENGAJA tidak memakai `<details>`: panel `<details>` yang terbuka tidak ikut
 * tertutup ketika halaman berpindah lewat `next/link`.
 */

export interface ButirMenu {
  href: string;
  label: string;
  /** Satu baris keterangan di bawah labelnya. */
  ket?: string;
  /** true untuk butir yang diberi nada merek — dipakai "Masuk". */
  sorot?: boolean;
}

/* --------------------------------------------------------------------------
   Ikon

   Digambar sebaris sebagai SVG `currentColor`, bukan emoji: siswa Adzkia
   membuka halaman ini dari Android, iPhone, iPad, dan laptop sekolah
   sekaligus, dan rupa emoji berbeda-beda di keempatnya.
   -------------------------------------------------------------------------- */

function Bungkus({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="h-[18px] w-[18px] shrink-0"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** Pintu masuk — anak panah menuju pintu. */
function IkonMasuk() {
  return (
    <Bungkus>
      <path d="M14.5 3.5h3A1.5 1.5 0 0 1 19 5v14a1.5 1.5 0 0 1-1.5 1.5h-3" />
      <path d="M10 8.5 13.5 12 10 15.5M13 12H4.5" />
    </Bungkus>
  );
}

/** UTBK — toga wisuda. */
function IkonToga() {
  return (
    <Bungkus>
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />
      <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
    </Bungkus>
  );
}

/** SKD — perisai bercentang. */
function IkonPerisai() {
  return (
    <Bungkus>
      <path d="M12 3 4 6.5v5c0 4.6 3.4 8.4 8 9.5 4.6-1.1 8-4.9 8-9.5v-5L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </Bungkus>
  );
}

/** Warung Soal — kanopi warung. */
function IkonWarung() {
  return (
    <Bungkus>
      <path d="M3.5 8.5h17l-1.2-3.2a1.5 1.5 0 0 0-1.4-1H6.1a1.5 1.5 0 0 0-1.4 1L3.5 8.5Z" />
      <path d="M5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V8.5" />
      <path d="M9.5 20.5V14h5v6.5" />
    </Bungkus>
  );
}

/** Language Skill — bola dunia. */
function IkonDunia() {
  return (
    <Bungkus>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.2 2.3 3.4 5.3 3.4 8.5S14.2 18.2 12 20.5c-2.2-2.3-3.4-5.3-3.4-8.5S9.8 5.8 12 3.5Z" />
    </Bungkus>
  );
}

/** Ikon dipilih dari alamatnya, supaya pemanggilnya cukup mengirim daftar tautan. */
function ikonUntuk(href: string) {
  if (href.startsWith("/utbk")) return <IkonToga />;
  if (href.startsWith("/skd")) return <IkonPerisai />;
  if (href.startsWith("/warung")) return <IkonWarung />;
  if (href.startsWith("/language")) return <IkonDunia />;
  return <IkonMasuk />;
}

/* --------------------------------------------------------------------------
   Menu
   -------------------------------------------------------------------------- */

export function MenuUtama({ butir }: { butir: ButirMenu[] }) {
  const [buka, setBuka] = useState(false);
  const bungkus = useRef<HTMLDivElement | null>(null);
  const tombol = useRef<HTMLButtonElement | null>(null);
  const panelId = useId();

  useEffect(() => {
    if (!buka) return;

    const diLuar = (e: MouseEvent | TouchEvent) => {
      if (!bungkus.current?.contains(e.target as Node)) setBuka(false);
    };
    const onTombol = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setBuka(false);
      tombol.current?.focus();
    };

    // `capture` supaya ketukan tetap tertangkap walau ada komponen lain yang
    // menghentikan perambatan peristiwanya lebih dulu.
    document.addEventListener("pointerdown", diLuar, true);
    document.addEventListener("keydown", onTombol);
    return () => {
      document.removeEventListener("pointerdown", diLuar, true);
      document.removeEventListener("keydown", onTombol);
    };
  }, [buka]);

  return (
    <div className="relative shrink-0" ref={bungkus}>
      <button
        ref={tombol}
        type="button"
        onClick={() => setBuka((b) => !b)}
        aria-haspopup="menu"
        aria-expanded={buka}
        aria-controls={panelId}
        aria-label={buka ? "Tutup menu" : "Buka menu"}
        className="grid size-11 place-items-center rounded-full border border-line bg-surface text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25"
      >
        {/*
          Tiga garis yang berubah menjadi silang. Garis tengahnya dipudarkan
          dan kedua garis luarnya bertemu di tengah — statusnya terbaca dari
          BENTUKNYA, bukan dari warnanya saja.
        */}
        <span aria-hidden className="relative block h-4 w-5">
          <span
            className={`absolute left-0 block h-[2px] w-5 rounded-full bg-current transition-transform duration-200 ${
              buka ? "top-[7px] rotate-45" : "top-0"
            }`}
          />
          <span
            className={`absolute left-0 top-[7px] block h-[2px] w-5 rounded-full bg-current transition-opacity duration-200 ${
              buka ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute left-0 block h-[2px] w-5 rounded-full bg-current transition-transform duration-200 ${
              buka ? "top-[7px] -rotate-45" : "top-[14px]"
            }`}
          />
        </span>
      </button>

      {buka && (
        <div
          id={panelId}
          role="menu"
          aria-label="Menu halaman"
          className="absolute right-0 z-50 mt-2 w-[17rem] overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
        >
          <ul className="p-2">
            {butir.map((b) => (
              <li key={b.href}>
                <Link
                  href={b.href}
                  role="menuitem"
                  // Panelnya ditutup sendiri: `next/link` tidak memuat ulang
                  // halaman, jadi tanpa ini menunya menggantung terbuka di
                  // atas halaman tujuan.
                  onClick={() => setBuka(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    b.sorot
                      ? "bg-brand text-white hover:bg-brand-strong"
                      : "text-foreground hover:bg-surface-muted"
                  }`}
                >
                  <span className={b.sorot ? "text-white" : "text-brand"}>
                    {ikonUntuk(b.href)}
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block">{b.label}</span>
                    {b.ket && (
                      <span
                        className={`block text-[11px] font-medium ${
                          b.sorot ? "text-white/75" : "text-muted"
                        }`}
                      >
                        {b.ket}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
