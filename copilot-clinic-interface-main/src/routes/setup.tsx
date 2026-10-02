import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Building2,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Activity,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/contexts/tenant-context";
import { CopilotoLogo } from "@/components/brand/copiloto-logo";
import { toast } from "sonner";
import { Card, Button, Field } from "@/components/kit";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Configuração Inicial da Clínica — Copiloto Med" },
      {
        name: "description",
        content: "Configuração do primeiro acesso administrativo e cadastro da clínica.",
      },
    ],
  }),
  component: SetupPage,
});

function extractErrorMessage(err: unknown): string {
  if (!err) return "Erro desconhecido";
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const errorObj = err as Record<string, unknown>;
    const msg =
      (typeof errorObj["message"] === "string" && errorObj["message"].trim()) ||
      (typeof errorObj["error_description"] === "string" && errorObj["error_description"].trim()) ||
      (typeof errorObj["details"] === "string" && errorObj["details"].trim()) ||
      "";

    if (msg) {
      const details =
        typeof errorObj["details"] === "string" &&
        errorObj["details"].trim() &&
        errorObj["details"] !== msg
          ? ` (${errorObj["details"]})`
          : "";
      return `${msg}${details}`;
    }

    try {
      return JSON.stringify(err);
    } catch {
      return "Erro na comunicação com o banco de dados.";
    }
  }
  return String(err);
}

function SetupPage() {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { hasClinic, loading: tenantLoading, reloadTenant } = useTenant();

  const [nomeClinica, setNomeClinica] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Se o usuário já tiver uma clínica vinculada, redireciona para /configuracoes
  useEffect(() => {
    if (!authLoading && !tenantLoading && hasClinic) {
      console.log("[Setup] ✅ Usuário já possui clínica ativa vinculada. Redirecionando para /configuracoes.");
      navigate({ to: "/configuracoes" });
    }
  }, [hasClinic, authLoading, tenantLoading, navigate]);

  const handleCreateClinic = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Você precisa estar autenticado para configurar a clínica.");
      return;
    }

    const trimmedNome = nomeClinica.trim();
    if (!trimmedNome) {
      toast.error("Por favor, digite o nome da clínica.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      console.log("[Setup] 1. Criando registro na tabela clinicas com nome:", trimmedNome);

      // 1. Insert na tabela clinicas
      const { data: novaClinica, error: erroClinica } = await supabase
        .from("clinicas")
        .insert({
          nome: trimmedNome,
        })
        .select("id, nome")
        .single();

      if (erroClinica) {
        console.error("[Setup] ❌ Erro ao cadastrar clínica:", erroClinica);
        throw new Error(`Falha ao criar clínica: ${extractErrorMessage(erroClinica)}`);
      }

      console.log("[Setup] ✅ Clínica criada com sucesso! ID:", novaClinica.id);

      // 2. Insert na tabela membros_clinica vinculando usuario_id como admin_geral
      console.log(`[Setup] 2. Vinculando usuário (${user.id}) como admin_geral na clínica ${novaClinica.id}...`);

      const { data: novoMembro, error: erroMembro } = await supabase
        .from("membros_clinica")
        .insert({
          clinica_id: novaClinica.id,
          usuario_id: user.id,
          cargo: "admin_geral",
        })
        .select()
        .single();

      if (erroMembro) {
        console.error("[Setup] ❌ Erro ao vincular membros_clinica:", erroMembro);
        throw new Error(`Clínica criada, mas falhou ao vincular acesso administrativo: ${extractErrorMessage(erroMembro)}`);
      }

      console.log("[Setup] ✅ Membro admin_geral cadastrado com sucesso:", novoMembro);

      // 3. Força a recarga do TenantContext para carregar o novo vínculo no estado global
      console.log("[Setup] 3. Recarregando TenantContext global...");
      await reloadTenant();

      toast.success("Sistema configurado com sucesso!", {
        description: `Bem-vindo(a) à ${trimmedNome}. Seu acesso como Superadministrador foi liberado!`,
      });

      // 4. Redireciona para /configuracoes
      console.log("[Setup] 4. Redirecionando para /configuracoes...");
      navigate({ to: "/configuracoes" });
    } catch (err: unknown) {
      const msg = extractErrorMessage(err);
      console.error("[Setup] ❌ Erro na criação:", msg, err);
      setErrorMessage(msg);
      toast.error("Falha na configuração da clínica", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col justify-center items-center bg-background px-4 py-12 relative overflow-hidden">
      {/* Background Decorativo com Gradiente Médico */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-primary/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-10 size-[500px] rounded-full bg-primary-soft/30 blur-3xl" />

      {/* Header com Logotipo do Copiloto Med */}
      <div className="relative z-10 mb-8">
        <CopilotoLogo size="lg" badge="Setup" />
      </div>

      {/* Card Principal de Onboarding */}
      <div className="relative z-10 w-full max-w-lg">
        <Card className="p-8 sm:p-10 shadow-xl border-border/80 bg-surface">
          {/* Badge e Título */}
          <div className="text-center space-y-2 mb-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Sparkles className="size-3.5 text-primary" />
              Primeiro Acesso do Administrador
            </span>

            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Configure sua Clínica
            </h1>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
              Identificamos que seu usuário ainda não possui uma clínica vinculada no banco de dados.
              Cadastre o nome da sua instituição para liberar o acesso administrativo completo.
            </p>
          </div>

          {/* Alerta de Erro */}
          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive animate-in fade-in duration-200">
              <AlertCircle className="size-5 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs leading-relaxed">
                <p className="font-semibold">Erro ao salvar no Supabase</p>
                <p className="text-destructive/80 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Formulário de Configuração */}
          <form onSubmit={handleCreateClinic} className="space-y-6">
            <div>
              <Field
                label="Nome da Clínica ou Consultório *"
                hint="Este nome aparecerá nos dossiês clínicos, triagens e cabeçalho"
              >
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                    <Building2 className="size-4.5" />
                  </div>
                  <input
                    type="text"
                    value={nomeClinica}
                    onChange={(e) => setNomeClinica(e.target.value)}
                    placeholder="Ex: Clínica Integrada Vida & Saúde"
                    required
                    disabled={isSubmitting}
                    autoFocus
                    className="h-11 w-full rounded-xl border border-input bg-surface pl-10 pr-4 text-sm font-medium outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                  />
                </div>
              </Field>
            </div>

            {/* Box Informativo de Permissão */}
            <div className="rounded-xl border border-border/70 bg-secondary/40 p-4 flex items-start gap-3">
              <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                <p className="font-semibold text-foreground">
                  Atribuição de Acesso: <span className="text-primary font-mono">admin_geral</span>
                </p>
                <p className="mt-0.5">
                  Seu usuário atual (<span className="text-foreground font-medium">{user?.email}</span>) será
                  registrado como o Superadministrador titular na tabela <code className="font-mono text-[11px]">membros_clinica</code>.
                </p>
              </div>
            </div>

            {/* Botão de Ação */}
            <Button
              type="submit"
              disabled={isSubmitting || !nomeClinica.trim()}
              className="w-full h-11 text-sm font-semibold shadow-md cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4.5 animate-spin" />
                  Criando Clínica e Liberando Acesso...
                </>
              ) : (
                <>
                  <span>Configurar Meu Sistema</span>
                  <ArrowRight className="size-4.5" />
                </>
              )}
            </Button>
          </form>

          {/* Botão de Logout caso deseje trocar de conta */}
          <div className="mt-6 pt-5 border-t border-border/60 text-center">
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate({ to: "/login" });
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <LogOut className="size-3.5" />
              Sair desta conta e entrar com outro e-mail
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
