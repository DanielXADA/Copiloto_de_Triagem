-- ==============================================================================
-- Políticas de Segurança (Row Level Security - RLS) para a tabela public.perfis
-- ==============================================================================
-- Permite que usuários autenticados visualizem, atualizem e criem exclusivamente
-- o seu próprio perfil associado ao seu ID do Supabase Auth (auth.uid()).

-- 1. Garante que o RLS está habilitado na tabela
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- 2. Remove políticas anteriores com os mesmos nomes (caso já existam)
DROP POLICY IF EXISTS "perfis_select_own_row" ON public.perfis;
DROP POLICY IF EXISTS "perfis_update_own_row" ON public.perfis;
DROP POLICY IF EXISTS "perfis_insert_own_row" ON public.perfis;

-- 3. Política de SELECT: O usuário só pode consultar o seu próprio registro
CREATE POLICY "perfis_select_own_row"
ON public.perfis
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 4. Política de UPDATE: O usuário só pode alterar o seu próprio registro
CREATE POLICY "perfis_update_own_row"
ON public.perfis
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. Política de INSERT: Permite criar o próprio registro inicial caso ainda não exista
CREATE POLICY "perfis_insert_own_row"
ON public.perfis
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);
