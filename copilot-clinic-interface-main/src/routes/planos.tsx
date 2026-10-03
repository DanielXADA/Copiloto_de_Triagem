import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Check,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  Loader2,
  Stethoscope,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CopilotoLogo } from "@/components/brand/copiloto-logo";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos de Assinatura — Copiloto Med" },
      {
        name: "description",
        content: "Escolha o plano ideal para sua clínica e revolucione o atendimento pré-consulta com IA.",
      },
    ],
  }),
  component: PlanosPage,
});

function PlanosPage() {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSelectPlan = async (planName: "basico" | "pro") => {
    setLoadingPlan(planName);

    try {
      // Simulação de transação/ativacao de plano
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (typeof window !== "undefined") {
        localStorage.setItem("copiloto_selected_plan", planName);
      }

      if (planName === "pro") {
        toast.success("Assinatura Copiloto Pro ativada com sucesso!", {
          description: "Acesso completo a Dossiês com IA e triagem ilimitada liberados.",
        });
      } else {
        toast.success("Plano Básico selecionado!", {
          description: "Você pode atualizar para o Pro a qualquer momento.",
        });
      }

      // Redireciona para o onboarding da clínica (/setup)
      navigate({ to: "/setup" });
    } catch (_err) {
      toast.error("Erro ao selecionar plano. Tente novamente.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8">
      {/* Cabeçalho superior */}
      <div className="mx-auto w-full max-w-6xl flex items-center justify-between">
        <CopilotoLogo size="lg" />
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-medium text-primary">
          <ShieldCheck className="size-4" />
          <span>7 dias de garantia • Cancele quando quiser</span>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="mx-auto w-full max-w-5xl my-8 space-y-8 text-center">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground border border-border">
            <Zap className="size-3.5 text-primary" />
            <span>Passo 1 de 2 • Escolha seu plano de acesso</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Escolha o plano ideal para a sua clínica
          </h1>
          <p className="mx-auto max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed">
            Economize horas de anamnese estruturando sintomas e anamnese antes do paciente entrar no consultório.
          </p>
        </div>

        {/* Cards dos Planos */}
        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto pt-4 text-left">
          {/* PLANO 1: BÁSICO (GRÁTIS) */}
          <div className="relative flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xs transition-all hover:border-border/80">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  Grátis
                </span>
                <Building2 className="size-5 text-muted-foreground" />
              </div>

              <h3 className="mt-4 text-xl font-bold text-foreground">Plano Básico</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Ideal para profissionais autônomos iniciando organização digital.
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-foreground">R$ 0</span>
                <span className="text-xs text-muted-foreground">/mês</span>
              </div>

              <ul className="mt-6 space-y-3 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-500 shrink-0" />
                  <span>Agenda simples semanal e compromissos</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-500 shrink-0" />
                  <span>Até 50 pacientes cadastrados</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-500 shrink-0" />
                  <span>Pré-triagem manual sem resumos de IA</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground/60">
                  <span className="size-4 flex items-center justify-center text-[10px] text-muted-foreground">✕</span>
                  <span>Sem Dossiês Automáticos com IA</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              disabled={loadingPlan !== null}
              onClick={() => handleSelectPlan("basico")}
              className="mt-8 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary text-xs font-semibold text-foreground transition-all hover:bg-secondary/80 focus:outline-none disabled:opacity-50 cursor-pointer"
            >
              {loadingPlan === "basico" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <span>Começar com Básico</span>
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </button>
          </div>

          {/* PLANO 2: COPILOTO PRO (R$ 97/mês) */}
          <div className="relative flex flex-col justify-between rounded-2xl border-2 border-primary bg-gradient-to-b from-primary/10 via-surface to-surface p-6 sm:p-8 shadow-xl shadow-primary/10 transition-all">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-primary-foreground shadow-sm flex items-center gap-1">
              <Sparkles className="size-3" />
              <span>Mais Popular • Recomendado</span>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-primary/20 px-2.5 py-1 text-xs font-bold text-primary">
                  Copiloto Pro
                </span>
                <Stethoscope className="size-5 text-primary" />
              </div>

              <h3 className="mt-4 text-xl font-bold text-foreground">Copiloto Pro</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Inteligência clínica completa para sua consulta rende 3x mais.
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-foreground">R$ 97</span>
                <span className="text-xs text-muted-foreground">/mês por clínica</span>
              </div>

              <ul className="mt-6 space-y-3 text-xs font-medium text-foreground/90">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary shrink-0" />
                  <span><strong>Triagem Médica com IA Ilimitada</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary shrink-0" />
                  <span><strong>Dossiês Clínicos Automatizados</strong> em segundos</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary shrink-0" />
                  <span>Controle Realtime de Check-in na Recepção</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary shrink-0" />
                  <span>Pacientes e prontuários ilimitados</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary shrink-0" />
                  <span>Suporte prioritário e conformidade LGPD</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              disabled={loadingPlan !== null}
              onClick={() => handleSelectPlan("pro")}
              className="mt-8 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/95 hover:shadow-lg focus:outline-none disabled:opacity-50 cursor-pointer"
            >
              {loadingPlan === "pro" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="size-4" />
                  <span>Assinar Copiloto Pro (R$ 97/mês)</span>
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Rodapé sutil */}
      <div className="mx-auto w-full max-w-5xl text-center text-xs text-muted-foreground pt-4 border-t border-border/60">
        <span>© {new Date().getFullYear()} Copiloto Med. Todos os direitos reservados. Suporte em suporte@copilotomed.com.br</span>
      </div>
    </div>
  );
}
