-- ====================================================================================================
-- SCRIPT DEFINITIVO DE CORREÇÃO DE RLS (ROW LEVEL SECURITY)
-- Tabelas: public.clinicas e public.membros_clinica
-- 
-- MOTIVO DA RECURSÃO INFINITA:
-- O PostgreSQL entrava em loop infinito porque a política de 'clinicas' fazia subquery em 'membros_clinica',
-- e a política de 'membros_clinica' tentava checar 'clinicas' (ou a si mesma) sem proteção de SECURITY DEFINER.
-- Além disso, no momento do /setup, o 'INSERT INTO clinicas ... RETURNING id' tentava validar o SELECT da clínica
-- antes mesmo do usuário ter sido inserido como membro!
--
-- SOLUÇÃO:
-- 1. Remoção dinâmica de todas as políticas anteriores em ambas as tabelas.
-- 2. Criação de funções auxiliares com SECURITY DEFINER (executam com privilégio de sistema e não disparam RLS).
-- 3. Desacoplamento do SELECT e INSERT de 'clinicas' para permitir o Onboarding / Setup sem bloqueios.
-- 4. Proteção rígida de UPDATE e DELETE via validação de cargo (admin_geral / admin_clinica).
-- ====================================================================================================

-- 1. HABILITAR EXTENSÕES REQUERIDAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. REMOVER DINAMICAMENTE TODAS AS POLÍTICAS EXISTENTES DAS DUAS TABELAS
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('clinicas', 'membros_clinica')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 3. GARANTIR QUE RLS ESTÁ HABILITADO
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membros_clinica ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------------------------------
-- 4. FUNÇÕES AUXILIARES COM "SECURITY DEFINER" (PREVINEM RECURSÃO INFINITA NO POSTGRESQL)
-- ----------------------------------------------------------------------------------------------------

-- Retorna os IDs das clínicas das quais o usuário autenticado faz parte
CREATE OR REPLACE FUNCTION public.get_my_clinic_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT clinica_id 
    FROM public.membros_clinica 
    WHERE usuario_id = auth.uid();
$$;

-- Verifica se o usuário autenticado é administrador (admin_geral ou admin_clinica) de uma clínica específica
CREATE OR REPLACE FUNCTION public.is_clinic_admin(p_clinica_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.membros_clinica 
        WHERE clinica_id = p_clinica_id 
          AND usuario_id = auth.uid() 
          AND cargo IN ('admin_geral', 'admin_clinica')
    );
$$;

-- ----------------------------------------------------------------------------------------------------
-- 5. POLÍTICAS DE SEGURANÇA: public.clinicas
-- ----------------------------------------------------------------------------------------------------

-- 5.1. LEITURA (SELECT):
-- Qualquer usuário autenticado pode ler dados básicos das clínicas.
-- Isso é fundamental para evitar recursão e permitir que o /setup receba o 'id' no RETURNING logo após o INSERT.
CREATE POLICY "clinicas_select_policy"
ON public.clinicas
FOR SELECT
TO authenticated
USING (true);

-- 5.2. INSERÇÃO (INSERT):
-- Qualquer usuário autenticado pode criar sua clínica no primeiro acesso (/setup).
CREATE POLICY "clinicas_insert_policy"
ON public.clinicas
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5.3. ATUALIZAÇÃO (UPDATE):
-- Apenas usuários com cargo 'admin_geral' ou 'admin_clinica' vinculados a essa clínica podem alterá-la.
CREATE POLICY "clinicas_update_policy"
ON public.clinicas
FOR UPDATE
TO authenticated
USING (public.is_clinic_admin(id))
WITH CHECK (public.is_clinic_admin(id));

-- 5.4. EXCLUSÃO (DELETE):
-- Apenas administradores da clínica podem excluí-la.
CREATE POLICY "clinicas_delete_policy"
ON public.clinicas
FOR DELETE
TO authenticated
USING (public.is_clinic_admin(id));

-- ----------------------------------------------------------------------------------------------------
-- 6. POLÍTICAS DE SEGURANÇA: public.membros_clinica
-- ----------------------------------------------------------------------------------------------------

-- 6.1. LEITURA (SELECT):
-- O usuário pode ver o seu próprio vínculo OU os colegas de equipe das clínicas onde atua.
CREATE POLICY "membros_clinica_select_policy"
ON public.membros_clinica
FOR SELECT
TO authenticated
USING (
    usuario_id = auth.uid()
    OR
    clinica_id IN (SELECT public.get_my_clinic_ids())
);

-- 6.2. INSERÇÃO (INSERT):
-- Permite que o próprio usuário se vincule (no primeiro acesso /setup)
-- OU que um administrador da clínica convide/vincule novos profissionais.
CREATE POLICY "membros_clinica_insert_policy"
ON public.membros_clinica
FOR INSERT
TO authenticated
WITH CHECK (
    usuario_id = auth.uid()
    OR
    public.is_clinic_admin(clinica_id)
);

-- 6.3. ATUALIZAÇÃO (UPDATE):
-- Apenas administradores da clínica podem alterar cargos de membros.
CREATE POLICY "membros_clinica_update_policy"
ON public.membros_clinica
FOR UPDATE
TO authenticated
USING (public.is_clinic_admin(clinica_id))
WITH CHECK (public.is_clinic_admin(clinica_id));

-- 6.4. EXCLUSÃO (DELETE):
-- Apenas administradores da clínica podem remover membros, ou o próprio usuário pode se desvincular.
CREATE POLICY "membros_clinica_delete_policy"
ON public.membros_clinica
FOR DELETE
TO authenticated
USING (
    public.is_clinic_admin(clinica_id)
    OR
    usuario_id = auth.uid()
);
