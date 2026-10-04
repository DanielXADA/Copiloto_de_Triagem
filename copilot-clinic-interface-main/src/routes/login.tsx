import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
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
  RotateCw,
  ArrowLeft,
  MailCheck,
  Info,
  Send,
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
        content: "Faça login com Link Mágico ou senha no Copiloto Med.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();

  // Modos de autenticação: 'magic-link' (sem senha), 'password' (senha), 'register' (criar conta), 'forgot-password' (recuperação)
  const [mode, setMode] = useState<"magic-link" | "password" | "register" | "forgot-password">("magic-link");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Estados específicos de Magic Link
  const [magicEmail, setMagicEmail] = useState("");
  const [magicName, setMagicName] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Campos de Login por Senha
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Campos de Recuperação de Senha
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);

  // Campos de Cadastro
  const [registerName, setRegisterName] = useState("");
  const [registerSpecialty, setRegisterSpecialty] = useState("Clínica Geral");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");

  // Redireciona para Home se já estiver autenticado
  useEffect(() => {
    if (!authLoading && session) {
      navigate({ to: "/" });
    }
  }, [session, authLoading, navigate]);

  /**
   * Envia o Magic Link padrão para o e-mail informado
   */
  const handleSendMagicLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const email = magicEmail.trim();
    const name = magicName.trim();

    if (!email) {
      setErrorMessage("Por favor, informe seu endereço de e-mail.");
      return;
    }

    setSubmitting(true);
    try {
      const options: {
        emailRedirectTo?: string;
        shouldCreateUser?: boolean;
        data?: Record<string, unknown>;
      } = {
        shouldCreateUser: true,
      };

      if (typeof window !== "undefined") {
        options.emailRedirectTo = `${window.location.origin}/`;
      }

      if (name) {
        options.data = {
          full_name: name,
          name: name,
        };
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options,
      });

      if (error) {
        if (
          error.message.toLowerCase().includes("rate limit") ||
          error.message.toLowerCase().includes("over_email_send_rate_limit") ||
          error.message.toLowerCase().includes("seconds")
        ) {
          throw new Error(
            "Limite de envios atingido temporariamente. Por segurança, aguarde alguns instantes antes de solicitar novamente.",
          );
        }
        if (error.message.toLowerCase().includes("signups not allowed")) {
          throw new Error("Novos cadastros estão desativados nas configurações do Supabase.");
        }
        throw error;
      }

      setMagicLinkSent(true);
      toast.success("Link de acesso enviado!", {
        description: "Verifique sua caixa de entrada pelo celular ou computador.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[MagicLink] Erro ao enviar link:", msg);
      setErrorMessage(msg);
      toast.error("Falha ao enviar link de acesso", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Login tradicional por e-mail e senha
   */
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
        const lower = error.message.toLowerCase();
        if (
          lower.includes("email not confirmed") ||
          lower.includes("email_not_confirmed") ||
          lower.includes("unconfirmed") ||
          lower.includes("confirm your email")
        ) {
          throw new Error("Verifique seu e-mail e clique no link para confirmar sua conta. Se já confirmou, tente novamente.");
        }
        if (
          lower.includes("invalid login credentials") ||
          lower.includes("invalid credentials")
        ) {
          throw new Error("E-mail ou senha incorretos. Verifique suas credenciais ou solicite um Link Mágico.");
        }
        throw error;
      }

      const userName = data.user?.user_metadata?.["full_name"] || data.user?.email || "Médico(a)";
      toast.success("Acesso autenticado com sucesso!", {
        description: `Bem-vindo(a) de volta, ${userName}.`,
      });

      navigate({ to: "/" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Login] Erro ao autenticar:", msg);
      setErrorMessage(msg);
      toast.error("Falha no acesso", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Envia link de redefinição de senha para o e-mail informado
   */
  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const email = recoveryEmail.trim();

    if (!email) {
      setErrorMessage("Por favor, informe seu endereço de e-mail.");
      return;
    }

    setSubmitting(true);
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/login`
          : "";

      const { error } = await supabase.auth.resetPasswordForEmail(
        email,
        redirectTo ? { redirectTo } : undefined
      );

      if (error) {
        if (
          error.message.toLowerCase().includes("rate limit") ||
          error.message.toLowerCase().includes("over_email_send_rate_limit") ||
          error.message.toLowerCase().includes("seconds")
        ) {
          throw new Error(
            "Limite de envios atingido temporariamente. Por segurança, aguarde alguns instantes antes de solicitar novamente."
          );
        }
        throw error;
      }

      setRecoverySent(true);
      toast.success("Link de recuperação enviado!", {
        description: "Confira as instruções enviadas para sua caixa de entrada e spam.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Recuperação de Senha] Erro:", msg);
      setErrorMessage(msg);
      toast.error("Falha ao enviar recuperação", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Cadastro com Senha
   */
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
      const cleanEmail = email.toLowerCase().trim();

      // =========================================================================
      // ETAPA DE PRE-CHECK: Valida se o e-mail já existe antes de disparar o signUp
      // =========================================================================
      let emailJaExiste = false;

      // 1. Consulta (select) na tabela 'perfis' usando o e-mail digitado
      try {
        const { data: perfilExistente, error: erroPerfil } = await supabase
          .from("perfis")
          .select("id")
          .eq("email", cleanEmail)
          .maybeSingle();

        if (!erroPerfil && perfilExistente) {
          emailJaExiste = true;
        }
      } catch (errCheck) {
        // Fallback resiliente caso a tabela perfis ainda não possua a coluna email no banco legado
      }

      // 2. Consulta complementar na tabela 'perfis_usuarios'
      if (!emailJaExiste) {
        try {
          const { data: usuarioExistente, error: erroUsuario } = await supabase
            .from("perfis_usuarios")
            .select("id")
            .eq("email", cleanEmail)
            .maybeSingle();

          if (!erroUsuario && usuarioExistente) {
            emailJaExiste = true;
          }
        } catch (errCheck2) {
          // Ignora se tabela ou coluna não estiver acessível
        }
      }

      // Se o e-mail já existir, aborta o fluxo e exibe o erro em vermelho
      if (emailJaExiste) {
        const erroDuplicado = "Este e-mail já possui cadastro. Por favor, acesse a aba de Login.";
        setErrorMessage(erroDuplicado);
        toast.error("Cadastro não permitido", {
          description: erroDuplicado,
          duration: 8000,
        });
        setSubmitting(false);
        return;
      }

      const confirmationRedirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/confirmacao-sucesso`
          : "";

      const signUpOptions: {
        emailRedirectTo?: string;
        data: {
          full_name: string;
          name: string;
          specialty: string;
        };
      } = {
        data: {
          full_name: name,
          name,
          specialty: specialty || "Clínica Geral",
        },
      };

      if (confirmationRedirectUrl) {
        signUpOptions.emailRedirectTo = confirmationRedirectUrl;
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: signUpOptions,
      });

      if (error) {
        if (
          error.message.toLowerCase().includes("user already registered") ||
          error.message.toLowerCase().includes("already registered") ||
          error.message.toLowerCase().includes("already exists")
        ) {
          throw new Error("Este e-mail já possui cadastro. Por favor, acesse a aba de Login.");
        }
        throw error;
      }

      // Supabase Anti-enumeração: quando o e-mail já existe, data.user pode vir com identities vazias ([])
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        const erroDuplicado = "Este e-mail já possui cadastro. Por favor, acesse a aba de Login.";
        setErrorMessage(erroDuplicado);
        toast.error("Cadastro não permitido", {
          description: erroDuplicado,
          duration: 8000,
        });
        setSubmitting(false);
        return;
      }

      if (data.session) {
        toast.success("Conta criada e autenticada com sucesso!", {
          description: `Bem-vindo(a) ao Copiloto Med, ${name}.`,
        });
        navigate({ to: "/" });
      } else {
        setSuccessNotice(
          "Solicitação recebida! Se este e-mail for novo, enviamos um link de confirmação para ele. Caso o e-mail já possua cadastro, acesse usando a aba de Login.",
        );
        toast.success("Solicitação recebida!", {
          description:
            "Se este e-mail for novo, enviamos um link de confirmação para ele. Caso o e-mail já possua cadastro, acesse usando a aba de Login.",
          duration: 9000,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Registro] Erro:", msg);
      setErrorMessage(msg);
      toast.error("Erro no cadastro", { description: msg });
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
            <span>Autenticação Segura • Magic Link & Supabase</span>
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
                <Sparkles className="size-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Link Mágico Direto</p>
                <p className="text-[11px] text-muted-foreground">Acesso em 1 clique sem senha</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 rounded-md bg-primary/15 p-1 text-primary">
                <Lock className="size-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Acesso por Senha</p>
                <p className="text-[11px] text-muted-foreground">Credenciais criptografadas</p>
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

          {/* Seletor de Modo: Link Mágico (Padrão) / Senha / Cadastro */}
          {mode === "forgot-password" ? (
            <div className="mb-6 flex items-center justify-between rounded-xl bg-secondary/60 p-2.5 border border-border">
              <button
                type="button"
                onClick={() => {
                  setMode("password");
                  setErrorMessage(null);
                  setSuccessNotice(null);
                  setRecoverySent(false);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                <ArrowLeft className="size-4" />
                <span>Voltar para o Login</span>
              </button>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider pr-1">
                Recuperação de Senha
              </span>
            </div>
          ) : (
            <div className="mb-6 flex rounded-xl bg-secondary p-1 border border-border">
              <button
                type="button"
                onClick={() => {
                  setMode("magic-link");
                  setErrorMessage(null);
                  setSuccessNotice(null);
                }}
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  mode === "magic-link"
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Sparkles className="size-3.5 text-primary" />
                <span>Link Mágico</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("password");
                  setErrorMessage(null);
                  setSuccessNotice(null);
                }}
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  mode === "password"
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Lock className="size-3.5" />
                <span>Senha</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setErrorMessage(null);
                  setSuccessNotice(null);
                }}
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  mode === "register"
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <User className="size-3.5" />
                <span>Criar Conta</span>
              </button>
            </div>
          )}

          {/* Cabeçalho do Formulário */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {mode === "magic-link" && (magicLinkSent ? "Confira seu E-mail" : "Acesso Direto por E-mail")}
              {mode === "password" && "Acesse seu painel clínico"}
              {mode === "register" && "Crie seu perfil profissional"}
              {mode === "forgot-password" && (recoverySent ? "Verifique seu e-mail" : "Recuperar senha")}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "magic-link" &&
                (magicLinkSent
                  ? `Enviamos o link de autenticação segura para ${magicEmail}.`
                  : "Enviaremos um link de acesso direto para seu e-mail. Rápido, seguro e sem senhas.")}
              {mode === "password" && "Entre com seu e-mail e senha configurados no Supabase."}
              {mode === "register" && "Cadastre seus dados para iniciar atendimentos na plataforma."}
              {mode === "forgot-password" &&
                (recoverySent
                  ? `Enviamos as instruções de recuperação para ${recoveryEmail}.`
                  : "Informe seu e-mail cadastrado para receber um link de redefinição de senha.")}
            </p>
          </div>

          {/* Alerta de Erro Visual */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive animate-in fade-in slide-in-from-top-2"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed flex-1">
                <strong className="font-semibold block mb-0.5">Erro na autenticação</strong>
                <span>{errorMessage}</span>
                {mode === "register" && errorMessage.includes("aba de Login") && (
                  <div className="mt-2.5 pt-2 border-t border-destructive/20">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmail(registerEmail);
                        setMode("password");
                        setErrorMessage(null);
                      }}
                      className="text-xs font-semibold text-destructive-foreground bg-destructive/90 hover:bg-destructive rounded-md px-2.5 py-1 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Lock className="size-3" />
                      <span>Ir para aba de Login com Senha →</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alerta de Sucesso Visual */}
          {successNotice && (
            <div
              role="status"
              className="mb-5 flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-3.5 text-xs text-success animate-in fade-in slide-in-from-top-2"
            >
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed flex-1">
                <strong className="font-semibold block mb-0.5">Notificação</strong>
                <span>{successNotice}</span>
                {mode === "register" && (
                  <div className="mt-2.5 pt-2 border-t border-success/20">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmail(registerEmail);
                        setMode("password");
                        setSuccessNotice(null);
                      }}
                      className="text-xs font-semibold text-foreground bg-surface/80 hover:bg-surface border border-success/40 rounded-md px-2.5 py-1 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Lock className="size-3 text-primary" />
                      <span>Acessar aba de Login agora →</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* FLUXO 1: MAGIC LINK (ACESSO DIRETO POR E-MAIL)            */}
          {/* ======================================================== */}
          {mode === "magic-link" && (
            <div>
              {magicLinkSent ? (
                /* ESTADO DE SUCESSO: LINK ENVIADO */
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent p-6 text-center shadow-xs">
                    <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
                      <MailCheck className="size-7" />
                    </div>

                    <h3 className="text-lg font-bold text-foreground">
                      Link de acesso enviado!
                    </h3>

                    <p className="mt-2 text-sm text-foreground/90 font-medium leading-relaxed">
                      Link de acesso enviado! Verifique sua caixa de entrada pelo celular ou computador.
                    </p>

                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary/80 px-3 py-1 text-xs text-muted-foreground border border-border">
                      <Mail className="size-3.5 text-primary" />
                      <span className="font-semibold text-foreground">{magicEmail}</span>
                    </div>

                    <div className="mt-5 rounded-xl bg-background/80 p-3.5 border border-border text-left space-y-2">
                      <div className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                        <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
                        <span>
                          Basta clicar no botão recebido no e-mail para autenticar instantaneamente, sem precisar digitar senhas ou códigos PIN.
                        </span>
                      </div>
                      <div className="flex items-start gap-2 text-xs text-muted-foreground/80 leading-relaxed pt-1.5 border-t border-border/50">
                        <Info className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <span>
                          Não encontrou? Confira sua pasta de <strong>Spam</strong> ou <strong>Lixo Eletrônico</strong>.
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleSendMagicLink()}
                      disabled={submitting}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          <span>Reenviando link de acesso...</span>
                        </>
                      ) : (
                        <>
                          <RotateCw className="size-3.5" />
                          <span>Reenviar Link de Acesso</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMagicLinkSent(false);
                        setErrorMessage(null);
                      }}
                      className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-xs font-medium text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="size-3.5" />
                      <span>Informar outro e-mail</span>
                    </button>
                  </div>

                  <div className="text-center pt-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmail(magicEmail);
                        setMode("password");
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      Prefere usar senha tradicional? <span className="text-primary font-medium">Entrar com senha</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* FORMULÁRIO DE SOLICITAÇÃO DO MAGIC LINK */
                <form onSubmit={handleSendMagicLink} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">
                      E-mail profissional ou institucional
                    </label>
                    <div className="relative">
                      <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="email"
                        value={magicEmail}
                        onChange={(e) => setMagicEmail(e.target.value)}
                        placeholder="medico@vidaintegrada.com.br"
                        required
                        autoFocus
                        autoComplete="email"
                        className="h-10 w-full rounded-lg border border-input bg-surface pr-3 pl-9 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-foreground block">
                        Nome profissional <span className="text-muted-foreground font-normal">(opcional)</span>
                      </label>
                      <span className="text-[11px] text-muted-foreground">Para novos cadastros</span>
                    </div>
                    <div className="relative">
                      <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={magicName}
                        onChange={(e) => setMagicName(e.target.value)}
                        placeholder="Ex: Dra. Ana Beatriz"
                        className="h-10 w-full rounded-lg border border-input bg-surface pr-3 pl-9 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 flex items-start gap-2.5 text-[11px] text-muted-foreground">
                    <Info className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      Se este for seu primeiro acesso, sua conta será criada automaticamente ao clicar no link recebido por e-mail.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !magicEmail.trim()}
                    className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Enviando link para seu e-mail...</span>
                      </>
                    ) : (
                      <>
                        <Send className="size-3.5" />
                        <span>Enviar Link de Acesso</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setMode("password")}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      Prefere usar senha tradicional? <span className="text-primary font-medium">Entrar com senha</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* FLUXO 2: LOGIN TRADICIONAL COM SENHA                      */}
          {/* ======================================================== */}
          {mode === "password" && (
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
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryEmail(loginEmail);
                      setMode("forgot-password");
                      setErrorMessage(null);
                      setSuccessNotice(null);
                      setRecoverySent(false);
                    }}
                    className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
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

              <div className="flex flex-col gap-2 pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryEmail(loginEmail);
                    setMode("forgot-password");
                    setErrorMessage(null);
                    setSuccessNotice(null);
                    setRecoverySent(false);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Esqueceu a senha? <span className="text-primary font-medium underline">Recuperar por e-mail</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMagicEmail(loginEmail);
                    setMode("magic-link");
                    setErrorMessage(null);
                    setSuccessNotice(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Prefere entrar sem senha? <span className="text-primary font-medium">Usar Link Mágico</span>
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* FLUXO 3: CRIAR CONTA                                      */}
          {/* ======================================================== */}
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
                    <span>Criar Conta com Senha</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center border-t border-border mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setMagicEmail(registerEmail);
                    setMagicName(registerName);
                    setMode("magic-link");
                  }}
                  className="text-xs text-primary font-medium hover:underline cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Sparkles className="size-3.5" />
                  <span>Prefere cadastrar instantaneamente sem senha via Link Mágico?</span>
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* FLUXO 4: ESQUECI A SENHA / RECUPERAÇÃO DE CONTA            */}
          {/* ======================================================== */}
          {mode === "forgot-password" && (
            <div className="space-y-4">
              {recoverySent ? (
                <div className="space-y-5 rounded-2xl border border-border bg-surface p-6 shadow-sm text-center animate-in fade-in zoom-in-95 duration-300">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <MailCheck className="size-7" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-semibold text-foreground">
                      Instruções enviadas!
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Se existir uma conta vinculada ao e-mail{" "}
                      <span className="font-semibold text-foreground">{recoveryEmail}</span>,
                      enviamos um link seguro para redefinir sua senha.
                    </p>
                  </div>
                  <div className="rounded-xl bg-secondary/50 p-3.5 text-left border border-border/60">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      💡 <strong>Dica:</strong> Verifique também sua caixa de <em>Spam</em> ou <em>Lixo Eletrônico</em>. O link expira em poucas horas por segurança.
                    </p>
                  </div>
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("password");
                        setRecoverySent(false);
                        setErrorMessage(null);
                        setSuccessNotice(null);
                      }}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/95 cursor-pointer"
                    >
                      <ArrowLeft className="size-3.5" />
                      <span>Voltar para o Login</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResetPassword()}
                      disabled={submitting}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer block w-full py-1.5"
                    >
                      Não recebeu? <span className="text-primary font-medium">Reenviar link</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">
                      E-mail cadastrado
                    </label>
                    <div className="relative">
                      <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="email"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        placeholder="seu-email@vidaintegrada.com.br"
                        required
                        autoFocus
                        autoComplete="email"
                        className="h-10 w-full rounded-lg border border-input bg-surface pr-3 pl-9 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Enviaremos um link de confirmação para você redefinir sua senha com segurança.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Disparando e-mail...</span>
                      </>
                    ) : (
                      <>
                        <Send className="size-3.5" />
                        <span>Enviar link de recuperação</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("password");
                        setErrorMessage(null);
                        setSuccessNotice(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="size-3.5" />
                      <span>Lembrou da senha? Voltar ao Login</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
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
