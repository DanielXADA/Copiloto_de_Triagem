import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate, Json } from "@/integrations/supabase/types";

export type TriageStatus = "concluida" | "andamento" | "nao_iniciada";

export type Patient = {
  id: string;
  name: string;
  age: number;
  cpf: string;
  phone: string;
  email: string;
  plan: string;
  lastVisit: string;
  status: "Ativo" | "Inativo" | "Novo";
  area: string;
  conditions: string[];
  allergies: string[];
  medications: string[];
  created_at?: string | undefined;
  updated_at?: string | undefined;
};

export type Triage = {
  id: string;
  patient: string;
  patient_id?: string | null | undefined;
  reason: string;
  status: TriageStatus;
  progress: number;
  priority: "Alta" | "Média" | "Baixa";
  started: string;
  channel: "WhatsApp" | "Web" | "Totem";
  created_at?: string | undefined;
};

export type Dossier = {
  id: string;
  patient: string;
  patient_id?: string | null | undefined;
  age: number;
  area: string;
  createdAt: string;
  duration: string;
  chiefComplaint: string;
  history: string;
  symptoms: { label: string; value: string }[];
  redFlags: string[];
  suggestions: string[];
  created_at?: string | undefined;
};

export type NewPatientInput = Omit<Patient, "id"> & { id?: string | undefined };
export type NewTriageInput = Omit<Triage, "id"> & { id?: string | undefined };
export type NewDossierInput = Omit<Dossier, "id"> & { id?: string | undefined };

// ==========================================
// UTILITÁRIOS DE CPF E MÁSCARAS
// ==========================================

/**
 * Remove todos os caracteres não numéricos do CPF.
 * Ex: "123.456.789-00" -> "12345678900"
 */
export function normalizeCpf(cpf: string | null | undefined): string {
  if (!cpf) return "";
  return cpf.replace(/\D/g, "");
}

/**
 * Formata dígitos em máscara de CPF: 000.000.000-00
 */
export function formatCpf(cpf: string | null | undefined): string {
  const digits = normalizeCpf(cpf).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Formata telefone brasileiro: (00) 00000-0000 ou (00) 0000-0000
 */
export function formatPhone(phone: string | null | undefined): string {
  const digits = (phone || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Verifica se a query de busca corresponde ao CPF do paciente,
 * considerando tanto entradas com máscara quanto sem máscara.
 */
export function matchCpf(patientCpf: string, query: string): boolean {
  const rawQuery = query.trim();
  if (!rawQuery) return false;

  const cleanQuery = normalizeCpf(rawQuery);
  const cleanPatientCpf = normalizeCpf(patientCpf);

  // Se a query contiver dígitos, compara os dígitos limpos
  if (cleanQuery.length > 0 && cleanPatientCpf.includes(cleanQuery)) {
    return true;
  }

  // Compara texto direto (caso haja caracteres especiais ou consulta parcial)
  return (patientCpf || "").toLowerCase().includes(rawQuery.toLowerCase());
}

// ==========================================
// MAPEADORES SUPABASE <-> MODELOS DE DOMÍNIO
// ==========================================

function getProp(obj: unknown, key: string): unknown {
  if (obj && typeof obj === "object" && key in obj) {
    return (obj as Record<string, unknown>)[key];
  }
  return undefined;
}

export function mapRowToPatient(row: Tables<"pacientes"> | Record<string, unknown>): Patient {
  const r = row as Tables<"pacientes">;
  const name = r.name ?? (getProp(row, "nome") as string | undefined) ?? "Sem nome";
  const age = Number(r.age ?? getProp(row, "idade") ?? 0);
  const cpf = formatCpf(
    (r.cpf as string | null) ?? (getProp(row, "cpf") as string | undefined) ?? "",
  );
  const phone = formatPhone(
    (r.phone as string | null) ?? (getProp(row, "telefone") as string | undefined) ?? "",
  );
  const email = String(r.email ?? getProp(row, "email") ?? "");
  const plan = String(r.plan ?? getProp(row, "convenio") ?? getProp(row, "plano") ?? "Particular");
  const lastVisit = String(
    r.last_visit ?? getProp(row, "lastVisit") ?? getProp(row, "ultima_consulta") ?? "—",
  );
  const statusRaw = String(r.status ?? getProp(row, "status") ?? "Novo");
  const status: Patient["status"] =
    statusRaw === "Ativo" || statusRaw === "Inativo" || statusRaw === "Novo" ? statusRaw : "Novo";
  const area = String(r.area ?? getProp(row, "especialidade") ?? "Clínica Geral");

  const condRaw = r.conditions ?? (getProp(row, "condicoes") as string[] | null | undefined);
  const conditions = Array.isArray(condRaw) ? condRaw : [];

  const algRaw = r.allergies ?? (getProp(row, "alergias") as string[] | null | undefined);
  const allergies = Array.isArray(algRaw) ? algRaw : [];

  const medRaw = r.medications ?? (getProp(row, "medicacoes") as string[] | null | undefined);
  const medications = Array.isArray(medRaw) ? medRaw : [];

  return {
    id: String(r.id ?? getProp(row, "id") ?? ""),
    name,
    age,
    cpf,
    phone,
    email,
    plan,
    lastVisit,
    status,
    area,
    conditions,
    allergies,
    medications,
    created_at: (r.created_at as string | null) ?? undefined,
    updated_at: (r.updated_at as string | null) ?? undefined,
  };
}

export function mapRowToTriage(row: Tables<"triagens"> | Record<string, unknown>): Triage {
  const r = row as Tables<"triagens">;
  const statusRaw = String(r.status ?? getProp(row, "status") ?? "nao_iniciada");
  const validStatus: TriageStatus =
    statusRaw === "concluida" || statusRaw === "andamento" || statusRaw === "nao_iniciada"
      ? statusRaw
      : "nao_iniciada";

  const priorityRaw = String(r.priority ?? getProp(row, "priority") ?? "Média");
  const validPriority: Triage["priority"] =
    priorityRaw === "Alta" || priorityRaw === "Média" || priorityRaw === "Baixa"
      ? priorityRaw
      : "Média";

  const channelRaw = String(r.channel ?? getProp(row, "channel") ?? "Web");
  const validChannel: Triage["channel"] =
    channelRaw === "WhatsApp" || channelRaw === "Web" || channelRaw === "Totem"
      ? channelRaw
      : "Web";

  return {
    id: String(r.id ?? getProp(row, "id") ?? ""),
    patient: String(r.patient ?? getProp(row, "paciente") ?? "Paciente"),
    patient_id:
      (r.patient_id as string | null) ?? (getProp(row, "patient_id") as string | null) ?? null,
    reason: String(r.reason ?? getProp(row, "motivo") ?? ""),
    status: validStatus,
    progress: Number(r.progress ?? getProp(row, "progresso") ?? 0),
    priority: validPriority,
    started: String(r.started ?? getProp(row, "iniciado") ?? "—"),
    channel: validChannel,
    created_at: (r.created_at as string | null) ?? undefined,
  };
}

export function mapRowToDossier(row: Tables<"dossies"> | Record<string, unknown>): Dossier {
  const r = row as Tables<"dossies">;
  let symptomsList: { label: string; value: string }[] = [];
  const rawSymptoms = r.symptoms ?? getProp(row, "symptoms");
  if (Array.isArray(rawSymptoms)) {
    symptomsList = rawSymptoms as { label: string; value: string }[];
  } else if (typeof rawSymptoms === "string") {
    try {
      symptomsList = JSON.parse(rawSymptoms);
    } catch {
      symptomsList = [];
    }
  }

  let formattedDate = "Hoje";
  const rawCreatedAt = r.created_at ?? getProp(row, "created_at");
  if (rawCreatedAt) {
    try {
      formattedDate = new Date(String(rawCreatedAt)).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
    } catch {
      formattedDate = String(rawCreatedAt);
    }
  } else if (getProp(row, "createdAt")) {
    formattedDate = String(getProp(row, "createdAt"));
  }

  const redFlagsRaw = r.red_flags ?? (getProp(row, "redFlags") as string[] | null | undefined);
  const redFlags = Array.isArray(redFlagsRaw) ? redFlagsRaw : [];

  const suggestionsRaw =
    r.suggestions ?? (getProp(row, "sugestoes") as string[] | null | undefined);
  const suggestions = Array.isArray(suggestionsRaw) ? suggestionsRaw : [];

  return {
    id: String(r.id ?? getProp(row, "id") ?? ""),
    patient: String(r.patient ?? getProp(row, "paciente") ?? "Paciente"),
    patient_id:
      (r.patient_id as string | null) ?? (getProp(row, "patient_id") as string | null) ?? null,
    age: Number(r.age ?? getProp(row, "idade") ?? 0),
    area: String(r.area ?? getProp(row, "especialidade") ?? "Clínica Geral"),
    createdAt: formattedDate,
    duration: String(r.duration ?? getProp(row, "duracao") ?? "5min"),
    chiefComplaint: String(
      r.chief_complaint ?? getProp(row, "chiefComplaint") ?? getProp(row, "queixa_principal") ?? "",
    ),
    history: String(r.history ?? getProp(row, "historico") ?? ""),
    symptoms: symptomsList,
    redFlags,
    suggestions,
    created_at: (r.created_at as string | null) ?? undefined,
  };
}

// ==========================================
// OPERAÇÕES NO SUPABASE: PACIENTES
// ==========================================

export async function fetchPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from("pacientes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Supabase] Erro ao buscar pacientes:", error.message);
    throw error;
  }

  return (data || []).map((row) => mapRowToPatient(row));
}

export async function fetchPatientById(id: string): Promise<Patient | null> {
  const { data, error } = await supabase.from("pacientes").select("*").eq("id", id).maybeSingle();

  if (error) {
    console.error("[Supabase] Erro ao buscar paciente por ID:", error.message);
    throw error;
  }

  return data ? mapRowToPatient(data) : null;
}

export async function createPatient(patient: NewPatientInput): Promise<Patient> {
  const payload: TablesInsert<"pacientes"> = {
    name: patient.name.trim(),
    age: Number(patient.age) || 0,
    cpf: formatCpf(patient.cpf),
    phone: formatPhone(patient.phone) || null,
    email: patient.email?.trim() || null,
    plan: patient.plan?.trim() || "Particular",
    last_visit: patient.lastVisit?.trim() || "—",
    status: patient.status || "Novo",
    area: patient.area?.trim() || "Clínica Geral",
    conditions: patient.conditions || [],
    allergies: patient.allergies || [],
    medications: patient.medications || [],
    ...(patient.id ? { id: patient.id } : {}),
  };

  const { data, error } = await supabase.from("pacientes").insert(payload).select().single();

  if (error) {
    console.error("[Supabase] Erro ao criar paciente:", error.message);
    throw error;
  }

  return mapRowToPatient(data);
}

export async function updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
  const payload: TablesUpdate<"pacientes"> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.age !== undefined) payload.age = Number(updates.age);
  if (updates.cpf !== undefined) payload.cpf = formatCpf(updates.cpf);
  if (updates.phone !== undefined) payload.phone = formatPhone(updates.phone) || null;
  if (updates.email !== undefined) payload.email = updates.email?.trim() || null;
  if (updates.plan !== undefined) payload.plan = updates.plan?.trim() || null;
  if (updates.lastVisit !== undefined) payload.last_visit = updates.lastVisit?.trim() || null;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.area !== undefined) payload.area = updates.area?.trim() || null;
  if (updates.conditions !== undefined) payload.conditions = updates.conditions;
  if (updates.allergies !== undefined) payload.allergies = updates.allergies;
  if (updates.medications !== undefined) payload.medications = updates.medications;

  const { data, error } = await supabase
    .from("pacientes")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[Supabase] Erro ao atualizar paciente:", error.message);
    throw error;
  }

  return mapRowToPatient(data);
}

export async function deletePatient(id: string): Promise<void> {
  const { error } = await supabase.from("pacientes").delete().eq("id", id);
  if (error) {
    console.error("[Supabase] Erro ao excluir paciente:", error.message);
    throw error;
  }
}

// ==========================================
// OPERAÇÕES NO SUPABASE: TRIAGENS
// ==========================================

export async function fetchTriages(): Promise<Triage[]> {
  const { data, error } = await supabase
    .from("triagens")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Supabase] Erro ao buscar triagens:", error.message);
    throw error;
  }

  return (data || []).map((row) => mapRowToTriage(row));
}

export async function createTriage(triage: NewTriageInput): Promise<Triage> {
  const payload: TablesInsert<"triagens"> = {
    patient: triage.patient.trim(),
    patient_id: triage.patient_id || null,
    reason: triage.reason.trim(),
    status: triage.status || "nao_iniciada",
    progress: Number(triage.progress) || 0,
    priority: triage.priority || "Média",
    started: triage.started || "—",
    channel: triage.channel || "Web",
    ...(triage.id ? { id: triage.id } : {}),
  };

  const { data, error } = await supabase.from("triagens").insert(payload).select().single();

  if (error) {
    console.error("[Supabase] Erro ao criar triagem:", error.message);
    throw error;
  }

  return mapRowToTriage(data);
}

export async function updateTriage(id: string, updates: Partial<Triage>): Promise<Triage> {
  const payload: TablesUpdate<"triagens"> = {};

  if (updates.patient !== undefined) payload.patient = updates.patient.trim();
  if (updates.patient_id !== undefined) payload.patient_id = updates.patient_id;
  if (updates.reason !== undefined) payload.reason = updates.reason.trim();
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.progress !== undefined) payload.progress = Number(updates.progress);
  if (updates.priority !== undefined) payload.priority = updates.priority;
  if (updates.started !== undefined) payload.started = updates.started;
  if (updates.channel !== undefined) payload.channel = updates.channel;

  const { data, error } = await supabase
    .from("triagens")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[Supabase] Erro ao atualizar triagem:", error.message);
    throw error;
  }

  return mapRowToTriage(data);
}

export async function deleteTriage(id: string): Promise<void> {
  const { error } = await supabase.from("triagens").delete().eq("id", id);
  if (error) {
    console.error("[Supabase] Erro ao excluir triagem:", error.message);
    throw error;
  }
}

// ==========================================
// OPERAÇÕES NO SUPABASE: DOSSIÊS
// ==========================================

export async function fetchDossiers(): Promise<Dossier[]> {
  const { data, error } = await supabase
    .from("dossies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Supabase] Erro ao buscar dossiês:", error.message);
    throw error;
  }

  return (data || []).map((row) => mapRowToDossier(row));
}

export async function createDossier(dossier: NewDossierInput): Promise<Dossier> {
  const payload: TablesInsert<"dossies"> = {
    patient: dossier.patient.trim(),
    patient_id: dossier.patient_id || null,
    age: Number(dossier.age) || 0,
    area: dossier.area.trim(),
    duration: dossier.duration || "5min",
    chief_complaint: dossier.chiefComplaint.trim(),
    history: dossier.history.trim(),
    symptoms: (dossier.symptoms ?? []) as unknown as Json,
    red_flags: dossier.redFlags || [],
    suggestions: dossier.suggestions || [],
    ...(dossier.id ? { id: dossier.id } : {}),
  };

  const { data, error } = await supabase.from("dossies").insert(payload).select().single();

  if (error) {
    console.error("[Supabase] Erro ao criar dossiê:", error.message);
    throw error;
  }

  return mapRowToDossier(data);
}

export async function updateDossier(id: string, updates: Partial<Dossier>): Promise<Dossier> {
  const payload: TablesUpdate<"dossies"> = {};

  if (updates.patient !== undefined) payload.patient = updates.patient.trim();
  if (updates.patient_id !== undefined) payload.patient_id = updates.patient_id;
  if (updates.age !== undefined) payload.age = Number(updates.age);
  if (updates.area !== undefined) payload.area = updates.area.trim();
  if (updates.duration !== undefined) payload.duration = updates.duration;
  if (updates.chiefComplaint !== undefined) payload.chief_complaint = updates.chiefComplaint.trim();
  if (updates.history !== undefined) payload.history = updates.history.trim();
  if (updates.symptoms !== undefined) payload.symptoms = updates.symptoms as unknown as Json;
  if (updates.redFlags !== undefined) payload.red_flags = updates.redFlags;
  if (updates.suggestions !== undefined) payload.suggestions = updates.suggestions;

  const { data, error } = await supabase
    .from("dossies")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[Supabase] Erro ao atualizar dossiê:", error.message);
    throw error;
  }

  return mapRowToDossier(data);
}

export async function deleteDossier(id: string): Promise<void> {
  const { error } = await supabase.from("dossies").delete().eq("id", id);
  if (error) {
    console.error("[Supabase] Erro ao excluir dossiê:", error.message);
    throw error;
  }
}

// ==========================================
// RESUMO DINÂMICO DE TRIAGENS
// ==========================================

export function computeTriageSummary(triagesList: Triage[]) {
  const concluidas = triagesList.filter((t) => t.status === "concluida").length;
  const andamento = triagesList.filter((t) => t.status === "andamento").length;
  const naoIniciada = triagesList.filter((t) => t.status === "nao_iniciada").length;
  return {
    concluidas,
    andamento,
    naoIniciada,
    total: triagesList.length,
  };
}

// ==========================================
// DADOS DE CONFIGURAÇÃO E PAINEL (MÉDICO & KPIs)
// ==========================================

export const doctor = {
  name: "Dra. Ana Beatriz",
  specialty: "Clínica Geral",
  clinic: "Clínica Vida Integrada",
  initials: "AB",
};

export const kpis = [
  { label: "Triagens hoje", value: "28", delta: "+12%", hint: "vs. ontem" },
  { label: "Tempo economizado", value: "6h 20min", delta: "+30%", hint: "na semana" },
  { label: "Dossiês prontos", value: "24", delta: "+18%", hint: "hoje" },
  { label: "Pacientes satisfeitos", value: "92%", delta: "+8%", hint: "últimos 30 dias" },
];

export const appointments = [
  {
    time: "08:00",
    name: "Mariana Souza",
    type: "Retorno",
    area: "Clínica Geral",
    status: "Confirmado",
  },
  {
    time: "08:30",
    name: "Carlos Mendes",
    type: "Consulta",
    area: "Ortopedia",
    status: "Confirmado",
  },
  {
    time: "09:00",
    name: "Juliana Costa",
    type: "Primeira consulta",
    area: "Dermatologia",
    status: "Aguardando",
  },
  {
    time: "09:30",
    name: "Rafael Lima",
    type: "Retorno",
    area: "Cardiologia",
    status: "Confirmado",
  },
  {
    time: "10:00",
    name: "Joaquim Antunes",
    type: "Consulta",
    area: "Ginecologia",
    status: "Aguardando",
  },
  {
    time: "10:30",
    name: "Paulo Mendes",
    type: "Retorno",
    area: "Clínica Geral",
    status: "Confirmado",
  },
  {
    time: "11:00",
    name: "Camila Nogueira",
    type: "Consulta",
    area: "Endocrinologia",
    status: "Cancelado",
  },
];

export const recentPatients = [
  { name: "Lucas Ferreira", age: 32, cpf: "123.456.789-00", when: "Hoje, 07:42" },
  { name: "Aline Rocha", age: 28, cpf: "987.654.321-00", when: "Hoje, 07:15" },
  { name: "Roberto Santos", age: 45, cpf: "456.789.123-00", when: "Hoje, 06:58" },
  { name: "Camila Nogueira", age: 37, cpf: "321.654.987-00", when: "Hoje, 06:41" },
  { name: "Paulo Mendes", age: 50, cpf: "654.321.789-00", when: "Hoje, 06:20" },
];

export const triageSummary = { concluidas: 24, andamento: 3, naoIniciada: 1, total: 28 };

export const weeklyTriages = [
  { day: "Seg", triagens: 22, dossies: 19 },
  { day: "Ter", triagens: 27, dossies: 24 },
  { day: "Qua", triagens: 19, dossies: 17 },
  { day: "Qui", triagens: 31, dossies: 28 },
  { day: "Sex", triagens: 28, dossies: 24 },
  { day: "Sáb", triagens: 12, dossies: 10 },
  { day: "Dom", triagens: 5, dossies: 4 },
];

export const specialtyShare = [
  { name: "Clínica Geral", value: 42 },
  { name: "Cardiologia", value: 21 },
  { name: "Ortopedia", value: 17 },
  { name: "Dermatologia", value: 12 },
  { name: "Outros", value: 8 },
];

export const timeSaved = [
  { month: "Abr", horas: 18 },
  { month: "Mai", horas: 24 },
  { month: "Jun", horas: 29 },
  { month: "Jul", horas: 33 },
  { month: "Ago", horas: 38 },
  { month: "Set", horas: 46 },
];

// Fallback inicial vazio para compatibilidade se arrays estáticos forem importados
export const patients: Patient[] = [];
export const triages: Triage[] = [];
export const dossiers: Dossier[] = [];
