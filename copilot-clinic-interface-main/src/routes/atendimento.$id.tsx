import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  Sparkles,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  User,
  Activity,
  Heart,
  ShieldAlert,
  Mic,
  MicOff,
  Stethoscope,
  Send,
  Loader2,
  Calendar,
  Check,
} from "lucide-react";
import { Card, CardHead, Badge, Button, Avatar } from "@/components/kit";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/atendimento/$id")({
  head: () => ({
    meta: [
      { title: "Atendimento Clínico — Copiloto Med" },
      {
        name: "description",
        content: "Sala de atendimento clínico em tempo real com auxílio de IA e geração de dossiê.",
      },
    ],
  }),
  component: AtendimentoPage,
});

interface ConsultationState {
  patientName: string;
  patientId: string | null;
  age: number;
  cpf: string;
  plan: string;
  chiefComplaint: string;
  history: string;
  vitalSigns: {
    bloodPressure: string;
    heartRate: string;
    temperature: string;
    saturation: string;
  };
  conduct: string;
}

function AtendimentoPage() {
  const { id } = useParams({ from: "/atendimento/$id" });
  const navigate = useNavigate();
  const { currentClinic } = useTenant();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Dados clínicos da consulta em andamento
  const [consultation, setConsultation] = useState<ConsultationState>({
    patientName: "Paciente em Atendimento",
    patientId: null,
    age: 35,
    cpf: "—",
    plan: "Particular",
    chiefComplaint: "",
    history: "",
    vitalSigns: {
      bloodPressure: "120/80",
      heartRate: "72",
      temperature: "36.5",
      saturation: "98",
    },
    conduct: "",
  });

  // Insights gerados pela IA
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([
    "Avaliar histórico prévio de cefaleia ou enxaqueca familiar.",
    "Aferir pressão arterial em repouso e após 10 minutos.",
    "Investigar fatores de estresse recente, qualidade do sono e hidratação.",
  ]);

  const [redFlags, setRedFlags] = useState<string[]>([
    "Sem sinais neurológicos focais imediatos relatados.",
  ]);

  // Cronômetro do atendimento
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTimer = useMemo(() => {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [elapsedSeconds]);

  // 1. Carregar dados do agendamento / triagem a partir do ID
  const loadConsultationData = useCallback(async () => {
    if (!id || !currentClinic?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Tenta buscar na tabela agendamentos
      const { data: appData, error: appError } = await supabase
        .from("agendamentos")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (appData) {
        setConsultation((prev) => ({
          ...prev,
          patientName: appData.paciente_nome,
          patientId: appData.paciente_id,
          chiefComplaint: appData.observacoes || "Consulta de rotina / avaliação",
        }));

        // Se houver paciente_id, busca os detalhes do paciente
        if (appData.paciente_id) {
          const { data: patData } = await supabase
            .from("pacientes")
            .select("age, cpf, plan")
            .eq("id", appData.paciente_id)
            .maybeSingle();

          if (patData) {
            setConsultation((prev) => ({
              ...prev,
              age: patData.age || 0,
              cpf: patData.cpf || "—",
              plan: patData.plan || "Particular",
            }));
          }
        }
      } else {
        // Se não encontrou em agendamentos, tenta buscar na tabela triagens
        const { data: triageData } = await supabase
          .from("triagens")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (triageData) {
          setConsultation((prev) => ({
            ...prev,
            patientName: triageData.patient,
            patientId: triageData.patient_id,
            chiefComplaint: triageData.reason || "",
          }));
        }
      }
    } catch (err: unknown) {
      console.error("[Atendimento] Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  }, [id, currentClinic?.id]);

  useEffect(() => {
    loadConsultationData();
  }, [loadConsultationData]);

  // Simular escuta de consulta / IA em tempo real
  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      toast.info("Escuta clínica da IA iniciada!", {
        description: "O Copiloto Med está transcrevendo e estruturando hipóteses em segundo plano.",
      });
      setTimeout(() => {
        setConsultation((prev) => ({
          ...prev,
          history:
            prev.history ||
            "Paciente refere início de sintomas há 3 dias com intensidade progressiva. Nega febre, náuseas ou episódios de síncope. Fez uso de analgésico comum com alívio transitório.",
        }));
        setAiSuggestions((prev) => [
          ...prev,
          "Considerar solicitação de hemograma ou rastreio inflamatório se persistência > 5 dias.",
        ]);
      }, 3500);
    } else {
      setIsRecording(false);
      toast.success("Escuta pausada.");
    }
  };

  // Finalizar Atendimento e Gerar Dossiê no Supabase
  const handleFinishConsultation = async () => {
    if (!currentClinic?.id) {
      toast.error("Clínica não identificada para gerar o dossiê.");
      return;
    }

    setFinishing(true);
    try {
      // 1. Cria o Dossiê estruturado na tabela dossies
      const dossiePayload = {
        clinica_id: currentClinic.id,
        patient: consultation.patientName,
        patient_id: consultation.patientId,
        age: consultation.age,
        area: "Clínica Geral",
        duration: formattedTimer,
        chief_complaint: consultation.chiefComplaint || "Consulta clínica",
        history: consultation.history || "Atendimento clínico concluído com êxito.",
        symptoms: [
          { label: "Pressão Arterial", value: consultation.vitalSigns.bloodPressure },
          { label: "Freq. Cardíaca", value: `${consultation.vitalSigns.heartRate} bpm` },
          { label: "Temperatura", value: `${consultation.vitalSigns.temperature} °C` },
          { label: "Saturação O2", value: `${consultation.vitalSigns.saturation}%` },
        ],
        red_flags: redFlags,
        suggestions: aiSuggestions,
      };

      const { data: dossie, error: dossieError } = await supabase
        .from("dossies")
        .insert(dossiePayload)
        .select()
        .single();

      if (dossieError) throw dossieError;

      // 2. Se for agendamento, atualiza status para 'Concluido'
      if (id) {
        await supabase
          .from("agendamentos")
          .update({ status: "Concluido", updated_at: new Date().toISOString() })
          .eq("id", id);
      }

      toast.success("Atendimento concluído com sucesso!", {
        description: "Dossiê clínico estruturado pela IA e salvo no prontuário.",
      });

      // Redireciona para o painel de dossiês
      navigate({ to: "/dossies" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Falha ao concluir atendimento: ${msg}`);
    } finally {
      setFinishing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Barra Superior de Navegação e Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/agenda"
            className="flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            title="Voltar para a Agenda"
          >
            <ArrowLeft className="size-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {consultation.patientName}
              </h1>
              <Badge tone="green" className="gap-1 animate-pulse">
                <span className="size-1.5 rounded-full bg-success" /> Em Atendimento
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {consultation.age > 0 ? `${consultation.age} anos • ` : ""}
              CPF: {consultation.cpf} • Convênio: {consultation.plan}
            </p>
          </div>
        </div>

        {/* Cronômetro e Ação Principal */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-mono font-medium">
            <Clock className="size-3.5 text-primary" />
            <span>{formattedTimer}</span>
          </div>

          <Button
            variant="outline"
            onClick={toggleRecording}
            className={cn("gap-2 text-xs", isRecording && "border-destructive text-destructive")}
          >
            {isRecording ? (
              <>
                <MicOff className="size-3.5 animate-pulse" /> Pausar IA
              </>
            ) : (
              <>
                <Mic className="size-3.5 text-primary" /> Escuta IA
              </>
            )}
          </Button>

          <Button
            onClick={handleFinishConsultation}
            disabled={finishing}
            className="flex items-center gap-2 shadow-sm"
          >
            {finishing ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Concluindo...
              </>
            ) : (
              <>
                <Check className="size-4" /> Finalizar & Gerar Dossiê
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Grid Principal do Atendimento: Prontuário Médico (Esquerda) vs Copiloto IA (Direita) */}
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        {/* Coluna 1: Anamnese e Prontuário Clínico */}
        <div className="space-y-5">
          {/* Card de Queixa e História Clínica */}
          <Card className="p-6 space-y-5">
            <div>
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">
                Queixa Principal & Motivo do Atendimento
              </label>
              <input
                type="text"
                value={consultation.chiefComplaint}
                onChange={(e) =>
                  setConsultation((prev) => ({ ...prev, chiefComplaint: e.target.value }))
                }
                placeholder="Ex: Cefaleia pulsátil há 3 dias acompanhada de fotofobia..."
                className="flex h-10 w-full rounded-lg border border-input bg-surface px-3.5 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  História da Doença Atual (HDA) / Evolução Clínica
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Alimentado via digitação ou IA
                </span>
              </div>
              <textarea
                rows={5}
                value={consultation.history}
                onChange={(e) =>
                  setConsultation((prev) => ({ ...prev, history: e.target.value }))
                }
                placeholder="Descreva a cronologia dos sintomas, fatores de melhora/piora, antecedentes e medicamentos em uso..."
                className="flex w-full rounded-lg border border-input bg-surface p-3 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>
          </Card>

          {/* Sinais Vitais */}
          <Card className="p-6">
            <CardHead
              title="Sinais Vitais & Medições"
              subtitle="Dados coletados na pré-consulta ou no consultório"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <div className="rounded-lg border border-border bg-secondary/20 p-3 text-center">
                <p className="text-[11px] text-muted-foreground uppercase font-medium">Pressão (PA)</p>
                <input
                  type="text"
                  value={consultation.vitalSigns.bloodPressure}
                  onChange={(e) =>
                    setConsultation((prev) => ({
                      ...prev,
                      vitalSigns: { ...prev.vitalSigns, bloodPressure: e.target.value },
                    }))
                  }
                  className="mt-1 w-full text-center text-base font-bold bg-transparent border-b border-border focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-muted-foreground">mmHg</span>
              </div>

              <div className="rounded-lg border border-border bg-secondary/20 p-3 text-center">
                <p className="text-[11px] text-muted-foreground uppercase font-medium">Freq. Cardíaca</p>
                <input
                  type="text"
                  value={consultation.vitalSigns.heartRate}
                  onChange={(e) =>
                    setConsultation((prev) => ({
                      ...prev,
                      vitalSigns: { ...prev.vitalSigns, heartRate: e.target.value },
                    }))
                  }
                  className="mt-1 w-full text-center text-base font-bold bg-transparent border-b border-border focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-muted-foreground">bpm</span>
              </div>

              <div className="rounded-lg border border-border bg-secondary/20 p-3 text-center">
                <p className="text-[11px] text-muted-foreground uppercase font-medium">Temperatura</p>
                <input
                  type="text"
                  value={consultation.vitalSigns.temperature}
                  onChange={(e) =>
                    setConsultation((prev) => ({
                      ...prev,
                      vitalSigns: { ...prev.vitalSigns, temperature: e.target.value },
                    }))
                  }
                  className="mt-1 w-full text-center text-base font-bold bg-transparent border-b border-border focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-muted-foreground">°C</span>
              </div>

              <div className="rounded-lg border border-border bg-secondary/20 p-3 text-center">
                <p className="text-[11px] text-muted-foreground uppercase font-medium">Saturação O2</p>
                <input
                  type="text"
                  value={consultation.vitalSigns.saturation}
                  onChange={(e) =>
                    setConsultation((prev) => ({
                      ...prev,
                      vitalSigns: { ...prev.vitalSigns, saturation: e.target.value },
                    }))
                  }
                  className="mt-1 w-full text-center text-base font-bold bg-transparent border-b border-border focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-muted-foreground">%</span>
              </div>
            </div>
          </Card>

          {/* Conduta & Orientações */}
          <Card className="p-6">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">
              Conduta Médica, Prescrição & Orientações
            </label>
            <textarea
              rows={4}
              value={consultation.conduct}
              onChange={(e) =>
                setConsultation((prev) => ({ ...prev, conduct: e.target.value }))
              }
              placeholder="Ex: Prescrito Dipirona 1g se dor forte. Orientado repouso relativo, hidratação adequada e retorno em 7 dias se ausência de melhora..."
              className="flex w-full rounded-lg border border-input bg-surface p-3 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </Card>
        </div>

        {/* Coluna 2: Copiloto IA em Tempo Real */}
        <div className="space-y-5">
          {/* Card Assistente Copiloto Med IA */}
          <Card className="p-6 border-primary/30 shadow-md">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-foreground">
                  Copiloto Med IA
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Análise preditiva e suporte à decisão clínica
                </p>
              </div>
            </div>

            {/* Sugestões Clínicas */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sugestões de Anamnese & Investigação:
              </p>
              <ul className="space-y-2">
                {aiSuggestions.map((s, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/30 p-2.5 text-xs text-foreground"
                  >
                    <Stethoscope className="size-4 shrink-0 text-primary mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Red Flags / Sinais de Alerta */}
            <div className="mt-5 space-y-2 pt-4 border-t border-border">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-warning">
                <AlertTriangle className="size-4" />
                <span>Sinais de Alerta (Red Flags):</span>
              </div>
              <ul className="space-y-1.5">
                {redFlags.map((flag, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-warning" />
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* Card com Informações do Profissional Responsável */}
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Profissional Responsável
            </p>
            <div className="flex items-center gap-3">
              <Avatar name={profile.name} />
              <div>
                <p className="text-[13px] font-semibold text-foreground">{profile.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {currentClinic?.nome ?? "Copiloto Med"} • CRM Ativo
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
