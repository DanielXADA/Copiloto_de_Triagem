import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, CircleDashed, Filter, Download, RefreshCw } from "lucide-react";
import { Card, PageHeader, Badge, Button, Avatar, Progress } from "@/components/kit";
import {
  fetchTriages,
  computeTriageSummary,
  type Triage,
  type TriageStatus,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/triagens")({
  head: () => ({
    meta: [
      { title: "Triagens — Copiloto Med" },
      {
        name: "description",
        content:
          "Acompanhe o status e o andamento de cada triagem pré-consulta em tempo real, por canal e prioridade.",
      },
      { property: "og:title", content: "Triagens — Copiloto Med" },
      {
        property: "og:description",
        content: "Status, progresso e prioridade de todas as triagens do dia.",
      },
    ],
  }),
  component: Triagens,
});

const statusMeta: Record<
  TriageStatus,
  { label: string; tone: "green" | "blue" | "neutral"; icon: typeof CheckCircle2 }
> = {
  concluida: { label: "Concluída", tone: "green", icon: CheckCircle2 },
  andamento: { label: "Em andamento", tone: "blue", icon: Loader2 },
  nao_iniciada: { label: "Não iniciada", tone: "neutral", icon: CircleDashed },
};

function Triagens() {
  const [triagesList, setTriagesList] = useState<Triage[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"todas" | TriageStatus>("todas");

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchTriages();
      setTriagesList(data);
    } catch (err) {
      console.warn("[Triagens] Supabase não respondeu, usando estado inicial vazio:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const summary = useMemo(() => computeTriageSummary(triagesList), [triagesList]);

  const tabs = [
    { key: "todas" as const, label: "Todas", count: summary.total },
    { key: "concluida" as const, label: "Concluídas", count: summary.concluidas },
    { key: "andamento" as const, label: "Em andamento", count: summary.andamento },
    { key: "nao_iniciada" as const, label: "Não iniciadas", count: summary.naoIniciada },
  ];

  const rows = triagesList.filter((t) => tab === "todas" || t.status === tab);

  return (
    <div>
      <PageHeader
        title="Triagens"
        description="Pré-atendimentos estruturados automaticamente antes da consulta"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadData} disabled={loading}>
              <RefreshCw className={cn("size-4", loading && "animate-spin text-primary")} />{" "}
              Atualizar
            </Button>
            <Button variant="outline">
              <Filter className="size-4" /> Filtrar
            </Button>
            <Button variant="outline">
              <Download className="size-4" /> Exportar
            </Button>
          </div>
        }
      />

      <div className="mb-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { l: "Total do dia", v: summary.total, tone: "neutral" as const },
          { l: "Concluídas", v: summary.concluidas, tone: "green" as const },
          { l: "Em andamento", v: summary.andamento, tone: "blue" as const },
          { l: "Não iniciadas", v: summary.naoIniciada, tone: "neutral" as const },
        ].map((s) => (
          <Card key={s.l} className="p-5">
            <p className="text-[13px] text-muted-foreground">{s.l}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{s.v}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-3">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors",
                tab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {t.label}
              <span className="ml-2 opacity-70">{t.count}</span>
            </button>
          ))}
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border text-[11px] tracking-wide text-muted-foreground uppercase">
              <th className="px-5 py-3 font-medium">Paciente</th>
              <th className="px-5 py-3 font-medium">Queixa principal</th>
              <th className="px-5 py-3 font-medium">Canal</th>
              <th className="px-5 py-3 font-medium">Prioridade</th>
              <th className="w-48 px-5 py-3 font-medium">Andamento</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="size-5 animate-spin text-primary" /> Carregando triagens...
                  </div>
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((t) => {
                const meta = statusMeta[t.status] || statusMeta.nao_iniciada;
                return (
                  <tr key={t.id} className="transition-colors hover:bg-secondary/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={t.patient} />
                        <div>
                          <p className="text-[13px] font-medium">{t.patient}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {t.id} • início {t.started}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-56 px-5 py-3.5 text-[13px] text-muted-foreground">
                      {t.reason}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{t.channel}</td>
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
                        <span className="w-9 text-right text-[11px] text-muted-foreground">
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
                  </tr>
                );
              })}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Nenhuma triagem encontrada para esta categoria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
