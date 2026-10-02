import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2 } from "lucide-react";
import { PageHeader } from "@/components/kit";
import { PerfilEditor } from "@/components/perfil/perfil-editor";

export const Route = createFileRoute("/configuracoes_/perfil")({
  head: () => ({
    meta: [
      { title: "Meu Perfil — Copiloto Med" },
      {
        name: "description",
        content:
          "Gerenciamento do perfil profissional, nome e credenciais de acesso no Copiloto Med com sincronização na tabela perfis do Supabase.",
      },
      { property: "og:title", content: "Meu Perfil — Copiloto Med" },
      {
        property: "og:description",
        content: "Gerencie suas informações de perfil na clínica.",
      },
    ],
  }),
  component: PerfilRoutePage,
});

function PerfilRoutePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Navegação Superior e Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            to="/configuracoes"
            className="flex items-center gap-1.5 font-medium hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Configurações
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground">Meu Perfil</span>
        </div>

        <Link
          to="/configuracoes"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <Building2 className="size-3.5" />
          Configurações da clínica
        </Link>
      </div>

      <PageHeader
        title="Meu Perfil"
        description="Gerencie seu nome de exibição e identificação profissional sincronizados com a tabela perfis do Supabase."
      />

      {/* Editor completo de perfil com Supabase Auth check, select e update */}
      <PerfilEditor showHeroCard={true} />
    </div>
  );
}
