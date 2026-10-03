import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
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
  KeyRound,
  RotateCw,
  Pencil,
  ArrowLeft,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CopilotoLogo } from "@/components/brand/copiloto-logo";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Acesso Seguro — Copiloto Med" },
      {
        name: "description",
        content: "Faça login com código OTP ou senha no Copiloto Med.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();

  // Modos de autenticação: 'otp' (código sem senha), 'password' (senha tradicional), 'register' (criar conta)
  const [mode, setMode] = useState<"otp" | "password" | "register">("otp");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Estados específicos de OTP
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpName, setOtpName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [resending, setResending] = useState(false);

  // Campos de Login por Senha
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  // Contador regressivo para reenvio de OTP (60s)
  useEffect(() => {
    if (otpStep !== "verify" || countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [otpStep, countdown]);

  /**
   * Envia o código OTP para o e-mail informado
   */
  const handleSendOtp = async (e?: React.FormEvent, customEmail?: string, customName?: string) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const email = (customEmail ?? otpEmail).trim();
    const name = (customName ?? otpName).trim();

    if (!email) {
      setErrorMessage("Por favor, informe seu endereço de e-mail.");
      return;
    }

    setSubmitting(true);
    try {
      const options: {
        shouldCreateUser?: boolean;
        data?: Record<string, unknown>;
      } = {
        shouldCreateUser: true,
      };

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

      setOtpStep("verify");
      setCountdown(60);
      setSuccessNotice(`Código de 6 dígitos enviado para ${email}.`);
      toast.success("Código enviado com sucesso!", {
        description: `Verifique sua caixa de entrada no e-mail ${email}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[OTP] Erro ao enviar código:", msg);
      setErrorMessage(msg);
      toast.error("Falha ao enviar código", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Reenvia o código OTP
   */
  const handleResendOtp = async () => {
    if (countdown > 0 || resending || submitting) return;
    setErrorMessage(null);
    setResending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: otpEmail.trim(),
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      setCountdown(60);
      setOtpCode("");
      toast.success("Novo código enviado!", {
        description: `Um novo PIN foi enviado para ${otpEmail}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[OTP] Erro ao reenviar:", msg);
      setErrorMessage(msg);
      toast.error("Erro ao reenviar", { description: msg });
    } finally {
      setResending(false);
    }
  };

  /**
   * Valida o código OTP de 6 dígitos digitado pelo usuário
   */
  const handleVerifyOtp = useCallback(
    async (codeToVerify?: string) => {
      const token = (codeToVerify ?? otpCode).trim();
      const email = otpEmail.trim();

      if (!token || token.length !== 6) {
        setErrorMessage("Digite o código de 6 dígitos completo recebido no e-mail.");
        return;
      }

      setSubmitting(true);
      setErrorMessage(null);
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: "email",
        });

        if (error) {
          if (
            error.message.toLowerCase().includes("token has expired") ||
            error.message.toLowerCase().includes("invalid") ||
            error.message.toLowerCase().includes("otp")
          ) {
            throw new Error(
              "Código inválido ou expirado. Verifique os números digitados ou solicite um novo código.",
            );
          }
          throw error;
        }

        const userName =
          data.user?.user_metadata?.["full_name"] ||
          data.user?.user_metadata?.["name"] ||
          data.user?.email ||
          "Médico(a)";

        toast.success("Autenticação realizada com sucesso!", {
          description: `Bem-vindo(a), ${userName}.`,
        });

        navigate({ to: "/" });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[OTP] Erro ao validar token:", msg);
        setErrorMessage(msg);
        toast.error("Falha na validação", { description: msg });
      } finally {
        setSubmitting(false);
      }
    },
    [otpEmail, otpCode, navigate],
  );

  /**
   * Tratamento de mudança no input OTP com auto-submit ao atingir 6 dígitos
   */
  const handleOtpChange = (value: string) => {
    setOtpCode(value);
    setErrorMessage(null);
    if (value.length === 6 && !submitting) {
      handleVerifyOtp(value);
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
        if (
          error.message.toLowerCase().includes("invalid login credentials") ||
          error.message.toLowerCase().includes("invalid credentials")
        ) {
          throw new Error("E-mail ou senha incorretos. Verifique suas credenciais ou entre via Código OTP.");
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
          throw new Error("Já existe uma conta com este e-mail. Faça login ou entre via Código OTP.");
        }
        throw error;
      }

      if (data.session) {
        toast.success("Conta criada e autenticada com sucesso!", {
          description: `Bem-vindo(a) ao Copiloto Med, ${name}.`,
        });
        navigate({ to: "/" });
      } else {
        setSuccessNotice(
          "Conta criada com sucesso! Enviamos uma confirmação para seu e-mail.",
        );
        toast.success("Cadastro realizado!", {
          description: "Verifique seu e-mail para validar seu acesso.",
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
            <span>Autenticação Segura • Código OTP & Supabase</span>
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
                <KeyRound className="size-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Código de Acesso Rápido</p>
                <p className="text-[11px] text-muted-foreground">PIN de 6 dígitos via e-mail</p>
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

          {/* Seletor de Modo: OTP (Padrão) / Senha / Cadastro */}
          <div className="mb-6 flex rounded-xl bg-secondary p-1 border border-border">
            <button
              type="button"
              onClick={() => {
                setMode("otp");
                setErrorMessage(null);
                setSuccessNotice(null);
              }}
              className={cn(
                "flex-1 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                mode === "otp"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <KeyRound className="size-3.5 text-primary" />
              <span>Código OTP</span>
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

          {/* Cabeçalho do Formulário */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {mode === "otp" && (otpStep === "request" ? "Entrar com Código de E-mail" : "Confirme o Código PIN")}
              {mode === "password" && "Acesse seu painel clínico"}
              {mode === "register" && "Crie seu perfil profissional"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "otp" &&
                (otpStep === "request"
                  ? "Enviaremos um código numérico de 6 dígitos para seu e-mail. Seguro, sem senhas."
                  : `Digite o código de 6 dígitos enviado para ${otpEmail}.`)}
              {mode === "password" && "Entre com seu e-mail e senha configurados no Supabase."}
              {mode === "register" && "Cadastre seus dados para iniciar atendimentos na plataforma."}
            </p>
          </div>

          {/* Alerta de Erro Visual */}
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

          {/* Alerta de Sucesso Visual */}
          {successNotice && (
            <div
              role="status"
              className="mb-5 flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-3.5 text-xs text-success animate-in fade-in slide-in-from-top-2"
            >
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="font-semibold block mb-0.5">Notificação</strong>
                <span>{successNotice}</span>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* FLUXO 1: CÓDIGO OTP (PASSWORDLESS)                        */}
          {/* ======================================================== */}
          {mode === "otp" && (
            <div>
              {otpStep === "request" ? (
                /* ETAPA 1: SOLICITAR CÓDIGO */
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">
                      E-mail profissional ou institucional
                    </label>
                    <div className="relative">
                      <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="email"
                        value={otpEmail}
                        onChange={(e) => setOtpEmail(e.target.value)}
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
                        value={otpName}
                        onChange={(e) => setOtpName(e.target.value)}
                        placeholder="Ex: Dra. Ana Beatriz"
                        className="h-10 w-full rounded-lg border border-input bg-surface pr-3 pl-9 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg bg-primary/5 border border-primary/15 p-3 flex items-start gap-2.5 text-[11px] text-muted-foreground">
                    <Info className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      Se este for seu primeiro acesso, sua conta será criada automaticamente ao confirmar o código recebido.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !otpEmail.trim()}
                    className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Enviando código para seu e-mail...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="size-3.5" />
                        <span>Enviar Código de 6 Dígitos</span>
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
              ) : (
                /* ETAPA 2: DIGITAR O CÓDIGO DE 6 DÍGITOS */
                <div className="space-y-5 animate-in fade-in slide-in-from-right-2">
                  {/* Card informativo de e-mail de destino com botão de editar */}
                  <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <Mail className="size-4" />
                      </div>
                      <div className="truncate">
                        <span className="text-[11px] font-medium text-muted-foreground block">
                          Código enviado para:
                        </span>
                        <span className="text-xs font-semibold text-foreground truncate block">
                          {otpEmail}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpStep("request");
                        setOtpCode("");
                        setErrorMessage(null);
                      }}
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors cursor-pointer shrink-0"
                    >
                      <Pencil className="size-3" />
                      <span>Alterar</span>
                    </button>
                  </div>

                  {/* Input OTP de 6 dígitos com Slots Visuais */}
                  <div className="flex flex-col items-center justify-center py-2">
                    <label className="mb-3 text-xs font-semibold text-foreground text-center">
                      Insira o código numérico de 6 dígitos
                    </label>
                    <InputOTP
                      maxLength={6}
                      value={otpCode}
                      onChange={handleOtpChange}
                      disabled={submitting}
                      autoFocus
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="size-11 sm:size-12 text-lg sm:text-xl font-bold bg-surface" />
                        <InputOTPSlot index={1} className="size-11 sm:size-12 text-lg sm:text-xl font-bold bg-surface" />
                        <InputOTPSlot index={2} className="size-11 sm:size-12 text-lg sm:text-xl font-bold bg-surface" />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} className="size-11 sm:size-12 text-lg sm:text-xl font-bold bg-surface" />
                        <InputOTPSlot index={4} className="size-11 sm:size-12 text-lg sm:text-xl font-bold bg-surface" />
                        <InputOTPSlot index={5} className="size-11 sm:size-12 text-lg sm:text-xl font-bold bg-surface" />
                      </InputOTPGroup>
                    </InputOTP>
                    <p className="mt-3 text-[11px] text-muted-foreground text-center">
                      Você pode digitar ou colar (Ctrl+V) o código recebido por e-mail.
                    </p>
                  </div>

                  {/* Reenvio e Contador */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-muted-foreground">Não encontrou o e-mail?</span>
                    {countdown > 0 ? (
                      <span className="font-mono text-muted-foreground flex items-center gap-1 text-[11px]">
                        <RotateCw className="size-3 animate-spin text-primary" />
                        Reenviar em {countdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resending || submitting}
                        className="font-medium text-primary hover:underline cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 text-xs"
                      >
                        {resending ? (
                          <>
                            <Loader2 className="size-3 animate-spin" />
                            <span>Reenviando...</span>
                          </>
                        ) : (
                          <>
                            <RotateCw className="size-3" />
                            <span>Reenviar código</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Botão de Validação Manual */}
                  <button
                    type="button"
                    onClick={() => handleVerifyOtp()}
                    disabled={submitting || otpCode.length !== 6}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Validando código com Supabase...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="size-4" />
                        <span>Confirmar Código e Entrar</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpStep("request");
                        setOtpCode("");
                        setErrorMessage(null);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="size-3" />
                      <span>Voltar para e-mail</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("password")}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      Entrar com senha
                    </button>
                  </div>
                </div>
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

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setOtpEmail(loginEmail);
                    setMode("otp");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Esqueceu a senha? <span className="text-primary font-medium">Entrar via Código OTP de E-mail</span>
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
                    setOtpEmail(registerEmail);
                    setOtpName(registerName);
                    setMode("otp");
                  }}
                  className="text-xs text-primary font-medium hover:underline cursor-pointer inline-flex items-center gap-1.5"
                >
                  <KeyRound className="size-3.5" />
                  <span>Prefere cadastrar instantaneamente sem senha via OTP?</span>
                </button>
              </div>
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
