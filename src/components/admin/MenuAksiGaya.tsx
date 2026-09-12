/**
 * Gaya baris untuk isi `<MenuAksi>` — SENGAJA di berkas terpisah, tanpa
 * `"use client"`.
 *
 * JANGAN DISATUKAN KEMBALI DENGAN `MenuAksi.tsx`. Berkas itu bertanda
 * `"use client"`, dan seluruh isi berkas berpenanda itu menjadi milik klien —
 * termasuk fungsi biasa seperti `nadaMenu()`. Halaman daftar paket adalah
 * komponen SERVER dan memanggil `nadaMenu()` saat merender, sehingga
 * penyatuannya menghasilkan galat yang membingungkan:
 *
 *   "Attempted to call nadaMenu() from the server but nadaMenu is on the
 *    client. It's not possible to invoke a client function from the server."
 *
 * Yang benar-benar butuh berjalan di peramban hanyalah `MenuAksi` sendiri —
 * ia menyimpan keadaan buka/tutup dan mendengarkan ketukan di luar. Gaya dan
 * pemisah di bawah murni tampilan, jadi keduanya tinggal di sisi server.
 */

/** Bentuk dasar satu baris menu; disamakan untuk tautan maupun tombol submit. */
export const BARIS_MENU =
  "flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] font-semibold transition-colors";

/**
 * Warna satu baris menu menurut akibatnya.
 *
 * `awas` dan `bahaya` bukan hiasan: keduanya dipakai untuk aksi yang menghapus
 * data, dan warnanya adalah rem terakhir sebelum pengelola menekan sesuatu yang
 * tidak bisa dibatalkan.
 */
export function nadaMenu(nada: "biasa" | "sukses" | "awas" | "bahaya" = "biasa"): string {
  if (nada === "sukses") return `${BARIS_MENU} text-success hover:bg-success-soft`;
  if (nada === "awas") return `${BARIS_MENU} text-warning hover:bg-warning-soft`;
  if (nada === "bahaya") return `${BARIS_MENU} text-danger hover:bg-danger-soft`;
  return `${BARIS_MENU} text-foreground hover:bg-surface-muted`;
}

/** Garis pemisah antar kelompok aksi di dalam menu. */
export function PemisahMenu() {
  return <div className="my-1 border-t border-line" aria-hidden />;
}
