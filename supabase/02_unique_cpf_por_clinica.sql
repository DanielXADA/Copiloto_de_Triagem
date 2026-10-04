-- ====================================================================================================
-- MIGRATION: Restrição de Unicidade de CPF por Clínica (Multi-Tenant) & Auto-Cura de Perfis
-- Arquivo: supabase/02_unique_cpf_por_clinica.sql
-- 
-- Regra de Negócio:
-- 1. O CPF do paciente NÃO pode se repetir dentro da mesma clínica (clinica_id),
--    porém o mesmo CPF pode existir cadastrado em clínicas diferentes.
-- 2. Garantir coluna email e políticas de auto-cura na tabela perfis para evitar
--    erro de Foreign Key (membros_clinica_usuario_id_fkey) no /setup.
-- 3. Permitir Pre-check de e-mail no login/cadastro para evitar mensagens falsas de sucesso.
-- ====================================================================================================

-- 1. Deduplicação preventiva:
-- Caso existam registros duplicados pré-existentes para o mesmo (clinica_id, cpf),
-- preserva o registro mais recente e remove os mais antigos.
DELETE FROM public.pacientes a
USING public.pacientes b
WHERE a.id < b.id
  AND a.clinica_id = b.clinica_id
  AND a.cpf = b.cpf;

-- 2. Adicionar a UNIQUE CONSTRAINT na tabela pacientes combinando clinica_id e cpf de forma idempotente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_pacientes_clinica_cpf'
    ) THEN
        ALTER TABLE public.pacientes
        ADD CONSTRAINT uq_pacientes_clinica_cpf UNIQUE (clinica_id, cpf);
    END IF;
END $$;

-- 3. Criar índice composto explícito para otimização de performance nas consultas
CREATE UNIQUE INDEX IF NOT EXISTS idx_pacientes_unique_clinica_cpf
ON public.pacientes (clinica_id, cpf);

COMMENT ON CONSTRAINT uq_pacientes_clinica_cpf ON public.pacientes
IS 'Garante unicidade do CPF por clínica no ambiente Multi-Tenant. O mesmo CPF pode existir em clínicas distintas.';

-- 4. Garantir que a tabela perfis possua a coluna email para o Pre-check
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_perfis_email ON public.perfis (email);

-- 5. Garantir políticas de RLS e permissões na tabela perfis para suportar Auto-cura e Pre-check
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "perfis_select_own_row" ON public.perfis;
    DROP POLICY IF EXISTS "perfis_update_own_row" ON public.perfis;
    DROP POLICY IF EXISTS "perfis_insert_own_row" ON public.perfis;
    DROP POLICY IF EXISTS "perfis_anon_email_precheck" ON public.perfis;

    -- Permite ao usuário autenticado gerenciar seu perfil (idêntico ao auth.uid())
    CREATE POLICY "perfis_select_own_row" ON public.perfis FOR SELECT TO authenticated USING (auth.uid() = id);
    CREATE POLICY "perfis_insert_own_row" ON public.perfis FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
    CREATE POLICY "perfis_update_own_row" ON public.perfis FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

    -- Permite ao formulário de cadastro checar duplicidade de e-mail (Pre-check)
    CREATE POLICY "perfis_anon_email_precheck" ON public.perfis FOR SELECT TO anon USING (true);
END $$;

-- 6. Pre-check também na tabela perfis_usuarios caso seja utilizada
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'perfis_usuarios') THEN
        DROP POLICY IF EXISTS "perfis_usuarios_anon_precheck" ON public.perfis_usuarios;
        CREATE POLICY "perfis_usuarios_anon_precheck" ON public.perfis_usuarios FOR SELECT TO anon USING (true);
    END IF;
END $$;
