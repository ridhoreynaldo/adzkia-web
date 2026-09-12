"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * MENU AKSI — tombol roda gigi yang membuka daftar tindakan satu baris.
 *
 * Dibuat 11 September 2026 atas permintaan pengelola. Sebelumnya setiap baris
 * paket memajang SEBELAS tautan aksi bertumpuk sekaligus, sehingga satu baris
 * setinggi sebelas baris dan daftar paket harus digulir jauh hanya untuk
 * membaca empat paket. Dengan menu ini tiap paket kembali menjadi SATU baris —
 * susunannya seperti garis buku — dan aksinya muncul hanya ketika diminta.
 *
 * TIGA HAL YANG MEMBUATNYA AMAN DIPAKAI DI PANEL YANG PENUH AKSI MERUSAK:
 *
 *  1. Menu ditutup oleh ketukan di luar DAN oleh tombol Escape. Menu yang
 *     menggantung terbuka di atas baris lain adalah undangan menekan "Hapus
 *     paket" milik paket yang salah.
 *  2. Isinya FORMULIR SUNGGUHAN, bukan tombol tiruan. Server Action yang
 *     dipakai daftar paket tetap yang itu juga; menu ini hanya membungkusnya,
 *     jadi tidak ada jalur baru yang perlu dijaga ulang.
 *  3. `aria-haspopup`/`aria-expanded` terpasang dan fokus dikembalikan ke
 *     tombolnya saat ditutup lewat Escape — pengelola yang memakai papan ketik
 *     tidak kehilangan tempatnya.
 *
 * Gaya barisnya (`nadaMenu`, `PemisahMenu`) tinggal di `MenuAksiGaya.tsx` yang
 * TANPA `"use client"` — alasannya ditulis di sana, dan jangan disatukan ke
 * sini: halaman yang memakai menu ini komponen SERVER, dan fungsi dari berkas
 * berpenanda klien tidak bisa dipanggil dari sana.
 *
 * Menu ini SENGAJA tidak memakai `<details>`: di dalamnya ada formulir yang
 * mengirim Server Action, dan `<details>` yang tertutup sendiri saat halaman
 * berpindah membuat status "Memproses…" pada `TombolKonfirmasi` tidak pernah
 * terlihat.
 */
export function MenuAksi({
  label,
  children,
  judul = "Aksi paket",
}: {
  /** Disebut pembaca layar, mis. "Aksi paket TO-11SEP2026". */
  label: string;
  children: ReactNode;
  /** Judul kecil di kepala panel. */
  judul?: string;
}) {
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
      // Fokus dikembalikan supaya pemakai papan ketik tidak terlempar ke awal
      // halaman setiap kali menutup menu.
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
        aria-controls={buka ? panelId : undefined}
        aria-label={label}
        title={label}
        className={`grid size-9 place-items-center rounded-xl border transition-colors ${
          buka
            ? "border-brand bg-brand-soft text-brand"
            : "border-line bg-surface text-muted hover:border-brand hover:text-brand"
        }`}
      >
        <IkonRodaGigi className={`h-4.5 w-4.5 transition-transform ${buka ? "rotate-45" : ""}`} />
      </button>

      {buka && (
        <div
          id={panelId}
          role="menu"
          aria-label={label}
          className="absolute right-0 top-full z-30 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_48px_-20px_rgba(23,17,14,0.35)]"
        >
          <p className="border-b border-line bg-surface-muted px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-muted">
            {judul}
          </p>
          <div className="py-1">{children}</div>
        </div>
      )}
    </div>
  );
}

function IkonRodaGigi({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={`shrink-0 ${className}`}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.1 4.7a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.16.63.7 1.03 1.36 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z" />
    </svg>
  );
}
