import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
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
  LogOut,
  Loader2,
  User,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CopilotoLogo, CopilotoIcon } from "@/components/brand/copiloto-logo";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { currentClinic, cargoLabel, isAdmin } = usePermissions();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      toast.success("Sessão encerrada com sucesso!", {
        description: "Você desconectou da sua conta no Copiloto Med.",
      });
      navigate({ to: "/login" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Erro ao encerrar sessão:", {
        description: msg,
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar de navegação */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border/60">
          <CopilotoLogo
            size="md"
            clinicName={currentClinic?.nome ?? "Copiloto Med"}
            badge={cargoLabel}
          />
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-3">
          {nav.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
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
          <p className="text-[13px] font-semibold">
            {currentClinic?.plano ? `Plano ${currentClinic.plano}` : "Plano Pro"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {currentClinic?.nome ?? "Unidade Ativa"}
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface">
            <div className="h-full w-[82%] rounded-full bg-primary" />
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen w-full flex-col lg:pl-60">
        {/* Header principal com busca e perfil dinâmico */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-surface px-5">
          <div className="lg:hidden shrink-0">
            <CopilotoIcon size="sm" />
          </div>
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
            <button
              type="button"
              className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
              aria-label="Notificações"
            >
              <Bell className="size-4.5" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
            </button>

            {/* Menu Dropdown Dinâmico do Perfil Autenticado */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-1.5 text-left transition-colors hover:bg-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  aria-label="Menu do usuário"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-[12px] font-semibold text-accent-foreground select-none">
                    {profile.initials}
                  </div>
                  <div className="hidden leading-tight sm:block">
                    <p className="text-[13px] font-semibold text-foreground truncate max-w-[140px]">
                      {profile.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                      {cargoLabel}
                    </p>
                  </div>
                  <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64 p-1.5">
                <DropdownMenuLabel className="font-normal px-2.5 py-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {profile.name}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
                        <span className="size-1.5 rounded-full bg-success" />
                        Conectado
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {profile.email || "Usuário Conectado"}
                    </p>
                    <p className="text-[11px] text-primary font-medium mt-0.5 truncate">
                      {currentClinic?.nome ?? "Clínica Integrada"} • {cargoLabel}
                    </p>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link
                    to="/configuracoes/perfil"
                    className="flex w-full items-center gap-2.5 px-2.5 py-2 text-xs font-medium cursor-pointer"
                  >
                    <User className="size-4 text-muted-foreground" />
                    <span>Meu Perfil</span>
                  </Link>
                </DropdownMenuItem>

                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link
                      to="/configuracoes"
                      className="flex w-full items-center gap-2.5 px-2.5 py-2 text-xs font-medium cursor-pointer"
                    >
                      <Settings className="size-4 text-muted-foreground" />
                      <span>Configurações da clínica</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem asChild>
                  <Link
                    to="/pacientes"
                    className="flex w-full items-center gap-2.5 px-2.5 py-2 text-xs font-medium cursor-pointer"
                  >
                    <Users className="size-4 text-muted-foreground" />
                    <span>Gerenciar pacientes</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                >
                  {isLoggingOut ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Encerrando sessão...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="size-4" />
                      <span>Sair (Logout)</span>
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
