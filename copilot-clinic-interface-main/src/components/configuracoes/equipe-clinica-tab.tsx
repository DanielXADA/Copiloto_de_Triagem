import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  Stethoscope,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant, type UserCargo } from "@/contexts/tenant-context";
import { useAuth, extractInitials } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Card,
  CardHead,
  Badge,
  Button,
  Field,
  Input,
} from "@/components/kit";
import { cn } from "@/lib/utils";

interface EquipeMemberItem {
  id: string;
  clinica_id: string;
  usuario_id: string;
  perfil_id?: string | null | undefined;
  cargo: UserCargo;
  criado_em?: string | null | undefined;
  // Dados hidratados da tabela perfis
  nome_completo?: string | null | undefined;
  avatar_url?: string | null | undefined;
}

const CARGO_BADGES: Record<
  UserCargo,
  { label: string; tone: "blue" | "green" | "amber" | "neutral" }
> = {
  admin_geral: { label: "Superadministrador", tone: "blue" },
  admin_clinica: { label: "Administrador da Clínica", tone: "blue" },
  medico: { label: "Médico(a)", tone: "green" },
  recepcionista: { label: "Recepção", tone: "neutral" },
};

function extractErrorMessage(err: unknown): string {
  if (!err) return "Erro desconhecido";
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const errorObj = err as Record<string, unknown>;
    const msg =
      (typeof errorObj["message"] === "string" && errorObj["message"].trim()) ||
      (typeof errorObj["details"] === "string" && errorObj["details"].trim()) ||
      "";
    if (msg) return msg;
    try {
      return JSON.stringify(err);
    } catch {
      return "Erro na requisição ao Supabase.";
    }
  }
  return String(err);
}

export function EquipeClinicaTab() {
  const { currentClinic, isAdmin } = useTenant();
  const { user } = useAuth();

  const [members, setMembers] = useState<EquipeMemberItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados para modal de convidar/vincular novo membro
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [invitePerfilId, setInvitePerfilId] = useState("");
  const [inviteCargo, setInviteCargo] = useState<UserCargo>("medico");
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  // Estado para alteração de cargo rápida
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  // 1. Carrega os membros reais da clínica e faz join com a tabela perfis
  const fetchEquipe = useCallback(async () => {
    if (!currentClinic?.id) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1.1 Consulta membros na tabela membros_clinica
      const { data: membrosData, error: membrosError } = await supabase
        .from("membros_clinica")
        .select("id, clinica_id, usuario_id, cargo, criado_em")
        .eq("clinica_id", currentClinic.id);

      if (membrosError) {
        console.error("[EquipeClinicaTab] Erro ao buscar membros_clinica:", membrosError);
        throw membrosError;
      }

      const membrosList = (membrosData || []) as unknown as EquipeMemberItem[];

      // 1.2 Hidrata com nomes da tabela perfis
      const userIds = membrosList.map((m) => m.usuario_id || m.perfil_id).filter(Boolean) as string[];

      let perfisMap: Record<string, { nome_completo: string | null; avatar_url: string | null }> = {};
      if (userIds.length > 0) {
        const { data: perfisData, error: perfisError } = await supabase
          .from("perfis")
          .select("id, nome_completo, avatar_url")
          .in("id", userIds);

        if (!perfisError && perfisData) {
          perfisData.forEach((p) => {
            perfisMap[p.id] = {
              nome_completo: p.nome_completo,
              avatar_url: p.avatar_url,
            };
          });
        }
      }

      // Combina os dados
      const fullList: EquipeMemberItem[] = membrosList.map((m) => {
        const targetId = m.usuario_id || m.perfil_id || "";
        const perfil = perfisMap[targetId];
        return {
          ...m,
          nome_completo: perfil?.nome_completo ?? (targetId === user?.id ? "Você (Perfil Atual)" : null),
          avatar_url: perfil?.avatar_url,
        };
      });

      setMembers(fullList);
    } catch (err: unknown) {
      const msg = extractErrorMessage(err);
      console.error("[EquipeClinicaTab] Falha ao carregar equipe:", msg);
      setErrorMessage(`Não foi possível carregar a equipe da clínica: ${msg}`);
      toast.error("Erro ao carregar equipe", { description: msg });
    } finally {
      setIsLoading(false);
    }
  }, [currentClinic?.id, user?.id]);

  useEffect(() => {
    if (currentClinic?.id) {
      fetchEquipe();
    }
  }, [currentClinic?.id, fetchEquipe]);

  // 2. Adicionar / Vincular Novo Membro à Clínica
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentClinic?.id) {
      toast.error("Clínica não identificada.");
      return;
    }

    const trimmedId = invitePerfilId.trim();
    if (!trimmedId) {
      toast.error("Informe o ID de usuário (UUID) do perfil a ser vinculado.");
      return;
    }

    setIsSubmittingInvite(true);

    try {
      // Verifica se o membro já existe nesta clínica
      const existing = members.find((m) => (m.usuario_id || m.perfil_id) === trimmedId);
      if (existing) {
        throw new Error("Este usuário já faz parte da equipe desta clínica.");
      }

      const { data: inserted, error: insertError } = await supabase
        .from("membros_clinica")
        .insert({
          clinica_id: currentClinic.id,
          usuario_id: trimmedId,
          cargo: inviteCargo,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      toast.success("Membro vinculado com sucesso!", {
        description: `Usuário adicionado com o cargo de ${CARGO_BADGES[inviteCargo].label}.`,
      });

      setIsInviteOpen(false);
      setInvitePerfilId("");
      fetchEquipe();
    } catch (err: unknown) {
      const msg = extractErrorMessage(err);
      toast.error("Falha ao adicionar membro", { description: msg });
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  // 3. Alterar Cargo de um Membro
  const handleChangeCargo = async (memberId: string, newCargo: UserCargo) => {
    setUpdatingMemberId(memberId);
    try {
      const { error } = await supabase
        .from("membros_clinica")
        .update({ cargo: newCargo })
        .eq("id", memberId);

      if (error) throw error;

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, cargo: newCargo } : m)),
      );

      toast.success("Cargo atualizado!", {
        description: `Novo nível de acesso: ${CARGO_BADGES[newCargo].label}.`,
      });
    } catch (err: unknown) {
      const msg = extractErrorMessage(err);
      toast.error("Erro ao alterar cargo", { description: msg });
    } finally {
      setUpdatingMemberId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Alerta de Erro */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive animate-in fade-in duration-200">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium">Falha na listagem da equipe</p>
            <p className="text-xs text-destructive/80 mt-0.5">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={fetchEquipe}
            className="text-xs font-semibold underline hover:opacity-80 cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Modal / Formulário de Convite de Membro */}
      {isInviteOpen && (
        <Card className="p-5 border-primary/30 bg-primary-soft/30 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Plus className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Vincular Novo Profissional à Clínica
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsInviteOpen(false)}
              className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          <form onSubmit={handleAddMember} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Field
                  label="ID do Perfil (UUID) *"
                  hint="Identificador do usuário cadastrado na tabela perfis"
                >
                  <input
                    type="text"
                    value={invitePerfilId}
                    onChange={(e) => setInvitePerfilId(e.target.value)}
                    placeholder="Ex: a1b2c3d4-e5f6-7890-..."
                    required
                    disabled={isSubmittingInvite}
                    className="h-9 w-full font-mono rounded-lg border border-input bg-surface px-3 text-xs outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </Field>
              </div>

              <div>
                <Field label="Cargo / Nível de Acesso *" hint="Define as permissões no sistema">
                  <select
                    value={inviteCargo}
                    onChange={(e) => setInviteCargo(e.target.value as UserCargo)}
                    disabled={isSubmittingInvite}
                    className="h-9 w-full rounded-lg border border-input bg-surface px-3 text-xs font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  >
                    <option value="medico">Médico(a)</option>
                    <option value="admin_clinica">Administrador da Clínica</option>
                    <option value="recepcionista">Recepção / Atendimento</option>
                    <option value="admin_geral">Superadministrador</option>
                  </select>
                </Field>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInviteOpen(false)}
                disabled={isSubmittingInvite}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmittingInvite || !invitePerfilId.trim()}>
                {isSubmittingInvite ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Vinculando...
                  </>
                ) : (
                  <>
                    <Plus className="size-4" />
                    Confirmar Vínculo
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Card da Lista da Equipe */}
      <Card>
        <CardHead
          title="Equipe de Profissionais"
          subtitle={`${members.length} profissional(is) cadastrado(s) na tabela membros_clinica`}
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchEquipe}
                disabled={isLoading}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
                title="Recarregar membros"
              >
                <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
                Recarregar
              </button>

              {isAdmin && !isInviteOpen && (
                <Button variant="outline" onClick={() => setIsInviteOpen(true)}>
                  <Plus className="size-4" />
                  Adicionar Membro
                </Button>
              )}
            </div>
          }
        />

        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="size-6 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm font-medium">Carregando membros da equipe...</p>
            <p className="text-xs text-muted-foreground mt-1">
              Buscando vínculos da clínica <code className="font-mono">{currentClinic?.nome}</code> no Supabase.
            </p>
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="size-10 text-muted-foreground mx-auto mb-3 opacity-60" />
            <h3 className="text-sm font-semibold">Nenhum membro encontrado</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              Esta clínica ainda não possui membros cadastrados na tabela <code className="font-mono">membros_clinica</code>.
            </p>
            {isAdmin && (
              <Button className="mt-4" onClick={() => setIsInviteOpen(true)}>
                <Plus className="size-4" />
                Vincular Primeiro Membro
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {members.map((m) => {
              const memberUserId = m.usuario_id || m.perfil_id || "";
              const displayName = m.nome_completo?.trim() || `Usuário (${memberUserId.slice(0, 8)}...)`;
              const initials = extractInitials(displayName);
              const badgeInfo = CARGO_BADGES[m.cargo] || { label: m.cargo, tone: "neutral" };
              const isCurrentUser = memberUserId === user?.id;
              const isUpdating = updatingMemberId === m.id;

              return (
                <li
                  key={m.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-secondary/20"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-[13px] font-bold text-primary">
                      {initials}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-semibold text-foreground">
                          {displayName}
                        </p>
                        {isCurrentUser && (
                          <span className="rounded bg-primary/15 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                            Você
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        ID: {memberUserId}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center flex-wrap">
                    {/* Badge do Cargo */}
                    <Badge tone={badgeInfo.tone}>
                      {badgeInfo.label}
                    </Badge>

                    {/* Ações administrativas */}
                    {isAdmin && (
                      <div className="flex items-center gap-1.5 ml-1">
                        {/* Seletor rápido de cargo */}
                        <select
                          value={m.cargo}
                          disabled={isUpdating}
                          onChange={(e) => handleChangeCargo(m.id, e.target.value as UserCargo)}
                          className="h-7 rounded border border-border bg-surface px-2 text-[11px] font-medium outline-none hover:bg-secondary focus:border-primary cursor-pointer disabled:opacity-50"
                          title="Alterar cargo do profissional"
                        >
                          <option value="medico">Médico(a)</option>
                          <option value="admin_clinica">Admin Clínica</option>
                          <option value="recepcionista">Recepção</option>
                          <option value="admin_geral">Admin Geral</option>
                        </select>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
