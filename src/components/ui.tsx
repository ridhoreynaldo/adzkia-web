import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

type Tone = "brand" | "accent" | "success" | "danger" | "warning" | "muted";

const TONE: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  muted: "bg-surface-muted text-muted",
};

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[tone]}`}>
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="card p-10 text-center">
      <p className="font-semibold">{title}</p>
      {description && <p className="text-muted text-sm mt-1.5 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Alert({ children, tone = "danger" }: { children: ReactNode; tone?: Tone }) {
  return <div className={`rounded-xl px-4 py-3 text-sm font-medium ${TONE[tone]}`}>{children}</div>;
}
