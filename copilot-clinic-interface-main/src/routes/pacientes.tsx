import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Plus, SlidersHorizontal, Mail, Phone, X, FileText } from "lucide-react";
import { Card, PageHeader, Badge, Button, Avatar, Input } from "@/components/kit";
import { patients, type Patient } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pacientes")({
  head: () => ({
    meta: [
      { title: "Pacientes — Copiloto Med" },
      {
        name: "description",
        content:
          "Base de pacientes da clínica com busca, filtros por status e painel lateral com histórico clínico completo.",
      },
      { property: "og:title", content: "Pacientes — Copiloto Med" },
      {
        property: "og:description",
        content: "Busque, filtre e consulte o histórico clínico de cada paciente.",
      },
    ],
  }),
  component: Pacientes,
});

const filters = ["Todos", "Ativo", "Novo", "Inativo"] as const;

function Pacientes() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");
  const [selected, setSelected] = useState<Patient | null>(patients[0] ?? null);

  const rows = useMemo(
    () =>
      patients.filter(
        (p) =>
          (filter === "Todos" || p.status === filter) &&
          (p.name.toLowerCase().includes(query.toLowerCase()) || p.cpf.includes(query)),
      ),
    [query, filter],
  );

  return (
    <div>
      <PageHeader
        title="Pacientes"
        description={`${patients.length} pacientes cadastrados na ${"Clínica Vida Integrada"}`}
        actions={
          <>
            <Button variant="outline">
              <SlidersHorizontal className="size-4" /> Filtros avançados
            </Button>
            <Button>
              <Plus className="size-4" /> Novo paciente
            </Button>
          </>
        }
      />

      <div className={cn("grid gap-5", selected ? "xl:grid-cols-[1fr_360px]" : "")}>
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
            <div className="relative min-w-56 flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={setQuery}
                placeholder="Buscar por nome ou CPF"
                className="pl-9"
              />
            </div>
            <div className="flex gap-1 rounded-lg bg-secondary p-1">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    filter === f
                      ? "bg-surface text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-[11px] tracking-wide text-muted-foreground uppercase">
                <th className="px-5 py-3 font-medium">Paciente</th>
                <th className="px-5 py-3 font-medium">CPF</th>
                <th className="px-5 py-3 font-medium">Especialidade</th>
                <th className="px-5 py-3 font-medium">Última consulta</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-secondary/60",
                    selected?.id === p.id && "bg-primary-soft/60",
                  )}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.name} />
                      <div>
                        <p className="text-[13px] font-medium">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">{p.age} anos</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[13px] text-muted-foreground">{p.cpf}</td>
                  <td className="px-5 py-3 text-[13px] text-muted-foreground">{p.area}</td>
                  <td className="px-5 py-3 text-[13px] text-muted-foreground">{p.lastVisit}</td>
                  <td className="px-5 py-3">
                    <Badge
                      tone={p.status === "Ativo" ? "green" : p.status === "Novo" ? "blue" : "neutral"}
                    >
                      {p.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    Nenhum paciente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        {selected && (
          <Card className="h-fit xl:sticky xl:top-22">
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <Avatar name={selected.name} className="size-11 text-base" />
                <div>
                  <p className="text-[15px] font-semibold tracking-tight">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selected.age} anos • {selected.area}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
                aria-label="Fechar painel"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div className="space-y-2 text-[13px]">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-3.5" /> {selected.phone}
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-3.5" /> {selected.email}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: "Convênio", v: selected.plan },
                  { l: "Última consulta", v: selected.lastVisit },
                ].map((i) => (
                  <div key={i.l} className="rounded-lg bg-secondary px-3 py-2.5">
                    <p className="text-[11px] text-muted-foreground">{i.l}</p>
                    <p className="mt-0.5 text-[13px] font-medium">{i.v}</p>
                  </div>
                ))}
              </div>

              {[
                { title: "Condições", items: selected.conditions, tone: "blue" as const },
                { title: "Alergias", items: selected.allergies, tone: "red" as const },
                { title: "Medicações em uso", items: selected.medications, tone: "neutral" as const },
              ].map((g) => (
                <div key={g.title}>
                  <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    {g.title}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {g.items.length ? (
                      g.items.map((i) => (
                        <Badge key={i} tone={g.tone}>
                          {i}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-[13px] text-muted-foreground">Sem registros</span>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex gap-2 border-t border-border pt-4">
                <Button className="flex-1">
                  <FileText className="size-4" /> Abrir dossiê
                </Button>
                <Button variant="outline">Editar</Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
