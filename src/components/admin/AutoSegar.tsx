"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Memuat ulang data halaman (server component) pada selang tertentu tanpa
 * memuat ulang seluruh browser — dipakai papan skor live.
 * Penyegaran dihentikan saat tab disembunyikan supaya tidak membebani server.
 */
export function AutoSegar({ detik = 10 }: { detik?: number }) {
  const router = useRouter();
  const [aktif, setAktif] = useState(true);
  const [hitung, setHitung] = useState(detik);

  useEffect(() => {
    if (!aktif) return;
    const id = window.setInterval(() => {
      setHitung((n) => {
        if (n <= 1) {
          if (document.visibilityState === "visible") router.refresh();
          return detik;
        }
        return n - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [aktif, detik, router]);

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="flex items-center gap-2 text-muted">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            aktif ? "animate-pulse bg-success" : "bg-muted"
          }`}
          aria-hidden
        />
        {aktif ? `Menyegarkan dalam ${hitung} dtk` : "Penyegaran dijeda"}
      </span>
      <button
        type="button"
        onClick={() => {
          setAktif((v) => !v);
          setHitung(detik);
        }}
        className="btn btn-ghost !px-3 !py-1.5 text-xs"
      >
        {aktif ? "Jeda" : "Lanjutkan"}
      </button>
      <button
        type="button"
        onClick={() => {
          router.refresh();
          setHitung(detik);
        }}
        className="btn btn-ghost !px-3 !py-1.5 text-xs"
      >
        Segarkan sekarang
      </button>
    </div>
  );
}
