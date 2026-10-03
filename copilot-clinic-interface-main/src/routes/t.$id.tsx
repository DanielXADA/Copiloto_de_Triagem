import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Heart,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Clock,
  Calendar,
  Sparkles,
  Loader2,
  Send,
  Pill,
  AlertTriangle,
  User,
  Phone,
  FileText,
  Activity,
  ThumbsUp,
  MapPin,
  Lock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CopilotoIcon } from "@/components/brand/copiloto-logo";
import { MaskedInput } from "@/components/ui/masked-input";
import { formatBirthDate, formatPhone } from "@/lib/masks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/t/$id")({
  head: () => ({
    meta: [
      { title: "Pré-Triagem do Paciente — Copiloto Med" },
      {
        name: "description",
        content: "Formulário rápido e seguro de pré-atendimento para otimizar sua consulta médica.",
      },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
    ],
  }),
  component: PublicTriagePage,
});

interface AppointmentInfo {
  id: string;
  clinica_id: string;
  paciente_id: string | null;
  paciente_nome: string;
  data_hora: string;
  tipo?: string;
  area?: string;
  status: string;
}

interface FormState {
  patientName: string;
  birthDate: string;
  phone: string;
  chiefComplaint: string;
  symptomDuration: string;
  hasAllergies: boolean | null;
  allergiesDetail: string;
  hasMedications: boolean | null;
  medicationsDetail: string;
  conditions: string[];
  painLevel: number;
  painLocation: string;
}

const COMMON_CONDITIONS = [
  "Hipertensão (Pressão Alta)",
  "Diabetes",
  "Asma / Bronquite",
  "Problemas Cardíacos",
  "Ansiedade / Depressão",
  "Problemas de Tireoide",
  "Colesterol Alto",
];

const DURATION_OPTIONS = [
  "Começou hoje",
  "Há 2 a 3 dias",
  "Cerca de 1 semana",
  "Há mais de 1 mês",
  "Apenas rotina / Check-up",
];

const PAIN_LOCATIONS = [
  "Cabeça",
  "Garganta",
  "Peito / Tórax",
  "Abdômen / Estômago",
  "Costas / Coluna",
  "Articulações",
  "Membros (Braço/Perna)",
  "Sem dor localizada",
];

function calculateAgeFromBirthDate(birthDateStr: string): number | null {
  const parts = birthDateStr.split("/");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0] || "", 10);
  const month = parseInt(parts[1] || "", 10) - 1;
  const year = parseInt(parts[2] || "", 10);
  if (
    isNaN(day) ||
    isNaN(month) ||
    isNaN(year) ||
    year < 1900 ||
    year > new Date().getFullYear()
  ) {
    return null;
  }
  const birth = new Date(year, month, day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 && age <= 125 ? age : null;
}

function getPainDescriptor(level: number) {
  if (level === 0) return { label: "Sem Dor", desc: "Nenhum desconforto físico", color: "text-emerald-500", emoji: "😊" };
  if (level <= 3) return { label: "Dor Leve", desc: "Desconforto sutil, não impede atividades", color: "text-lime-500", emoji: "🙂" };
  if (level <= 6) return { label: "Dor Moderada", desc: "Interfere na rotina ou no sono", color: "text-amber-500", emoji: "😐" };
  if (level <= 8) return { label: "Dor Intensa", desc: "Dificulta tarefas diárias normais", color: "text-orange-500", emoji: "😣" };
  return { label: "Dor Extrema", desc: "Insuportável, necessita de atenção urgente", color: "text-rose-500", emoji: "😫" };
}

function PublicTriagePage() {
  const { id } = useParams({ from: "/t/$id" });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [appointment, setAppointment] = useState<AppointmentInfo | null>(null);

  // Controle de passos (1 a 5)
  // 1: Dados Pessoais | 2: Queixa Principal | 3: Histórico Rápido | 4: Escala de Dor | 5: Revisão e Envio
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState<FormState>({
    patientName: "",
    birthDate: "",
    phone: "",
    chiefComplaint: "",
    symptomDuration: "Há 2 a 3 dias",
    hasAllergies: null,
    allergiesDetail: "",
    hasMedications: null,
    medicationsDetail: "",
    conditions: [],
    painLevel: 0,
    painLocation: "Sem dor localizada",
  });

  // 1. Carregar dados do agendamento por ID
  const fetchAppointment = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("id, clinica_id, paciente_id, paciente_nome, data_hora, tipo, area, status")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.warn("[TriagemPublica] Erro ou restrição RLS ao consultar agendamento:", error.message);
      }

      if (data) {
        const appInfo: AppointmentInfo = {
          id: data.id,
          clinica_id: data.clinica_id,
          paciente_id: data.paciente_id,
          paciente_nome: data.paciente_nome,
          data_hora: data.data_hora,
          tipo: data.tipo,
          area: data.area,
          status: data.status,
        };
        setAppointment(appInfo);

        if (data.paciente_nome) {
          setFormData((prev) => ({
            ...prev,
            patientName: data.paciente_nome,
          }));
        }

        // Se o agendamento já tiver status de triagem concluída
        if (data.status === "Triagem Concluída") {
          setAlreadyCompleted(true);
        }

        // Se houver paciente_id, tenta buscar dados prévios para agilizar
        if (data.paciente_id) {
          const { data: patData } = await supabase
            .from("pacientes")
            .select("phone, allergies, medications, conditions")
            .eq("id", data.paciente_id)
            .maybeSingle();

          if (patData) {
            setFormData((prev) => ({
              ...prev,
              phone: patData.phone ? formatPhone(patData.phone) : prev.phone,
              hasAllergies: patData.allergies && patData.allergies.length > 0 ? true : prev.hasAllergies,
              allergiesDetail: patData.allergies?.join(", ") || prev.allergiesDetail,
              hasMedications: patData.medications && patData.medications.length > 0 ? true : prev.hasMedications,
              medicationsDetail: patData.medications?.join(", ") || prev.medicationsDetail,
              conditions: patData.conditions || prev.conditions,
            }));
          }
        }
      }
    } catch (err: unknown) {
      console.error("[TriagemPublica] Falha ao carregar agendamento:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAppointment();
  }, [fetchAppointment]);

  // Idade calculada dinamicamente
  const calculatedAge = useMemo(() => {
    return calculateAgeFromBirthDate(formData.birthDate);
  }, [formData.birthDate]);

  // Formatação de data da consulta
  const formattedAppointmentDate = useMemo(() => {
    if (!appointment?.data_hora) return null;
    const date = new Date(appointment.data_hora);
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }, [appointment?.data_hora]);

  // Validação por passo
  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      if (!formData.patientName.trim()) {
        toast.warning("Por favor, informe seu nome completo.");
        return false;
      }
      if (formData.birthDate.length > 0 && formData.birthDate.length < 10) {
        toast.warning("Por favor, preencha a data de nascimento completa (DD/MM/AAAA).");
        return false;
      }
      return true;
    }

    if (currentStep === 2) {
      if (!formData.chiefComplaint.trim() || formData.chiefComplaint.trim().length < 4) {
        toast.warning("Descreva o que você está sentindo com um pouco mais de detalhes.");
        return false;
      }
      return true;
    }

    if (currentStep === 3) {
      if (formData.hasAllergies === true && !formData.allergiesDetail.trim()) {
        toast.warning("Por favor, informe quais alergias você possui.");
        return false;
      }
      if (formData.hasMedications === true && !formData.medicationsDetail.trim()) {
        toast.warning("Por favor, informe quais medicamentos toma atualmente.");
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 5));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Alternar comorbidades
  const toggleCondition = (condition: string) => {
    setFormData((prev) => {
      const exists = prev.conditions.includes(condition);
      if (exists) {
        return { ...prev, conditions: prev.conditions.filter((c) => c !== condition) };
      } else {
        return { ...prev, conditions: [...prev.conditions, condition] };
      }
    });
  };

  // Submissão Final
  const handleSubmitTriage = async () => {
    setSubmitting(true);
    try {
      const painInfo = getPainDescriptor(formData.painLevel);

      // 1. Monta o texto descritivo e estruturado da queixa
      const structuredReason = [
        `QUEIXA PRINCIPAL: ${formData.chiefComplaint.trim()}`,
        `DURAÇÃO DOS SINTOMAS: ${formData.symptomDuration}`,
        `ESCALA DE DOR: ${formData.painLevel}/10 (${painInfo.label}) - Local: ${formData.painLocation}`,
        `ALERGIAS: ${formData.hasAllergies ? formData.allergiesDetail.trim() : "Nenhuma relatada"}`,
        `MEDICAMENTOS CONTÍNUOS: ${formData.hasMedications ? formData.medicationsDetail.trim() : "Nenhum informado"}`,
        `CONDIÇÕES PRÉVIAS: ${formData.conditions.length > 0 ? formData.conditions.join(", ") : "Nenhuma relatada"}`,
        formData.birthDate ? `NASCIMENTO: ${formData.birthDate}${calculatedAge ? ` (${calculatedAge} anos)` : ""}` : null,
        formData.phone ? `CONTATO: ${formData.phone}` : null,
      ]
        .filter(Boolean)
        .join("\n\n");

      const clinicaId = appointment?.clinica_id || "00000000-0000-0000-0000-000000000000";

      // 2. Insere na tabela de triagens
      const triagePayload = {
        clinica_id: clinicaId,
        patient: formData.patientName.trim(),
        patient_id: appointment?.paciente_id || null,
        reason: structuredReason,
        status: "concluido",
        progress: 100,
        priority: formData.painLevel >= 8 ? "Alta" : formData.painLevel >= 5 ? "Media" : "Baixa",
        started: new Date().toISOString(),
        channel: "Web Paciente",
      };

      const { error: triageError } = await supabase.from("triagens").insert(triagePayload);
      if (triageError) {
        console.warn("[TriagemPublica] Aviso ao inserir triagem:", triageError.message);
      }

      // 3. Atualiza o status do agendamento para 'Triagem Concluída'
      if (id) {
        const { error: appUpdateError } = await supabase
          .from("agendamentos")
          .update({
            status: "Triagem Concluída",
            observacoes: `[Pré-Triagem Paciente] Dor: ${formData.painLevel}/10 (${painInfo.label}). Queixa: ${formData.chiefComplaint.slice(0, 100)}...`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (appUpdateError) {
          console.warn("[TriagemPublica] Aviso ao atualizar agendamento:", appUpdateError.message);
        }
      }

      // 4. Se houver paciente_id, atualiza comorbidades/alergias se informadas
      if (appointment?.paciente_id) {
        const allergiesArray = formData.hasAllergies && formData.allergiesDetail.trim()
          ? formData.allergiesDetail.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined;

        const medsArray = formData.hasMedications && formData.medicationsDetail.trim()
          ? formData.medicationsDetail.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined;

        const patUpdate: {
          allergies?: string[];
          medications?: string[];
          conditions?: string[];
          age?: number;
          phone?: string;
        } = {};
        if (allergiesArray) patUpdate.allergies = allergiesArray;
        if (medsArray) patUpdate.medications = medsArray;
        if (formData.conditions.length > 0) patUpdate.conditions = formData.conditions;
        if (calculatedAge !== null) patUpdate.age = calculatedAge;
        if (formData.phone) patUpdate.phone = formData.phone;

        if (Object.keys(patUpdate).length > 0) {
          await supabase.from("pacientes").update(patUpdate).eq("id", appointment.paciente_id);
        }
      }

      setIsSuccess(true);
      toast.success("Pré-triagem enviada com sucesso!");
    } catch (err: unknown) {
      console.error("[TriagemPublica] Erro na submissão da triagem:", err);
      toast.error("Ocorreu uma falha ao enviar sua triagem. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  // Renderização do Estado de Carregamento
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center dark:bg-slate-950">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
          <Activity className="size-7 animate-pulse text-primary" />
        </div>
        <p className="mt-4 text-sm font-semibold text-foreground">Preparando formulário médico...</p>
        <p className="text-xs text-muted-foreground">Conexão segura com o Copiloto Med</p>
      </div>
    );
  }

  // Renderização: Já preenchido anteriormente
  if (alreadyCompleted && !isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-2xl border border-emerald-500/20 bg-card p-6 text-center shadow-lg sm:p-8">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-8" />
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-foreground">
            Pré-triagem Já Realizada!
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Você já respondeu a este questionário de pré-atendimento para sua consulta.
          </p>
          {formattedAppointmentDate && (
            <div className="mt-5 rounded-xl border border-border bg-secondary/50 p-3.5 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Horário Agendado:</p>
              <p className="mt-0.5 capitalize">{formattedAppointmentDate}</p>
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Seus dados já estão no prontuário que o médico consultará durante seu atendimento.
          </p>
        </div>
      </div>
    );
  }

  // Renderização: Sucesso após submissão
  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-card p-6 text-center shadow-xl sm:p-8 animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto flex size-18 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-inner">
            <CheckCircle2 className="size-10" />
          </div>
          <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Sparkles className="size-3.5" /> Pré-triagem Concluída
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            Obrigado, {formData.patientName.split(" ")[0]}!
          </h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Seus sintomas e histórico foram organizados pelo <strong className="text-foreground">Copiloto Med</strong> e enviados com segurança para o médico.
          </p>

          <div className="mt-6 space-y-2 rounded-xl border border-border bg-secondary/40 p-4 text-left text-xs">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Calendar className="size-4 text-primary" />
              <span>Consulta confirmada</span>
            </div>
            {formattedAppointmentDate && (
              <p className="text-muted-foreground capitalize pl-6">
                {formattedAppointmentDate}
              </p>
            )}
            <div className="flex items-center gap-2 text-muted-foreground pt-1">
              <ShieldCheck className="size-4 text-emerald-500" />
              <span>Dossiê clínico pré-estruturado com sucesso</span>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-primary/5 p-3 text-xs text-muted-foreground">
            💡 <strong>Dica:</strong> Recomendamos chegar com 10 minutos de antecedência ao consultório.
          </div>
        </div>
      </div>
    );
  }

  // Progresso visual em %
  const progressPercent = Math.round((step / 5) * 100);

  return (
    <div className="min-h-screen bg-slate-50 text-foreground dark:bg-slate-950 flex flex-col justify-between">
      {/* Top Header Seguro */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/80 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CopilotoIcon size="sm" />
            <div>
              <p className="text-xs font-bold leading-tight tracking-tight">
                Copiloto <span className="text-primary">Med</span>
              </p>
              <p className="text-[10px] text-muted-foreground">Pré-Triagem do Paciente</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <Lock className="size-3" />
            <span>Seguro • LGPD</span>
          </div>
        </div>

        {/* Barra de Progresso Mobile-First */}
        <div className="mx-auto max-w-lg pt-3">
          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-1">
            <span>Passo {step} de 5</span>
            <span>{progressPercent}% preenchido</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-gradient-to-r from-primary to-sky-500 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* Conteúdo Principal / Wizard Step-by-Step */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 sm:py-8">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm">
          {/* PASSO 1: DADOS PESSOAIS */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  <User className="size-3" /> Passo 1 de 5
                </span>
                <h2 className="mt-2 text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  Confirmação de Dados
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Confirme seus dados para localizarmos seu histórico no consultório médico.
                </p>
              </div>

              {/* Banner de Consulta Agendada (se houver) */}
              {appointment && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs">
                  <p className="font-semibold text-primary flex items-center gap-1.5">
                    <Calendar className="size-3.5" /> Consulta Identificada
                  </p>
                  {formattedAppointmentDate && (
                    <p className="text-muted-foreground mt-0.5 capitalize">
                      {formattedAppointmentDate}
                    </p>
                  )}
                  {appointment.area && (
                    <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                      Especialidade: {appointment.area}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {/* Nome Completo */}
                <div>
                  <label className="text-xs font-semibold text-foreground">
                    Seu Nome Completo <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Maria dos Santos Silva"
                    value={formData.patientName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, patientName: e.target.value }))
                    }
                    className="mt-1.5 flex h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                {/* Data de Nascimento com Máscara e Idade Dinâmica */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Data de Nascimento
                    </label>
                    {calculatedAge !== null && (
                      <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {calculatedAge} anos
                      </span>
                    )}
                  </div>
                  <MaskedInput
                    mask="date"
                    placeholder="DD/MM/AAAA"
                    value={formData.birthDate}
                    onValueChange={(val) =>
                      setFormData((prev) => ({ ...prev, birthDate: val }))
                    }
                    className="mt-1.5 flex h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                {/* Telefone / WhatsApp */}
                <div>
                  <label className="text-xs font-semibold text-foreground">
                    WhatsApp para Avisos
                  </label>
                  <MaskedInput
                    mask="phone"
                    placeholder="(99) 99999-9999"
                    value={formData.phone}
                    onValueChange={(val) =>
                      setFormData((prev) => ({ ...prev, phone: val }))
                    }
                    className="mt-1.5 flex h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Utilizado apenas para avisos pontuais sobre o seu horário.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PASSO 2: MOTIVO DA CONSULTA */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  <FileText className="size-3" /> Passo 2 de 5
                </span>
                <h2 className="mt-2 text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  Motivo da Consulta
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Descreva em poucas palavras o que você está sentindo ou precisando tratar hoje.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">
                  Queixa Principal ou Sintomas <span className="text-destructive">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Ex: Estou sentindo uma dor de garganta muito forte ao engolir, febre de 38°C desde ontem e cansaço no corpo..."
                  value={formData.chiefComplaint}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, chiefComplaint: e.target.value }))
                  }
                  className="mt-1.5 flex w-full rounded-xl border border-input bg-background p-3.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">
                  Há quanto tempo começaram os sintomas?
                </label>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {DURATION_OPTIONS.map((opt) => {
                    const isSelected = formData.symptomDuration === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, symptomDuration: opt }))
                        }
                        className={cn(
                          "flex items-center justify-between rounded-xl border p-3 text-left text-xs font-medium transition-all cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary shadow-xs"
                            : "border-border hover:bg-secondary/60 text-muted-foreground",
                        )}
                      >
                        <span>{opt}</span>
                        {isSelected && <CheckCircle2 className="size-4 shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* PASSO 3: HISTÓRICO RÁPIDO */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  <Pill className="size-3" /> Passo 3 de 5
                </span>
                <h2 className="mt-2 text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  Questionário Rápido de Saúde
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Informações essenciais para segurança na prescrição de remédios pelo médico.
                </p>
              </div>

              {/* Pergunta Alergias */}
              <div className="rounded-xl border border-border p-4 bg-secondary/20">
                <p className="text-xs font-semibold text-foreground">
                  Você possui alguma alergia? (medicamentos, alimentos, etc.)
                </p>
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        hasAllergies: false,
                        allergiesDetail: "",
                      }))
                    }
                    className={cn(
                      "flex-1 rounded-xl border py-2.5 text-center text-xs font-medium transition-all cursor-pointer",
                      formData.hasAllergies === false
                        ? "border-primary bg-primary text-primary-foreground font-semibold"
                        : "border-border bg-background hover:bg-secondary text-foreground",
                    )}
                  >
                    Não
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, hasAllergies: true }))
                    }
                    className={cn(
                      "flex-1 rounded-xl border py-2.5 text-center text-xs font-medium transition-all cursor-pointer",
                      formData.hasAllergies === true
                        ? "border-primary bg-primary text-primary-foreground font-semibold"
                        : "border-border bg-background hover:bg-secondary text-foreground",
                    )}
                  >
                    Sim
                  </button>
                </div>

                {formData.hasAllergies === true && (
                  <div className="mt-3 animate-in fade-in duration-150">
                    <label className="text-[11px] font-medium text-foreground">
                      Quais alergias? <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Dipirona, Penicilina, Frutos do mar..."
                      value={formData.allergiesDetail}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          allergiesDetail: e.target.value,
                        }))
                      }
                      className="mt-1 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </div>
                )}
              </div>

              {/* Pergunta Medicamentos */}
              <div className="rounded-xl border border-border p-4 bg-secondary/20">
                <p className="text-xs font-semibold text-foreground">
                  Toma algum medicamento de uso contínuo atualmente?
                </p>
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        hasMedications: false,
                        medicationsDetail: "",
                      }))
                    }
                    className={cn(
                      "flex-1 rounded-xl border py-2.5 text-center text-xs font-medium transition-all cursor-pointer",
                      formData.hasMedications === false
                        ? "border-primary bg-primary text-primary-foreground font-semibold"
                        : "border-border bg-background hover:bg-secondary text-foreground",
                    )}
                  >
                    Não
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, hasMedications: true }))
                    }
                    className={cn(
                      "flex-1 rounded-xl border py-2.5 text-center text-xs font-medium transition-all cursor-pointer",
                      formData.hasMedications === true
                        ? "border-primary bg-primary text-primary-foreground font-semibold"
                        : "border-border bg-background hover:bg-secondary text-foreground",
                    )}
                  >
                    Sim
                  </button>
                </div>

                {formData.hasMedications === true && (
                  <div className="mt-3 animate-in fade-in duration-150">
                    <label className="text-[11px] font-medium text-foreground">
                      Quais medicamentos e dosagens? <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Losartana 50mg pela manhã, Omeprazol 20mg..."
                      value={formData.medicationsDetail}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          medicationsDetail: e.target.value,
                        }))
                      }
                      className="mt-1 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </div>
                )}
              </div>

              {/* Condições e Comorbidades */}
              <div>
                <label className="text-xs font-semibold text-foreground">
                  Possui algum diagnóstico prévio? (opcional)
                </label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Toque para marcar todos os que se aplicam a você:
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {COMMON_CONDITIONS.map((cond) => {
                    const isSelected = formData.conditions.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => toggleCondition(cond)}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:bg-secondary text-muted-foreground",
                        )}
                      >
                        {isSelected ? `✓ ${cond}` : `+ ${cond}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* PASSO 4: ESCALA DE DOR */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  <Activity className="size-3" /> Passo 4 de 5
                </span>
                <h2 className="mt-2 text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  Escala de Dor
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Selecione o nível de dor que você está sentindo agora, de 0 a 10.
                </p>
              </div>

              {/* Indicador Visual do Nível de Dor */}
              {(() => {
                const pain = getPainDescriptor(formData.painLevel);
                return (
                  <div className="rounded-2xl border border-border bg-secondary/30 p-5 text-center">
                    <div className="text-5xl select-none animate-bounce duration-1000">
                      {pain.emoji}
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <span className="text-3xl font-extrabold tracking-tight text-foreground">
                        {formData.painLevel}
                      </span>
                      <span className="text-sm text-muted-foreground">/ 10</span>
                    </div>
                    <p className={cn("mt-1 text-sm font-bold", pain.color)}>
                      {pain.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {pain.desc}
                    </p>
                  </div>
                );
              })()}

              {/* Botões Numéricos da Escala (0 a 10) */}
              <div>
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                    const isSelected = formData.painLevel === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, painLevel: num }))
                        }
                        className={cn(
                          "flex h-11 flex-col items-center justify-center rounded-xl border text-sm font-bold transition-all cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-md scale-105"
                            : "border-border bg-background hover:bg-secondary text-foreground",
                        )}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-muted-foreground px-1">
                  <span>0 (Sem dor)</span>
                  <span>5 (Moderada)</span>
                  <span>10 (Insuportável)</span>
                </div>
              </div>

              {/* Localização da dor */}
              <div>
                <label className="text-xs font-semibold text-foreground">
                  Onde está localizada a dor?
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {PAIN_LOCATIONS.map((loc) => {
                    const isSelected = formData.painLocation === loc;
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, painLocation: loc }))
                        }
                        className={cn(
                          "rounded-xl border p-2.5 text-left text-xs font-medium transition-all cursor-pointer truncate",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border bg-background hover:bg-secondary text-muted-foreground",
                        )}
                      >
                        {loc}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* PASSO 5: REVISÃO E ENVIO */}
          {step === 5 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3" /> Revisão Final
                </span>
                <h2 className="mt-2 text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  Quase pronto! Confira suas respostas
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ao confirmar, os dados serão salvos no prontuário que o médico abrirá no consultório.
                </p>
              </div>

              {/* Cartão de Resumo */}
              <div className="divide-y divide-border rounded-xl border border-border bg-secondary/20 text-xs">
                {/* Paciente */}
                <div className="p-3.5 flex items-start justify-between gap-2">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Paciente</span>
                    <span className="font-semibold text-foreground">{formData.patientName}</span>
                    {formData.birthDate && (
                      <span className="text-muted-foreground block text-[11px] mt-0.5">
                        Nasc: {formData.birthDate} {calculatedAge ? `(${calculatedAge} anos)` : ""}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                  >
                    Alterar
                  </button>
                </div>

                {/* Queixa */}
                <div className="p-3.5 flex items-start justify-between gap-2">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Motivo & Duração</span>
                    <span className="font-medium text-foreground">{formData.chiefComplaint}</span>
                    <span className="text-muted-foreground block text-[11px] mt-0.5">
                      Duração: {formData.symptomDuration}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                  >
                    Alterar
                  </button>
                </div>

                {/* Alergias & Medicações */}
                <div className="p-3.5 flex items-start justify-between gap-2">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Segurança Farmacológica</span>
                    <p className="font-medium text-foreground">
                      Alergias: {formData.hasAllergies ? formData.allergiesDetail : "Nenhuma relatada"}
                    </p>
                    <p className="font-medium text-foreground mt-0.5">
                      Medicamentos: {formData.hasMedications ? formData.medicationsDetail : "Nenhum informado"}
                    </p>
                    {formData.conditions.length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Condições: {formData.conditions.join(", ")}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                  >
                    Alterar
                  </button>
                </div>

                {/* Dor */}
                <div className="p-3.5 flex items-start justify-between gap-2">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Nível de Dor</span>
                    <span className="font-semibold text-foreground">
                      {formData.painLevel}/10 ({getPainDescriptor(formData.painLevel).label})
                    </span>
                    <span className="text-muted-foreground block text-[11px] mt-0.5">
                      Local: {formData.painLocation}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                  >
                    Alterar
                  </button>
                </div>
              </div>

              {/* Botão de Envio Grande */}
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitTriage}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 px-4 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Transmitindo dados ao consultório...</span>
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    <span>Enviar Pré-Triagem com Segurança</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Navegação Inferior (Voltar / Avançar) */}
          <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
              >
                <ChevronLeft className="size-4" /> Voltar
              </button>
            ) : (
              <div />
            )}

            {step < 5 && (
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Continuar <ChevronRight className="size-4" />
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Footer Simples & Confiável */}
      <footer className="border-t border-border/60 bg-background/50 py-4 text-center text-[11px] text-muted-foreground">
        <p className="flex items-center justify-center gap-1.5">
          <ShieldCheck className="size-3.5 text-emerald-500" />
          <span>Copiloto Med — Seus dados clínicos são protegidos com sigilo e confidencialidade.</span>
        </p>
      </footer>
    </div>
  );
}
