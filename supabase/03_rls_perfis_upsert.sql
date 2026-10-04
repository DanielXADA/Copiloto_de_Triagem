-- ====================================================================================================
-- MIGRATION: 03_rls_perfis_upsert.sql
-- Objetivo: Liberar permissões de RLS para Auto-Cura e Onboarding (/setup)
--
-- Corrige o erro:
-- "403 Forbidden - new row violates row-level security policy for table perfis"
-- e garante que o usuário consiga fazer INSERT e UPDATE no seu próprio perfil (auth.uid() = id).
-- ====================================================================================================

-- 1. Conceder permissões básicas de schema e tabelas para os roles do Supabase
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------------------------------
-- 2. TABELA: public.perfis
-- ----------------------------------------------------------------------------------------------------
-- Garante que a tabela exista com as colunas essenciais
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome_completo TEXT,
    email TEXT,
    avatar_url TEXT,
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- Garante coluna email caso a tabela já existisse sem ela
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS nome_completo TEXT;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Concede privilégios de acesso
GRANT ALL ON TABLE public.perfis TO authenticated;
GRANT ALL ON TABLE public.perfis TO service_role;
GRANT SELECT ON TABLE public.perfis TO anon;

-- Habilita Row Level Security
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- Limpeza preventiva de políticas antigas em 'perfis'
DO $$
BEGIN
    DROP POLICY IF EXISTS "perfis_select_own_row" ON public.perfis;
    DROP POLICY IF EXISTS "perfis_insert_own_row" ON public.perfis;
    DROP POLICY IF EXISTS "perfis_update_own_row" ON public.perfis;
    DROP POLICY IF EXISTS "perfis_upsert_own_row" ON public.perfis;
    DROP POLICY IF EXISTS "perfis_manage_own_row" ON public.perfis;
    DROP POLICY IF EXISTS "perfis_anon_email_precheck" ON public.perfis;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.perfis;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.perfis;
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.perfis;
END $$;

-- 2.1 Leitura: O próprio usuário pode ler seu perfil
CREATE POLICY "perfis_select_own_row"
ON public.perfis
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 2.2 Inserção: O próprio usuário autenticado pode criar seu perfil (auth.uid() = id)
CREATE POLICY "perfis_insert_own_row"
ON public.perfis
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 2.3 Atualização: O próprio usuário pode atualizar suas informações
CREATE POLICY "perfis_update_own_row"
ON public.perfis
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 2.4 Pre-check anônimo: Permite ao formulário de cadastro checar duplicidade de e-mail
CREATE POLICY "perfis_anon_email_precheck"
ON public.perfis
FOR SELECT
TO anon
USING (true);


-- ----------------------------------------------------------------------------------------------------
-- 3. TABELA: public.perfis_usuarios (se existir no schema)
-- ----------------------------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'perfis_usuarios'
    ) THEN
        -- Conceder permissões
        GRANT ALL ON TABLE public.perfis_usuarios TO authenticated;
        GRANT ALL ON TABLE public.perfis_usuarios TO service_role;
        GRANT SELECT ON TABLE public.perfis_usuarios TO anon;

        ALTER TABLE public.perfis_usuarios ENABLE ROW LEVEL SECURITY;

        -- Remove políticas conflitantes
        DROP POLICY IF EXISTS "perfis_usuarios_select_policy" ON public.perfis_usuarios;
        DROP POLICY IF EXISTS "perfis_usuarios_insert_policy" ON public.perfis_usuarios;
        DROP POLICY IF EXISTS "perfis_usuarios_update_policy" ON public.perfis_usuarios;
        DROP POLICY IF EXISTS "perfis_usuarios_anon_precheck" ON public.perfis_usuarios;
        DROP POLICY IF EXISTS "perfis_usuarios_insert_own_row" ON public.perfis_usuarios;
        DROP POLICY IF EXISTS "perfis_usuarios_update_own_row" ON public.perfis_usuarios;

        -- 3.1 Leitura de perfis
        CREATE POLICY "perfis_usuarios_select_policy"
        ON public.perfis_usuarios
        FOR SELECT
        TO authenticated
        USING (id = auth.uid() OR true);

        -- 3.2 Inserção: O próprio usuário pode inserir seu registro
        CREATE POLICY "perfis_usuarios_insert_policy"
        ON public.perfis_usuarios
        FOR INSERT
        TO authenticated
        WITH CHECK (id = auth.uid());

        -- 3.3 Atualização: O próprio usuário pode atualizar seu registro
        CREATE POLICY "perfis_usuarios_update_policy"
        ON public.perfis_usuarios
        FOR UPDATE
        TO authenticated
        USING (id = auth.uid())
        WITH CHECK (id = auth.uid());

        -- 3.4 Pre-check
        CREATE POLICY "perfis_usuarios_anon_precheck"
        ON public.perfis_usuarios
        FOR SELECT
        TO anon
        USING (true);
    END IF;
END $$;


-- ----------------------------------------------------------------------------------------------------
-- 4. TABELA: public.membros_clinica (garante que o vínculo inicial no /setup seja permitido)
-- ----------------------------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'membros_clinica'
    ) THEN
        GRANT ALL ON TABLE public.membros_clinica TO authenticated;
        GRANT ALL ON TABLE public.membros_clinica TO service_role;

        ALTER TABLE public.membros_clinica ENABLE ROW LEVEL SECURITY;

        -- Garante a política de inserção para o próprio usuário durante o setup
        DROP POLICY IF EXISTS "membros_clinica_insert_own_row" ON public.membros_clinica;
        CREATE POLICY "membros_clinica_insert_own_row"
        ON public.membros_clinica
        FOR INSERT
        TO authenticated
        WITH CHECK (usuario_id = auth.uid());
    END IF;
END $$;

-- ----------------------------------------------------------------------------------------------------
-- 5. TABELA: public.clinicas (garante que a criação da clínica seja permitida para usuários autenticados)
-- ----------------------------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'clinicas'
    ) THEN
        GRANT ALL ON TABLE public.clinicas TO authenticated;
        GRANT ALL ON TABLE public.clinicas TO service_role;

        ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "clinicas_insert_authenticated" ON public.clinicas;
        CREATE POLICY "clinicas_insert_authenticated"
        ON public.clinicas
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
END $$;
