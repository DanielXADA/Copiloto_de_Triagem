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
  ChevronLeft,
  ChevronRight,
  LogOut,
  Loader2,
  User,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
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

  // Controle de estado recolhido da sidebar (persistente no localStorage)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("copiloto_sidebar_collapsed") === "true";
    }
    return false;
  });

  // Gaveta lateral para visualização mobile
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fecha menu mobile ao mudar de rota
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("copiloto_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

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
      {/* Sidebar Desktop com suporte a Minimizar/Expandir */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 hidden flex-col border-r border-border bg-surface transition-all duration-300 z-30 lg:flex",
          isCollapsed ? "w-[68px]" : "w-60",
        )}
      >
        {/* Botão circular flutuante na borda direita da sidebar */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute -right-3 top-5 z-40 flex size-6 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground shadow-xs transition-all hover:bg-secondary hover:text-foreground hover:scale-110 focus:outline-none cursor-pointer"
          title={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          aria-label={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
        >
          {isCollapsed ? (
            <ChevronRight className="size-3.5" />
          ) : (
            <ChevronLeft className="size-3.5" />
          )}
        </button>

        {/* Cabeçalho da Sidebar */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-border/60 transition-all overflow-hidden",
            isCollapsed ? "justify-center px-2" : "px-4",
          )}
        >
          {isCollapsed ? (
            <Link
              to="/"
              className="flex items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-secondary/60 focus:outline-none"
              title={currentClinic?.nome ?? "Copiloto Med"}
            >
              <CopilotoIcon size="sm" />
            </Link>
          ) : (
            <Link
              to="/"
              className="flex items-center overflow-hidden focus:outline-none"
            >
              <CopilotoLogo
                size="md"
                clinicName={currentClinic?.nome ?? "Copiloto Med"}
                badge={cargoLabel}
              />
            </Link>
          )}
        </div>

        {/* Links de Navegação */}
        <nav className="flex flex-1 flex-col gap-1.5 px-2.5 py-3 overflow-y-auto">
          {nav.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={item.label}
                className={cn(
                  "flex items-center rounded-lg text-[13px] font-medium transition-colors cursor-pointer",
                  isCollapsed
                    ? "justify-center px-2.5 py-2.5"
                    : "gap-3 px-3 py-2.5",
                  active
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <item.icon className="size-4.5 shrink-0" strokeWidth={2} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Card do Plano no Rodapé (oculto quando colapsada) */}
        {!isCollapsed && (
          <div className="p-2.5 border-t border-border/60 animate-in fade-in duration-150">
            <div className="rounded-lg border border-border bg-primary-soft p-3.5">
              <p className="text-[13px] font-semibold text-foreground truncate">
                {currentClinic?.plano ? `Plano ${currentClinic.plano}` : "Plano Pro"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground truncate">
                {currentClinic?.nome ?? "Unidade Ativa"}
              </p>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                <div className="h-full w-[82%] rounded-full bg-primary" />
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Drawer Mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-surface p-5 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <CopilotoLogo
                size="sm"
                clinicName={currentClinic?.nome ?? "Copiloto Med"}
                badge={cargoLabel}
              />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1.5 py-4">
              {nav.map((item) => {
                const active = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
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
          </div>
        </div>
      )}

      {/* Conteúdo Principal com Largura 100% Total (Sem restrição max-w) */}
      <div
        className={cn(
          "flex min-h-screen w-full flex-col transition-all duration-300",
          isCollapsed ? "lg:pl-[68px]" : "lg:pl-60",
        )}
      >
        {/* Header principal com busca e perfil dinâmico */}
        <header className="sticky top-0 z-20 flex h-16 w-full items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
          {/* Botão Mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden cursor-pointer"
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>

          {/* Busca Global */}
          <div className="relative w-full max-w-md">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar paciente por nome, CPF ou consulta..."
              className="h-9.5 w-full rounded-lg border border-input bg-background pr-16 pl-9 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            <kbd className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-muted-foreground hidden sm:inline-block">
              Ctrl + K
            </kbd>
          </div>

          <div className="ml-auto flex items-center gap-2.5 sm:gap-3">
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

        {/* Layout com Limite Amigável para Telas Ultrawide (max-w-[1600px] mx-auto) */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
