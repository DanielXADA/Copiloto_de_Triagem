import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type UserCargo = "admin_geral" | "admin_clinica" | "medico" | "recepcionista";

export interface ClinicaData {
  id: string;
  nome: string;
  cnpj: string | null;
  razao_social: string | null;
  slug?: string | null;
  telefone: string | null;
  email_contato: string | null;
  status?: string;
  plano?: string;
  configuracoes_triagem?: Record<string, unknown> | null;
}

export interface MembroClinicaData {
  id?: string;
  clinica_id: string;
  usuario_id?: string;
  cargo: UserCargo;
  criado_em?: string | null;
}

export interface TenantContextValue {
  currentClinic: ClinicaData | null;
  currentMember: MembroClinicaData | null;
  hasClinic: boolean;
  cargo: UserCargo | null;
  cargoLabel: string;
  loading: boolean;
  error: string | null;
  // Permissões calculadas (RBAC)
  isAdmin: boolean;
  isAdminGeral: boolean;
  isAdminClinica: boolean;
  isMedico: boolean;
  isRecepcionista: boolean;
  canManageClinic: boolean;
  canManageTeam: boolean;
  canViewSecurity: boolean;
  canAccessTab: (tabKey: string) => boolean;
  // Ações
  reloadTenant: () => Promise<void>;
  updateClinicState: (updated: Partial<ClinicaData>) => void;
}

export const TenantContext = createContext<TenantContextValue | undefined>(undefined);

const CARGO_LABELS: Record<UserCargo, string> = {
  admin_geral: "Superadministrador",
  admin_clinica: "Administrador da Clínica",
  medico: "Médico(a)",
  recepcionista: "Recepção / Atendimento",
};

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  const [currentMember, setCurrentMember] = useState<MembroClinicaData | null>(null);
  const [currentClinic, setCurrentClinic] = useState<ClinicaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTenantData = useCallback(async () => {
    if (!user) {
      console.log("[TenantContext] Sem usuário autenticado. Limpando tenant.");
      setCurrentMember(null);
      setCurrentClinic(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    console.log(`[TenantContext] Sincronizando dados para o usuário ID: ${user.id} (${user.email})`);

    try {
      // 1. Busca vínculo na tabela membros_clinica filtrando compulsoriamente por usuario_id = user.id
      let memberRecord: MembroClinicaData | null = null;

      console.log(`[TenantContext] Executando query: supabase.from('membros_clinica').select('clinica_id, cargo').eq('usuario_id', '${user.id}')`);
      const { data: members, error: errorUsuario } = await supabase
        .from("membros_clinica")
        .select("clinica_id, cargo")
        .eq("usuario_id", user.id);

      if (errorUsuario) {
        console.error("[TenantContext] ❌ Erro na query membros_clinica (.eq usuario_id):", {
          code: errorUsuario.code,
          message: errorUsuario.message,
          details: errorUsuario.details,
          hint: errorUsuario.hint,
        });
      } else {
        console.log(`[TenantContext] Registros encontrados em membros_clinica (${members?.length ?? 0}):`, members);
      }

      if (members && members.length > 0) {
        // Se houver múltiplos registros, prioriza o cargo com maior privilégio
        const prioritized =
          members.find((m) => m.cargo === "admin_geral") ||
          members.find((m) => m.cargo === "admin_clinica") ||
          members[0];

        console.log("[TenantContext] ✅ Membro ativo selecionado:", prioritized);
        memberRecord = prioritized as MembroClinicaData;
      }

      // 2. Se localizou o vínculo de membro, busca a clínica ativa
      if (memberRecord && memberRecord.clinica_id) {
        setCurrentMember(memberRecord);
        console.log(`[TenantContext] Cargo ativo: "${memberRecord.cargo}". Buscando clínica ID: ${memberRecord.clinica_id}`);

        const { data: clinicData, error: clinicError } = await supabase
          .from("clinicas")
          .select("id, nome, cnpj, razao_social, slug, telefone, email_contato, status, plano, configuracoes_triagem")
          .eq("id", memberRecord.clinica_id)
          .maybeSingle();

        if (clinicError) {
          console.error("[TenantContext] ❌ Erro ao buscar clínica:", {
            code: clinicError.code,
            message: clinicError.message,
            details: clinicError.details,
            hint: clinicError.hint,
          });
          setError(`Erro ao carregar dados da clínica: ${clinicError.message}`);
          setCurrentClinic(null);
        } else if (clinicData) {
          console.log("[TenantContext] ✅ Dados da clínica carregados com sucesso:", clinicData.nome, clinicData);
          setCurrentClinic(clinicData as ClinicaData);
        } else {
          console.warn("[TenantContext] ⚠️ Clínica vinculada não encontrada na tabela clinicas para ID:", memberRecord.clinica_id);
          setCurrentClinic(null);
        }
      } else {
        // Usuário logado SEM nenhuma clínica vinculada
        console.warn("[TenantContext] ⚠️ Usuário autenticado NÃO possui clínica vinculada em membros_clinica. Redirecionamento para Onboarding (/setup) necessário.");
        setCurrentMember(null);
        setCurrentClinic(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[TenantContext] ❌ Exceção crítica ao carregar tenant:", msg, err);
      setError(msg);
      setCurrentMember(null);
      setCurrentClinic(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      loadTenantData();
    }
  }, [authLoading, loadTenantData]);

  // Função para atualizar localmente os dados da clínica após um UPDATE com sucesso
  const updateClinicState = useCallback((updated: Partial<ClinicaData>) => {
    setCurrentClinic((prev) => (prev ? { ...prev, ...updated } : null));
  }, []);

  // RBAC: Cálculos de permissão baseados no cargo real do usuário
  const cargo: UserCargo | null = currentMember?.cargo ?? null;
  const cargoLabel = cargo ? CARGO_LABELS[cargo] : "Sem Clínica Vinculada";

  const isAdminGeral = cargo === "admin_geral";
  const isAdminClinica = cargo === "admin_clinica";
  const isAdmin = isAdminGeral || isAdminClinica;
  const isMedico = cargo === "medico";
  const isRecepcionista = cargo === "recepcionista";
  const hasClinic = !!currentClinic && !!currentMember;

  // Capacidades de gerenciamento
  const canManageClinic = isAdmin;
  const canManageTeam = isAdmin;
  const canViewSecurity = isAdmin;

  // Regra de acesso a abas de configuração:
  // Médicos e recepcionistas NÃO podem acessar 'clinica', 'equipe' e 'segurança'
  const canAccessTab = useCallback(
    (tabKey: string): boolean => {
      if (tabKey === "perfil" || tabKey === "preferencias") {
        return true;
      }
      if (tabKey === "clinica" || tabKey === "equipe" || tabKey === "seguranca") {
        return isAdmin;
      }
      return true;
    },
    [isAdmin],
  );

  const value: TenantContextValue = {
    currentClinic,
    currentMember,
    hasClinic,
    cargo,
    cargoLabel,
    loading: authLoading || loading,
    error,
    isAdmin,
    isAdminGeral,
    isAdminClinica,
    isMedico,
    isRecepcionista,
    canManageClinic,
    canManageTeam,
    canViewSecurity,
    canAccessTab,
    reloadTenant: loadTenantData,
    updateClinicState,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export const DEFAULT_TENANT_FALLBACK: TenantContextValue = {
  currentClinic: null,
  currentMember: null,
  hasClinic: false,
  cargo: null,
  cargoLabel: "Sem Clínica",
  loading: false,
  error: null,
  isAdmin: false,
  isAdminGeral: false,
  isAdminClinica: false,
  isMedico: false,
  isRecepcionista: false,
  canManageClinic: false,
  canManageTeam: false,
  canViewSecurity: false,
  canAccessTab: () => false,
  reloadTenant: async () => {},
  updateClinicState: () => {},
};

export function useTenant(options?: { optional?: boolean }): TenantContextValue {
  const context = useContext(TenantContext);
  if (!context) {
    if (options?.optional) {
      return DEFAULT_TENANT_FALLBACK;
    }
    // Retorna fallback seguro para não quebrar a árvore de renderização em rotas públicas
    return DEFAULT_TENANT_FALLBACK;
  }
  return context;
}

export function useOptionalTenant(): TenantContextValue | null {
  return useContext(TenantContext) ?? null;
}
