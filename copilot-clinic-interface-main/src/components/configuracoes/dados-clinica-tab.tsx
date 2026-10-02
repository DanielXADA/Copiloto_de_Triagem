import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Save,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  FileText,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/tenant-context";
import { toast } from "sonner";
import {
  Card,
  CardHead,
  Badge,
  Button,
  Field,
  Input,
} from "@/components/kit";
import { MaskedInput } from "@/components/ui/masked-input";
import { cn } from "@/lib/utils";

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

export function DadosClinicaTab() {
  const { currentClinic, updateClinicState, reloadTenant, loading: tenantLoading } = useTenant();

  const [nome, setNome] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [emailContato, setEmailContato] = useState("");

  const [initialData, setInitialData] = useState<{
    nome: string;
    razaoSocial: string;
    cnpj: string;
    telefone: string;
    emailContato: string;
  }>({
    nome: "",
    razaoSocial: "",
    cnpj: "",
    telefone: "",
    emailContato: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Carrega dados reais da tabela clinicas
  const fetchClinica = useCallback(async () => {
    if (!currentClinic?.id) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from("clinicas")
        .select("id, nome, cnpj, razao_social, telefone, email_contato, status, plano")
        .eq("id", currentClinic.id)
        .maybeSingle();

      if (error) {
        console.error("[DadosClinicaTab] Erro no select da clínica:", error);
        throw error;
      }

      if (data) {
        const loadedNome = data.nome ?? "";
        const loadedRazao = data.razao_social ?? "";
        const loadedCnpj = data.cnpj ?? "";
        const loadedTel = data.telefone ?? "";
        const loadedEmail = data.email_contato ?? "";

        setNome(loadedNome);
        setRazaoSocial(loadedRazao);
        setCnpj(loadedCnpj);
        setTelefone(loadedTel);
        setEmailContato(loadedEmail);

        setInitialData({
          nome: loadedNome,
          razaoSocial: loadedRazao,
          cnpj: loadedCnpj,
          telefone: loadedTel,
          emailContato: loadedEmail,
        });

        updateClinicState({
          nome: loadedNome,
          razao_social: loadedRazao,
          cnpj: loadedCnpj,
          telefone: loadedTel,
          email_contato: loadedEmail,
        });
      }
    } catch (err: unknown) {
      const msg = extractErrorMessage(err);
      setErrorMessage(`Falha ao carregar dados da clínica: ${msg}`);
      toast.error("Erro ao carregar clínica", { description: msg });
    } finally {
      setIsLoading(false);
    }
  }, [currentClinic?.id, updateClinicState]);

  useEffect(() => {
    if (currentClinic) {
      // Pré-popula inicialmente com os dados já presentes no contexto
      setNome(currentClinic.nome ?? "");
      setRazaoSocial(currentClinic.razao_social ?? "");
      setCnpj(currentClinic.cnpj ?? "");
      setTelefone(currentClinic.telefone ?? "");
      setEmailContato(currentClinic.email_contato ?? "");
      setInitialData({
        nome: currentClinic.nome ?? "",
        razaoSocial: currentClinic.razao_social ?? "",
        cnpj: currentClinic.cnpj ?? "",
        telefone: currentClinic.telefone ?? "",
        emailContato: currentClinic.email_contato ?? "",
      });

      // E realiza busca atualizada no banco
      fetchClinica();
    }
  }, [currentClinic?.id, fetchClinica]);

  // 2. Salva alterações no banco via UPDATE na tabela clinicas
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!currentClinic?.id) {
      toast.error("Nenhuma clínica ativa encontrada para atualizar.");
      return;
    }

    const trimmedNome = nome.trim();
    if (!trimmedNome) {
      toast.error("O nome da clínica é obrigatório.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = {
        nome: trimmedNome,
        razao_social: razaoSocial.trim() || null,
        cnpj: cnpj.trim() || null,
        telefone: telefone.trim() || null,
        email_contato: emailContato.trim() || null,
      };

      const { data, error } = await supabase
        .from("clinicas")
        .update(payload)
        .eq("id", currentClinic.id)
        .select();

      if (error) {
        console.error("[DadosClinicaTab] Erro ao atualizar tabela clinicas:", error);
        throw error;
      }

      // Atualiza estado local e contexto global instantaneamente
      setInitialData({
        nome: trimmedNome,
        razaoSocial: razaoSocial.trim(),
        cnpj: cnpj.trim(),
        telefone: telefone.trim(),
        emailContato: emailContato.trim(),
      });

      updateClinicState({
        nome: trimmedNome,
        razao_social: razaoSocial.trim() || null,
        cnpj: cnpj.trim() || null,
        telefone: telefone.trim() || null,
        email_contato: emailContato.trim() || null,
      });

      const successMsg = `Dados da clínica "${trimmedNome}" atualizados com sucesso!`;
      setSuccessMessage(successMsg);
      toast.success("Clínica atualizada!", {
        description: "As alterações foram gravadas na tabela clinicas.",
      });

      // Recarrega o tenant para sincronizar outros dados caso necessário
      reloadTenant();
    } catch (err: unknown) {
      const msg = extractErrorMessage(err);
      console.error("[DadosClinicaTab] Falha no update:", msg);
      setErrorMessage(`Erro ao salvar dados da clínica: ${msg}`);
      toast.error("Falha ao salvar", { description: msg });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    nome.trim() !== initialData.nome.trim() ||
    razaoSocial.trim() !== initialData.razaoSocial.trim() ||
    cnpj.trim() !== initialData.cnpj.trim() ||
    telefone.trim() !== initialData.telefone.trim() ||
    emailContato.trim() !== initialData.emailContato.trim();

  if (tenantLoading || (isLoading && !currentClinic)) {
    return (
      <Card className="p-10 text-center">
        <Loader2 className="size-6 animate-spin text-primary mx-auto mb-3" />
        <p className="text-sm font-medium">Carregando dados da clínica...</p>
        <p className="text-xs text-muted-foreground mt-1">
          Buscando registros na tabela <code className="font-mono">clinicas</code> do Supabase.
        </p>
      </Card>
    );
  }

  if (!currentClinic) {
    return (
      <Card className="p-8 text-center border-dashed">
        <Building2 className="size-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-base font-semibold">Nenhuma clínica vinculada</h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
          Não identificamos uma clínica vinculada ao seu usuário. Verifique com o administrador ou crie uma clínica.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Alerta de Sucesso */}
      {successMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-success animate-in fade-in duration-200">
          <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium">{successMessage}</p>
            <p className="text-xs text-success/80 mt-0.5">
              Os dados corporativos da clínica foram sincronizados em todo o sistema.
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

      {/* Alerta de Erro */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive animate-in fade-in duration-200">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium">Atenção ao salvar dados da clínica</p>
            <p className="text-xs text-destructive/80 mt-0.5">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={fetchClinica}
            className="text-xs font-semibold underline hover:opacity-80 cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Card com Resumo da Clínica Atual */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground shadow-xs">
              <Building2 className="size-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {nome || "Clínica sem nome"}
                </h2>
                <Badge tone="blue">
                  <Sparkles className="size-3" />
                  {currentClinic.plano ? `Plano ${currentClinic.plano}` : "Plano Pro"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-success" />
                Multi-Tenant Ativo • ID: <code className="font-mono text-[11px]">{currentClinic.id.slice(0, 8)}...</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={fetchClinica}
              disabled={isLoading || isSaving}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
              title="Recarregar dados do banco"
            >
              <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
              Recarregar
            </button>
          </div>
        </div>
      </Card>

      {/* Formulário Principal de Edição dos Dados da Clínica */}
      <Card>
        <CardHead
          title="Dados Cadastrais da Clínica"
          subtitle="Informações oficiais exibidas nos dossiês de atendimento e relatórios"
        />

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Nome Fantasia */}
            <div className="sm:col-span-2">
              <Field
                label="Nome Fantasia da Clínica *"
                hint="Nome principal exibido na barra lateral e nos dossiês para os pacientes"
              >
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Building2 className="size-4" />
                  </div>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Clínica Vida Integrada"
                    disabled={isSaving || isLoading}
                    required
                    className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50 transition-all"
                  />
                </div>
              </Field>
            </div>

            {/* Razão Social */}
            <div>
              <Field label="Razão Social" hint="Nome jurídico registrado da empresa">
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <FileText className="size-4" />
                  </div>
                  <input
                    type="text"
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    placeholder="Ex: Vida Integrada Serviços Médicos LTDA"
                    disabled={isSaving || isLoading}
                    className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50 transition-all"
                  />
                </div>
              </Field>
            </div>

            {/* CNPJ */}
            <div>
              <Field label="CNPJ" hint="Cadastro Nacional da Pessoa Jurídica">
                <MaskedInput
                  mask="cnpj"
                  value={cnpj}
                  onValueChange={(val) => setCnpj(val)}
                  placeholder="00.000.000/0001-00"
                  disabled={isSaving || isLoading}
                  className="h-10 bg-surface"
                />
              </Field>
            </div>

            {/* Telefone */}
            <div>
              <Field label="Telefone Comercial" hint="Número de contato para WhatsApp ou recepção">
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground z-10">
                    <Phone className="size-4" />
                  </div>
                  <MaskedInput
                    mask="phone"
                    value={telefone}
                    onValueChange={(val) => setTelefone(val)}
                    placeholder="(11) 98765-4321"
                    disabled={isSaving || isLoading}
                    className="h-10 bg-surface pl-9"
                  />
                </div>
              </Field>
            </div>

            {/* E-mail de Contato */}
            <div>
              <Field label="E-mail de Contato" hint="Endereço oficial para notificações e suporte">
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Mail className="size-4" />
                  </div>
                  <input
                    type="email"
                    value={emailContato}
                    onChange={(e) => setEmailContato(e.target.value)}
                    placeholder="contato@clinica.com.br"
                    disabled={isSaving || isLoading}
                    className="h-10 w-full rounded-lg border border-input bg-surface pl-9 pr-3 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50 transition-all"
                  />
                </div>
              </Field>
            </div>
          </div>

          {/* Rodapé com Ações do Formulário */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <div className="text-xs text-muted-foreground">
              {hasChanges ? (
                <span className="text-warning font-medium">
                  Você possui alterações nos dados da clínica não salvas.
                </span>
              ) : (
                <span>Dados da clínica sincronizados com a tabela clinicas.</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {hasChanges && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => {
                    setNome(initialData.nome);
                    setRazaoSocial(initialData.razaoSocial);
                    setCnpj(initialData.cnpj);
                    setTelefone(initialData.telefone);
                    setEmailContato(initialData.emailContato);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                >
                  Desfazer
                </Button>
              )}

              <Button
                type="submit"
                disabled={isSaving || !hasChanges || !nome.trim()}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Salvando alterações...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Salvar Alterações da Clínica
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
