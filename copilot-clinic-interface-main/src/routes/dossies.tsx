import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Printer, Share2, AlertTriangle, Sparkles, Clock } from "lucide-react";
import { Card, CardHead, PageHeader, Badge, Button, Avatar, Input } from "@/components/kit";
import { dossiers, type Dossier } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dossies")({
  head: () => ({
    meta: [
      { title: "Dossiês clínicos — Copiloto Med" },
      {
        name: "description",
        content:
          "Resumos clínicos gerados a partir da triagem: queixa principal, sintomas estruturados, sinais de alerta e sugestões.",
      },
      { property: "og:title", content: "Dossiês clínicos — Copiloto Med" },
      {
        property: "og:description",
        content: "Abra o resumo clínico do paciente antes da consulta.",
      },
    ],
  }),
  component: Dossies,
});

function Dossies() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Dossier>(dossiers[0]!);
  const list = dossiers.filter((d) => d.patient.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Dossiês"
        description="Resumos clínicos prontos antes de o paciente entrar no consultório"
        actions={
          <>
            <Button variant="outline">
              <Share2 className="size-4" /> Compartilhar
            </Button>
            <Button variant="outline">
              <Printer className="size-4" /> Imprimir
            </Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <div className="border-b border-border px-4 py-3">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={setQuery} placeholder="Buscar dossiê" className="pl-9" />
            </div>
          </div>
          <ul className="divide-y divide-border">
            {list.map((d) => (
              <li key={d.id}>
                <button
                  onClick={() => setOpen(d)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60",
                    open.id === d.id && "bg-primary-soft/60",
                  )}
                >
                  <Avatar name={d.patient} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{d.patient}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {d.id} • {d.area}
                    </p>
                  </div>
                  {d.redFlags.length > 0 && (
                    <AlertTriangle className="size-4 shrink-0 text-warning" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-5">
            <div className="flex items-center gap-3">
              <Avatar name={open.patient} className="size-11 text-base" />
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{open.patient}</h2>
                <p className="text-xs text-muted-foreground">
                  {open.age} anos • {open.area} • {open.id}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="blue">
                <Clock className="size-3" /> Triagem em {open.duration}
              </Badge>
              <Badge tone="green">{open.createdAt}</Badge>
            </div>
          </div>

          <div className="space-y-6 px-6 py-6">
            <section>
              <h3 className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Queixa principal
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed font-medium">{open.chiefComplaint}</p>
            </section>

            <section>
              <h3 className="text-[11px] tracking-wide text-muted-foreground uppercase">
                História da doença atual
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{open.history}</p>
            </section>

            <section>
              <h3 className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Sintomas estruturados
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {open.symptoms.map((s) => (
                  <div key={s.label} className="rounded-lg border border-border px-3.5 py-3">
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                    <p className="mt-1 text-[15px] font-semibold tracking-tight">{s.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-lg border border-warning/30 bg-warning/8 p-4">
                <h3 className="flex items-center gap-2 text-[13px] font-semibold">
                  <AlertTriangle className="size-4 text-warning" /> Sinais de alerta
                </h3>
                <ul className="mt-3 space-y-2">
                  {open.redFlags.map((f) => (
                    <li key={f} className="flex gap-2 text-[13px] text-muted-foreground">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-border bg-primary-soft/60 p-4">
                <h3 className="flex items-center gap-2 text-[13px] font-semibold">
                  <Sparkles className="size-4 text-primary" /> Sugestões de conduta
                </h3>
                <ul className="mt-3 space-y-2">
                  {open.suggestions.map((s) => (
                    <li key={s} className="flex gap-2 text-[13px] text-muted-foreground">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <p className="border-t border-border pt-4 text-[11px] text-muted-foreground">
              Conteúdo gerado a partir da triagem do paciente. Não substitui a avaliação clínica do
              profissional.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
