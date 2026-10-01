import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  ArrowRight,
  Users,
  Clock,
  FileText,
  Smile,
  Zap,
  MoreVertical,
} from "lucide-react";
import { Card, CardHead, Avatar } from "@/components/kit";
import { kpis, appointments, recentPatients, triageSummary, doctor } from "@/lib/mock-data";
import { useAuth } from "@/hooks/use-auth";
import doctorHero from "@/assets/doctor-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Início — Copiloto Med | Triagem médica inteligente" },
      {
        name: "description",
        content:
          "Painel do Copiloto Med: KPIs de triagem, próximos atendimentos, triagens do dia e pacientes recentes da sua clínica.",
      },
      { property: "og:title", content: "Início — Copiloto Med" },
      {
        property: "og:description",
        content: "Acompanhe triagens, agenda e dossiês clínicos em um só painel.",
      },
    ],
  }),
  component: Inicio,
});

const kpiIcons = [Users, Clock, FileText, Smile];

function Donut() {
  const { concluidas, andamento, naoIniciada, total } = triageSummary;
  const r = 62;
  const c = 2 * Math.PI * r;
  const segs = [
    { v: concluidas, color: "var(--color-chart-1)" },
    { v: andamento, color: "var(--color-chart-2)" },
    { v: naoIniciada, color: "var(--color-chart-3)" },
  ];
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-6 px-5 py-6 sm:flex-row sm:justify-around">
      <div className="relative size-[152px]">
        <svg viewBox="0 0 160 160" className="size-full -rotate-90">
          {segs.map((s, i) => {
            const len = (s.v / total) * c;
            const el = (
              <circle
                key={i}
                cx="80"
                cy="80"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="16"
                strokeLinecap="butt"
                strokeDasharray={`${len - 3} ${c - len + 3}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tracking-tight">{total}</span>
          <span className="text-xs text-muted-foreground">triagens</span>
        </div>
      </div>
      <ul className="space-y-3">
        {[
          { label: "Concluídas", v: concluidas, color: "var(--color-chart-1)" },
          { label: "Em andamento", v: andamento, color: "var(--color-chart-2)" },
          { label: "Não iniciada", v: naoIniciada, color: "var(--color-chart-3)" },
        ].map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 text-[13px]">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="w-6 font-semibold">{s.v}</span>
            <span className="text-muted-foreground">{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Inicio() {
  const { profile } = useAuth();

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Card className="relative overflow-hidden">
          <img
            src={doctorHero}
            alt="Médica sorrindo em consultório da clínica"
            width={928}
            height={720}
            className="absolute inset-y-0 right-0 hidden h-full w-[46%] object-cover object-top lg:block"
          />
          <div className="relative z-10 max-w-2xl px-8 py-10">
            <p className="text-[13px] text-muted-foreground">Olá, {profile.name}</p>
            <h1 className="mt-3 text-[38px] leading-[1.1] font-semibold tracking-tight">
              Seu dia mais produtivo
              <br />
              começa com <span className="text-primary">informação.</span>
            </h1>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              O Copiloto Med organiza o pré-atendimento dos seus pacientes para que você foque no
              que realmente importa: o cuidado.
            </p>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-[36%] hidden w-[26%] bg-gradient-to-r from-card via-card/85 to-transparent lg:block" />
        </Card>

        <Card className="flex flex-col justify-center p-7">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary-soft">
            <Zap className="size-5 text-primary" />
          </div>
          <h2 className="mt-5 text-lg leading-snug font-semibold tracking-tight">
            Tecnologia a favor de uma medicina mais humana.
          </h2>
          <p className="mt-3 text-[13px] text-muted-foreground">
            Triagens em tempo real, dossiês organizados e um atendimento mais ágil e seguro.
          </p>
        </Card>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => {
          const Icon = kpiIcons[i] ?? Users;
          return (
            <Card key={k.label} className="flex items-center gap-4 p-5">
              <div className="flex size-11 items-center justify-center rounded-lg bg-primary-soft">
                <Icon className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">{k.value}</p>
                <p className="text-[13px] text-muted-foreground">{k.label}</p>
                <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-success">
                  <ArrowUpRight className="size-3" /> {k.delta}
                  <span className="text-muted-foreground">{k.hint}</span>
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHead
            title="Próximos atendimentos"
            action={
              <Link
                to="/agenda"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Ver agenda <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          <ul className="divide-y divide-border">
            {appointments.slice(0, 5).map((a) => (
              <li key={a.time} className="flex items-center gap-3 px-5 py-3">
                <span className="w-11 text-[13px] font-medium text-muted-foreground">{a.time}</span>
                <Avatar name={a.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{a.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {a.type} • {a.area}
                  </p>
                </div>
                <MoreVertical className="size-4 text-muted-foreground" />
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHead title="Triagens de hoje" />
          <Donut />
        </Card>

        <Card>
          <CardHead
            title="Pacientes recentes"
            action={
              <Link
                to="/pacientes"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Ver todos <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          <ul className="divide-y divide-border">
            {recentPatients.map((p) => (
              <li key={p.name} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={p.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{p.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {p.age} anos • CPF {p.cpf}
                  </p>
                </div>
                <span className="text-[11px] whitespace-nowrap text-muted-foreground">
                  {p.when}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
