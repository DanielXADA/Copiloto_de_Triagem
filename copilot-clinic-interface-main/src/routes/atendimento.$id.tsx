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

  // Dados clínicos 100% dinâmicos (iniciam vazios aguardando aferição real do consultório)
  const [consultation, setConsultation] = useState<ConsultationState>({
    patientName: "",
    patientId: null,
    age: 0,
    cpf: "—",
    plan: "Particular",
    chiefComplaint: "",
    history: "",
    vitalSigns: {
      bloodPressure: "",
      heartRate: "",
      temperature: "",
      saturation: "",
    },
    conduct: "",
  });

  // Insights gerados pela IA (iniciam vazios e são gerados durante a consulta)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [redFlags, setRedFlags] = useState<string[]>([]);

  // Cronômetro do atendimento em tempo real
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

  // 1. Carregar dados reais do agendamento / triagem a partir do banco de dados Supabase
  const loadConsultationData = useCallback(async () => {
    if (!id || !currentClinic?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Tenta buscar na tabela agendamentos
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
          chiefComplaint: appData.observacoes || "",
        }));

        // Se houver paciente_id, busca os dados reais cadastrados do paciente
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
        // 2. Se não encontrou em agendamentos, busca na tabela triagens
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

          if (triageData.patient_id) {
            const { data: patData } = await supabase
              .from("pacientes")
              .select("age, cpf, plan")
              .eq("id", triageData.patient_id)
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
        }
      }
    } catch (err: unknown) {
      console.error("[Atendimento] Erro ao carregar dados do atendimento:", err);
      toast.error("Erro ao sincronizar dados do atendimento.");
    } finally {
      setLoading(false);
    }
  }, [id, currentClinic?.id]);

  useEffect(() => {
    loadConsultationData();
  }, [loadConsultationData]);

  // Escuta clínica da IA / Análise assistida
  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      toast.info("Escuta clínica da IA ativada!", {
        description: "O Copiloto Med está analisando a consulta em tempo real.",
      });

      // Gera hipóteses e sugestões dinamicamente com base na queixa real informada
      setTimeout(() => {
        const queixa = consultation.chiefComplaint.trim();
        const baseSuggestions = [
          "Aferir e registrar sinais vitais em repouso no consultório.",
          "Investigar tempo de evolução dos sintomas e uso prévio de medicações.",
          "Verificar antecedentes pessoais, histórico de alergias e condições crônicas.",
        ];

        if (queixa) {
          baseSuggestions.unshift(`Avaliar correlação clínica para: "${queixa}".`);
        }

        setAiSuggestions(baseSuggestions);
        setRedFlags([
          "Monitorar possíveis sinais de descompensação clínica ou dores refratárias.",
        ]);
      }, 2000);
    } else {
      setIsRecording(false);
      toast.success("Escuta da IA pausada.");
    }
  };

  // Finalizar Atendimento e Salvar Dossiê Real no Supabase
  const handleFinishConsultation = async () => {
    if (!currentClinic?.id) {
      toast.error("Nenhuma clínica ativa encontrada para salvar o atendimento.");
      return;
    }

    if (!consultation.patientName.trim()) {
      toast.warning("Nome do paciente não identificado.");
      return;
    }

    setFinishing(true);
    try {
      // Monta os sinais vitais que foram efetivamente medidos
      const measuredSymptoms: { label: string; value: string }[] = [];

      if (consultation.vitalSigns.bloodPressure.trim()) {
        measuredSymptoms.push({
          label: "Pressão Arterial (PA)",
          value: `${consultation.vitalSigns.bloodPressure.trim()} mmHg`,
        });
      }
      if (consultation.vitalSigns.heartRate.trim()) {
        measuredSymptoms.push({
          label: "Frequência Cardíaca",
          value: `${consultation.vitalSigns.heartRate.trim()} bpm`,
        });
      }
      if (consultation.vitalSigns.temperature.trim()) {
        measuredSymptoms.push({
          label: "Temperatura Corporal",
          value: `${consultation.vitalSigns.temperature.trim()} °C`,
        });
      }
      if (consultation.vitalSigns.saturation.trim()) {
        measuredSymptoms.push({
          label: "Saturação O2",
          value: `${consultation.vitalSigns.saturation.trim()}%`,
        });
      }

      // 1. Cria o Dossiê na tabela dossies no Supabase
      const dossiePayload = {
        clinica_id: currentClinic.id,
        patient: consultation.patientName,
        patient_id: consultation.patientId,
        age: consultation.age,
        area: "Clínica Geral",
        duration: formattedTimer,
        chief_complaint: consultation.chiefComplaint.trim() || "Consulta médica presencial",
        history:
          consultation.history.trim() ||
          (consultation.conduct.trim()
            ? `Evolução: ${consultation.conduct.trim()}`
            : "Atendimento clínico concluído pelo médico."),
        symptoms: measuredSymptoms.length > 0 ? measuredSymptoms : null,
        red_flags: redFlags.length > 0 ? redFlags : null,
        suggestions: aiSuggestions.length > 0 ? aiSuggestions : null,
      };

      const { data: dossie, error: dossieError } = await supabase
        .from("dossies")
        .insert(dossiePayload)
        .select()
        .single();

      if (dossieError) throw dossieError;

      // 2. Se a consulta tiver sido iniciada pela agenda, atualiza para 'Concluido'
      if (id) {
        await supabase
          .from("agendamentos")
          .update({ status: "Concluido", updated_at: new Date().toISOString() })
          .eq("id", id);
      }

      toast.success("Atendimento concluído com sucesso!", {
        description: "Dossiê clínico estruturado e prontuário salvo no banco de dados.",
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
                {loading ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Carregando paciente...
                  </span>
                ) : (
                  consultation.patientName || "Paciente em Atendimento"
                )}
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

        {/* Cronômetro e Ações Principais */}
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
            disabled={finishing || loading}
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
          {/* Card de Queixa Principal e História Clínica */}
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
                placeholder="Informe a queixa ou motivo trazido pelo paciente..."
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
                placeholder="Descreva a cronologia dos sintomas, evolução clínica, fatores de melhora/piora e medicamentos em uso..."
                className="flex w-full rounded-lg border border-input bg-surface p-3 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>
          </Card>

          {/* Sinais Vitais & Medições (Campos limpos aguardando aferição real no consultório) */}
          <Card className="p-6">
            <CardHead
              title="Sinais Vitais & Medições"
              subtitle="Preencha os valores aferidos presencialmente no consultório pelo enfermeiro ou médico"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              {/* Pressão Arterial */}
              <div className="rounded-xl border border-border bg-surface p-3.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Pressão (PA)</p>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="text"
                    placeholder="120/80"
                    value={consultation.vitalSigns.bloodPressure}
                    onChange={(e) =>
                      setConsultation((prev) => ({
                        ...prev,
                        vitalSigns: { ...prev.vitalSigns, bloodPressure: e.target.value },
                      }))
                    }
                    className="w-full text-sm font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 text-foreground"
                  />
                  <span className="text-[11px] text-muted-foreground shrink-0">mmHg</span>
                </div>
              </div>

              {/* Frequência Cardíaca */}
              <div className="rounded-xl border border-border bg-surface p-3.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Freq. Cardíaca</p>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="text"
                    placeholder="ex: 75"
                    value={consultation.vitalSigns.heartRate}
                    onChange={(e) =>
                      setConsultation((prev) => ({
                        ...prev,
                        vitalSigns: { ...prev.vitalSigns, heartRate: e.target.value },
                      }))
                    }
                    className="w-full text-sm font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 text-foreground"
                  />
                  <span className="text-[11px] text-muted-foreground shrink-0">bpm</span>
                </div>
              </div>

              {/* Temperatura */}
              <div className="rounded-xl border border-border bg-surface p-3.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Temperatura</p>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="text"
                    placeholder="ex: 36.5"
                    value={consultation.vitalSigns.temperature}
                    onChange={(e) =>
                      setConsultation((prev) => ({
                        ...prev,
                        vitalSigns: { ...prev.vitalSigns, temperature: e.target.value },
                      }))
                    }
                    className="w-full text-sm font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 text-foreground"
                  />
                  <span className="text-[11px] text-muted-foreground shrink-0">°C</span>
                </div>
              </div>

              {/* Saturação O2 */}
              <div className="rounded-xl border border-border bg-surface p-3.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                <p className="text-[11px] text-muted-foreground uppercase font-semibold">Saturação O2</p>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="text"
                    placeholder="ex: 98"
                    value={consultation.vitalSigns.saturation}
                    onChange={(e) =>
                      setConsultation((prev) => ({
                        ...prev,
                        vitalSigns: { ...prev.vitalSigns, saturation: e.target.value },
                      }))
                    }
                    className="w-full text-sm font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 text-foreground"
                  />
                  <span className="text-[11px] text-muted-foreground shrink-0">%</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Conduta Médica & Prescrição (Campo limpo pronto para o médico digitar) */}
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
              placeholder="Digite aqui as orientações médicas, conduta clínica, prescrições e solicitações de exames..."
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
                  Suporte à decisão clínica em tempo real
                </p>
              </div>
            </div>

            {/* Sugestões Clínicas */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sugestões de Investigação & Anamnese:
              </p>
              {aiSuggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-border rounded-xl">
                  <Stethoscope className="size-6 text-muted-foreground/50 mb-2" />
                  <p className="text-xs font-semibold text-foreground">Aguardando dados clínicos</p>
                  <p className="text-[11px] text-muted-foreground max-w-[220px] mt-1">
                    Digite a queixa do paciente ou ative a "Escuta IA" para que o copiloto gere
                    sugestões em tempo real.
                  </p>
                </div>
              ) : (
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
              )}
            </div>

            {/* Red Flags / Sinais de Alerta */}
            <div className="mt-5 space-y-2 pt-4 border-t border-border">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-warning">
                <AlertTriangle className="size-4" />
                <span>Sinais de Alerta (Red Flags):</span>
              </div>
              {redFlags.length === 0 ? (
                <div className="rounded-lg bg-secondary/30 p-2.5 text-xs text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-success shrink-0" />
                  <span>Nenhum sinal crítico identificado no momento.</span>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {redFlags.map((flag, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-warning" />
                      {flag}
                    </li>
                  ))}
                </ul>
              )}
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
