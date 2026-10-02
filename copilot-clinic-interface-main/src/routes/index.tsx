import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  ArrowRight,
  Users,
  Clock,
  FileText,
  Zap,
  Plus,
  CalendarClock,
  Activity,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Card, CardHead, Avatar, Badge } from "@/components/kit";
import { useAuth } from "@/hooks/use-auth";
import { useClinicDashboard } from "@/hooks/use-clinic-dashboard";
import doctorHero from "@/assets/doctor-hero.jpg";
import { cn } from "@/lib/utils";

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

interface DonutProps {
  concluidas: number;
  andamento: number;
  naoIniciada: number;
  total: number;
}

function Donut({ concluidas, andamento, naoIniciada, total }: DonutProps) {
  const r = 62;
  const c = 2 * Math.PI * r;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-5 py-6 text-center">
        <div className="relative flex size-[140px] items-center justify-center">
          <svg viewBox="0 0 160 160" className="size-full">
            <circle
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="12"
              strokeDasharray="6 6"
              className="text-border"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-semibold tracking-tight text-muted-foreground">0</span>
            <span className="text-xs text-muted-foreground">triagens</span>
          </div>
        </div>
        <p className="max-w-[220px] text-xs text-muted-foreground">
          Nenhuma triagem realizada ainda. O resumo em tempo real aparecerá aqui.
        </p>
        <Link
          to="/triagens"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Iniciar primeira triagem <ArrowRight className="size-3" />
        </Link>
      </div>
    );
  }

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
            const len = total > 0 ? (s.v / total) * c : 0;
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
                strokeDasharray={`${Math.max(0, len - 3)} ${Math.max(0, c - len + 3)}`}
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
  const { metrics, isLoading } = useClinicDashboard();

  const kpis = [
    {
      label: "Triagens hoje",
      value: metrics.triagensHoje,
      sub: metrics.totalTriagens > 0 ? `${metrics.taxaConclusao}% concluídas` : "0 registradas",
      hint: metrics.totalTriagens > 0 ? "Taxa de conclusão" : "Aguardando pacientes",
      to: "/triagens",
      icon: Activity,
      tone: metrics.totalTriagens > 0 ? "text-success" : "text-muted-foreground",
    },
    {
      label: "Tempo economizado",
      value: metrics.tempoEconomizadoFormatado,
      sub: metrics.totalTriagens > 0 ? "Devolvido à equipe" : "~15min / triagem",
      hint: "Estimativa clínica",
      to: "/relatorios",
      icon: Clock,
      tone: metrics.totalTriagens > 0 ? "text-success" : "text-muted-foreground",
    },
    {
      label: "Dossiês prontos",
      value: metrics.totalDossies,
      sub: metrics.totalDossies > 0 ? "Prontuários gerados" : "Pronto para gerar",
      hint: metrics.totalDossies > 0 ? "Gerados via IA" : "0 dossiês",
      to: "/dossies",
      icon: FileText,
      tone: metrics.totalDossies > 0 ? "text-success" : "text-muted-foreground",
    },
    {
      label: "Pacientes cadastrados",
      value: metrics.totalPacientes,
      sub: metrics.totalPacientes > 0 ? "Base da clínica" : "Nenhum cadastro",
      hint: metrics.totalPacientes > 0 ? "Pacientes ativos" : "Cadastre o primeiro",
      to: "/pacientes",
      icon: Users,
      tone: metrics.totalPacientes > 0 ? "text-success" : "text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Banner Principal com Apresentação Dinâmica */}
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
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-medium text-muted-foreground">
                Olá, {profile.name}
              </p>
              {metrics.clinicName && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  {metrics.clinicName}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-[38px] leading-[1.1] font-semibold tracking-tight">
              Seu dia mais produtivo
              <br />
              começa com <span className="text-primary">informação.</span>
            </h1>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              O Copiloto Med organiza o pré-atendimento dos seus pacientes para que você foque no
              que realmente importa: o cuidado humanizado.
            </p>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-[36%] hidden w-[26%] bg-gradient-to-r from-card via-card/85 to-transparent lg:block" />
        </Card>

        {/* Card Lateral de Ações Rápidas */}
        <Card className="flex flex-col justify-between p-6">
          <div>
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary-soft">
              <Zap className="size-5 text-primary" />
            </div>
            <h2 className="mt-4 text-lg leading-snug font-semibold tracking-tight">
              Tecnologia a favor de uma medicina mais humana.
            </h2>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Triagens em tempo real, dossiês estruturados e atendimento mais ágil e seguro.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <Link
              to="/triagens"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-3.5" /> Iniciar Triagem
            </Link>
            <Link
              to="/pacientes"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <Users className="size-3.5" /> Cadastrar Paciente
            </Link>
          </div>
        </Card>
      </div>

      {/* 4 Cards de Métricas Reais e Clicáveis */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Link
              key={k.label}
              to={k.to}
              className="group block rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-lg bg-primary-soft text-primary group-hover:scale-105 transition-transform">
                  <Icon className="size-5" />
                </div>
                <ArrowRight className="size-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-semibold tracking-tight">
                  {isLoading ? "—" : k.value}
                </p>
                <p className="text-[13px] text-muted-foreground">{k.label}</p>
                <p className={cn("mt-1.5 flex items-center gap-1 text-[11px] font-medium", k.tone)}>
                  <ArrowUpRight className="size-3" /> {k.sub}
                  <span className="text-muted-foreground font-normal">• {k.hint}</span>
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Grid de Seções com Tratamento de Empty States Proativos */}
      <div className="grid gap-5 xl:grid-cols-3">
        {/* Coluna 1: Fila de Atendimento / Triagens Recentes */}
        <Card>
          <CardHead
            title="Próximos atendimentos"
            action={
              <Link
                to="/triagens"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Ver triagens <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          {isLoading ? (
            <div className="flex h-56 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : metrics.recentTriages.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <CalendarClock className="size-6" />
              </div>
              <h3 className="mt-3.5 text-sm font-semibold text-foreground">
                Fila de atendimento livre
              </h3>
              <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
                Nenhuma triagem em andamento ou na fila de espera no momento.
              </p>
              <Link
                to="/triagens"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                <Plus className="size-3.5" /> Iniciar nova triagem
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {metrics.recentTriages.map((t) => (
                <li
                  key={t.id}
                  className="group flex items-center gap-3 px-5 py-3 hover:bg-secondary/40 transition-colors"
                >
                  <span className="w-12 text-[12px] font-medium text-muted-foreground">
                    {t.started || "Hoje"}
                  </span>
                  <Avatar name={t.patient} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium group-hover:text-primary transition-colors">
                      {t.patient}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {t.reason} • {t.channel}
                    </p>
                  </div>
                  <Badge
                    tone={
                      t.status === "concluida"
                        ? "green"
                        : t.status === "andamento"
                        ? "blue"
                        : "neutral"
                    }
                  >
                    {t.status === "concluida"
                      ? "Concluída"
                      : t.status === "andamento"
                      ? "Em andamento"
                      : "Não iniciada"}
                  </Badge>
                  <Link
                    to="/triagens"
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    title="Ver detalhes da triagem"
                  >
                    <ArrowRight className="size-4" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Coluna 2: Donut das Triagens de Hoje */}
        <Card>
          <CardHead title="Triagens de hoje" />
          {isLoading ? (
            <div className="flex h-56 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Donut
              concluidas={metrics.triageSummary.concluidas}
              andamento={metrics.triageSummary.andamento}
              naoIniciada={metrics.triageSummary.naoIniciada}
              total={metrics.triageSummary.total}
            />
          )}
        </Card>

        {/* Coluna 3: Pacientes Recentes */}
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
          {isLoading ? (
            <div className="flex h-56 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : metrics.recentPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Users className="size-6" />
              </div>
              <h3 className="mt-3.5 text-sm font-semibold text-foreground">
                Nenhum paciente cadastrado
              </h3>
              <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
                Cadastre o primeiro paciente da sua clínica para associar a triagens e dossiês.
              </p>
              <Link
                to="/pacientes"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                <Plus className="size-3.5" /> Cadastrar paciente
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {metrics.recentPatients.map((p) => (
                <li
                  key={p.id || p.name}
                  className="group flex items-center gap-3 px-5 py-3 hover:bg-secondary/40 transition-colors"
                >
                  <Avatar name={p.name} />
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/pacientes"
                      className="truncate text-[13px] font-medium group-hover:text-primary transition-colors block"
                    >
                      {p.name}
                    </Link>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {p.age > 0 ? `${p.age} anos • ` : ""}{p.cpf ? `CPF ${p.cpf}` : p.plan || "Particular"}
                    </p>
                  </div>
                  <Badge tone={p.status === "Ativo" ? "green" : "neutral"}>
                    {p.status || "Ativo"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
