import { useState, useEffect, useCallback } from "react";
import {
  User as UserIcon,
  Save,
  CheckCircle2,
  AlertCircle,
  Mail,
  ShieldCheck,
  Clock,
  Sparkles,
  Loader2,
  RefreshCw,
  Lock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, extractInitials } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Card,
  CardHead,
  Badge,
  Button,
  Field,
  Input,
} from "@/components/kit";
import { cn } from "@/lib/utils";

export interface PerfilData {
  id: string;
  nome_completo: string | null;
  avatar_url?: string | null | undefined;
  criado_em?: string | null | undefined;
}

interface PerfilEditorProps {
  showHeroCard?: boolean;
  className?: string;
}

/**
 * Utilitário para extrair mensagem legível de erros, prevenindo [object Object]
 */
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
      return "Ocorreu um erro na comunicação com o banco de dados.";
    }
  }
  return String(err);
}

export function PerfilEditor({ showHeroCard = true, className }: PerfilEditorProps) {
  const { user, session, loading: authLoading } = useAuth();

  const [nomeCompleto, setNomeCompleto] = useState("");
  const [initialNome, setInitialNome] = useState("");
  const [perfilData, setPerfilData] = useState<PerfilData | null>(null);

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Carregar perfil do Supabase (consultando estritamente id, nome_completo, avatar_url, criado_em)
  const loadProfile = useCallback(async () => {
    if (!user) return;

    setIsLoadingProfile(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from("perfis")
        .select("id, nome_completo, avatar_url, criado_em")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[PerfilEditor] Erro no select da tabela perfis:", error);
        throw error;
      }

      if (data && data.nome_completo) {
        const nome = data.nome_completo.trim();
        setNomeCompleto(nome);
        setInitialNome(nome);
        setPerfilData(data);
      } else {
        // Fallback para metadados da autenticação do Supabase
        const metadata = user.user_metadata;
        const fallbackNome =
          (metadata && typeof metadata["full_name"] === "string" && metadata["full_name"]) ||
          (metadata && typeof metadata["name"] === "string" && metadata["name"]) ||
          "";
        setNomeCompleto(fallbackNome);
        setInitialNome(fallbackNome);
        setPerfilData({
          id: user.id,
          nome_completo: fallbackNome,
          avatar_url: data?.avatar_url ?? null,
          criado_em: data?.criado_em ?? null,
        });
      }
    } catch (err: unknown) {
      const msg = extractErrorMessage(err);
      setErrorMessage(`Falha ao buscar perfil: ${msg}`);
      toast.error("Erro ao carregar dados do perfil", {
        description: msg,
      });
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      loadProfile();
    }
  }, [user, authLoading, loadProfile]);

  // 2. Salvar alterações (Atualiza estritamente as colunas reais da tabela perfis)
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!user) {
      toast.error("Usuário não autenticado", {
        description: "Por favor, faça login novamente.",
      });
      return;
    }

    const trimmedNome = nomeCompleto.trim();
    if (!trimmedNome) {
      toast.error("Nome obrigatório", {
        description: "Por favor, insira o seu nome completo.",
      });
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Executa update na tabela perfis apenas com as colunas reais
      const { data: updateData, error: updateError } = await supabase
        .from("perfis")
        .update({
          nome_completo: trimmedNome,
        })
        .eq("id", user.id)
        .select("id, nome_completo, avatar_url, criado_em");

      // Caso a linha não exista ainda (ex: trigger não disparou), realiza upsert seguro
      if (updateError) {
        console.warn("[PerfilEditor] Tentando upsert após falha no update:", updateError);
        const { error: upsertError } = await supabase.from("perfis").upsert({
          id: user.id,
          nome_completo: trimmedNome,
        });

        if (upsertError) throw upsertError;
      } else if (!updateData || updateData.length === 0) {
        const { error: insertError } = await supabase.from("perfis").insert({
          id: user.id,
          nome_completo: trimmedNome,
        });

        if (insertError) throw insertError;
      }

      // Sincroniza metadata do Supabase Auth para atualização em tempo real no cabeçalho
      try {
        await supabase.auth.updateUser({
          data: {
            full_name: trimmedNome,
            name: trimmedNome,
          },
        });
      } catch (authErr) {
        console.warn("[PerfilEditor] Atualização de metadata do Auth informativa:", authErr);
      }

      setInitialNome(trimmedNome);
      setPerfilData((prev) => ({
        id: user.id,
        nome_completo: trimmedNome,
        avatar_url: prev?.avatar_url,
        criado_em: prev?.criado_em,
      }));

      const msg = "Nome atualizado com sucesso na tabela perfis!";
      setSuccessMessage(msg);
      toast.success("Perfil atualizado!", {
        description: `Seu nome foi alterado para "${trimmedNome}".`,
      });
    } catch (err: unknown) {
      const msg = extractErrorMessage(err);
      console.error("[PerfilEditor] Falha ao atualizar tabela perfis:", msg);
      setErrorMessage(`Erro ao salvar perfil: ${msg}`);
      toast.error("Falha ao salvar alterações", {
        description: msg,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = nomeCompleto.trim() !== initialNome.trim();
  const initials = extractInitials(nomeCompleto || user?.email || "DR");

  if (authLoading || (isLoadingProfile && !perfilData && !nomeCompleto)) {
    return (
      <div className={cn("rounded-xl border border-border bg-surface p-12 text-center", className)}>
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
          <Loader2 className="size-6 animate-spin" />
        </div>
        <h3 className="text-base font-semibold">Carregando dados do perfil...</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Buscando registro do usuário na tabela <code className="font-mono">perfis</code> do Supabase.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-5", className)}>
      {/* Alerta de Sucesso */}
      {successMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-success animate-in fade-in duration-200">
          <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium">{successMessage}</p>
            <p className="text-xs text-success/80 mt-0.5">
              O registro na tabela <code className="font-mono font-semibold">perfis</code> foi atualizado com sucesso.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-success/70 hover:text-success underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Alerta de Erro com mensagem legível */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive animate-in fade-in duration-200">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium">Falha na operação</p>
            <p className="text-xs text-destructive/80 mt-0.5">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={loadProfile}
            className="text-xs font-semibold underline hover:opacity-80 cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Hero Card com Avatar e Dados de Acesso (E-mail puxado exclusivamente do Supabase Auth) */}
      {showHeroCard && (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-sm">
                {initials}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    {nomeCompleto.trim() || "Usuário do Sistema"}
                  </h2>
                  <Badge tone="blue">
                    <Sparkles className="size-3" />
                    Conta Ativa
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Mail className="size-3.5" />
                  {user?.email ?? "E-mail não informado"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
                <span className="size-2 rounded-full bg-success animate-pulse" />
                Supabase Auth Conectado
              </span>
              <button
                type="button"
                onClick={loadProfile}
                disabled={isLoadingProfile || isSaving}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
                title="Recarregar dados do banco"
              >
                <RefreshCw className={cn("size-3.5", isLoadingProfile && "animate-spin")} />
                Recarregar
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Card Principal do Formulário */}
      <Card>
        <CardHead
          title="Dados do Perfil"
          subtitle="Identificação cadastrada na tabela perfis do banco de dados"
          action={
            perfilData?.criado_em ? (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" />
                Criado em:{" "}
                {new Date(perfilData.criado_em).toLocaleDateString("pt-BR")}{" "}
                {new Date(perfilData.criado_em).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            ) : null
          }
        />

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Input: Nome Completo (Coluna real nome_completo) */}
            <div className="sm:col-span-2">
              <Field
                label="Nome Completo *"
                hint="Nome utilizado para assinar triagens, relatórios médicos e identificação clínica"
              >
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <UserIcon className="size-4" />
                  </div>
                  <input
                    type="text"
                    value={nomeCompleto}
                    onChange={(e) => setNomeCompleto(e.target.value)}
                    placeholder="Ex: Dra. Ana Beatriz Silva"
                    disabled={isSaving || isLoadingProfile}
                    required
                    className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50 transition-all"
                  />
                </div>
              </Field>
              {hasChanges && (
                <p className="mt-1.5 text-xs text-primary font-medium flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-primary" />
                  Alteração pendente de confirmação
                </p>
              )}
            </div>

            {/* E-mail da Conta (Puxado exclusivamente do Supabase Auth user.email) */}
            <div>
              <Field
                label="E-mail da Conta"
                hint="Endereço oficial autenticado via Supabase Auth"
              >
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Mail className="size-4" />
                  </div>
                  <Input
                    type="email"
                    value={user?.email ?? ""}
                    className="pl-9 bg-secondary/50 text-muted-foreground cursor-not-allowed"
                    placeholder="seuemail@clinica.com"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                    <Lock className="size-3.5" />
                  </div>
                </div>
              </Field>
            </div>

            {/* Identificador no Supabase (auth.uid) */}
            <div>
              <Field
                label="Identificador Único (ID)"
                hint="Chave primária na tabela perfis vinculada ao auth.users"
              >
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <ShieldCheck className="size-4" />
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={user?.id ?? ""}
                    className="h-9 w-full font-mono rounded-lg border border-input bg-secondary/50 pl-9 pr-3 text-xs text-muted-foreground cursor-not-allowed select-all"
                  />
                </div>
              </Field>
            </div>
          </div>

          {/* Rodapé com Botão Salvar Alterações e Estado de Loading */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <div className="text-xs text-muted-foreground">
              {hasChanges ? (
                <span className="text-warning font-medium">
                  Você possui modificações pendentes de salvamento.
                </span>
              ) : (
                <span>Tabela perfis em sincronia.</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {hasChanges && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => {
                    setNomeCompleto(initialNome);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                >
                  Desfazer
                </Button>
              )}

              <Button
                type="submit"
                disabled={isSaving || !hasChanges || !nomeCompleto.trim()}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Salvando Alterações...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
