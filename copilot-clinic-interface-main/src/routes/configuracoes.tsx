import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Users, Bell, ShieldCheck, Plus } from "lucide-react";
import {
  Card,
  CardHead,
  PageHeader,
  Badge,
  Button,
  Avatar,
  Field,
  Input,
  Toggle,
} from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Copiloto Med" },
      {
        name: "description",
        content:
          "Gestão da clínica no Copiloto Med: dados cadastrais, equipe, preferências de triagem, notificações e segurança.",
      },
      { property: "og:title", content: "Configurações — Copiloto Med" },
      {
        property: "og:description",
        content: "Gerencie clínica, equipe e preferências do pré-atendimento.",
      },
    ],
  }),
  component: Configuracoes,
});

const sections = [
  { key: "clinica", label: "Clínica", icon: Building2 },
  { key: "equipe", label: "Equipe", icon: Users },
  { key: "preferencias", label: "Preferências", icon: Bell },
  { key: "seguranca", label: "Segurança", icon: ShieldCheck },
] as const;

const team = [
  { name: "Ana Beatriz", role: "Médica • Clínica Geral", access: "Administrador" },
  { name: "Rodrigo Prado", role: "Médico • Cardiologia", access: "Médico" },
  { name: "Beatriz Coelho", role: "Recepção", access: "Operacional" },
  { name: "Marcos Vinícius", role: "Enfermagem", access: "Operacional" },
];

function Configuracoes() {
  const [tab, setTab] = useState<(typeof sections)[number]["key"]>("clinica");
  const [prefs, setPrefs] = useState({
    autoTriage: true,
    whatsapp: true,
    redFlagAlert: true,
    weeklyReport: false,
    twoFactor: true,
  });
  const toggle = (k: keyof typeof prefs) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Gestão da clínica, equipe e preferências do pré-atendimento"
        actions={<Button>Salvar alterações</Button>}
      />

      <div className="grid gap-5 xl:grid-cols-[220px_1fr]">
        <Card className="h-fit p-2">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setTab(s.key)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                tab === s.key
                  ? "bg-primary-soft text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <s.icon className="size-4" />
              {s.label}
            </button>
          ))}
        </Card>

        <div className="space-y-5">
          {tab === "clinica" && (
            <Card>
              <CardHead title="Dados da clínica" subtitle="Informações exibidas nos dossiês" />
              <div className="grid gap-5 px-5 py-6 sm:grid-cols-2">
                <Field label="Nome da clínica">
                  <Input defaultValue="Clínica Vida Integrada" />
                </Field>
                <Field label="CNPJ">
                  <Input defaultValue="12.345.678/0001-90" />
                </Field>
                <Field label="Telefone">
                  <Input defaultValue="(11) 3344-5566" />
                </Field>
                <Field label="E-mail de contato">
                  <Input defaultValue="contato@vidaintegrada.com.br" />
                </Field>
                <Field label="Endereço">
                  <Input defaultValue="Av. Paulista, 1400 — São Paulo, SP" />
                </Field>
                <Field label="Responsável técnico">
                  <Input defaultValue="Dra. Ana Beatriz — CRM 123456/SP" />
                </Field>
              </div>
            </Card>
          )}

          {tab === "equipe" && (
            <Card>
              <CardHead
                title="Equipe"
                subtitle="4 membros ativos"
                action={
                  <Button variant="outline">
                    <Plus className="size-4" /> Convidar
                  </Button>
                }
              />
              <ul className="divide-y divide-border">
                {team.map((m) => (
                  <li key={m.name} className="flex items-center gap-3 px-5 py-4">
                    <Avatar name={m.name} />
                    <div className="flex-1">
                      <p className="text-[13px] font-medium">{m.name}</p>
                      <p className="text-[11px] text-muted-foreground">{m.role}</p>
                    </div>
                    <Badge tone={m.access === "Administrador" ? "blue" : "neutral"}>
                      {m.access}
                    </Badge>
                    <Button variant="ghost">Gerenciar</Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {tab === "preferencias" && (
            <Card>
              <CardHead
                title="Preferências de triagem"
                subtitle="Como o copiloto atua no dia a dia"
              />
              <ul className="divide-y divide-border">
                {[
                  {
                    k: "autoTriage" as const,
                    l: "Enviar triagem automaticamente",
                    d: "Dispara o pré-atendimento 24h antes da consulta.",
                  },
                  {
                    k: "whatsapp" as const,
                    l: "Canal WhatsApp",
                    d: "Permite ao paciente responder pelo WhatsApp.",
                  },
                  {
                    k: "redFlagAlert" as const,
                    l: "Alertas de sinais de alerta",
                    d: "Notifica a equipe quando a triagem detecta risco.",
                  },
                  {
                    k: "weeklyReport" as const,
                    l: "Relatório semanal por e-mail",
                    d: "Resumo de indicadores toda segunda-feira.",
                  },
                ].map((p) => (
                  <li key={p.k} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1">
                      <p className="text-[13px] font-medium">{p.l}</p>
                      <p className="text-[11px] text-muted-foreground">{p.d}</p>
                    </div>
                    <Toggle on={prefs[p.k]} onToggle={() => toggle(p.k)} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {tab === "seguranca" && (
            <Card>
              <CardHead title="Segurança e privacidade" subtitle="Conformidade com a LGPD" />
              <div className="space-y-5 px-5 py-6">
                <div className="flex items-center gap-4 rounded-lg border border-border px-4 py-4">
                  <div className="flex-1">
                    <p className="text-[13px] font-medium">Autenticação em duas etapas</p>
                    <p className="text-[11px] text-muted-foreground">
                      Exigida para todos os perfis administrativos.
                    </p>
                  </div>
                  <Toggle on={prefs.twoFactor} onToggle={() => toggle("twoFactor")} />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Retenção de dados de triagem" hint="Período de armazenamento">
                    <Input defaultValue="60 meses" />
                  </Field>
                  <Field label="Encarregado de dados (DPO)">
                    <Input defaultValue="dpo@vidaintegrada.com.br" />
                  </Field>
                </div>
                <div className="rounded-lg bg-secondary px-4 py-3 text-[12px] text-muted-foreground">
                  Todos os dados clínicos são criptografados em trânsito e em repouso. O último
                  registro de auditoria foi gerado hoje às 06:00.
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
