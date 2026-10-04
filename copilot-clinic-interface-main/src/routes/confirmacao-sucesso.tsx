import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CheckCircle2, ArrowRight, ShieldCheck, Sparkles, LogIn, Stethoscope } from "lucide-react";
import { CopilotoLogo } from "@/components/brand/copiloto-logo";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/confirmacao-sucesso")({
  head: () => ({
    meta: [
      { title: "Conta Ativada com Sucesso — Copiloto Med" },
      {
        name: "description",
        content: "Sua conta no Copiloto Med foi ativada com sucesso. Acesse o painel clínico.",
      },
    ],
  }),
  component: ConfirmacaoSucessoPage,
});

function ConfirmacaoSucessoPage() {
  const navigate = useNavigate();
  const { session } = useAuth();

  return (
    <div className="flex min-h-screen w-full flex-col justify-center items-center bg-background px-4 py-12 relative overflow-hidden">
      {/* Background Decorativo Médico com Gradientes Suaves */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-10 size-[500px] rounded-full bg-emerald-500/10 blur-3xl" />

      {/* Header com Logotipo */}
      <div className="relative z-10 mb-8">
        <CopilotoLogo size="lg" />
      </div>

      {/* Card Central de Celebração de Sucesso */}
      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-400">
        <div className="rounded-3xl border border-border/80 bg-surface/95 backdrop-blur-md p-8 sm:p-10 shadow-2xl text-center space-y-6">
          {/* Badge Visual */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Sparkles className="size-3.5" />
            <span>Validação Concluída</span>
          </div>

          {/* Ícone de Sucesso Animado */}
          <div className="relative mx-auto flex size-20 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
            <div className="relative flex size-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xl shadow-emerald-500/25">
              <CheckCircle2 className="size-10 stroke-[2.2]" />
            </div>
          </div>

          {/* Textos Principais */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl leading-snug">
              Sua conta foi ativada com sucesso!
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Seu e-mail foi validado na plataforma. O ambiente clínico do Copiloto Med está pronto
              para otimizar seus atendimentos e anamneses.
            </p>
          </div>

          {/* Detalhes de Segurança e LGPD */}
          <div className="rounded-xl border border-border/70 bg-secondary/50 p-3.5 text-left flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-1.5 text-primary shrink-0 mt-0.5">
              <ShieldCheck className="size-4" />
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground block">
                Ambiente Criptografado & Seguro
              </span>
              <span>
                Prontuários e dados de triagem em estrita conformidade com a LGPD e sigilo médico.
              </span>
            </div>
          </div>

          {/* Botão Principal de Ação: Ir para o Login */}
          <div className="space-y-3 pt-2">
            <Link
              to="/login"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/95 hover:shadow-xl active:scale-[0.99] cursor-pointer"
            >
              <LogIn className="size-4.5" />
              <span>Ir para o Login</span>
              <ArrowRight className="size-4 ml-0.5" />
            </Link>

            {/* Caso o usuário já tenha sessão ativa pelo link, oferece atalho para a Home */}
            {session && (
              <button
                type="button"
                onClick={() => navigate({ to: "/" })}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-1"
              >
                Ou continuar diretamente para o painel principal →
              </button>
            )}
          </div>

          {/* Rodapé do Card */}
          <div className="pt-4 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-center gap-2">
            <Stethoscope className="size-3.5 text-primary" />
            <span>Copiloto Med • Inteligência Clínica</span>
          </div>
        </div>
      </div>
    </div>
  );
}
