"use client";

/** Cetak / unduh PDF lewat dialog cetak peramban (Simpan sebagai PDF). */
export function TombolCetak({ label = "Cetak / Unduh PDF" }: { label?: string }) {
  return (
    <button type="button" className="btn btn-ghost no-print" onClick={() => window.print()}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M6 9V2h12v7" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v8H6z" />
      </svg>
      {label}
    </button>
  );
}
