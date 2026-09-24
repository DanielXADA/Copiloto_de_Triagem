import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Video,
  FileText,
  CheckCheck,
  CalendarDays,
} from "lucide-react";
import { Card, CardHead, PageHeader, Badge, Button, Avatar } from "@/components/kit";
import { appointments } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — Copiloto Med" },
      {
        name: "description",
        content:
          "Agenda do dia com compromissos confirmados, ações rápidas de atendimento e visão semanal da clínica.",
      },
      { property: "og:title", content: "Agenda — Copiloto Med" },
      {
        property: "og:description",
        content: "Compromissos, confirmações e ações rápidas em uma agenda clara.",
      },
    ],
  }),
  component: Agenda,
});

const week = [
  { day: "Seg", n: 7, count: 9 },
  { day: "Ter", n: 8, count: 11 },
  { day: "Qua", n: 9, count: 8 },
  { day: "Qui", n: 10, count: 12 },
  { day: "Sex", n: 11, count: 7 },
  { day: "Sáb", n: 12, count: 3 },
  { day: "Dom", n: 13, count: 0 },
];

function Agenda() {
  const [active, setActive] = useState(10);

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Quinta-feira, 10 de setembro de 2026 • 12 compromissos"
        actions={
          <>
            <Button variant="outline">
              <CalendarDays className="size-4" /> Semana
            </Button>
            <Button>
              <Plus className="size-4" /> Novo agendamento
            </Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Card className="flex items-center gap-2 p-3">
            <button className="rounded-lg p-2 text-muted-foreground hover:bg-secondary">
              <ChevronLeft className="size-4" />
            </button>
            <div className="grid flex-1 grid-cols-7 gap-2">
              {week.map((d) => (
                <button
                  key={d.day}
                  onClick={() => setActive(d.n)}
                  className={cn(
                    "rounded-lg border px-2 py-2.5 text-center transition-colors",
                    active === d.n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-secondary",
                  )}
                >
                  <p className="text-[11px] opacity-80">{d.day}</p>
                  <p className="text-base font-semibold">{d.n}</p>
                  <p className="text-[10px] opacity-70">{d.count} cons.</p>
                </button>
              ))}
            </div>
            <button className="rounded-lg p-2 text-muted-foreground hover:bg-secondary">
              <ChevronRight className="size-4" />
            </button>
          </Card>

          <Card>
            <CardHead title="Compromissos do dia" subtitle="Ordenados por horário" />
            <ul className="divide-y divide-border">
              {appointments.map((a) => (
                <li key={a.time} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="w-14">
                    <p className="text-[15px] font-semibold">{a.time}</p>
                    <p className="text-[11px] text-muted-foreground">30 min</p>
                  </div>
                  <div className="h-10 w-px bg-border" />
                  <Avatar name={a.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">{a.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {a.type} • {a.area}
                    </p>
                  </div>
                  <Badge
                    tone={
                      a.status === "Confirmado" ? "green" : a.status === "Aguardando" ? "amber" : "red"
                    }
                  >
                    {a.status}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <button
                      className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      title="Abrir dossiê"
                    >
                      <FileText className="size-4" />
                    </button>
                    <button
                      className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      title="Teleconsulta"
                    >
                      <Video className="size-4" />
                    </button>
                    <Button variant="outline">Iniciar</Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <p className="text-[13px] font-semibold">Resumo do dia</p>
            <ul className="mt-4 space-y-3">
              {[
                { l: "Confirmados", v: "9" },
                { l: "Aguardando confirmação", v: "2" },
                { l: "Cancelados", v: "1" },
                { l: "Taxa de ocupação", v: "86%" },
              ].map((i) => (
                <li key={i.l} className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">{i.l}</span>
                  <span className="font-semibold">{i.v}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHead title="Ações rápidas" />
            <div className="space-y-2 p-4">
              {[
                { icon: CheckCheck, l: "Confirmar pendentes", d: "2 pacientes sem resposta" },
                { icon: FileText, l: "Enviar triagens", d: "3 links de pré-atendimento" },
                { icon: Video, l: "Abrir sala virtual", d: "Teleconsulta das 11:00" },
              ].map((a) => (
                <button
                  key={a.l}
                  className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-3 text-left transition-colors hover:bg-secondary"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary-soft">
                    <a.icon className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium">{a.l}</p>
                    <p className="text-[11px] text-muted-foreground">{a.d}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
