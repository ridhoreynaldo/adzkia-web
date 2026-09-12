import Link from "next/link";
import type { ReactNode } from "react";

import { Alert, Badge } from "@/components/ui";
import { LABEL_STATUS, type PaketStatus } from "@/lib/admin/admin-konstanta";

/** Pesan sukses / galat yang datang lewat query string `?pesan=` atau `?galat=`. */
export function PesanFlash({ pesan, galat }: { pesan?: string; galat?: string }) {
  if (!pesan && !galat) return null;
  return (
    <div className="mb-5 space-y-3">
      {galat && <Alert tone="danger">{galat}</Alert>}
      {pesan && <Alert tone="success">{pesan}</Alert>}
    </div>
  );
}

export function KartuStat({
  label,
  nilai,
  keterangan,
  href,
}: {
  label: string;
  nilai: ReactNode;
  keterangan?: string;
  href?: string;
}) {
  const isi = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-brand">{nilai}</p>
      {keterangan && <p className="mt-1 text-xs text-muted">{keterangan}</p>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="card block p-5 transition-colors hover:bg-surface-muted">
        {isi}
      </Link>
    );
  }
  return <div className="card p-5">{isi}</div>;
}

/** Pembungkus tabel supaya bisa digeser mendatar di layar kecil. */
export function TabelScroll({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-block min-w-full align-middle">{children}</div>
    </div>
  );
}

export function LencanaStatus({ status }: { status: PaketStatus }) {
  const tone = status === "published" ? "success" : status === "closed" ? "danger" : "warning";
  return <Badge tone={tone}>{LABEL_STATUS[status] ?? status}</Badge>;
}

/** Bar kelengkapan sederhana (terisi / target). */
export function BarKelengkapan({
  terisi,
  target,
  className = "",
}: {
  terisi: number;
  target: number;
  className?: string;
}) {
  const persen = target > 0 ? Math.min(100, Math.round((terisi / target) * 100)) : 0;
  const penuh = terisi >= target;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-surface-muted">
        <div
          className={`h-full rounded-full ${penuh ? "bg-success" : "bg-brand"}`}
          style={{ width: `${persen}%` }}
        />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${penuh ? "text-success" : "text-muted"}`}>
        {terisi}/{target}
      </span>
    </div>
  );
}

export const TH = "px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted";
export const TD = "px-3 py-2.5 align-top text-sm";
