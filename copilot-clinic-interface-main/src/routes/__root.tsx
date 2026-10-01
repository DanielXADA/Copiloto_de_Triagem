import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Activity, Loader2 } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/use-auth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O endereço acessado não existe ou foi movido.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Falha no carregamento da página
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocorreu um erro inesperado. Tente recarregar ou retornar para a página inicial.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir para início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Copiloto Med — Triagem médica inteligente" },
      {
        name: "description",
        content:
          "Plataforma de pré-atendimento que estrutura sintomas e gera dossiês clínicos antes da consulta.",
      },
      { property: "og:title", content: "Copiloto Med — Triagem médica inteligente" },
      {
        property: "og:description",
        content: "Pré-atendimento automatizado e dossiês clínicos para clínicas particulares.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Route Guard de Autenticação Segura
 * Garante que nenhuma rota protegida seja exibida sem sessão válida no Supabase.
 * Se não autenticado, redireciona compulsoriamente para /login.
 * AppShell só é instanciado para usuários autenticados.
 */
function AuthRouteGuard() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!loading) {
      if (!session && !isLoginPage) {
        // Redirecionamento obrigatório para /login
        navigate({ to: "/login" as string });
      } else if (session && isLoginPage) {
        // Redireciona usuário autenticado para a home
        navigate({ to: "/" as string });
      }
    }
  }, [session, loading, isLoginPage, navigate]);

  // 1. Enquanto valida a sessão do Supabase: tela de loading suave
  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
          <Activity className="size-6 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          <span>Verificando credenciais e permissões clínicas...</span>
        </div>
      </div>
    );
  }

  // 2. Rota pública de login/cadastro: renderiza diretamente sem AppShell
  if (isLoginPage) {
    return <Outlet />;
  }

  // 3. Usuário não autenticado: impede exposição do dashboard enquanto o redirecionamento ocorre
  if (!session) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background gap-2">
        <Loader2 className="size-5 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Redirecionando para login seguro...</span>
      </div>
    );
  }

  // 4. Usuário autenticado: renderiza o AppShell completo com as rotas protegidas
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthRouteGuard />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
