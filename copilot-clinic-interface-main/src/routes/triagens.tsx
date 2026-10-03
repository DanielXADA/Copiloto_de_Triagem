import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  CheckCircle2,
  Loader2,
  CircleDashed,
  RefreshCw,
  Stethoscope,
  Link2,
  ClipboardList,
  Eye,
  Calendar,
  AlertTriangle,
  Pill,
  Sparkles,
  HeartPulse,
  Clock,
  Phone,
  CalendarDays,
  Activity,
} from "lucide-react";
import { Card, PageHeader, Badge, Button, Avatar, Progress } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/tenant-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/triagens")({
  head: () => ({
    meta: [
      { title: "Triagens Pré-Consulta — Copiloto Med" },
      {
        name: "description",
        content:
          "Acompanhe o status e as respostas das pré-triagens preenchidas pelos pacientes em tempo real.",
      },
      { property: "og:title", content: "Triagens — Copiloto Med" },
      {
        property: "og:description",
        content: "Status, progresso e dados clínicos de triagem dos pacientes da clínica.",
      },
    ],
  }),
  component: Triagens,
});

export type TriageStatus = "concluida" | "andamento" | "nao_iniciada";

export interface TriageItem {
  id: string;
  clinica_id?: string | undefined;
  appointment_id?: string | null | undefined;
  patient: string;
  patient_id?: string | null | undefined;
  reason: string;
  status: TriageStatus;
  progress: number;
  priority: "Alta" | "Média" | "Baixa";
  started: string;
  channel: string;
  created_at?: string | null | undefined;
  painLevel?: number | undefined;
  painLocation?: string | undefined;
  painLabel?: string | undefined;
  duration?: string | undefined;
  allergies?: string | undefined;
  medications?: string | undefined;
  conditions?: string | undefined;
  birthDate?: string | undefined;
  phone?: string | undefined;
  rawDetails?: string | undefined;
}

const statusMeta: Record<
  TriageStatus,
  { label: string; tone: "green" | "blue" | "neutral"; icon: typeof CheckCircle2 }
> = {
  concluida: { label: "Concluída", tone: "green", icon: CheckCircle2 },
  andamento: { label: "Em andamento", tone: "blue", icon: Loader2 },
  nao_iniciada: { label: "Não iniciada", tone: "neutral", icon: CircleDashed },
};

/**
 * Utilitário para extrair dados estruturados da queixa principal submetida na rota pública
 */
function parseTriageReason(text: string) {
  if (!text) {
    return {
      complaint: "Consulta médica / avaliação",
      duration: undefined,
      painLevel: undefined,
      painLabel: undefined,
      painLocation: undefined,
      allergies: undefined,
      medications: undefined,
      conditions: undefined,
      birthDate: undefined,
      phone: undefined,
      full: "",
    };
  }

  const queixaMatch = text.match(/QUEIXA PRINCIPAL:\s*([^\n]+)/i);
  const duracaoMatch = text.match(/DURAÇÃO DOS SINTOMAS:\s*([^\n]+)/i);
  const dorMatch = text.match(/ESCALA DE DOR:\s*([^\n]+)/i);
  const alergiasMatch = text.match(/ALERGIAS:\s*([^\n]+)/i);
  const medicamentosMatch = text.match(/MEDICAMENTOS CONTÍNUOS:\s*([^\n]+)/i);
  const condicoesMatch = text.match(/CONDIÇÕES PRÉVIAS:\s*([^\n]+)/i);
  const nascimentoMatch = text.match(/NASCIMENTO:\s*([^\n]+)/i);
  const contatoMatch = text.match(/CONTATO:\s*([^\n]+)/i);

  let complaint = "";
  if (queixaMatch && queixaMatch[1]) {
    complaint = queixaMatch[1].trim();
  } else {
    const firstLine = text.split("\n")[0] || "";
    complaint = firstLine.replace(/^\[Pré-Triagem Paciente\]\s*/i, "").trim() || text;
  }

  let painLevel: number | undefined = undefined;
  let painLabel: string | undefined = undefined;
  let painLocation: string | undefined = undefined;

  if (dorMatch?.[1]) {
    const dorString = dorMatch[1].trim();
    const pMatch = dorString.match(/(\d+)\/10/);
    if (pMatch?.[1]) {
      painLevel = parseInt(pMatch[1], 10);
    }
    const labelMatch = dorString.match(/\(([^)]+)\)/);
    if (labelMatch?.[1]) {
      painLabel = labelMatch[1];
    }
    const locMatch = dorString.match(/Local:\s*(.+)$/i);
    if (locMatch?.[1]) {
      painLocation = locMatch[1].trim();
    }
  }

  return {
    complaint: complaint || "Consulta médica geral",
    duration: duracaoMatch?.[1]?.trim(),
    painLevel,
    painLabel,
    painLocation,
    allergies: alergiasMatch?.[1]?.trim(),
    medications: medicamentosMatch?.[1]?.trim(),
    conditions: condicoesMatch?.[1]?.trim(),
    birthDate: nascimentoMatch?.[1]?.trim(),
    phone: contatoMatch?.[1]?.trim(),
    full: text,
  };
}

/**
 * Formata data e hora para exibição amigável em pt-BR
 */
function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr || dateStr === "—") return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return dateStr;
  }
}

function Triagens() {
  const navigate = useNavigate();
  const { currentClinic, loading: tenantLoading } = useTenant();

  const [triagesList, setTriagesList] = useState<TriageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"todas" | TriageStatus>("todas");
  const [selectedTriage, setSelectedTriage] = useState<TriageItem | null>(null);

  /**
   * Carrega os dados reais do Supabase (filtrando por clinica_id)
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const clinicId = currentClinic?.id;

      // 1. Busca da tabela real de triagens
      let triagensRows: Array<{
        id: string;
        clinica_id: string;
        patient: string;
        patient_id: string | null;
        reason: string;
        status: string;
        progress: number;
        priority: string;
        started: string | null;
        channel: string;
        created_at: string | null;
      }> = [];

      if (clinicId) {
        const { data, error } = await supabase
          .from("triagens")
          .select("*")
          .eq("clinica_id", clinicId)
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("[Triagens] Aviso ao buscar triagens por clinica_id:", error.message);
        }

        if (data && data.length > 0) {
          triagensRows = data;
        } else {
          // Fallback gracioso: busca triagens órfãs ou legadas para auto-recuperação
          const { data: fallbackData } = await supabase
            .from("triagens")
            .select("*")
            .or(`clinica_id.eq.${clinicId},clinica_id.is.null`)
            .order("created_at", { ascending: false });

          triagensRows = fallbackData || [];

          // Auto-cura: vincula triagens órfãs à clínica ativa
          const orphanIds = triagensRows.filter((t) => !t.clinica_id).map((t) => t.id);
          if (orphanIds.length > 0) {
            supabase
              .from("triagens")
              .update({ clinica_id: clinicId })
              .in("id", orphanIds)
              .then(() =>
                console.log(`[Triagens] ${orphanIds.length} triagens auto-vinculadas à clínica.`),
              );
          }
        }
      } else {
        const { data, error } = await supabase
          .from("triagens")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data) triagensRows = data;
      }

      // 2. Busca agendamentos correspondentes para vincular IDs de consulta (permitindo ir direto para atendimento e gerar link)
      let appQuery = supabase
        .from("agendamentos")
        .select("id, clinica_id, paciente_id, paciente_nome, data_hora, status, observacoes, created_at")
        .order("data_hora", { ascending: false });

      if (clinicId) {
        appQuery = appQuery.or(`clinica_id.eq.${clinicId},clinica_id.is.null`);
      }

      const { data: appRows } = await appQuery;

      const processedPatients = new Set<string>();
      const combinedList: TriageItem[] = [];

      // Mapeia registros reais da tabela 'triagens'
      if (triagensRows && triagensRows.length > 0) {
        for (const row of triagensRows) {
          const rawStatus = String(row.status || "").toLowerCase();
          let status: TriageStatus = "nao_iniciada";

          if (
            rawStatus.includes("conclui") ||
            rawStatus.includes("conclu") ||
            rawStatus === "triagem concluída" ||
            rawStatus === "completed" ||
            rawStatus === "done"
          ) {
            status = "concluida";
          } else if (
            rawStatus.includes("andam") ||
            rawStatus.includes("aguard") ||
            rawStatus === "in_progress"
          ) {
            status = "andamento";
          }

          const rawPriority = String(row.priority || "").toLowerCase();
          let priority: "Alta" | "Média" | "Baixa" = "Média";
          if (rawPriority.includes("alt") || rawPriority.includes("high")) {
            priority = "Alta";
          } else if (rawPriority.includes("baix") || rawPriority.includes("low")) {
            priority = "Baixa";
          }

          const parsed = parseTriageReason(row.reason || "");

          // Vincula com agendamento correspondente (por paciente_id ou nome)
          const matchingApp = (appRows || []).find(
            (a) =>
              (row.patient_id && a.paciente_id === row.patient_id) ||
              a.paciente_nome?.toLowerCase().trim() === (row.patient || "").toLowerCase().trim(),
          );

          const triageItem: TriageItem = {
            id: row.id,
            clinica_id: row.clinica_id,
            appointment_id: matchingApp?.id || null,
            patient: row.patient || "Paciente",
            patient_id: row.patient_id,
            reason: parsed.complaint,
            status,
            progress: Number(row.progress) || (status === "concluida" ? 100 : status === "andamento" ? 50 : 0),
            priority,
            started: formatDisplayDate(row.started || row.created_at),
            channel: row.channel || "Web Paciente",
            created_at: row.created_at ?? undefined,
            rawDetails: row.reason || "",
            duration: parsed.duration,
            allergies: parsed.allergies,
            medications: parsed.medications,
            conditions: parsed.conditions,
            birthDate: parsed.birthDate,
            phone: parsed.phone,
            painLevel: parsed.painLevel,
            painLabel: parsed.painLabel,
            painLocation: parsed.painLocation,
          };

          combinedList.push(triageItem);
          processedPatients.add(triageItem.patient.toLowerCase().trim());
        }
      }

      // Sincroniza agendamentos ativos ou com triagem concluída que ainda não tenham sido inseridos na tabela triagens
      if (appRows && appRows.length > 0) {
        for (const app of appRows) {
          const isTriageCompleted = app.status === "Triagem Concluída";
          const patientNameKey = (app.paciente_nome || "").toLowerCase().trim();

          // Se já mapeamos essa triagem, apenas garante que o appointment_id está preenchido
          const existingItem = combinedList.find(
            (t) => t.patient.toLowerCase().trim() === patientNameKey,
          );
          if (existingItem) {
            if (!existingItem.appointment_id) existingItem.appointment_id = app.id;
            continue;
          }

          let itemStatus: TriageStatus = "nao_iniciada";
          let itemProgress = 0;

          if (isTriageCompleted) {
            itemStatus = "concluida";
            itemProgress = 100;
          } else if (app.status === "Aguardando" || app.status === "Confirmado") {
            itemStatus = "andamento";
            itemProgress = 40;
          }

          const parsed = parseTriageReason(app.observacoes || "");

          combinedList.push({
            id: `app-${app.id}`,
            appointment_id: app.id,
            clinica_id: app.clinica_id,
            patient: app.paciente_nome || "Paciente",
            patient_id: app.paciente_id,
            reason: parsed.complaint || "Aguardando preenchimento da pré-triagem",
            status: itemStatus,
            progress: itemProgress,
            priority: isTriageCompleted ? "Média" : "Baixa",
            started: formatDisplayDate(app.data_hora || app.created_at),
            channel: isTriageCompleted ? "Link Público /t/" : "Agenda",
            created_at: app.created_at,
            rawDetails: app.observacoes || "",
            duration: parsed.duration,
            allergies: parsed.allergies,
            medications: parsed.medications,
            conditions: parsed.conditions,
            birthDate: parsed.birthDate,
            phone: parsed.phone,
            painLevel: parsed.painLevel,
            painLabel: parsed.painLabel,
            painLocation: parsed.painLocation,
          });

          processedPatients.add(patientNameKey);
        }
      }

      setTriagesList(combinedList);
    } catch (err: unknown) {
      console.error("[Triagens] Erro ao carregar triagens:", err);
      toast.error("Erro ao sincronizar triagens da clínica.");
    } finally {
      setLoading(false);
    }
  }, [currentClinic?.id]);

  useEffect(() => {
    if (!tenantLoading) {
      loadData();
    }

    // Atualização em tempo real via Supabase Realtime
    const channel = supabase
      .channel("realtime-triagens-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "triagens" },
        () => {
          loadData();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agendamentos" },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantLoading, loadData]);

  // Totais e Métricas em Tempo Real (Total, Concluídas, Em andamento)
  const summary = useMemo(() => {
    const total = triagesList.length;
    const concluidas = triagesList.filter((t) => t.status === "concluida").length;
    const andamento = triagesList.filter((t) => t.status === "andamento").length;
    const naoIniciada = triagesList.filter((t) => t.status === "nao_iniciada").length;
    return { total, concluidas, andamento, naoIniciada };
  }, [triagesList]);

  const tabs = [
    { key: "todas" as const, label: "Todas", count: summary.total },
    { key: "concluida" as const, label: "Concluídas", count: summary.concluidas },
    { key: "andamento" as const, label: "Em andamento", count: summary.andamento },
    { key: "nao_iniciada" as const, label: "Não iniciadas", count: summary.naoIniciada },
  ];

  const rows = triagesList.filter((t) => tab === "todas" || t.status === tab);

  // Copia o link público de pré-triagem para a área de transferência
  const handleCopyTriageLink = (triage: TriageItem) => {
    const targetId = triage.appointment_id || triage.id.replace(/^app-/, "");
    if (!targetId) {
      toast.error("ID de agendamento não disponível para gerar link público.");
      return;
    }
    const publicUrl = `${window.location.origin}/t/${targetId}`;
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link de pré-triagem copiado!", {
      description: "Envie este link via WhatsApp para o paciente responder antes da consulta.",
    });
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5">
      <PageHeader
        title="Triagens Pré-Consulta"
        description="Acompanhe as respostas e o histórico de pré-atendimento de cada paciente antes da consulta médica"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadData} disabled={loading}>
              <RefreshCw className={cn("size-4", loading && "animate-spin text-primary")} />{" "}
              Atualizar
            </Button>
            <Button
              onClick={() => navigate({ to: "/agenda" })}
              className="hidden sm:inline-flex items-center gap-1.5"
            >
              <Calendar className="size-4" /> Ver Agenda
            </Button>
          </div>
        }
      />

      {/* Cards de Métricas Reais do Supabase (Total, Concluídas, Em andamento) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card: Total */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-muted-foreground">Total de Triagens</p>
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{summary.total}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Triagens registradas na clínica</p>
        </Card>

        {/* Card: Concluídas */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-muted-foreground">Triagens Concluídas</p>
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {summary.concluidas}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Respostas recebidas via rota pública</p>
        </Card>

        {/* Card: Em Andamento */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-muted-foreground">Em Andamento</p>
            <span className="flex size-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Loader2 className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-sky-600 dark:text-sky-400">
            {summary.andamento}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Aguardando envio ou preenchimento</p>
        </Card>

        {/* Card: Taxa de Resposta */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-muted-foreground">Taxa de Conclusão</p>
            <span className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {summary.total > 0 ? Math.round((summary.concluidas / summary.total) * 100) : 0}%
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Índice de engajamento do paciente</p>
        </Card>
      </div>

      {/* Tabela de Listagem das Triagens com Filtros */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between border-b border-border px-4 py-3 gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  tab === t.key
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "ml-1.5 rounded-full px-1.5 py-0.2 text-[10px]",
                    tab === t.key ? "bg-white/20" : "bg-secondary",
                  )}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          <span className="text-xs text-muted-foreground hidden sm:inline-block">
            {rows.length} triagem(ns) listada(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <th className="px-5 py-3">Paciente</th>
                <th className="px-5 py-3">Queixa Principal / Motivo</th>
                <th className="px-5 py-3">Canal</th>
                <th className="px-5 py-3">Prioridade</th>
                <th className="w-44 px-5 py-3">Progresso</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="size-6 animate-spin text-primary" />
                      <span>Sincronizando triagens da clínica no Supabase...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((t) => {
                  const meta = statusMeta[t.status] || statusMeta.nao_iniciada;
                  return (
                    <tr key={t.id} className="transition-colors hover:bg-secondary/40">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={t.patient} />
                          <div>
                            <p className="text-[13px] font-semibold text-foreground leading-tight">
                              {t.patient}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {t.started}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="max-w-xs px-5 py-3.5">
                        <p
                          className="text-[13px] text-foreground font-medium truncate"
                          title={t.reason}
                        >
                          {t.reason}
                        </p>
                        {t.painLevel !== undefined && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                            <HeartPulse className="size-3" /> Dor: {t.painLevel}/10
                            {t.painLocation && ` (${t.painLocation})`}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-[11px] font-medium text-foreground">
                          {t.channel}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <Badge
                          tone={
                            t.priority === "Alta"
                              ? "red"
                              : t.priority === "Média"
                                ? "amber"
                                : "neutral"
                          }
                        >
                          {t.priority}
                        </Badge>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Progress value={t.progress} />
                          <span className="w-8 text-right font-mono text-[11px] font-medium text-muted-foreground">
                            {t.progress}%
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <Badge tone={meta.tone}>
                          <meta.icon className="size-3" />
                          {meta.label}
                        </Badge>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão Ver Detalhes / Dossiê da Triagem */}
                          <Button
                            variant="ghost"
                            onClick={() => setSelectedTriage(t)}
                            title="Ver detalhes da resposta do paciente"
                            className="h-8 px-2 text-xs"
                          >
                            <Eye className="size-3.5" />
                          </Button>

                          {/* Copiar Link Público */}
                          <Button
                            variant="ghost"
                            onClick={() => handleCopyTriageLink(t)}
                            title="Copiar link público para o paciente responder"
                            className="h-8 px-2 text-xs"
                          >
                            <Link2 className="size-3.5" />
                          </Button>

                          {/* Ir para Atendimento Médico */}
                          {t.appointment_id ? (
                            <Link
                              to="/atendimento/$id"
                              params={{ id: t.appointment_id }}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                              title="Abrir sala de atendimento médico"
                            >
                              <Stethoscope className="size-3.5" />
                              <span className="hidden xl:inline">Atender</span>
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <div className="mx-auto max-w-sm space-y-3">
                      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <ClipboardList className="size-6" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        Nenhuma triagem encontrada nesta categoria
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Quando os pacientes responderem ao link público de pré-triagem enviado via
                        WhatsApp ou no agendamento, as queixas e sinais vitais aparecerão nesta tela.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => navigate({ to: "/agenda" })}
                        className="mt-2 text-xs h-8"
                      >
                        Ir para a Agenda
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de Detalhes da Triagem Selecionada */}
      <Dialog open={!!selectedTriage} onOpenChange={(open) => !open && setSelectedTriage(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-5 text-primary" />
              <span>Dossiê de Pré-Triagem — {selectedTriage?.patient}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Respostas estruturadas submetidas pelo paciente no formulário público.
            </DialogDescription>
          </DialogHeader>

          {selectedTriage && (
            <div className="space-y-4 py-2 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Status da Triagem</span>
                  <Badge tone={statusMeta[selectedTriage.status]?.tone || "neutral"}>
                    {statusMeta[selectedTriage.status]?.label || selectedTriage.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Prioridade</span>
                  <Badge
                    tone={
                      selectedTriage.priority === "Alta"
                        ? "red"
                        : selectedTriage.priority === "Média"
                          ? "amber"
                          : "neutral"
                    }
                  >
                    {selectedTriage.priority}
                  </Badge>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Canal</span>
                  <span className="font-semibold text-foreground">{selectedTriage.channel}</span>
                </div>
              </div>

              {/* Queixa Principal e Duração */}
              <div className="rounded-lg border border-border bg-surface p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary" /> Queixa Principal
                  </h4>
                  {selectedTriage.duration && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="size-3" /> {selectedTriage.duration}
                    </span>
                  )}
                </div>
                <p className="text-[13px] font-medium text-foreground leading-relaxed">
                  {selectedTriage.reason}
                </p>
              </div>

              {/* Nível de Dor */}
              {selectedTriage.painLevel !== undefined && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="size-4 text-amber-600 dark:text-amber-400" />
                    <div>
                      <strong className="text-amber-700 dark:text-amber-300 font-semibold block text-[11px]">
                        Nível de Dor Avaliado: {selectedTriage.painLevel}/10
                      </strong>
                      <span className="text-muted-foreground text-[11px]">
                        {selectedTriage.painLabel || "Desconforto relatado"}
                        {selectedTriage.painLocation ? ` • Local: ${selectedTriage.painLocation}` : ""}
                      </span>
                    </div>
                  </div>
                  <Badge tone={selectedTriage.painLevel >= 8 ? "red" : selectedTriage.painLevel >= 5 ? "amber" : "green"}>
                    {selectedTriage.painLevel >= 8 ? "Severa" : selectedTriage.painLevel >= 5 ? "Moderada" : "Leve"}
                  </Badge>
                </div>
              )}

              {/* Alergias */}
              {selectedTriage.allergies && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 flex items-start gap-2.5">
                  <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-destructive font-semibold block text-[11px]">
                      Alergias Relatadas
                    </strong>
                    <span className="text-destructive/90">{selectedTriage.allergies}</span>
                  </div>
                </div>
              )}

              {/* Medicamentos */}
              {selectedTriage.medications && (
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 flex items-start gap-2.5">
                  <Pill className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-blue-600 dark:text-blue-400 font-semibold block text-[11px]">
                      Medicamentos de Uso Contínuo
                    </strong>
                    <span className="text-foreground">{selectedTriage.medications}</span>
                  </div>
                </div>
              )}

              {/* Condições Prévias */}
              {selectedTriage.conditions && (
                <div className="rounded-lg border border-border bg-secondary/30 p-3 flex items-start gap-2.5">
                  <Activity className="size-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground font-semibold block text-[11px]">
                      Condições Pré-Existentes / Comorbidades
                    </strong>
                    <span className="text-muted-foreground">{selectedTriage.conditions}</span>
                  </div>
                </div>
              )}

              {/* Detalhes Brutos Completos */}
              {selectedTriage.rawDetails && (
                <details className="rounded-lg border border-border bg-secondary/20 p-2.5 text-[11px]">
                  <summary className="font-semibold text-muted-foreground cursor-pointer hover:text-foreground">
                    Ver transcrição completa da submissão
                  </summary>
                  <pre className="mt-2 p-2 rounded bg-surface border border-border text-[11px] whitespace-pre-wrap font-mono text-muted-foreground leading-relaxed">
                    {selectedTriage.rawDetails}
                  </pre>
                </details>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => handleCopyTriageLink(selectedTriage)}
                  className="h-8 px-2.5 text-xs"
                >
                  <Link2 className="size-3.5 mr-1" /> Copiar Link Público
                </Button>

                {selectedTriage.appointment_id && (
                  <Button
                    onClick={() => {
                      const appId = selectedTriage.appointment_id;
                      setSelectedTriage(null);
                      navigate({ to: "/atendimento/$id", params: { id: appId! } });
                    }}
                    className="h-8 px-3 text-xs"
                  >
                    <Stethoscope className="size-3.5 mr-1" /> Iniciar Atendimento
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
