import { useTenant, type UserCargo } from "@/contexts/tenant-context";

/**
 * Hook de Permissões (RBAC) do Copiloto Med
 * Lê o cargo do usuário logado na clínica ativa e expõe verificações de acesso diretas.
 */
export function usePermissions() {
  const {
    cargo,
    cargoLabel,
    isAdmin,
    isAdminGeral,
    isAdminClinica,
    isMedico,
    isRecepcionista,
    canManageClinic,
    canManageTeam,
    canViewSecurity,
    canAccessTab,
    currentClinic,
    currentMember,
    loading,
  } = useTenant();

  return {
    cargo: cargo as UserCargo | null,
    cargoLabel,
    clinicId: currentClinic?.id ?? null,
    clinicName: currentClinic?.nome ?? "Clínica",
    isAdmin,
    isAdminGeral,
    isAdminClinica,
    isMedico,
    isRecepcionista,
    canManageClinic,
    canManageTeam,
    canViewSecurity,
    canAccessTab,
    loading,
    currentClinic,
    currentMember,
  };
}
