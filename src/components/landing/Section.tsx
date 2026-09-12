import type { ReactNode } from "react";

/** Pembungkus satu bagian halaman depan supaya jarak & lebar konsisten. */
export function Section({
  id,
  children,
  className = "",
  tone = "default",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  tone?: "default" | "muted";
}) {
  return (
    <section
      id={id}
      className={`${tone === "muted" ? "bg-surface-muted/60" : ""} scroll-mt-20 ${className}`}
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={`${align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"} mb-10`}>
      {eyebrow && (
        <span className="inline-flex items-center rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand">
          {eyebrow}
        </span>
      )}
      <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
      {description && <p className="mt-3 text-muted leading-relaxed">{description}</p>}
    </div>
  );
}
