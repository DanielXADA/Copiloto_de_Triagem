import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  SlidersHorizontal,
  Mail,
  Phone,
  X,
  FileText,
  Loader2,
  RefreshCw,
  UserPlus,
  FilterX,
  AlertCircle,
  Check,
} from "lucide-react";
import { Card, PageHeader, Badge, Button, Avatar, Input } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  fetchPatients,
  createPatient,
  normalizeCpf,
  formatCpf,
  formatPhone,
  matchCpf,
  type Patient,
  type NewPatientInput,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/pacientes")({
  head: () => ({
    meta: [
      { title: "Pacientes — Copiloto Med" },
      {
        name: "description",
        content:
          "Base de pacientes da clínica com busca inteligente por CPF, filtros avançados e integração em tempo real com Supabase.",
      },
      { property: "og:title", content: "Pacientes — Copiloto Med" },
      {
        property: "og:description",
        content:
          "Busque por CPF (com ou sem máscara), filtre por convênio/status e cadastre pacientes.",
      },
    ],
  }),
  component: Pacientes,
});

const statusOptions = ["Todos", "Ativo", "Novo", "Inativo"] as const;

const predefinedPlans = [
  "Todos",
  "Particular",
  "Unimed Nacional",
  "Bradesco Saúde",
  "SulAmérica",
  "Amil",
  "Outro",
] as const;

const predefinedAreas = [
  "Clínica Geral",
  "Cardiologia",
  "Ortopedia",
  "Dermatologia",
  "Ginecologia",
  "Endocrinologia",
  "Neurologia",
  "Pediatria",
];

const initialPatientForm: NewPatientInput = {
  name: "",
  cpf: "",
  age: 30,
  phone: "",
  email: "",
  plan: "Particular",
  status: "Novo",
  area: "Clínica Geral",
  lastVisit: "—",
  conditions: [],
  allergies: [],
  medications: [],
};

function Pacientes() {
  const [patientsList, setPatientsList] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("Todos");
  const [planFilter, setPlanFilter] = useState<string>("Todos");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selected, setSelected] = useState<Patient | null>(null);

  // Modal de Novo Paciente
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<NewPatientInput>(initialPatientForm);
  const [conditionsText, setConditionsText] = useState("");
  const [allergiesText, setAllergiesText] = useState("");
  const [medicationsText, setMedicationsText] = useState("");

  // Carregar pacientes do Supabase
  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchPatients();
      setPatientsList(data);
      if (data.length > 0 && !selected && data[0]) {
        setSelected(data[0]);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("[Pacientes] Falha ao carregar do Supabase:", errorMsg);
      setLoadError(
        errorMsg.includes("PGRST205") || errorMsg.includes("Could not find the table")
          ? "Tabela 'pacientes' não encontrada no Supabase. Crie as tabelas executando o script 'supabase/schema.sql'."
          : errorMsg || "Erro ao conectar com o Supabase.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Extrair planos únicos dinamicamente da base + pré-definidos
  const availablePlans = useMemo(() => {
    const plansSet = new Set<string>(predefinedPlans);
    patientsList.forEach((p) => {
      if (p.plan && p.plan !== "—") plansSet.add(p.plan);
    });
    return Array.from(plansSet);
  }, [patientsList]);

  // Contagem de filtros ativos
  const activeFiltersCount = (statusFilter !== "Todos" ? 1 : 0) + (planFilter !== "Todos" ? 1 : 0);

  const resetFilters = () => {
    setStatusFilter("Todos");
    setPlanFilter("Todos");
    setQuery("");
  };

  // Busca Inteligente: funciona com CPF mascarado (123.456.789-00) ou sem máscara (12345678900) e por nome
  const rows = useMemo(() => {
    const cleanQuery = normalizeCpf(query);
    const queryLower = query.trim().toLowerCase();

    return patientsList.filter((p) => {
      // Filtro de Status
      if (statusFilter !== "Todos" && p.status !== statusFilter) {
        return false;
      }

      // Filtro de Convênio
      if (planFilter !== "Todos") {
        if (!p.plan || p.plan.toLowerCase() !== planFilter.toLowerCase()) {
          return false;
        }
      }

      // Se não há termo de busca, passa
      if (!queryLower) return true;

      // 1. Busca por Nome
      if (p.name.toLowerCase().includes(queryLower)) {
        return true;
      }

      // 2. Busca Inteligente por CPF (com máscara ou sem máscara)
      if (matchCpf(p.cpf, query)) {
        return true;
      }

      // 3. Busca por E-mail ou Telefone
      if (p.email && p.email.toLowerCase().includes(queryLower)) {
        return true;
      }
      if (cleanQuery.length >= 3 && p.phone && normalizeCpf(p.phone).includes(cleanQuery)) {
        return true;
      }

      return false;
    });
  }, [patientsList, query, statusFilter, planFilter]);

  // Abrir modal e resetar form
  const handleOpenModal = () => {
    setForm(initialPatientForm);
    setConditionsText("");
    setAllergiesText("");
    setMedicationsText("");
    setModalOpen(true);
  };

  // Salvar novo paciente no Supabase
  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Por favor, preencha o nome do paciente.");
      return;
    }

    const cleanCpf = normalizeCpf(form.cpf);
    if (!cleanCpf || cleanCpf.length !== 11) {
      toast.error("Por favor, insira um CPF válido com 11 dígitos.");
      return;
    }

    setSaving(true);
    try {
      const payload: NewPatientInput = {
        name: form.name.trim(),
        cpf: formatCpf(form.cpf),
        age: Number(form.age) || 0,
        phone: formatPhone(form.phone),
        email: form.email?.trim() || "",
        plan: form.plan?.trim() || "Particular",
        status: form.status || "Novo",
        area: form.area?.trim() || "Clínica Geral",
        lastVisit: "—",
        conditions: conditionsText
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        allergies: allergiesText
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        medications: medicationsText
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean),
      };

      const created = await createPatient(payload);

      toast.success(`Paciente ${created.name} cadastrado com sucesso!`, {
        description: `CPF: ${created.cpf} • Salvo no Supabase`,
      });

      // Atualiza a lista local e seleciona o novo paciente
      setPatientsList((prev) => [created, ...prev]);
      setSelected(created);
      setModalOpen(false);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("[Novo Paciente] Erro ao salvar:", errorMsg);
      const isTableMissing =
        errorMsg.includes("PGRST205") || errorMsg.includes("Could not find the table");

      if (isTableMissing) {
        toast.error("Tabela 'pacientes' não encontrada no Supabase.", {
          description: "Execute o arquivo 'supabase/schema.sql' no SQL Editor do Supabase.",
          duration: 7000,
        });
      } else {
        toast.error("Erro ao salvar paciente no Supabase", {
          description: errorMsg || "Verifique a conexão e tente novamente.",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Pacientes"
        description={`${patientsList.length} pacientes cadastrados na Clínica Vida Integrada`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={showAdvancedFilters || activeFiltersCount > 0 ? "primary" : "outline"}
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
              className={cn(
                "relative transition-all",
                activeFiltersCount > 0 &&
                  !showAdvancedFilters &&
                  "border-primary text-primary bg-primary/5",
              )}
            >
              <SlidersHorizontal className="size-4" />
              <span>Filtros avançados</span>
              {activeFiltersCount > 0 && (
                <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
            <Button onClick={handleOpenModal}>
              <Plus className="size-4" /> Novo paciente
            </Button>
          </div>
        }
      />

      {/* Alerta de erro de conexão com Supabase caso a tabela não exista */}
      {loadError && (
        <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 shrink-0 text-warning mt-0.5" />
            <div>
              <p className="font-semibold text-warning">Supabase conectado, aguardando tabelas</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{loadError}</p>
            </div>
          </div>
          <Button variant="outline" onClick={loadData} className="shrink-0 h-8 text-xs">
            <RefreshCw className="size-3.5" /> Tentar novamente
          </Button>
        </div>
      )}

      {/* Painel Expansível de Filtros Avançados */}
      {showAdvancedFilters && (
        <Card className="mb-5 p-4 bg-surface border-border">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-primary" />
              <span className="text-[13px] font-semibold">Filtros Avançados de Pacientes</span>
              {activeFiltersCount > 0 && <Badge tone="blue">{activeFiltersCount} ativo(s)</Badge>}
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <FilterX className="size-3.5" /> Limpar filtros
              </button>
            )}
          </div>

          <div className="mt-3.5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Filtro por Status */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Status do Paciente
              </label>
              <div className="flex flex-wrap gap-1 rounded-lg bg-secondary/80 p-1">
                {statusOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setStatusFilter(opt)}
                    className={cn(
                      "flex-1 rounded-md py-1 px-2 text-xs font-medium transition-colors text-center",
                      statusFilter === opt
                        ? "bg-surface text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtro por Convênio */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Convênio / Plano de Saúde
              </label>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-surface px-3 text-[13px] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                {availablePlans.map((plan) => (
                  <option key={plan} value={plan}>
                    {plan === "Todos" ? "Todos os convênios" : plan}
                  </option>
                ))}
              </select>
            </div>

            {/* Indicador de Resultados */}
            <div className="flex flex-col justify-end">
              <div className="rounded-lg bg-secondary/60 p-2.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{rows.length}</span> de{" "}
                <span className="font-medium text-foreground">{patientsList.length}</span> pacientes
                encontrados
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Grid Principal com Tabela e Painel Lateral */}
      <div className={cn("grid gap-5", selected ? "xl:grid-cols-[1fr_360px]" : "")}>
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
            {/* Campo de Busca Inteligente */}
            <div className="relative min-w-56 flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={setQuery}
                placeholder="Buscar por nome ou CPF (com ou sem máscara)..."
                className="pl-9 pr-8"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                  title="Limpar busca"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Botões rápidos de Status */}
            <div className="flex gap-1 rounded-lg bg-secondary p-1">
              {statusOptions.map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    statusFilter === f
                      ? "bg-surface text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Botão de recarregar */}
            <button
              onClick={loadData}
              disabled={loading}
              className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
              title="Recarregar do Supabase"
            >
              <RefreshCw className={cn("size-4", loading && "animate-spin text-primary")} />
            </button>
          </div>

          {/* Chips de Filtros Ativos */}
          {(activeFiltersCount > 0 || query) && (
            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/30 px-5 py-2 text-xs">
              <span className="text-muted-foreground font-medium">Filtrando por:</span>
              {query && (
                <Badge tone="neutral" className="gap-1">
                  Busca: "{query}"
                  <button onClick={() => setQuery("")} className="hover:opacity-75">
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
              {statusFilter !== "Todos" && (
                <Badge tone="blue" className="gap-1">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter("Todos")} className="hover:opacity-75">
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
              {planFilter !== "Todos" && (
                <Badge tone="green" className="gap-1">
                  Convênio: {planFilter}
                  <button onClick={() => setPlanFilter("Todos")} className="hover:opacity-75">
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
              <button
                onClick={resetFilters}
                className="ml-auto text-xs text-primary font-medium hover:underline"
              >
                Limpar todos
              </button>
            </div>
          )}

          {/* Tabela de Pacientes */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-[11px] tracking-wide text-muted-foreground uppercase">
                  <th className="px-5 py-3 font-medium">Paciente</th>
                  <th className="px-5 py-3 font-medium">CPF</th>
                  <th className="px-5 py-3 font-medium">Convênio</th>
                  <th className="px-5 py-3 font-medium">Especialidade</th>
                  <th className="px-5 py-3 font-medium">Última consulta</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-sm text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="size-6 animate-spin text-primary" />
                        <span>Carregando pacientes do Supabase...</span>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  rows.map((p) => (
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
                      <td className="px-5 py-3 text-[13px] font-mono text-muted-foreground">
                        {p.cpf}
                      </td>
                      <td className="px-5 py-3 text-[13px] text-muted-foreground">
                        {p.plan || "Particular"}
                      </td>
                      <td className="px-5 py-3 text-[13px] text-muted-foreground">{p.area}</td>
                      <td className="px-5 py-3 text-[13px] text-muted-foreground">{p.lastVisit}</td>
                      <td className="px-5 py-3">
                        <Badge
                          tone={
                            p.status === "Ativo"
                              ? "green"
                              : p.status === "Novo"
                                ? "blue"
                                : "neutral"
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}

                {!loading && rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-sm text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                        <div className="rounded-full bg-secondary p-3 text-muted-foreground">
                          <Search className="size-6" />
                        </div>
                        <p className="font-medium text-foreground">Nenhum paciente encontrado</p>
                        <p className="text-xs text-muted-foreground">
                          {query || activeFiltersCount > 0
                            ? "Nenhum resultado corresponde à busca ou aos filtros selecionados. Tente ajustar os termos."
                            : "Nenhum paciente cadastrado no banco de dados. Cadastre o primeiro no botão abaixo."}
                        </p>
                        {query || activeFiltersCount > 0 ? (
                          <Button variant="outline" onClick={resetFilters} className="text-xs">
                            Limpar filtros e busca
                          </Button>
                        ) : (
                          <Button onClick={handleOpenModal} className="text-xs">
                            <Plus className="size-3.5" /> Cadastrar paciente
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Painel Lateral com Detalhes do Paciente Selecionado */}
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
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary transition-colors"
                aria-label="Fechar painel"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div className="space-y-2 text-[13px]">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-semibold text-foreground font-mono">CPF:</span>{" "}
                  {selected.cpf}
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-3.5 text-primary" /> {selected.phone || "Não informado"}
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-3.5 text-primary" /> {selected.email || "Não informado"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: "Convênio", v: selected.plan || "Particular" },
                  { l: "Última consulta", v: selected.lastVisit || "—" },
                ].map((i) => (
                  <div key={i.l} className="rounded-lg bg-secondary px-3 py-2.5">
                    <p className="text-[11px] text-muted-foreground">{i.l}</p>
                    <p className="mt-0.5 text-[13px] font-medium">{i.v}</p>
                  </div>
                ))}
              </div>

              {[
                {
                  title: "Condições preexistentes",
                  items: selected.conditions,
                  tone: "blue" as const,
                },
                { title: "Alergias conhecidas", items: selected.allergies, tone: "red" as const },
                {
                  title: "Medicações em uso",
                  items: selected.medications,
                  tone: "neutral" as const,
                },
              ].map((g) => (
                <div key={g.title}>
                  <p className="text-[11px] tracking-wide text-muted-foreground uppercase font-medium">
                    {g.title}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {g.items && g.items.length > 0 ? (
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
                <Button
                  variant="outline"
                  onClick={() => {
                    toast.info(`Editando paciente ${selected.name}`);
                  }}
                >
                  Editar
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Modal Funcional: Novo Paciente (Conectado ao Supabase) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-primary">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <UserPlus className="size-5" />
              </div>
              <DialogTitle className="text-lg font-semibold">Novo Paciente</DialogTitle>
            </div>
            <DialogDescription>
              Preencha os dados clínicos e cadastrais. As informações serão salvas diretamente na
              tabela <code className="text-xs font-mono font-semibold">pacientes</code> do Supabase.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePatient} className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Nome Completo */}
              <div className="sm:col-span-2">
                <label className="text-[13px] font-medium text-foreground block mb-1">
                  Nome Completo <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.name}
                  onChange={(val) => setForm((prev) => ({ ...prev, name: val }))}
                  placeholder="Ex: Mariana Souza"
                  className="w-full"
                />
              </div>

              {/* CPF com máscara automática */}
              <div>
                <label className="text-[13px] font-medium text-foreground block mb-1">
                  CPF <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.cpf}
                  onChange={(val) => setForm((prev) => ({ ...prev, cpf: formatCpf(val) }))}
                  placeholder="000.000.000-00"
                  className="w-full font-mono"
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Digite com ou sem pontuação
                </span>
              </div>

              {/* Idade */}
              <div>
                <label className="text-[13px] font-medium text-foreground block mb-1">
                  Idade (anos)
                </label>
                <Input
                  type="number"
                  value={String(form.age)}
                  onChange={(val) => setForm((prev) => ({ ...prev, age: Number(val) || 0 }))}
                  placeholder="Ex: 34"
                  className="w-full"
                />
              </div>

              {/* Telefone / WhatsApp */}
              <div>
                <label className="text-[13px] font-medium text-foreground block mb-1">
                  Telefone / WhatsApp
                </label>
                <Input
                  value={form.phone}
                  onChange={(val) => setForm((prev) => ({ ...prev, phone: formatPhone(val) }))}
                  placeholder="(11) 98888-7777"
                  className="w-full"
                />
              </div>

              {/* E-mail */}
              <div>
                <label className="text-[13px] font-medium text-foreground block mb-1">E-mail</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(val) => setForm((prev) => ({ ...prev, email: val }))}
                  placeholder="paciente@email.com"
                  className="w-full"
                />
              </div>

              {/* Convênio */}
              <div>
                <label className="text-[13px] font-medium text-foreground block mb-1">
                  Convênio
                </label>
                <select
                  value={form.plan}
                  onChange={(e) => setForm((prev) => ({ ...prev, plan: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-input bg-surface px-3 text-[13px] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  <option value="Particular">Particular</option>
                  <option value="Unimed Nacional">Unimed Nacional</option>
                  <option value="Bradesco Saúde">Bradesco Saúde</option>
                  <option value="SulAmérica">SulAmérica</option>
                  <option value="Amil">Amil</option>
                  <option value="NotreDame Intermédica">NotreDame Intermédica</option>
                  <option value="Porto Seguro">Porto Seguro</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              {/* Especialidade / Área */}
              <div>
                <label className="text-[13px] font-medium text-foreground block mb-1">
                  Especialidade / Área
                </label>
                <select
                  value={form.area}
                  onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-input bg-surface px-3 text-[13px] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  {predefinedAreas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="text-[13px] font-medium text-foreground block mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value as Patient["status"],
                    }))
                  }
                  className="h-9 w-full rounded-lg border border-input bg-surface px-3 text-[13px] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  <option value="Novo">Novo</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
            </div>

            {/* Condições, Alergias, Medicações */}
            <div className="space-y-3 border-t border-border pt-3">
              <div>
                <label className="text-[13px] font-medium text-foreground block mb-1">
                  Condições preexistentes (separadas por vírgula)
                </label>
                <Input
                  value={conditionsText}
                  onChange={setConditionsText}
                  placeholder="Ex: Hipertensão, Diabetes tipo 2, Enxaqueca"
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-foreground block mb-1">
                  Alergias conhecidas (separadas por vírgula)
                </label>
                <Input
                  value={allergiesText}
                  onChange={setAllergiesText}
                  placeholder="Ex: Dipirona, Penicilina, Látex"
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-foreground block mb-1">
                  Medicações em uso (separadas por vírgula)
                </label>
                <Input
                  value={medicationsText}
                  onChange={setMedicationsText}
                  placeholder="Ex: Losartana 50mg, Topiramato 25mg"
                  className="w-full"
                />
              </div>
            </div>

            <DialogFooter className="mt-5 pt-3 border-t border-border flex items-center justify-end gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Salvando no Supabase...
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    Salvar paciente
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
