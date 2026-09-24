import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { ArrowUpRight, Download } from "lucide-react";
import { Card, CardHead, PageHeader, Button } from "@/components/kit";
import { weeklyTriages, specialtyShare, timeSaved } from "@/lib/mock-data";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Copiloto Med" },
      {
        name: "description",
        content:
          "Indicadores de produtividade da clínica: triagens por dia, dossiês gerados, horas economizadas e distribuição por especialidade.",
      },
      { property: "og:title", content: "Relatórios — Copiloto Med" },
      {
        property: "og:description",
        content: "Indicadores e gráficos de desempenho da triagem médica.",
      },
    ],
  }),
  component: Relatorios,
});

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  fontSize: 12,
  background: "var(--color-surface)",
};

function Relatorios() {
  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Desempenho da clínica nos últimos 30 dias"
        actions={
          <>
            <Button variant="outline">Período: 30 dias</Button>
            <Button>
              <Download className="size-4" /> Exportar PDF
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { l: "Triagens realizadas", v: "412", d: "+16%" },
          { l: "Dossiês gerados", v: "389", d: "+21%" },
          { l: "Tempo médio de triagem", v: "4min 42s", d: "-12%" },
          { l: "Horas economizadas", v: "46h", d: "+24%" },
        ].map((k) => (
          <Card key={k.l} className="p-5">
            <p className="text-[13px] text-muted-foreground">{k.l}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{k.v}</p>
            <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-success">
              <ArrowUpRight className="size-3" /> {k.d} vs. mês anterior
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHead title="Triagens e dossiês por dia" subtitle="Últimos 7 dias" />
          <div className="h-72 px-3 py-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTriages} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-secondary)" }} />
                <Bar dataKey="triagens" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="dossies" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHead title="Distribuição por especialidade" subtitle="Participação nas triagens" />
          <ul className="space-y-4 px-5 py-6">
            {specialtyShare.map((s) => (
              <li key={s.name}>
                <div className="flex items-center justify-between text-[13px]">
                  <span>{s.name}</span>
                  <span className="font-semibold">{s.value}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${s.value}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHead title="Horas economizadas por mês" subtitle="Tempo devolvido à equipe clínica" />
        <div className="h-64 px-3 py-5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeSaved}>
              <defs>
                <linearGradient id="fillHoras" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="horas"
                stroke="var(--color-chart-1)"
                strokeWidth={2.5}
                fill="url(#fillHoras)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
