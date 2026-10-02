import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Activity,
  Lock,
  Mail,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Stethoscope,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CopilotoLogo } from "@/components/brand/copiloto-logo";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Acesso Seguro — Copiloto Med" },
      {
        name: "description",
        content: "Faça login ou crie sua conta profissional no Copiloto Med.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Campos de Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Campos de Cadastro
  const [registerName, setRegisterName] = useState("");
  const [registerSpecialty, setRegisterSpecialty] = useState("Clínica Geral");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");

  // Se já estiver autenticado, redireciona para a raiz
  useEffect(() => {
    if (!authLoading && session) {
      navigate({ to: "/" });
    }
  }, [session, authLoading, navigate]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const email = loginEmail.trim();
    const password = loginPassword;

    if (!email || !password) {
      setErrorMessage("Por favor, preencha o e-mail e a senha.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Tratamento elegante e específico de credenciais incorretas
        if (
          error.message.toLowerCase().includes("invalid login credentials") ||
          error.message.toLowerCase().includes("invalid credentials")
        ) {
          throw new Error("E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.");
        }
        if (error.message.toLowerCase().includes("email not confirmed")) {
          throw new Error("Este e-mail ainda não foi confirmado. Verifique sua caixa de entrada.");
        }
        throw error;
      }

      const userName = data.user?.user_metadata?.["full_name"] || data.user?.email || "Médico(a)";
      toast.success("Acesso autenticado com sucesso!", {
        description: `Bem-vindo(a) de volta, ${userName}.`,
      });

      // Redireciona para a tela inicial
      navigate({ to: "/" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Login] Erro ao autenticar:", msg);
      setErrorMessage(msg);
      toast.error("Falha no acesso", {
        description: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const name = registerName.trim();
    const specialty = registerSpecialty.trim();
    const email = registerEmail.trim();
    const password = registerPassword;
    const confirmPassword = registerConfirmPassword;

    if (!name) {
      setErrorMessage("Informe seu nome completo.");
      return;
    }
    if (!email) {
      setErrorMessage("Informe um endereço de e-mail corporativo ou médico.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("As senhas informadas não coincidem.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            name,
            specialty: specialty || "Clínica Geral",
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("user already registered")) {
          throw new Error("Já existe uma conta cadastrada com este e-mail. Tente fazer login.");
        }
        throw error;
      }

      if (data.session) {
        toast.success("Conta criada e autenticada com sucesso!", {
          description: `Bem-vindo(a) ao Copiloto Med, ${name}.`,
        });
        navigate({ to: "/" });
      } else {
        // Caso o Supabase esteja com email confirmation ligado
        setSuccessNotice(
          "Conta criada com sucesso! Enviamos um link de confirmação para o seu e-mail. Por favor, confirme seu cadastro para entrar.",
        );
        toast.success("Cadastro realizado!", {
          description: "Verifique seu e-mail para ativar sua conta.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Registro] Erro:", msg);
      setErrorMessage(msg);
      toast.error("Erro no cadastro", {
        description: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Lado Esquerdo: Banner Profissional Médico (Desktop) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary/5 p-12 lg:flex border-r border-border">
        {/* Fundo com gradiente sutil e formas modernas */}
        <div className="absolute -top-32 -left-32 size-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <CopilotoLogo size="lg" />
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="size-4" />
            <span>Ambiente Seguro • Supabase Auth</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl leading-tight">
            Tecnologia clínica que organiza seu atendimento antes da consulta.
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Acesse o prontuário estruturado, dossiês automatizados de anamnese e gerencie seus
            pacientes com total segurança e conformidade LGPD.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/80">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 rounded-md bg-primary/15 p-1 text-primary">
                <Stethoscope className="size-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Triagem Automatizada</p>
                <p className="text-[11px] text-muted-foreground">Coleta orientada de queixas</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 rounded-md bg-primary/15 p-1 text-primary">
                <Sparkles className="size-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Dossiês com IA</p>
                <p className="text-[11px] text-muted-foreground">Resumos clínicos precisos</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-muted-foreground pt-6 border-t border-border">
          <span>© {new Date().getFullYear()} Copiloto Med. Todos os direitos reservados.</span>
          <span className="flex items-center gap-1 font-mono text-[11px]">
            <ShieldCheck className="size-3.5 text-primary" /> Sessão Criptografada
          </span>
        </div>
      </div>

      {/* Lado Direito: Formulário de Autenticação */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-20">
        <div className="mx-auto w-full max-w-md">
          {/* Logo mobile */}
          <CopilotoLogo size="md" className="mb-8 lg:hidden" />

          {/* Seletor de Modo: Entrar / Criar Conta */}
          <div className="mb-6 flex rounded-xl bg-secondary p-1 border border-border">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMessage(null);
                setSuccessNotice(null);
              }}
              className={cn(
                "flex-1 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer",
                mode === "login"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Entrar na conta
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErrorMessage(null);
                setSuccessNotice(null);
              }}
              className={cn(
                "flex-1 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer",
                mode === "register"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Criar conta
            </button>
          </div>

          {/* Cabeçalho do Form */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {mode === "login" ? "Acesse seu painel clínico" : "Crie seu perfil profissional"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "login"
                ? "Entre com suas credenciais do Supabase para acessar pacientes e triagens."
                : "Cadastre seu e-mail para iniciar atendimentos e triagens na plataforma."}
            </p>
          </div>

          {/* Alerta de Erro Visual (Trata especificamente credenciais inválidas) */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive animate-in fade-in slide-in-from-top-2"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="font-semibold block mb-0.5">Erro na autenticação</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Alerta de Sucesso */}
          {successNotice && (
            <div
              role="status"
              className="mb-5 flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-3.5 text-xs text-success animate-in fade-in slide-in-from-top-2"
            >
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="font-semibold block mb-0.5">Verifique seu e-mail</strong>
                <span>{successNotice}</span>
              </div>
            </div>
          )}

          {/* FORMULÁRIO DE LOGIN */}
          {mode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">
                  E-mail profissional
                </label>
                <div className="relative">
                  <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="medico@vidaintegrada.com.br"
                    required
                    autoComplete="email"
                    className="h-10 w-full rounded-lg border border-input bg-surface pr-3 pl-9 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-foreground block">
                    Senha
                  </label>
                  <span className="text-[11px] text-muted-foreground cursor-default">
                    Mínimo 6 caracteres
                  </span>
                </div>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="h-10 w-full rounded-lg border border-input bg-surface pr-10 pl-9 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Autenticando no Supabase...</span>
                  </>
                ) : (
                  <>
                    <Lock className="size-3.5" />
                    <span>Acessar Painel Clínico</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* FORMULÁRIO DE REGISTRO */}
          {mode === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Nome completo <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Ex: Dra. Ana Beatriz"
                    required
                    className="h-9 w-full rounded-lg border border-input bg-surface pr-3 pl-9 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Especialidade Médica
                </label>
                <div className="relative">
                  <Stethoscope className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={registerSpecialty}
                    onChange={(e) => setRegisterSpecialty(e.target.value)}
                    placeholder="Ex: Clínica Geral, Cardiologia..."
                    className="h-9 w-full rounded-lg border border-input bg-surface pr-3 pl-9 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  E-mail institucional <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="doutor@vidaintegrada.com.br"
                    required
                    autoComplete="email"
                    className="h-9 w-full rounded-lg border border-input bg-surface pr-3 pl-9 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Senha <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="Mín. 6 dígitos"
                    required
                    autoComplete="new-password"
                    className="h-9 w-full rounded-lg border border-input bg-surface px-3 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Confirmar Senha <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="password"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    required
                    autoComplete="new-password"
                    className="h-9 w-full rounded-lg border border-input bg-surface px-3 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Criando conta no Supabase...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    <span>Criar Conta Profissional</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-8 rounded-lg bg-secondary/60 border border-border p-3 text-center">
            <p className="text-[11px] text-muted-foreground">
              Acesso exclusivo para profissionais da saúde credenciados. Dados protegidos conforme a
              Lei Geral de Proteção de Dados (LGPD).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
