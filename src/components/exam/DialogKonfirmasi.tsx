"use client";

import { useEffect, useRef } from "react";

interface Props {
  terbuka: boolean;
  judul: string;
  children: React.ReactNode;
  labelYa: string;
  labelBatal?: string;
  memproses?: boolean;
  onYa: () => void;
  onBatal: () => void;
}

export function DialogKonfirmasi({
  terbuka,
  judul,
  children,
  labelYa,
  labelBatal = "Kembali ke soal",
  memproses = false,
  onYa,
  onBatal,
}: Props) {
  const tombolBatal = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!terbuka) return;
    tombolBatal.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBatal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [terbuka, onBatal]);

  if (!terbuka) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onBatal();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="judul-dialog-ujian"
        className="card w-full max-w-md p-6 shadow-xl"
      >
        <h2 id="judul-dialog-ujian" className="text-lg font-extrabold tracking-tight">
          {judul}
        </h2>
        <div className="mt-2 text-sm text-muted">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={tombolBatal}
            type="button"
            className="btn btn-ghost focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            onClick={onBatal}
            disabled={memproses}
          >
            {labelBatal}
          </button>
          <button
            type="button"
            className="btn btn-primary focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            onClick={onYa}
            disabled={memproses}
          >
            {memproses ? "Memproses…" : labelYa}
          </button>
        </div>
      </div>
    </div>
  );
}
