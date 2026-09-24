import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Users,
  ClipboardCheck,
  CalendarDays,
  FileText,
  BarChart3,
  Settings,
  Search,
  Bell,
  ChevronDown,
  Activity,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { doctor } from "@/lib/mock-data";

const nav = [
  { to: "/", label: "Início", icon: Home },
  { to: "/pacientes", label: "Pacientes", icon: Users },
  { to: "/triagens", label: "Triagens", icon: ClipboardCheck },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/dossies", label: "Dossiês", icon: FileText },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
            <Activity className="size-5 text-primary-foreground" strokeWidth={2.4} />
          </div>
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-tight">
              Copiloto <span className="text-primary">Med</span>
            </p>
            <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
              Triagem médica inteligente
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {nav.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <item.icon className="size-4.5" strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="m-3 rounded-lg border border-border bg-primary-soft p-4">
          <p className="text-[13px] font-semibold">Plano Clínica Pro</p>
          <p className="mt-1 text-xs text-muted-foreground">
            412 de 500 triagens usadas neste mês.
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface">
            <div className="h-full w-[82%] rounded-full bg-primary" />
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen w-full flex-col lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-surface px-5">
          <div className="relative w-full max-w-lg">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar paciente por nome, CPF ou número da consulta..."
              className="h-10 w-full rounded-lg border border-input bg-background pr-16 pl-9 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            <kbd className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-muted-foreground">
              Ctrl + K
            </kbd>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              <Bell className="size-4.5" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
            </button>
            <div className="flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-1.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-[12px] font-semibold text-accent-foreground">
                {doctor.initials}
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-[13px] font-semibold">{doctor.name}</p>
                <p className="text-[11px] text-muted-foreground">{doctor.specialty}</p>
              </div>
              <ChevronDown className="size-4 text-muted-foreground" />
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
