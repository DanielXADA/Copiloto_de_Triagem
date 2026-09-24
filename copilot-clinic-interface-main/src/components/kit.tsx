import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("card-flat", className)}>{children}</div>;
}

export function CardHead({
  title,
  action,
  subtitle,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const toneMap = {
  neutral: "bg-secondary text-secondary-foreground",
  blue: "bg-primary-soft text-accent-foreground",
  green: "bg-success/12 text-success",
  amber: "bg-warning/15 text-warning",
  red: "bg-destructive/10 text-destructive",
} as const;

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof toneMap;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium",
        toneMap[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "outline";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-border bg-surface hover:bg-secondary",
    ghost: "hover:bg-secondary text-muted-foreground hover:text-foreground",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

const avatarTints = [
  "bg-primary-soft text-accent-foreground",
  "bg-success/12 text-success",
  "bg-warning/15 text-warning",
  "bg-secondary text-secondary-foreground",
];

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initial = name.charAt(0).toUpperCase();
  const tint = avatarTints[name.length % avatarTints.length];
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold",
        tint,
        className,
      )}
    >
      {initial}
    </div>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-secondary", className)}>
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span> : null}
      <div className="mt-2">{children}</div>
    </label>
  );
}

export function Input({
  defaultValue,
  placeholder,
  value,
  onChange,
  className,
}: {
  defaultValue?: string;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  className?: string;
}) {
  return (
    <input
      defaultValue={defaultValue}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      className={cn(
        "h-9 w-full rounded-lg border border-input bg-surface px-3 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15",
        className,
      )}
    />
  );
}

export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
        on ? "bg-primary" : "bg-border",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-4 rounded-full bg-surface transition-all",
          on ? "left-4.5" : "left-0.5",
        )}
      />
    </button>
  );
}
