import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Video,
  FileText,
  CheckCheck,
  CalendarDays,
  Clock,
  User,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play,
} from "lucide-react";
import { Card, CardHead, PageHeader, Badge, Button, Avatar } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/tenant-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — Copiloto Med" },
      {
        name: "description",
        content:
          "Agenda da clínica com compromissos em tempo real, confirmações e ações rápidas de pré-atendimento.",
      },
      { property: "og:title", content: "Agenda — Copiloto Med" },
      {
        property: "og:description",
        content: "Compromissos, confirmações e ações rápidas em uma agenda conectada ao banco de dados.",
      },
    ],
  }),
  component: Agenda,
});

export interface Agendamento {
  id: string;
  clinica_id: string;
  paciente_id: string | null;
  paciente_nome: string;
  data_hora: string;
  duracao_minutos: number;
  tipo: string;
  area: string;
  status: "Confirmado" | "Aguardando" | "Cancelado" | "Concluido";
  observacoes: string | null;
  teleconsulta_url: string | null;
  created_at: string;
}

interface PacienteMin {
  id: string;
  name: string;
  cpf: string;
  phone: string | null;
}

function getWeekDays(referenceDate: Date) {
  const current = new Date(referenceDate);
  const day = current.getDay();
  // Ajusta para a segunda-feira da semana (0 é domingo, 1 é segunda)
  const diff = current.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(current.setDate(diff));

  const weekDays = [];
  const dayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split("T")[0]!;
    weekDays.push({
      dateStr,
      dayLabel: dayLabels[i]!,
      dayNumber: d.getDate(),
      dateObj: d,
    });
  }
  return weekDays;
}

function Agenda() {
  const navigate = useNavigate();
  const { currentClinic, hasClinic } = useTenant();

  const [appointments, setAppointments] = useState<Agendamento[]>([]);
  const [patients, setPatients] = useState<PacienteMin[]>([]);
  const [loading, setLoading] = useState(true);

  // Controle de datas
  const [currentWeekReference, setCurrentWeekReference] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]!,
  );

  // Modal de Novo Agendamento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Formulário do novo agendamento
  const [formData, setFormData] = useState({
    paciente_id: "",
    paciente_nome: "",
    data_hora: `${new Date().toISOString().split("T")[0]}T09:00`,
    duracao_minutos: 30,
    tipo: "Primeira consulta",
    area: "Clínica Geral",
    status: "Aguardando" as Agendamento["status"],
    observacoes: "",
  });

  const weekDays = useMemo(
    () => getWeekDays(currentWeekReference),
    [currentWeekReference],
  );

  // 1. Carregar agendamentos e pacientes reais da clínica
  const fetchData = useCallback(async () => {
    if (!currentClinic?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [appRes, patRes] = await Promise.all([
        supabase
          .from("agendamentos")
          .select("*")
          .eq("clinica_id", currentClinic.id)
          .order("data_hora", { ascending: true }),
        supabase
          .from("pacientes")
          .select("id, name, cpf, phone")
          .eq("clinica_id", currentClinic.id)
          .order("name", { ascending: true }),
      ]);

      if (appRes.error) {
        console.warn("[Agenda] Erro ao carregar agendamentos:", appRes.error.message);
        // Não quebra a interface, exibe lista vazia caso a tabela ainda esteja sendo criada
        setAppointments([]);
      } else {
        setAppointments((appRes.data as Agendamento[]) || []);
      }

      if (patRes.error) {
        console.warn("[Agenda] Erro ao carregar pacientes:", patRes.error.message);
      } else {
        setPatients((patRes.data as PacienteMin[]) || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Falha ao sincronizar agenda: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [currentClinic?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Contagem de compromissos por dia da semana
  const appointmentsCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const app of appointments) {
      const datePart = app.data_hora.split("T")[0];
      if (datePart) {
        counts[datePart] = (counts[datePart] || 0) + 1;
      }
    }
    return counts;
  }, [appointments]);

  // Agendamentos filtrados pela data selecionada
  const dayAppointments = useMemo(() => {
    return appointments.filter((a) => a.data_hora.startsWith(selectedDate));
  }, [appointments, selectedDate]);

  // Resumo estatístico do dia selecionado
  const dayStats = useMemo(() => {
    const total = dayAppointments.length;
    const confirmados = dayAppointments.filter((a) => a.status === "Confirmado").length;
    const aguardando = dayAppointments.filter((a) => a.status === "Aguardando").length;
    const cancelados = dayAppointments.filter((a) => a.status === "Cancelado").length;
    const taxa = total > 0 ? Math.round((confirmados / total) * 100) : 0;
    return { total, confirmados, aguardando, cancelados, taxa };
  }, [dayAppointments]);

  // Navegação entre semanas
  const handlePrevWeek = () => {
    const prev = new Date(currentWeekReference);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekReference(prev);
    setSelectedDate(prev.toISOString().split("T")[0]!);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekReference);
    next.setDate(next.getDate() + 7);
    setCurrentWeekReference(next);
    setSelectedDate(next.toISOString().split("T")[0]!);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentWeekReference(today);
    setSelectedDate(today.toISOString().split("T")[0]!);
  };

  // Abrir Modal de Novo Agendamento
  const handleOpenNewModal = () => {
    setFormData({
      paciente_id: "",
      paciente_nome: "",
      data_hora: `${selectedDate}T09:00`,
      duracao_minutos: 30,
      tipo: "Primeira consulta",
      area: "Clínica Geral",
      status: "Aguardando",
      observacoes: "",
    });
    setIsModalOpen(true);
  };

  // Salvar novo agendamento no Supabase
  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClinic?.id) {
      toast.error("Nenhuma clínica ativa encontrada para salvar o compromisso.");
      return;
    }

    if (!formData.paciente_nome.trim()) {
      toast.warning("Por favor, informe ou selecione o nome do paciente.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        clinica_id: currentClinic.id,
        paciente_id: formData.paciente_id || null,
        paciente_nome: formData.paciente_nome.trim(),
        data_hora: new Date(formData.data_hora).toISOString(),
        duracao_minutos: Number(formData.duracao_minutos) || 30,
        tipo: formData.tipo,
        area: formData.area,
        status: formData.status,
        observacoes: formData.observacoes.trim() || null,
      };

      const { data, error } = await supabase
        .from("agendamentos")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      toast.success("Compromisso agendado com sucesso!");
      setIsModalOpen(false);
      setAppointments((prev) => [...prev, data as Agendamento]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Falha ao salvar agendamento: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  // Alterar status de um agendamento
  const handleUpdateStatus = async (
    id: string,
    newStatus: Agendamento["status"],
  ) => {
    try {
      const { error } = await supabase
        .from("agendamentos")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)),
      );
      toast.success(`Status atualizado para: ${newStatus}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Erro ao atualizar status: ${msg}`);
    }
  };

  // Confirmar todos os agendamentos pendentes do dia
  const handleConfirmAllDay = async () => {
    const pendentes = dayAppointments.filter((a) => a.status === "Aguardando");
    if (pendentes.length === 0) {
      toast.info("Não há agendamentos pendentes aguardando confirmação hoje.");
      return;
    }

    try {
      const ids = pendentes.map((a) => a.id);
      const { error } = await supabase
        .from("agendamentos")
        .update({ status: "Confirmado", updated_at: new Date().toISOString() })
        .in("id", ids);

      if (error) throw error;

      setAppointments((prev) =>
        prev.map((a) => (ids.includes(a.id) ? { ...a, status: "Confirmado" } : a)),
      );
      toast.success(`${pendentes.length} compromisso(s) confirmado(s) com sucesso!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Erro ao confirmar compromissos: ${msg}`);
    }
  };

  // Teleconsulta: Gerar link ou abrir sala
  const handleTeleconsulta = (app: Agendamento) => {
    const roomUrl =
      app.teleconsulta_url ||
      `https://meet.jit.si/copiloto-med-${app.id.substring(0, 8)}`;
    navigator.clipboard.writeText(roomUrl);
    toast.success("Link da sala de teleconsulta copiado para a área de transferência!", {
      description: roomUrl,
      action: {
        label: "Abrir Sala",
        onClick: () => window.open(roomUrl, "_blank"),
      },
    });
  };

  // Iniciar Atendimento Clínico a partir da agenda
  const handleStartTriage = (app: Agendamento) => {
    toast.info(`Iniciando atendimento para ${app.paciente_nome}...`);
    navigate({
      to: "/atendimento/$id",
      params: { id: app.id },
    });
  };

  // Excluir agendamento
  const handleDeleteAppointment = async (id: string, pacienteNome: string) => {
    if (!confirm(`Deseja realmente remover o agendamento de ${pacienteNome}?`)) {
      return;
    }

    try {
      const { error } = await supabase.from("agendamentos").delete().eq("id", id);
      if (error) throw error;

      setAppointments((prev) => prev.filter((a) => a.id !== id));
      toast.success("Agendamento removido.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Erro ao excluir agendamento: ${msg}`);
    }
  };

  // Formatação de data em português
  const formattedSelectedDate = useMemo(() => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    if (!year || !month || !day) return "Data selecionada";
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  }, [selectedDate]);

  return (
    <div>
      <PageHeader
        title="Agenda"
        description={`${formattedSelectedDate} • ${dayAppointments.length} compromisso(s)`}
        actions={
          <>
            <Button variant="outline" onClick={handleToday}>
              <CalendarDays className="size-4" /> Hoje
            </Button>
            <Button onClick={handleOpenNewModal}>
              <Plus className="size-4" /> Novo agendamento
            </Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {/* Barra Semanal Dinâmica */}
          <Card className="flex items-center gap-2 p-3">
            <button
              onClick={handlePrevWeek}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary transition-colors"
              title="Semana anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="grid flex-1 grid-cols-7 gap-2">
              {weekDays.map((d) => {
                const count = appointmentsCountByDate[d.dateStr] || 0;
                const isSelected = selectedDate === d.dateStr;
                return (
                  <button
                    key={d.dateStr}
                    onClick={() => setSelectedDate(d.dateStr)}
                    className={cn(
                      "rounded-lg border px-2 py-2.5 text-center transition-all cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border hover:bg-secondary text-foreground",
                    )}
                  >
                    <p className="text-[11px] opacity-80">{d.dayLabel}</p>
                    <p className="text-base font-semibold">{d.dayNumber}</p>
                    <p className="text-[10px] opacity-75">
                      {count} {count === 1 ? "cons." : "cons."}
                    </p>
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleNextWeek}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary transition-colors"
              title="Próxima semana"
            >
              <ChevronRight className="size-4" />
            </button>
          </Card>

          {/* Lista de Compromissos do Dia */}
          <Card>
            <CardHead
              title="Compromissos do dia"
              subtitle={
                dayAppointments.length > 0
                  ? "Ordenados por horário cronológico"
                  : "Nenhum compromisso registrado"
              }
            />

            {loading ? (
              <div className="flex h-56 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : dayAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <CalendarDays className="size-7" />
                </div>
                <h3 className="mt-4 text-base font-semibold">
                  Nenhum compromisso para este dia
                </h3>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  A agenda para {formattedSelectedDate} está livre. Utilize o botão abaixo para
                  marcar um atendimento.
                </p>
                <Button onClick={handleOpenNewModal} className="mt-5">
                  <Plus className="size-4" /> Agendar Consulta
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {dayAppointments.map((a) => {
                  const time = new Date(a.data_hora).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <li
                      key={a.id}
                      className="group flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/30"
                    >
                      <div className="w-14">
                        <p className="text-[15px] font-semibold">{time}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {a.duracao_minutos} min
                        </p>
                      </div>
                      <div className="h-10 w-px bg-border" />
                      <Avatar name={a.paciente_nome} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-foreground">
                          {a.paciente_nome}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {a.tipo} • {a.area}
                          {a.observacoes && ` — "${a.observacoes}"`}
                        </p>
                      </div>

                      {/* Status Interativo */}
                      <div className="flex items-center gap-1.5">
                        <Badge
                          tone={
                            a.status === "Confirmado"
                              ? "green"
                              : a.status === "Aguardando"
                              ? "amber"
                              : a.status === "Concluido"
                              ? "blue"
                              : "red"
                          }
                        >
                          {a.status}
                        </Badge>

                        {/* Botão de alternar status rápido */}
                        {a.status === "Aguardando" && (
                          <button
                            onClick={() => handleUpdateStatus(a.id, "Confirmado")}
                            className="rounded-md p-1.5 text-success hover:bg-success/15 transition-colors"
                            title="Marcar como Confirmado"
                          >
                            <CheckCircle2 className="size-4" />
                          </button>
                        )}
                      </div>

                      {/* Ações do Atendimento */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate({ to: "/dossies" })}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                          title="Abrir dossiê"
                        >
                          <FileText className="size-4" />
                        </button>
                        <button
                          onClick={() => handleTeleconsulta(a)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                          title="Copiar sala de teleconsulta"
                        >
                          <Video className="size-4" />
                        </button>
                        <Button
                          variant="outline"
                          onClick={() => handleStartTriage(a)}
                          className="flex items-center gap-1 text-xs"
                        >
                          <Play className="size-3" /> Iniciar
                        </Button>
                        <button
                          onClick={() => handleDeleteAppointment(a.id, a.paciente_nome)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                          title="Remover compromisso"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Sidebar com Resumo e Ações Rápidas */}
        <div className="space-y-5">
          <Card className="p-5">
            <p className="text-[13px] font-semibold">Resumo do dia</p>
            <ul className="mt-4 space-y-3">
              {[
                { l: "Confirmados", v: String(dayStats.confirmados) },
                { l: "Aguardando confirmação", v: String(dayStats.aguardando) },
                { l: "Cancelados", v: String(dayStats.cancelados) },
                { l: "Taxa de confirmação", v: `${dayStats.taxa}%` },
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
              <button
                onClick={handleConfirmAllDay}
                className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-3 text-left transition-colors hover:bg-secondary cursor-pointer"
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary-soft">
                  <CheckCheck className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-[13px] font-medium">Confirmar pendentes</p>
                  <p className="text-[11px] text-muted-foreground">
                    {dayStats.aguardando} paciente(s) aguardando
                  </p>
                </div>
              </button>

              <button
                onClick={() => navigate({ to: "/triagens" })}
                className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-3 text-left transition-colors hover:bg-secondary cursor-pointer"
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary-soft">
                  <FileText className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-[13px] font-medium">Painel de Triagens</p>
                  <p className="text-[11px] text-muted-foreground">
                    Acessar fila de pré-atendimento
                  </p>
                </div>
              </button>

              <button
                onClick={() => navigate({ to: "/pacientes" })}
                className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-3 text-left transition-colors hover:bg-secondary cursor-pointer"
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary-soft">
                  <User className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-[13px] font-medium">Base de Pacientes</p>
                  <p className="text-[11px] text-muted-foreground">
                    Consultar prontuários e cadastros
                  </p>
                </div>
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal / Dialog de Novo Agendamento */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
            <DialogDescription>
              Marque uma nova consulta na clínica para o dia {selectedDate}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAppointment} className="space-y-4 py-2">
            {/* Selecionar Paciente */}
            <div>
              <label className="text-xs font-semibold text-foreground">
                Paciente <span className="text-destructive">*</span>
              </label>
              {patients.length > 0 ? (
                <div className="mt-1.5 space-y-2">
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.paciente_id}
                    onChange={(e) => {
                      const selId = e.target.value;
                      const pat = patients.find((p) => p.id === selId);
                      setFormData((prev) => ({
                        ...prev,
                        paciente_id: selId,
                        paciente_nome: pat ? pat.name : prev.paciente_nome,
                      }));
                    }}
                  >
                    <option value="">Selecione um paciente cadastrado...</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.cpf ? `(CPF: ${p.cpf})` : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Ou digite o nome do paciente..."
                    value={formData.paciente_nome}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, paciente_nome: e.target.value }))
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="Nome completo do paciente"
                  value={formData.paciente_nome}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, paciente_nome: e.target.value }))
                  }
                  className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              )}
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">
                  Data e Horário <span className="text-destructive">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.data_hora}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, data_hora: e.target.value }))
                  }
                  className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Duração</label>
                <select
                  value={formData.duracao_minutos}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      duracao_minutos: Number(e.target.value),
                    }))
                  }
                  className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>60 minutos</option>
                </select>
              </div>
            </div>

            {/* Tipo e Especialidade */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Tipo de Consulta</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tipo: e.target.value }))}
                  className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Primeira consulta">Primeira consulta</option>
                  <option value="Retorno">Retorno</option>
                  <option value="Urgência">Urgência</option>
                  <option value="Exame / Procedimento">Exame / Procedimento</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Especialidade</label>
                <select
                  value={formData.area}
                  onChange={(e) => setFormData((prev) => ({ ...prev, area: e.target.value }))}
                  className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Clínica Geral">Clínica Geral</option>
                  <option value="Cardiologia">Cardiologia</option>
                  <option value="Ortopedia">Ortopedia</option>
                  <option value="Dermatologia">Dermatologia</option>
                  <option value="Pediatria">Pediatria</option>
                  <option value="Ginecologia">Ginecologia</option>
                </select>
              </div>
            </div>

            {/* Status e Observações */}
            <div>
              <label className="text-xs font-semibold text-foreground">Status Inicial</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: e.target.value as Agendamento["status"],
                  }))
                }
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="Aguardando">Aguardando confirmação</option>
                <option value="Confirmado">Confirmado</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">
                Observações / Queixa principal
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Paciente com dores no joelho após esforço..."
                value={formData.observacoes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, observacoes: e.target.value }))
                }
                className="mt-1.5 flex w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  "Salvar Agendamento"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
