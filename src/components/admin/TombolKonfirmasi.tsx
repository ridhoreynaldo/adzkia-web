"use client";

import { useFormStatus } from "react-dom";

/**
 * Tombol submit untuk aksi merusak. Meminta konfirmasi dulu lewat dialog
 * bawaan peramban, lalu menampilkan status "Memproses…" selama aksi berjalan.
 */
export function TombolKonfirmasi({
  pesan,
  children,
  className = "btn btn-ghost py-1.5! px-3! text-xs text-danger!",
  title,
}: {
  pesan: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      title={title}
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (!window.confirm(pesan)) e.preventDefault();
      }}
    >
      {pending ? "Memproses…" : children}
    </button>
  );
}

/** Tombol submit biasa dengan indikator pending. */
export function TombolAksi({
  children,
  className = "btn btn-ghost py-1.5! px-3! text-xs",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" title={title} disabled={pending} className={className}>
      {children}
    </button>
  );
}
