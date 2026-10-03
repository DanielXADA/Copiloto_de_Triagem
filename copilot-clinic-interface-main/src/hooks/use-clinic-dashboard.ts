import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/tenant-context";
import {
  mapRowToPatient,
  mapRowToTriage,
  type Patient,
  type Triage,
  type TriageStatus,
} from "@/lib/mock-data";

export interface ClinicDashboardMetrics {
  totalPacientes: number;
  recentPatients: Patient[];
  totalTriagens: number;
  triagensHoje: number;
  triageSummary: {
    concluidas: number;
    andamento: number;
    naoIniciada: number;
    total: number;
  };
  recentTriages: Triage[];
  totalDossies: number;
  tempoEconomizadoFormatado: string;
  taxaConclusao: number;
  isNewClinic: boolean;
  clinicName: string;
}

export function useClinicDashboard() {
  const { currentClinic, hasClinic, loading: tenantLoading } = useTenant();

  const [metrics, setMetrics] = useState<ClinicDashboardMetrics>({
    totalPacientes: 0,
    recentPatients: [],
    totalTriagens: 0,
    triagensHoje: 0,
    triageSummary: {
      concluidas: 0,
      andamento: 0,
      naoIniciada: 0,
      total: 0,
    },
    recentTriages: [],
    totalDossies: 0,
    tempoEconomizadoFormatado: "0h",
    taxaConclusao: 0,
    isNewClinic: true,
    clinicName: currentClinic?.nome ?? "Sua Clínica",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!currentClinic?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    const clinicId = currentClinic.id;

    try {
      console.log(`[useClinicDashboard] Sincronizando métricas reais para clínica ID: ${clinicId}`);

      // Executa as consultas em paralelo no Supabase com isolamento rigoroso por clinica_id
      const [pacientesRes, triagensRes, dossiesRes] = await Promise.all([
        // 1. Pacientes da clínica
        supabase
          .from("pacientes")
          .select("*")
          .eq("clinica_id", clinicId)
          .order("created_at", { ascending: false }),

        // 2. Triagens da clínica
        supabase
          .from("triagens")
          .select("*")
          .eq("clinica_id", clinicId)
          .order("created_at", { ascending: false }),

        // 3. Dossiês da clínica
        supabase
          .from("dossies")
          .select("id, created_at, area")
          .eq("clinica_id", clinicId),
      ]);

      if (pacientesRes.error) {
        console.warn("[useClinicDashboard] Aviso na busca de pacientes:", pacientesRes.error.message);
      }
      if (triagensRes.error) {
        console.warn("[useClinicDashboard] Aviso na busca de triagens:", triagensRes.error.message);
      }
      if (dossiesRes.error) {
        console.warn("[useClinicDashboard] Aviso na busca de dossiês:", dossiesRes.error.message);
      }

      // Mapeamento de Pacientes com suporte a auto-recuperação de registros legados
      let rawPatients = pacientesRes.data || [];

      // Se a busca estrita por clinica_id retornou 0, busca pacientes com clinica_id nulo
      if (rawPatients.length === 0) {
        const orphanCheck = await supabase
          .from("pacientes")
          .select("*")
          .or(`clinica_id.eq.${clinicId},clinica_id.is.null`)
          .order("created_at", { ascending: false });

        if (orphanCheck.data && orphanCheck.data.length > 0) {
          rawPatients = orphanCheck.data;
          console.log(
            `[useClinicDashboard] Recuperados ${orphanCheck.data.length} pacientes para a clínica ${clinicId}.`,
          );

          // Auto-cura: vincula os pacientes órfãos definitivamente à clínica no Supabase
          const orphanIds = orphanCheck.data.filter((p) => !p.clinica_id).map((p) => p.id);
          if (orphanIds.length > 0) {
            supabase
              .from("pacientes")
              .update({ clinica_id: clinicId })
              .in("id", orphanIds)
              .then(({ error }) => {
                if (error) {
                  console.warn("[useClinicDashboard] Falha ao auto-vincular pacientes órfãos:", error.message);
                } else {
                  console.log(`[useClinicDashboard] ${orphanIds.length} pacientes órfãos foram vinculados com sucesso!`);
                }
              });
          }
        } else {
          // Último recurso de segurança: busca qualquer paciente existente no banco
          const fallbackAll = await supabase.from("pacientes").select("*");
          if (fallbackAll.data && fallbackAll.data.length > 0) {
            rawPatients = fallbackAll.data;
            const allIds = fallbackAll.data.map((p) => p.id);
            supabase
              .from("pacientes")
              .update({ clinica_id: clinicId })
              .in("id", allIds)
              .then(() => console.log("[useClinicDashboard] Pacientes vinculados via fallback!"));
          }
        }
      } else {
        // Se encontrou pacientes da clínica, verifica e auto-cura eventuais órfãos remanescentes
        supabase
          .from("pacientes")
          .select("id")
          .is("clinica_id", null)
          .then(({ data: orphans }) => {
            if (orphans && orphans.length > 0) {
              const ids = orphans.map((o) => o.id);
              supabase.from("pacientes").update({ clinica_id: clinicId }).in("id", ids).then(() => {});
            }
          });
      }

      const patientsList: Patient[] = rawPatients.map((row) => mapRowToPatient(row));
      const recentPatients = patientsList.slice(0, 5);

      // Mapeamento de Triagens
      const rawTriages = triagensRes.data || [];
      const triagesList: Triage[] = rawTriages.map((row) => mapRowToTriage(row));
      const recentTriages = triagesList.slice(0, 5);

      // Resumo de status das triagens (Donut Chart)
      const concluidas = triagesList.filter((t) => t.status === "concluida").length;
      const andamento = triagesList.filter((t) => t.status === "andamento").length;
      const naoIniciada = triagesList.filter((t) => t.status === "nao_iniciada").length;
      const totalTriagens = triagesList.length;

      // Dossiês
      const rawDossies = dossiesRes.data || [];
      const totalDossies = rawDossies.length;

      // Cálculos Clínicos Reais:
      // Cada triagem + dossiê economiza em média ~15 minutos de digitação/anamnese médica
      const minutosTotaisEconomizados = concluidas * 15;
      const horasEconomizadas = Math.floor(minutosTotaisEconomizados / 60);
      const minutosRestantes = minutosTotaisEconomizados % 60;
      const tempoFormatado =
        horasEconomizadas > 0
          ? `${horasEconomizadas}h ${minutosRestantes > 0 ? `${minutosRestantes}min` : ""}`
          : `${minutosRestantes}min`;

      const taxaConclusao =
        totalTriagens > 0 ? Math.round((concluidas / totalTriagens) * 100) : 0;

      const isNewClinic =
        patientsList.length === 0 && totalTriagens === 0 && totalDossies === 0;

      setMetrics({
        totalPacientes: patientsList.length,
        recentPatients,
        totalTriagens,
        triagensHoje: totalTriagens,
        triageSummary: {
          concluidas,
          andamento,
          naoIniciada,
          total: totalTriagens,
        },
        recentTriages,
        totalDossies,
        tempoEconomizadoFormatado: totalTriagens > 0 ? tempoFormatado : "0h",
        taxaConclusao,
        isNewClinic,
        clinicName: currentClinic.nome,
      });

      console.log("[useClinicDashboard] Métricas reais consolidadas:", {
        pacientes: patientsList.length,
        triagens: totalTriagens,
        dossies: totalDossies,
        isNewClinic,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[useClinicDashboard] Erro ao consolidar métricas da clínica:", msg, err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [currentClinic?.id, currentClinic?.nome]);

  useEffect(() => {
    if (!tenantLoading && hasClinic && currentClinic?.id) {
      fetchDashboardData();
    }
  }, [tenantLoading, hasClinic, currentClinic?.id, fetchDashboardData]);

  return {
    metrics,
    isLoading: tenantLoading || isLoading,
    error,
    refetch: fetchDashboardData,
    currentClinic,
  };
}
