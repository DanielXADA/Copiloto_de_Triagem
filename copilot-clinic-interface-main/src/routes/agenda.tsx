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
  Link2,
  Search,
  Stethoscope,
  Check,
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
  status: "Confirmado" | "Aguardando" | "Cancelado" | "Concluido" | "Triagem Concluída";
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

  // Busca Inteligente / Autocomplete de Paciente
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreatingNewPatient, setIsCreatingNewPatient] = useState(false);
  const [searchResults, setSearchResults] = useState<PacienteMin[]>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);

  // Modal de Confirmação para Iniciar Atendimento
  const [confirmStartAppointment, setConfirmStartAppointment] = useState<Agendamento | null>(null);

  // Controle de Check-in na Recepção (Na Sala de Espera)
  const [checkedInIds, setCheckedInIds] = useState<Record<string, boolean>>({});

  // Modal quando nenhum dossiê é encontrado para o paciente
  const [noDossierModal, setNoDossierModal] = useState<{
    isOpen: boolean;
    patientName: string;
    appointment?: Agendamento;
  }>({
    isOpen: false,
    patientName: "",
  });

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

  // Busca inteligente de pacientes (a partir de 2 caracteres)
  useEffect(() => {
    const term = patientSearchTerm.trim();
    if (term.length < 2) {
      setSearchResults([]);
      setSearchingPatients(false);
      return;
    }

    // Filtro local imediato
    const termLower = term.toLowerCase();
    const localMatches = patients.filter(
      (p) => p.name.toLowerCase().includes(termLower) || (p.cpf && p.cpf.includes(term)),
    );
    setSearchResults(localMatches);

    // Consulta complementar no Supabase
    const timer = setTimeout(async () => {
      if (!currentClinic?.id) return;
      setSearchingPatients(true);
      try {
        const { data } = await supabase
          .from("pacientes")
          .select("id, name, cpf, phone")
          .or(`clinica_id.eq.${currentClinic.id},clinica_id.is.null`)
          .ilike("name", `%${term}%`)
          .limit(8);

        if (data) {
          setSearchResults((prev) => {
            const map = new Map<string, PacienteMin>();
            for (const item of [...prev, ...(data as PacienteMin[])]) {
              map.set(item.id, item);
            }
            return Array.from(map.values());
          });
        }
      } catch (err) {
        console.warn("[Agenda] Erro ao buscar pacientes:", err);
      } finally {
        setSearchingPatients(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [patientSearchTerm, currentClinic?.id, patients]);

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
    setPatientSearchTerm("");
    setIsDropdownOpen(false);
    setIsCreatingNewPatient(false);
    setIsModalOpen(true);
  };

  // Salvar novo agendamento no Supabase
  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClinic?.id) {
      toast.error("Nenhuma clínica ativa encontrada para salvar o compromisso.");
      return;
    }

    const patientName = (formData.paciente_nome || patientSearchTerm).trim();
    if (!patientName) {
      toast.warning("Por favor, selecione ou informe o nome do paciente.");
      return;
    }

    setSaving(true);
    try {
      let finalPacienteId = formData.paciente_id || null;

      // Se for novo paciente (ou se não tem paciente_id vinculado)
      if (!finalPacienteId && (isCreatingNewPatient || patientName)) {
        // Pré-cadastro rápido na tabela pacientes (gera identificador provisório para respeitar a UNIQUE CONSTRAINT por clínica)
        const provisionalCpf = `Pendente-${Math.floor(1000 + Math.random() * 9000)}`;
        const { data: newPat, error: newPatError } = await supabase
          .from("pacientes")
          .insert({
            clinica_id: currentClinic.id,
            name: patientName,
            status: "Novo",
            plan: "Particular",
            area: formData.area || "Clínica Geral",
            cpf: provisionalCpf,
          })
          .select("id, name, cpf, phone")
          .single();

        if (newPatError) {
          console.warn("[Agenda] Aviso ao pré-cadastrar paciente:", newPatError.message);
        } else if (newPat) {
          finalPacienteId = newPat.id;
          setPatients((prev) => [...prev, newPat as PacienteMin]);
        }
      }

      const payload = {
        clinica_id: currentClinic.id,
        paciente_id: finalPacienteId,
        paciente_nome: patientName,
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

      toast.success(
        isCreatingNewPatient
          ? `Paciente ${patientName} pré-cadastrado e consulta agendada!`
          : "Compromisso agendado com sucesso!",
      );
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

  // Copiar link de pré-triagem pública do paciente
  const handleCopyTriageLink = (app: Agendamento) => {
    const triageUrl = `${window.location.origin}/t/${app.id}`;
    navigator.clipboard.writeText(triageUrl);
    toast.success(`Link de pré-triagem de ${app.paciente_nome} copiado!`, {
      description: triageUrl,
      action: {
        label: "Abrir Triagem",
        onClick: () => window.open(triageUrl, "_blank"),
      },
    });
  };

  // Alternar Check-in na Recepção (Na Sala de Espera)
  const toggleCheckIn = (app: Agendamento) => {
    const isChecked = !!checkedInIds[app.id];
    const next = !isChecked;
    setCheckedInIds((prev) => ({ ...prev, [app.id]: next }));

    if (next) {
      toast.success(`${app.paciente_nome} realizou Check-in!`, {
        description: "Paciente em estado 'Chegou / Na Sala de Espera'.",
      });
    } else {
      toast.info(`Check-in desativado para ${app.paciente_nome}.`);
    }
  };

  // Abertura Inteligente de Dossiês
  const handleOpenDossier = async (app: Agendamento) => {
    try {
      let query = supabase
        .from("triagens")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1);

      if (app.paciente_id) {
        query = query.or(`paciente_id.eq.${app.paciente_id},paciente_nome.ilike.%${app.paciente_nome}%`);
      } else {
        query = query.ilike("paciente_nome", `%${app.paciente_nome}%`);
      }

      const { data: dossies, error } = await query;

      if (error) {
        console.warn("[Agenda] Aviso ao consultar dossiê:", error.message);
      }

      if (dossies && dossies.length > 0 && dossies[0]?.id) {
        navigate({
          to: "/atendimento/$id",
          params: { id: dossies[0].id },
        });
      } else {
        setNoDossierModal({
          isOpen: true,
          patientName: app.paciente_nome,
          appointment: app,
        });
      }
    } catch (_err) {
      setNoDossierModal({
        isOpen: true,
        patientName: app.paciente_nome,
        appointment: app,
      });
    }
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
    <div className="w-full max-w-[1600px] mx-auto space-y-5">
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

      <div className="grid gap-5 xl:grid-cols-[1fr_320px] w-full">
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

                      {/* Status Interativo & Controles da Recepção */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          tone={
                            a.status === "Confirmado"
                              ? "green"
                              : a.status === "Triagem Concluída"
                              ? "purple"
                              : a.status === "Aguardando"
                              ? "amber"
                              : a.status === "Concluido"
                              ? "blue"
                              : "red"
                          }
                        >
                          {a.status}
                        </Badge>

                        {/* Ação 1: Botão Confirmar Presença (WhatsApp / Telefone) */}
                        {a.status !== "Confirmado" && a.status !== "Concluido" && (
                          <button
                            type="button"
                            onClick={() => {
                              handleUpdateStatus(a.id, "Confirmado");
                              toast.success("Presença confirmada pela recepção/WhatsApp!");
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                            title="Confirmar presença informada pelo paciente no WhatsApp"
                          >
                            <CheckCheck className="size-3.5" />
                            <span>Confirmar Presença</span>
                          </button>
                        )}

                        {/* Ação 2: Switch/Toggle de Check-in na Recepção (Na Sala de Espera) */}
                        <div
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-2 py-1"
                          title="Toggle de Check-in na recepção"
                        >
                          <span className="text-[11px] font-semibold text-muted-foreground">Check-in:</span>
                          <button
                            type="button"
                            onClick={() => toggleCheckIn(a)}
                            className={cn(
                              "relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                              checkedInIds[a.id] ? "bg-emerald-500" : "bg-muted-foreground/30",
                            )}
                            aria-label="Toggle Check-in"
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block size-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out",
                                checkedInIds[a.id] ? "translate-x-4" : "translate-x-0",
                              )}
                            />
                          </button>
                        </div>

                        {/* Indicador visual de Chegou / Na Sala de Espera */}
                        {checkedInIds[a.id] && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                            Chegou / Na Sala de Espera
                          </span>
                        )}
                      </div>

                      {/* Ações do Atendimento */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenDossier(a)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                          title="Abrir dossiê clínico (busca inteligente)"
                        >
                          <FileText className="size-4" />
                        </button>
                        <button
                          onClick={() => handleCopyTriageLink(a)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                          title="Copiar link de pré-triagem do paciente (/t/$id)"
                        >
                          <Link2 className="size-4" />
                        </button>
                        <button
                          onClick={() => handleTeleconsulta(a)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                          title="Copiar sala de teleconsulta"
                        >
                          <Video className="size-4" />
                        </button>
                        {a.status === "Concluido" ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2.5 py-1 text-xs font-medium text-muted-foreground select-none"
                            title="Atendimento já concluído"
                          >
                            <CheckCircle2 className="size-3 text-muted-foreground" /> Atendido
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => setConfirmStartAppointment(a)}
                            className="flex items-center gap-1 text-xs"
                          >
                            <Play className="size-3" /> Iniciar
                          </Button>
                        )}
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
            {/* Busca Inteligente (Combobox/Autocomplete) do Paciente */}
            <div className="relative">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>
                  Paciente <span className="text-destructive">*</span>
                </span>
                {isCreatingNewPatient && (
                  <span className="text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    ✓ Novo paciente será cadastrado
                  </span>
                )}
                {formData.paciente_id && (
                  <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    ✓ Paciente da base
                  </span>
                )}
              </label>

              <div className="relative mt-1.5">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  required
                  placeholder="Digite ao menos 2 letras do nome ou CPF..."
                  value={patientSearchTerm}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPatientSearchTerm(val);
                    setFormData((prev) => ({
                      ...prev,
                      paciente_nome: val,
                      paciente_id: "",
                    }));
                    setIsCreatingNewPatient(false);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => {
                    if (patientSearchTerm.length >= 2) setIsDropdownOpen(true);
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-8 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                {searchingPatients && (
                  <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Dropdown de sugestões e opção de pré-cadastro rápido */}
              {isDropdownOpen && patientSearchTerm.trim().length >= 2 && (
                <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                  {/* Opção para cadastrar novo paciente */}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        paciente_id: "",
                        paciente_nome: patientSearchTerm.trim(),
                      }));
                      setIsCreatingNewPatient(true);
                      setIsDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer border-b border-border/50"
                  >
                    <Plus className="size-3.5 shrink-0" />
                    <span className="truncate">
                      Cadastrar novo paciente <strong>"{patientSearchTerm.trim()}"</strong>
                    </span>
                  </button>

                  {/* Lista de pacientes encontrados */}
                  {searchResults.length > 0 ? (
                    <div className="py-1">
                      {searchResults.map((p) => {
                        const isSelected = formData.paciente_id === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                paciente_id: p.id,
                                paciente_nome: p.name,
                              }));
                              setPatientSearchTerm(p.name);
                              setIsCreatingNewPatient(false);
                              setIsDropdownOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs transition-colors cursor-pointer",
                              isSelected
                                ? "bg-primary/10 font-semibold text-primary"
                                : "hover:bg-secondary text-foreground",
                            )}
                          >
                            <div>
                              <p className="font-medium text-foreground">{p.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {p.cpf ? `CPF: ${p.cpf}` : "Sem CPF"}
                                {p.phone ? ` • Tel: ${p.phone}` : ""}
                              </p>
                            </div>
                            {isSelected && (
                              <Check className="size-4 text-primary shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    !searchingPatients && (
                      <p className="px-3 py-2 text-center text-xs text-muted-foreground">
                        Nenhum paciente existente com esse nome. Toque acima para cadastrar.
                      </p>
                    )
                  )}
                </div>
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

      {/* Modal de Confirmação para Iniciar Atendimento Clínico */}
      <Dialog
        open={!!confirmStartAppointment}
        onOpenChange={(open) => !open && setConfirmStartAppointment(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="size-4.5 text-primary" /> Iniciar Atendimento Clínico
            </DialogTitle>
            <DialogDescription>
              Você está prestes a abrir a sala de consulta médica em tempo real.
            </DialogDescription>
          </DialogHeader>

          {confirmStartAppointment && (
            <div className="space-y-3 py-2">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs">
                <p className="text-sm font-semibold text-foreground">
                  {confirmStartAppointment.paciente_nome}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-muted-foreground">
                  <span className="rounded bg-background border px-2 py-0.5 font-medium text-foreground">
                    {confirmStartAppointment.tipo}
                  </span>
                  <span className="rounded bg-background border px-2 py-0.5 font-medium text-foreground">
                    {confirmStartAppointment.area}
                  </span>
                  <span className="rounded bg-background border px-2 py-0.5 font-medium text-foreground">
                    {new Date(confirmStartAppointment.data_hora).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {confirmStartAppointment.observacoes && (
                  <p className="mt-2 text-muted-foreground italic border-t border-primary/10 pt-2">
                    "{confirmStartAppointment.observacoes}"
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Deseja iniciar o atendimento de{" "}
                <strong className="text-foreground">
                  {confirmStartAppointment.paciente_nome}
                </strong>
                ?
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              type="button"
              onClick={() => setConfirmStartAppointment(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (confirmStartAppointment) {
                  const target = confirmStartAppointment;
                  setConfirmStartAppointment(null);
                  handleStartTriage(target);
                }
              }}
              className="flex items-center gap-1.5"
            >
              <Play className="size-3.5" /> Iniciar Atendimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Alerta: Nenhum Dossiê Encontrado */}
      <Dialog
        open={noDossierModal.isOpen}
        onOpenChange={(open) =>
          setNoDossierModal((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertCircle className="size-5 text-amber-500" />
              <span>Nenhum Dossiê Encontrado</span>
            </DialogTitle>
            <DialogDescription className="pt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Nenhum dossiê foi encontrado para o(a) paciente{" "}
              <strong className="text-foreground">{noDossierModal.patientName}</strong>.
              O dossiê será gerado automaticamente após a triagem com IA.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-muted-foreground space-y-1.5 my-2">
            <p className="font-semibold text-foreground">💡 O que fazer agora?</p>
            <p>
              Você pode copiar o link de pré-triagem do paciente e enviá-lo pelo WhatsApp. Quando o paciente responder, a IA criará o dossiê clínico instantaneamente.
            </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            {noDossierModal.appointment && (
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  handleCopyTriageLink(noDossierModal.appointment!);
                  setNoDossierModal({ isOpen: false, patientName: "" });
                }}
                className="w-full sm:w-auto text-xs"
              >
                <Link2 className="size-3.5 mr-1" /> Copiar Link de Triagem com IA
              </Button>
            )}
            <Button
              type="button"
              onClick={() => setNoDossierModal({ isOpen: false, patientName: "" })}
              className="w-full sm:w-auto text-xs"
            >
              Entender
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
