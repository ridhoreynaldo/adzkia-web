import type { ReactNode } from "react";

/**
 * Pembungkus warna per jalur.
 *
 * Seluruh komponen memakai var(--brand)/var(--accent), jadi cukup memasang
 * kelas `tema-skd` di satu elemen pembungkus untuk mengubah seisi halaman
 * jadi maroon–oranye tanpa perlu versi komponen tersendiri.
 */
export function Tema({
  jalur,
  children,
  className = "",
}: {
  jalur: "utbk" | "skd";
  children: ReactNode;
  className?: string;
}) {
  if (jalur !== "skd") return <>{children}</>;
  return <div className={`tema-skd bg-background ${className}`}>{children}</div>;
}
