-- Schema para o Copiloto de Triagem (Supabase)
-- Execute este script no SQL Editor do seu projeto Supabase (https://peggrxulfqeylopbcbue.supabase.co)

-- Habilitar extensão para geração de UUID se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE PACIENTES
CREATE TABLE IF NOT EXISTS public.pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER NOT NULL DEFAULT 0,
  cpf TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  plan TEXT DEFAULT 'Particular',
  last_visit TEXT DEFAULT '—',
  status TEXT NOT NULL DEFAULT 'Novo' CHECK (status IN ('Ativo', 'Inativo', 'Novo')),
  area TEXT DEFAULT 'Clínica Geral',
  conditions TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  medications TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para busca rápida de pacientes
CREATE INDEX IF NOT EXISTS idx_pacientes_cpf ON public.pacientes (cpf);
CREATE INDEX IF NOT EXISTS idx_pacientes_name ON public.pacientes (name);
CREATE INDEX IF NOT EXISTS idx_pacientes_status ON public.pacientes (status);

-- 2. TABELA DE TRIAGENS
CREATE TABLE IF NOT EXISTS public.triagens (
  id TEXT PRIMARY KEY DEFAULT ('TR-' || floor(random() * 9000 + 1000)::text),
  patient TEXT NOT NULL,
  patient_id UUID REFERENCES public.pacientes(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'nao_iniciada' CHECK (status IN ('concluida', 'andamento', 'nao_iniciada')),
  progress INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'Média' CHECK (priority IN ('Alta', 'Média', 'Baixa')),
  started TEXT DEFAULT '—',
  channel TEXT NOT NULL DEFAULT 'WhatsApp' CHECK (channel IN ('WhatsApp', 'Web', 'Totem')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_triagens_status ON public.triagens (status);

-- 3. TABELA DE DOSSIÊS
CREATE TABLE IF NOT EXISTS public.dossies (
  id TEXT PRIMARY KEY DEFAULT ('DS-' || floor(random() * 9000 + 1000)::text),
  patient TEXT NOT NULL,
  patient_id UUID REFERENCES public.pacientes(id) ON DELETE SET NULL,
  age INTEGER NOT NULL DEFAULT 0,
  area TEXT NOT NULL DEFAULT 'Clínica Geral',
  created_at TIMESTAMPTZ DEFAULT now(),
  duration TEXT DEFAULT '5min',
  chief_complaint TEXT NOT NULL,
  history TEXT NOT NULL,
  symptoms JSONB DEFAULT '[]'::jsonb,
  red_flags TEXT[] DEFAULT '{}',
  suggestions TEXT[] DEFAULT '{}'
);

-- 4. POLÍTICAS DE ACESSO (Row Level Security - RLS)
-- Permitir leitura e escrita para chaves anônimas/autenticadas da clínica
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossies ENABLE ROW LEVEL SECURITY;

-- Políticas para pacientes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pacientes' AND policyname = 'Permitir leitura anonima pacientes') THEN
    CREATE POLICY "Permitir leitura anonima pacientes" ON public.pacientes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pacientes' AND policyname = 'Permitir insercao anonima pacientes') THEN
    CREATE POLICY "Permitir insercao anonima pacientes" ON public.pacientes FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pacientes' AND policyname = 'Permitir atualizacao anonima pacientes') THEN
    CREATE POLICY "Permitir atualizacao anonima pacientes" ON public.pacientes FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pacientes' AND policyname = 'Permitir delecao anonima pacientes') THEN
    CREATE POLICY "Permitir delecao anonima pacientes" ON public.pacientes FOR DELETE USING (true);
  END IF;
END $$;

-- Políticas para triagens
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'triagens' AND policyname = 'Permitir leitura anonima triagens') THEN
    CREATE POLICY "Permitir leitura anonima triagens" ON public.triagens FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'triagens' AND policyname = 'Permitir insercao anonima triagens') THEN
    CREATE POLICY "Permitir insercao anonima triagens" ON public.triagens FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'triagens' AND policyname = 'Permitir atualizacao anonima triagens') THEN
    CREATE POLICY "Permitir atualizacao anonima triagens" ON public.triagens FOR UPDATE USING (true);
  END IF;
END $$;

-- Políticas para dossiês
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dossies' AND policyname = 'Permitir leitura anonima dossies') THEN
    CREATE POLICY "Permitir leitura anonima dossies" ON public.dossies FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dossies' AND policyname = 'Permitir insercao anonima dossies') THEN
    CREATE POLICY "Permitir insercao anonima dossies" ON public.dossies FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dossies' AND policyname = 'Permitir atualizacao anonima dossies') THEN
    CREATE POLICY "Permitir atualizacao anonima dossies" ON public.dossies FOR UPDATE USING (true);
  END IF;
END $$;

-- DADOS INICIAIS (SEED)
INSERT INTO public.pacientes (name, age, cpf, phone, email, plan, last_visit, status, area, conditions, allergies, medications)
VALUES
  ('Mariana Souza', 34, '123.456.789-00', '(11) 98812-4410', 'mariana.souza@email.com', 'Unimed Nacional', '10/09/2026', 'Ativo', 'Clínica Geral', ARRAY['Enxaqueca crônica'], ARRAY['Dipirona'], ARRAY['Topiramato 25mg']),
  ('Carlos Mendes', 47, '234.567.890-11', '(11) 99120-7788', 'carlos.mendes@email.com', 'Particular', '09/09/2026', 'Ativo', 'Ortopedia', ARRAY['Lombalgia'], ARRAY[]::text[], ARRAY['Ciclobenzaprina 5mg']),
  ('Juliana Costa', 29, '345.678.901-22', '(11) 99871-3300', 'juliana.costa@email.com', 'Bradesco Saúde', '—', 'Novo', 'Dermatologia', ARRAY['Dermatite atópica'], ARRAY['Níquel'], ARRAY[]::text[]),
  ('Rafael Lima', 52, '456.789.012-33', '(21) 98444-1290', 'rafael.lima@email.com', 'SulAmérica', '02/09/2026', 'Ativo', 'Cardiologia', ARRAY['Hipertensão', 'Dislipidemia'], ARRAY[]::text[], ARRAY['Losartana 50mg', 'Sinvastatina 20mg']),
  ('Fernanda Alves', 38, '567.890.123-44', '(11) 98003-9911', 'fernanda.alves@email.com', 'Amil', '28/08/2026', 'Ativo', 'Ginecologia', ARRAY['SOP'], ARRAY['Penicilina'], ARRAY['Metformina 500mg']),
  ('Paulo Mendes', 50, '654.321.789-00', '(11) 97555-2020', 'paulo.mendes@email.com', 'Particular', '21/08/2026', 'Inativo', 'Clínica Geral', ARRAY['Refluxo'], ARRAY[]::text[], ARRAY['Omeprazol 20mg']),
  ('Camila Nogueira', 37, '321.654.987-00', '(31) 98766-4512', 'camila.nogueira@email.com', 'Unimed Nacional', '15/08/2026', 'Ativo', 'Endocrinologia', ARRAY['Hipotireoidismo'], ARRAY[]::text[], ARRAY['Levotiroxina 50mcg']),
  ('Lucas Ferreira', 32, '123.456.789-11', '(11) 98123-0099', 'lucas.ferreira@email.com', 'Particular', '10/09/2026', 'Ativo', 'Clínica Geral', ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[])
ON CONFLICT DO NOTHING;

INSERT INTO public.triagens (id, patient, reason, status, progress, priority, started, channel)
VALUES
  ('TR-2841', 'Mariana Souza', 'Cefaleia há 5 dias', 'concluida', 100, 'Média', '07:12', 'WhatsApp'),
  ('TR-2842', 'Carlos Mendes', 'Dor lombar irradiada', 'concluida', 100, 'Alta', '07:25', 'Web'),
  ('TR-2843', 'Juliana Costa', 'Lesões cutâneas pruriginosas', 'andamento', 62, 'Baixa', '07:48', 'WhatsApp'),
  ('TR-2844', 'Rafael Lima', 'Palpitações e cansaço', 'andamento', 35, 'Alta', '08:02', 'Totem'),
  ('TR-2845', 'Fernanda Alves', 'Ciclo irregular', 'nao_iniciada', 0, 'Média', '—', 'Web'),
  ('TR-2846', 'Paulo Mendes', 'Azia persistente', 'concluida', 100, 'Baixa', '06:40', 'WhatsApp'),
  ('TR-2847', 'Camila Nogueira', 'Fadiga e ganho de peso', 'andamento', 80, 'Média', '08:15', 'Web')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.dossies (id, patient, age, area, duration, chief_complaint, history, symptoms, red_flags, suggestions)
VALUES
  ('DS-1042', 'Mariana Souza', 34, 'Clínica Geral', '4min',
   'Cefaleia pulsátil há 5 dias, predominância hemicraniana à direita.',
   'Episódios recorrentes desde os 22 anos, piora com privação de sono e menstruação. Uso frequente de analgésicos comuns nas últimas 3 semanas.',
   '[{"label":"Intensidade","value":"7/10"},{"label":"Duração","value":"5 dias"},{"label":"Fotofobia","value":"Sim"},{"label":"Náusea","value":"Sim"},{"label":"Febre","value":"Não"},{"label":"Aura visual","value":"Ocasional"}]'::jsonb,
   ARRAY['Uso excessivo de analgésicos (risco de cefaleia por rebote)'],
   ARRAY['Revisar profilaxia com topiramato', 'Diário de cefaleia por 30 dias', 'Avaliar higiene do sono']),
  ('DS-1043', 'Carlos Mendes', 47, 'Ortopedia', '6min',
   'Dor lombar baixa com irradiação para membro inferior esquerdo.',
   'Início após esforço físico há 12 dias. Piora ao sentar por longos períodos, melhora parcial com relaxante muscular.',
   '[{"label":"Intensidade","value":"8/10"},{"label":"Duração","value":"12 dias"},{"label":"Irradiação","value":"Até panturrilha"},{"label":"Parestesia","value":"Sim"},{"label":"Perda de força","value":"Não"},{"label":"Alteração urinária","value":"Não"}]'::jsonb,
   ARRAY['Parestesia persistente em dermátomo L5'],
   ARRAY['Considerar ressonância de coluna lombar', 'Fisioterapia orientada', 'Reavaliação em 15 dias'])
ON CONFLICT (id) DO NOTHING;
