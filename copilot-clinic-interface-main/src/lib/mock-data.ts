export type TriageStatus = "concluida" | "andamento" | "nao_iniciada";

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
  { time: "08:00", name: "Mariana Souza", type: "Retorno", area: "Clínica Geral", status: "Confirmado" },
  { time: "08:30", name: "Carlos Mendes", type: "Consulta", area: "Ortopedia", status: "Confirmado" },
  { time: "09:00", name: "Juliana Costa", type: "Primeira consulta", area: "Dermatologia", status: "Aguardando" },
  { time: "09:30", name: "Rafael Lima", type: "Retorno", area: "Cardiologia", status: "Confirmado" },
  { time: "10:00", name: "joaquim", type: "Consulta", area: "Ginecologia", status: "Aguardando" },
  { time: "10:30", name: "Paulo Mendes", type: "Retorno", area: "Clínica Geral", status: "Confirmado" },
  { time: "11:00", name: "Camila Nogueira", type: "Consulta", area: "Endocrinologia", status: "Cancelado" },
];

export const recentPatients = [
  { name: "Lucas Ferreira", age: 32, cpf: "123.456.789-00", when: "Hoje, 07:42" },
  { name: "Aline Rocha", age: 28, cpf: "987.654.321-00", when: "Hoje, 07:15" },
  { name: "Roberto Santos", age: 45, cpf: "456.789.123-00", when: "Hoje, 06:58" },
  { name: "Camila Nogueira", age: 37, cpf: "321.654.987-00", when: "Hoje, 06:41" },
  { name: "Paulo Mendes", age: 50, cpf: "654.321.789-00", when: "Hoje, 06:20" },
];

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
};

export const patients: Patient[] = [
  {
    id: "p1", name: "Mariana Souza", age: 34, cpf: "123.456.789-00", phone: "(11) 98812-4410",
    email: "mariana.souza@email.com", plan: "Unimed Nacional", lastVisit: "10/09/2026", status: "Ativo",
    area: "Clínica Geral", conditions: ["Enxaqueca crônica"], allergies: ["Dipirona"], medications: ["Topiramato 25mg"],
  },
  {
    id: "p2", name: "Carlos Mendes", age: 47, cpf: "234.567.890-11", phone: "(11) 99120-7788",
    email: "carlos.mendes@email.com", plan: "Particular", lastVisit: "09/09/2026", status: "Ativo",
    area: "Ortopedia", conditions: ["Lombalgia"], allergies: [], medications: ["Ciclobenzaprina 5mg"],
  },
  {
    id: "p3", name: "Juliana Costa", age: 29, cpf: "345.678.901-22", phone: "(11) 99871-3300",
    email: "juliana.costa@email.com", plan: "Bradesco Saúde", lastVisit: "—", status: "Novo",
    area: "Dermatologia", conditions: ["Dermatite atópica"], allergies: ["Níquel"], medications: [],
  },
  {
    id: "p4", name: "Rafael Lima", age: 52, cpf: "456.789.012-33", phone: "(21) 98444-1290",
    email: "rafael.lima@email.com", plan: "SulAmérica", lastVisit: "02/09/2026", status: "Ativo",
    area: "Cardiologia", conditions: ["Hipertensão", "Dislipidemia"], allergies: [], medications: ["Losartana 50mg", "Sinvastatina 20mg"],
  },
  {
    id: "p5", name: "Fernanda Alves", age: 38, cpf: "567.890.123-44", phone: "(11) 98003-9911",
    email: "fernanda.alves@email.com", plan: "Amil", lastVisit: "28/08/2026", status: "Ativo",
    area: "Ginecologia", conditions: ["SOP"], allergies: ["Penicilina"], medications: ["Metformina 500mg"],
  },
  {
    id: "p6", name: "Paulo Mendes", age: 50, cpf: "654.321.789-00", phone: "(11) 97555-2020",
    email: "paulo.mendes@email.com", plan: "Particular", lastVisit: "21/08/2026", status: "Inativo",
    area: "Clínica Geral", conditions: ["Refluxo"], allergies: [], medications: ["Omeprazol 20mg"],
  },
  {
    id: "p7", name: "Camila Nogueira", age: 37, cpf: "321.654.987-00", phone: "(31) 98766-4512",
    email: "camila.nogueira@email.com", plan: "Unimed Nacional", lastVisit: "15/08/2026", status: "Ativo",
    area: "Endocrinologia", conditions: ["Hipotireoidismo"], allergies: [], medications: ["Levotiroxina 50mcg"],
  },
  {
    id: "p8", name: "Lucas Ferreira", age: 32, cpf: "123.456.789-11", phone: "(11) 98123-0099",
    email: "lucas.ferreira@email.com", plan: "Particular", lastVisit: "10/09/2026", status: "Ativo",
    area: "Clínica Geral", conditions: [], allergies: [], medications: [],
  },
];

export type Triage = {
  id: string;
  patient: string;
  reason: string;
  status: TriageStatus;
  progress: number;
  priority: "Alta" | "Média" | "Baixa";
  started: string;
  channel: "WhatsApp" | "Web" | "Totem";
};

export const triages: Triage[] = [
  { id: "TR-2841", patient: "Mariana Souza", reason: "Cefaleia há 5 dias", status: "concluida", progress: 100, priority: "Média", started: "07:12", channel: "WhatsApp" },
  { id: "TR-2842", patient: "Carlos Mendes", reason: "Dor lombar irradiada", status: "concluida", progress: 100, priority: "Alta", started: "07:25", channel: "Web" },
  { id: "TR-2843", patient: "Juliana Costa", reason: "Lesões cutâneas pruriginosas", status: "andamento", progress: 62, priority: "Baixa", started: "07:48", channel: "WhatsApp" },
  { id: "TR-2844", patient: "Rafael Lima", reason: "Palpitações e cansaço", status: "andamento", progress: 35, priority: "Alta", started: "08:02", channel: "Totem" },
  { id: "TR-2845", patient: "Fernanda Alves", reason: "Ciclo irregular", status: "nao_iniciada", progress: 0, priority: "Média", started: "—", channel: "Web" },
  { id: "TR-2846", patient: "Paulo Mendes", reason: "Azia persistente", status: "concluida", progress: 100, priority: "Baixa", started: "06:40", channel: "WhatsApp" },
  { id: "TR-2847", patient: "Camila Nogueira", reason: "Fadiga e ganho de peso", status: "andamento", progress: 80, priority: "Média", started: "08:15", channel: "Web" },
];

export const triageSummary = { concluidas: 24, andamento: 3, naoIniciada: 1, total: 28 };

export type Dossier = {
  id: string;
  patient: string;
  age: number;
  area: string;
  createdAt: string;
  duration: string;
  chiefComplaint: string;
  history: string;
  symptoms: { label: string; value: string }[];
  redFlags: string[];
  suggestions: string[];
};

export const dossiers: Dossier[] = [
  {
    id: "DS-1042", patient: "Mariana Souza", age: 34, area: "Clínica Geral", createdAt: "Hoje, 07:20", duration: "4min",
    chiefComplaint: "Cefaleia pulsátil há 5 dias, predominância hemicraniana à direita.",
    history: "Episódios recorrentes desde os 22 anos, piora com privação de sono e menstruação. Uso frequente de analgésicos comuns nas últimas 3 semanas.",
    symptoms: [
      { label: "Intensidade", value: "7/10" },
      { label: "Duração", value: "5 dias" },
      { label: "Fotofobia", value: "Sim" },
      { label: "Náusea", value: "Sim" },
      { label: "Febre", value: "Não" },
      { label: "Aura visual", value: "Ocasional" },
    ],
    redFlags: ["Uso excessivo de analgésicos (risco de cefaleia por rebote)"],
    suggestions: ["Revisar profilaxia com topiramato", "Diário de cefaleia por 30 dias", "Avaliar higiene do sono"],
  },
  {
    id: "DS-1043", patient: "Carlos Mendes", age: 47, area: "Ortopedia", createdAt: "Hoje, 07:34", duration: "6min",
    chiefComplaint: "Dor lombar baixa com irradiação para membro inferior esquerdo.",
    history: "Início após esforço físico há 12 dias. Piora ao sentar por longos períodos, melhora parcial com relaxante muscular.",
    symptoms: [
      { label: "Intensidade", value: "8/10" },
      { label: "Duração", value: "12 dias" },
      { label: "Irradiação", value: "Até panturrilha" },
      { label: "Parestesia", value: "Sim" },
      { label: "Perda de força", value: "Não" },
      { label: "Alteração urinária", value: "Não" },
    ],
    redFlags: ["Parestesia persistente em dermátomo L5"],
    suggestions: ["Considerar ressonância de coluna lombar", "Fisioterapia orientada", "Reavaliação em 15 dias"],
  },
  {
    id: "DS-1044", patient: "Rafael Lima", age: 52, area: "Cardiologia", createdAt: "Hoje, 08:10", duration: "5min",
    chiefComplaint: "Palpitações intermitentes associadas a cansaço aos esforços.",
    history: "Hipertenso em uso de losartana. Relata episódios de 2 a 5 minutos, algumas vezes ao dia, há duas semanas.",
    symptoms: [
      { label: "Frequência", value: "3x/dia" },
      { label: "Duração", value: "2-5 min" },
      { label: "Dor torácica", value: "Não" },
      { label: "Dispneia", value: "Leve" },
      { label: "Síncope", value: "Não" },
      { label: "Cafeína", value: "Alta" },
    ],
    redFlags: ["Dispneia aos esforços em hipertenso", "Histórico familiar de arritmia"],
    suggestions: ["Holter 24h", "ECG de repouso", "Reduzir cafeína e reavaliar em 7 dias"],
  },
  {
    id: "DS-1045", patient: "Camila Nogueira", age: 37, area: "Endocrinologia", createdAt: "Hoje, 08:26", duration: "4min",
    chiefComplaint: "Fadiga progressiva, ganho de peso e intolerância ao frio.",
    history: "Hipotireoidismo diagnosticado há 3 anos, uso irregular de levotiroxina nos últimos meses.",
    symptoms: [
      { label: "Fadiga", value: "Diária" },
      { label: "Ganho de peso", value: "4 kg / 3 meses" },
      { label: "Queda capilar", value: "Sim" },
      { label: "Constipação", value: "Sim" },
      { label: "Humor", value: "Deprimido" },
      { label: "Adesão", value: "Irregular" },
    ],
    redFlags: ["Baixa adesão medicamentosa"],
    suggestions: ["Solicitar TSH e T4 livre", "Reforço de adesão terapêutica", "Retorno em 30 dias"],
  },
];

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
