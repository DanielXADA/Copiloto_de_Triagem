import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Building2, Users, Bell, ShieldCheck, Plus, User, ShieldAlert } from "lucide-react";
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
import { PerfilEditor } from "@/components/perfil/perfil-editor";
import { DadosClinicaTab } from "@/components/configuracoes/dados-clinica-tab";
import { EquipeClinicaTab } from "@/components/configuracoes/equipe-clinica-tab";
import { usePermissions } from "@/hooks/use-permissions";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Copiloto Med" },
      {
        name: "description",
        content:
          "Gestão da clínica no Copiloto Med: dados cadastrais, perfil profissional, equipe, preferências de triagem, notificações e segurança.",
      },
      { property: "og:title", content: "Configurações — Copiloto Med" },
      {
        property: "og:description",
        content: "Gerencie perfil, clínica, equipe e preferências do pré-atendimento.",
      },
    ],
  }),
  component: Configuracoes,
});

const sections = [
  { key: "perfil", label: "Meu Perfil", icon: User },
  { key: "clinica", label: "Clínica", icon: Building2 },
  { key: "equipe", label: "Equipe", icon: Users },
  { key: "preferencias", label: "Preferências", icon: Bell },
  { key: "seguranca", label: "Segurança", icon: ShieldCheck },
] as const;

function Configuracoes() {
  const { canAccessTab, isAdmin, cargoLabel, currentClinic } = usePermissions();

  const [tab, setTab] = useState<(typeof sections)[number]["key"]>(
    isAdmin ? "clinica" : "perfil",
  );
  const [prefs, setPrefs] = useState({
    autoTriage: true,
    whatsapp: true,
    redFlagAlert: true,
    weeklyReport: false,
    twoFactor: true,
  });
  const toggle = (k: keyof typeof prefs) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  // Se o usuário não tiver permissão para a aba ativa (ex: médico tentando clinica), redireciona para 'perfil'
  useEffect(() => {
    if (!canAccessTab(tab)) {
      setTab("perfil");
    }
  }, [tab, canAccessTab]);

  const visibleSections = sections.filter((s) => canAccessTab(s.key));

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Gestão da clínica, equipe e preferências do pré-atendimento"
        actions={
          tab === "perfil" ? (
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = "/configuracoes/perfil";
              }}
            >
              Abrir URL dedicada (/configuracoes/perfil)
            </Button>
          ) : tab === "preferencias" || tab === "seguranca" ? (
            <Button>Salvar preferências</Button>
          ) : null
        }
      />

      <div className="grid gap-5 xl:grid-cols-[220px_1fr]">
        <Card className="h-fit p-2">
          <div className="mb-2 px-3 pt-2 pb-1.5 border-b border-border/60">
            <p className="text-[12px] font-semibold text-foreground truncate">
              {currentClinic?.nome ?? "Configurações"}
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] text-primary font-medium mt-0.5">
              <span className="size-1.5 rounded-full bg-primary" />
              {cargoLabel}
            </span>
          </div>

          <div className="space-y-0.5">
            {visibleSections.map((s) => (
              <button
                key={s.key}
                onClick={() => setTab(s.key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors cursor-pointer",
                  tab === s.key
                    ? "bg-primary-soft text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <s.icon className="size-4" />
                {s.label}
              </button>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          {!canAccessTab(tab) && (
            <Card className="p-8 text-center">
              <ShieldAlert className="size-10 text-warning mx-auto mb-3" />
              <h3 className="text-base font-semibold text-foreground">Acesso Restrito</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                As configurações de gestão da clínica são exclusivas para administradores. Seu cargo atual é{" "}
                <span className="font-semibold text-foreground">{cargoLabel}</span>.
              </p>
              <Button className="mt-4" onClick={() => setTab("perfil")}>
                Voltar para Meu Perfil
              </Button>
            </Card>
          )}

          {tab === "perfil" && <PerfilEditor showHeroCard={true} />}

          {tab === "clinica" && canAccessTab("clinica") && <DadosClinicaTab />}

          {tab === "equipe" && canAccessTab("equipe") && <EquipeClinicaTab />}

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

          {tab === "seguranca" && canAccessTab("seguranca") && (
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
