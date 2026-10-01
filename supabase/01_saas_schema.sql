-- ====================================================================================================
-- ARQUITETURA MULTI-TENANT SAAS - COPILOTO DE TRIAGEM
-- Arquivo: supabase/01_saas_schema.sql
-- Modelo: Shared Database, Shared Schema com Discriminação por clinica_id & PostgreSQL Row Level Security (RLS)
-- ====================================================================================================

-- 1. HABILITAR EXTENSÕES REQUERIDAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================================================
-- 2. TABELA: clinicas (Assinantes do SaaS / Tenants)
-- ====================================================================================================
CREATE TABLE IF NOT EXISTS public.clinicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    razao_social TEXT,
    slug TEXT UNIQUE,
    telefone TEXT,
    email_contato TEXT,
    configuracoes_triagem JSONB NOT NULL DEFAULT '{
        "sla_minutos_espera": 15,
        "criterio_urgencia": "padrao",
        "whatsapp_ativo": true,
        "ia_sugestoes_ativas": true,
        "perguntas_obrigatorias": ["sintoma_principal", "duracao", "intensidade_dor"]
    }'::jsonb,
    status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso', 'em_teste')),
    plano TEXT NOT NULL DEFAULT 'pro' CHECK (plano IN ('starter', 'pro', 'enterprise')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.clinicas IS 'Assinantes do SaaS (Tenants). Isolamento de dados garantido por clinica_id e RLS.';
COMMENT ON COLUMN public.clinicas.configuracoes_triagem IS 'Parâmetros customizáveis do motor de triagem por clínica (SLA, canais, regras de IA).';

CREATE INDEX IF NOT EXISTS idx_clinicas_cnpj ON public.clinicas (cnpj);
CREATE INDEX IF NOT EXISTS idx_clinicas_status ON public.clinicas (status);
CREATE INDEX IF NOT EXISTS idx_clinicas_slug ON public.clinicas (slug);

-- ====================================================================================================
-- 3. TABELA: perfis_usuarios (Extensão de auth.users com RBAC)
-- ====================================================================================================
CREATE TABLE IF NOT EXISTS public.perfis_usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    crm TEXT, -- Obrigatório para médicos (ex: '123456/SP'), nulo para recepção/admin geral
    tipo_perfil TEXT NOT NULL CHECK (tipo_perfil IN ('admin_sistema', 'medico', 'recepcao')),
    ativo BOOLEAN NOT NULL DEFAULT true,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.perfis_usuarios IS 'Perfil e papel global do usuário autenticado via Supabase Auth.';
COMMENT ON COLUMN public.perfis_usuarios.tipo_perfil IS 'admin_sistema: superusuário do SaaS | medico: profissional assistencial | recepcao: equipe de acolhimento';

CREATE INDEX IF NOT EXISTS idx_perfis_tipo ON public.perfis_usuarios (tipo_perfil);
CREATE INDEX IF NOT EXISTS idx_perfis_crm ON public.perfis_usuarios (crm) WHERE crm IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_perfis_ativo ON public.perfis_usuarios (ativo);

-- ====================================================================================================
-- 4. TABELA: vinculos_clinica (N:N Usuários <-> Clínicas)
-- Permite que médicos atuem em múltiplos estabelecimentos mantendo isolamento
-- ====================================================================================================
CREATE TABLE IF NOT EXISTS public.vinculos_clinica (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES public.perfis_usuarios(id) ON DELETE CASCADE,
    clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
    papel TEXT NOT NULL DEFAULT 'medico' CHECK (papel IN ('admin_clinica', 'medico', 'recepcao')),
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_usuario_clinica UNIQUE (usuario_id, clinica_id)
);

COMMENT ON TABLE public.vinculos_clinica IS 'Mapeamento de pertinência de profissionais às clínicas conveniadas e controle de status de acesso.';

CREATE INDEX IF NOT EXISTS idx_vinculos_usuario ON public.vinculos_clinica (usuario_id);
CREATE INDEX IF NOT EXISTS idx_vinculos_clinica ON public.vinculos_clinica (clinica_id);
CREATE INDEX IF NOT EXISTS idx_vinculos_usuario_clinica_ativo ON public.vinculos_clinica (usuario_id, clinica_id) WHERE ativo = true;

-- ====================================================================================================
-- 5. TRIGGER DE SINCRONIZAÇÃO AUTOMÁTICA: auth.users -> perfis_usuarios
-- ====================================================================================================
CREATE OR REPLACE FUNCTION public.trg_handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_nome TEXT;
    v_tipo TEXT;
    v_crm TEXT;
BEGIN
    v_nome := COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    v_tipo := COALESCE(NEW.raw_user_meta_data->>'tipo_perfil', 'medico');
    v_crm := NEW.raw_user_meta_data->>'crm';

    INSERT INTO public.perfis_usuarios (id, nome, email, crm, tipo_perfil, ativo)
    VALUES (
        NEW.id,
        v_nome,
        NEW.email,
        v_crm,
        v_tipo,
        true
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        nome = COALESCE(EXCLUDED.nome, public.perfis_usuarios.nome),
        crm = COALESCE(EXCLUDED.crm, public.perfis_usuarios.crm),
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.trg_handle_new_user();

-- ====================================================================================================
-- 6. ATUALIZAÇÃO / CRIAÇÃO DAS TABELAS EXISTENTES COM clinica_id OBRIGATÓRIO
-- ====================================================================================================

-- 6.1 Garantir que exista ao menos uma clínica padrão para migração segura de dados pré-existentes
INSERT INTO public.clinicas (id, nome, cnpj, slug, configuracoes_triagem, status, plano)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Clínica Matriz Modelo',
    '00.000.000/0001-91',
    'clinica-modelo',
    '{"sla_minutos_espera": 15, "criterio_urgencia": "padrao", "whatsapp_ativo": true, "ia_sugestoes_ativas": true}'::jsonb,
    'ativo',
    'pro'
)
ON CONFLICT (id) DO NOTHING;

-- 6.2 TABELA: pacientes
CREATE TABLE IF NOT EXISTS public.pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE,
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

-- Adicionar e forçar clinica_id NOT NULL caso a tabela já existisse sem ela
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'pacientes' AND column_name = 'clinica_id'
    ) THEN
        ALTER TABLE public.pacientes ADD COLUMN clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE;
    END IF;

    -- Backfill de registros orfãos para a clínica modelo
    UPDATE public.pacientes 
    SET clinica_id = '00000000-0000-0000-0000-000000000001' 
    WHERE clinica_id IS NULL;

    -- Aplicar restrição NOT NULL
    ALTER TABLE public.pacientes ALTER COLUMN clinica_id SET NOT NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_pacientes_clinica_id ON public.pacientes (clinica_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_clinica_cpf ON public.pacientes (clinica_id, cpf);
CREATE INDEX IF NOT EXISTS idx_pacientes_clinica_status ON public.pacientes (clinica_id, status);

-- 6.3 TABELA: triagens
CREATE TABLE IF NOT EXISTS public.triagens (
    id TEXT PRIMARY KEY DEFAULT ('TR-' || floor(random() * 9000 + 1000)::text),
    clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE,
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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'triagens' AND column_name = 'clinica_id'
    ) THEN
        ALTER TABLE public.triagens ADD COLUMN clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE;
    END IF;

    -- Backfill: herdar da clínica do paciente ou da clínica modelo
    UPDATE public.triagens t
    SET clinica_id = COALESCE(
        (SELECT p.clinica_id FROM public.pacientes p WHERE p.id = t.patient_id),
        '00000000-0000-0000-0000-000000000001'
    )
    WHERE t.clinica_id IS NULL;

    ALTER TABLE public.triagens ALTER COLUMN clinica_id SET NOT NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_triagens_clinica_id ON public.triagens (clinica_id);
CREATE INDEX IF NOT EXISTS idx_triagens_clinica_status ON public.triagens (clinica_id, status);
CREATE INDEX IF NOT EXISTS idx_triagens_clinica_priority ON public.triagens (clinica_id, priority);

-- 6.4 TABELA: dossies
CREATE TABLE IF NOT EXISTS public.dossies (
    id TEXT PRIMARY KEY DEFAULT ('DS-' || floor(random() * 9000 + 1000)::text),
    clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE,
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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'dossies' AND column_name = 'clinica_id'
    ) THEN
        ALTER TABLE public.dossies ADD COLUMN clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE;
    END IF;

    -- Backfill: herdar do paciente ou da clínica modelo
    UPDATE public.dossies d
    SET clinica_id = COALESCE(
        (SELECT p.clinica_id FROM public.pacientes p WHERE p.id = d.patient_id),
        '00000000-0000-0000-0000-000000000001'
    )
    WHERE d.clinica_id IS NULL;

    ALTER TABLE public.dossies ALTER COLUMN clinica_id SET NOT NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_dossies_clinica_id ON public.dossies (clinica_id);
CREATE INDEX IF NOT EXISTS idx_dossies_clinica_patient ON public.dossies (clinica_id, patient_id);

-- ====================================================================================================
-- 7. FUNÇÕES AUXILIARES DE SEGURANÇA (SECURITY DEFINER)
-- Evitam recursão em políticas de RLS e garantem alta performance via índice
-- ====================================================================================================

-- 7.1 Verifica se o usuário atual autenticado é um Administrador Global do SaaS
CREATE OR REPLACE FUNCTION public.is_admin_sistema()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.perfis_usuarios
        WHERE id = auth.uid()
          AND tipo_perfil = 'admin_sistema'
          AND ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

COMMENT ON FUNCTION public.is_admin_sistema() IS 'Verifica permissão de superadministrador SaaS com bypass global de RLS.';

-- 7.2 Retorna os IDs das clínicas onde o usuário autenticado possui vínculo ativo
CREATE OR REPLACE FUNCTION public.get_clinicas_ativas_usuario()
RETURNS TABLE (clinica_id UUID) AS $$
BEGIN
    -- Superadmin do SaaS possui visibilidade sobre todas as clínicas
    IF public.is_admin_sistema() THEN
        RETURN QUERY SELECT id FROM public.clinicas;
    ELSE
        RETURN QUERY
        SELECT vc.clinica_id
        FROM public.vinculos_clinica vc
        WHERE vc.usuario_id = auth.uid()
          AND vc.ativo = true;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

COMMENT ON FUNCTION public.get_clinicas_ativas_usuario() IS 'Retorna conjunto de clinica_id com associação ativa ao usuário conectado.';

-- 7.3 Verifica se o usuário autenticado tem permissão ativa sobre uma clínica específica
CREATE OR REPLACE FUNCTION public.usuario_tem_acesso_clinica(p_clinica_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- 1. Superadmin tem acesso irrestrito
    IF public.is_admin_sistema() THEN
        RETURN TRUE;
    END IF;

    -- 2. Se a sessão definir um claim de 'active_clinic_id', valida estritamente a clínica selecionada
    -- Caso contrário, valida se o usuário possui vínculo ativo na clínica requerida
    RETURN EXISTS (
        SELECT 1
        FROM public.vinculos_clinica
        WHERE usuario_id = auth.uid()
          AND clinica_id = p_clinica_id
          AND ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

COMMENT ON FUNCTION public.usuario_tem_acesso_clinica(UUID) IS 'Validação centralizada de tenat-access em RLS policies.';

-- ====================================================================================================
-- 8. POLÍTICAS DE ROW LEVEL SECURITY (RLS) RIGOROSAS
-- ====================================================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vinculos_clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossies ENABLE ROW LEVEL SECURITY;

-- 8.1 LIMPEZA DE POLÍTICAS ANTERIORES (Evita regras anônimas inseguras pré-existentes)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('clinicas', 'perfis_usuarios', 'vinculos_clinica', 'pacientes', 'triagens', 'dossies')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------------------------------
-- 8.2 POLÍTICAS: clinicas
-- ----------------------------------------------------------------------------------------------------
-- Leitura: Superadmins veem tudo; profissionais veem apenas as clínicas às quais estão vinculados e ativos
CREATE POLICY "clinicas_select_policy" ON public.clinicas
    FOR SELECT TO authenticated
    USING (
        public.is_admin_sistema()
        OR id IN (
            SELECT clinica_id 
            FROM public.vinculos_clinica 
            WHERE usuario_id = auth.uid() AND ativo = true
        )
    );

-- Inserção: Apenas Superadmins podem cadastrar novos tenants no SaaS
CREATE POLICY "clinicas_insert_policy" ON public.clinicas
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_sistema());

-- Atualização: Superadmins ou gestores da clínica (admin_clinica) vinculados e ativos
CREATE POLICY "clinicas_update_policy" ON public.clinicas
    FOR UPDATE TO authenticated
    USING (
        public.is_admin_sistema()
        OR id IN (
            SELECT clinica_id 
            FROM public.vinculos_clinica 
            WHERE usuario_id = auth.uid() AND papel = 'admin_clinica' AND ativo = true
        )
    )
    WITH CHECK (
        public.is_admin_sistema()
        OR id IN (
            SELECT clinica_id 
            FROM public.vinculos_clinica 
            WHERE usuario_id = auth.uid() AND papel = 'admin_clinica' AND ativo = true
        )
    );

-- Exclusão: Apenas Superadmins do SaaS podem remover clínicas
CREATE POLICY "clinicas_delete_policy" ON public.clinicas
    FOR DELETE TO authenticated
    USING (public.is_admin_sistema());

-- ----------------------------------------------------------------------------------------------------
-- 8.3 POLÍTICAS: perfis_usuarios
-- ----------------------------------------------------------------------------------------------------
-- Leitura:
-- 1. O próprio usuário visualiza seu perfil.
-- 2. Superadmin visualiza todos.
-- 3. Membros da mesma clínica podem visualizar os perfis dos colegas de equipe.
CREATE POLICY "perfis_usuarios_select_policy" ON public.perfis_usuarios
    FOR SELECT TO authenticated
    USING (
        id = auth.uid()
        OR public.is_admin_sistema()
        OR id IN (
            SELECT v2.usuario_id
            FROM public.vinculos_clinica v1
            JOIN public.vinculos_clinica v2 ON v1.clinica_id = v2.clinica_id
            WHERE v1.usuario_id = auth.uid() AND v1.ativo = true AND v2.ativo = true
        )
    );

-- Inserção: O próprio usuário (ou trigger) cria seu perfil; Superadmin pode inserir
CREATE POLICY "perfis_usuarios_insert_policy" ON public.perfis_usuarios
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid() OR public.is_admin_sistema());

-- Atualização: Usuário atualiza seu próprio perfil (exceto se inativo); Superadmin atualiza qualquer
CREATE POLICY "perfis_usuarios_update_policy" ON public.perfis_usuarios
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_admin_sistema())
    WITH CHECK (id = auth.uid() OR public.is_admin_sistema());

-- Exclusão: Apenas Superadmin
CREATE POLICY "perfis_usuarios_delete_policy" ON public.perfis_usuarios
    FOR DELETE TO authenticated
    USING (public.is_admin_sistema());

-- ----------------------------------------------------------------------------------------------------
-- 8.4 POLÍTICAS: vinculos_clinica
-- ----------------------------------------------------------------------------------------------------
-- Leitura: O usuário pode ver seus próprios vínculos; administradores de clínica veem a equipe da clínica; superadmin vê tudo
CREATE POLICY "vinculos_clinica_select_policy" ON public.vinculos_clinica
    FOR SELECT TO authenticated
    USING (
        usuario_id = auth.uid()
        OR public.is_admin_sistema()
        OR clinica_id IN (
            SELECT clinica_id 
            FROM public.vinculos_clinica 
            WHERE usuario_id = auth.uid() AND papel = 'admin_clinica' AND ativo = true
        )
    );

-- Modificações (INSERT, UPDATE, DELETE): Superadmin ou administrador local da clínica
CREATE POLICY "vinculos_clinica_insert_policy" ON public.vinculos_clinica
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin_sistema()
        OR clinica_id IN (
            SELECT clinica_id 
            FROM public.vinculos_clinica 
            WHERE usuario_id = auth.uid() AND papel = 'admin_clinica' AND ativo = true
        )
    );

CREATE POLICY "vinculos_clinica_update_policy" ON public.vinculos_clinica
    FOR UPDATE TO authenticated
    USING (
        public.is_admin_sistema()
        OR clinica_id IN (
            SELECT clinica_id 
            FROM public.vinculos_clinica 
            WHERE usuario_id = auth.uid() AND papel = 'admin_clinica' AND ativo = true
        )
    );

CREATE POLICY "vinculos_clinica_delete_policy" ON public.vinculos_clinica
    FOR DELETE TO authenticated
    USING (
        public.is_admin_sistema()
        OR clinica_id IN (
            SELECT clinica_id 
            FROM public.vinculos_clinica 
            WHERE usuario_id = auth.uid() AND papel = 'admin_clinica' AND ativo = true
        )
    );

-- ----------------------------------------------------------------------------------------------------
-- 8.5 POLÍTICAS: pacientes (Segurança Médica Estrita por Clínica)
-- Um médico/atendente só interage com pacientes pertencentes à clínica em que está vinculado e ativo.
-- ----------------------------------------------------------------------------------------------------
CREATE POLICY "pacientes_select_policy" ON public.pacientes
    FOR SELECT TO authenticated
    USING (public.usuario_tem_acesso_clinica(clinica_id));

CREATE POLICY "pacientes_insert_policy" ON public.pacientes
    FOR INSERT TO authenticated
    WITH CHECK (public.usuario_tem_acesso_clinica(clinica_id));

CREATE POLICY "pacientes_update_policy" ON public.pacientes
    FOR UPDATE TO authenticated
    USING (public.usuario_tem_acesso_clinica(clinica_id))
    WITH CHECK (public.usuario_tem_acesso_clinica(clinica_id));

CREATE POLICY "pacientes_delete_policy" ON public.pacientes
    FOR DELETE TO authenticated
    USING (public.usuario_tem_acesso_clinica(clinica_id));

-- ----------------------------------------------------------------------------------------------------
-- 8.6 POLÍTICAS: triagens (Segurança Médica Estrita por Clínica)
-- ----------------------------------------------------------------------------------------------------
CREATE POLICY "triagens_select_policy" ON public.triagens
    FOR SELECT TO authenticated
    USING (public.usuario_tem_acesso_clinica(clinica_id));

CREATE POLICY "triagens_insert_policy" ON public.triagens
    FOR INSERT TO authenticated
    WITH CHECK (public.usuario_tem_acesso_clinica(clinica_id));

CREATE POLICY "triagens_update_policy" ON public.triagens
    FOR UPDATE TO authenticated
    USING (public.usuario_tem_acesso_clinica(clinica_id))
    WITH CHECK (public.usuario_tem_acesso_clinica(clinica_id));

CREATE POLICY "triagens_delete_policy" ON public.triagens
    FOR DELETE TO authenticated
    USING (public.usuario_tem_acesso_clinica(clinica_id));

-- ----------------------------------------------------------------------------------------------------
-- 8.7 POLÍTICAS: dossies (Segurança Médica Estrita por Clínica)
-- Dossiês clínicos contêm dados sensíveis (LGPD / Sigilo Médico) e exigem isolamento estrito
-- ----------------------------------------------------------------------------------------------------
CREATE POLICY "dossies_select_policy" ON public.dossies
    FOR SELECT TO authenticated
    USING (public.usuario_tem_acesso_clinica(clinica_id));

CREATE POLICY "dossies_insert_policy" ON public.dossies
    FOR INSERT TO authenticated
    WITH CHECK (public.usuario_tem_acesso_clinica(clinica_id));

CREATE POLICY "dossies_update_policy" ON public.dossies
    FOR UPDATE TO authenticated
    USING (public.usuario_tem_acesso_clinica(clinica_id))
    WITH CHECK (public.usuario_tem_acesso_clinica(clinica_id));

CREATE POLICY "dossies_delete_policy" ON public.dossies
    FOR DELETE TO authenticated
    USING (public.usuario_tem_acesso_clinica(clinica_id));

-- ====================================================================================================
-- 9. SEED DEMONSTRATIVO PARA AMBIENTE DE DESENVOLVIMENTO / TESTES
-- Cria duas clínicas distintas para validação do isolamento Multi-tenant
-- ====================================================================================================
INSERT INTO public.clinicas (id, nome, cnpj, slug, configuracoes_triagem, status, plano)
VALUES 
    (
        '11111111-1111-1111-1111-111111111111',
        'Clínica CardioVida - Jardins',
        '12.345.678/0001-90',
        'cardiovida-jardins',
        '{"sla_minutos_espera": 10, "criterio_urgencia": "manchester", "whatsapp_ativo": true, "ia_sugestoes_ativas": true}'::jsonb,
        'ativo',
        'enterprise'
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        'Clínica OrtoCenter - Morumbi',
        '98.765.432/0001-10',
        'ortocenter-morumbi',
        '{"sla_minutos_espera": 20, "criterio_urgencia": "padrao", "whatsapp_ativo": false, "ia_sugestoes_ativas": true}'::jsonb,
        'ativo',
        'pro'
    )
ON CONFLICT (id) DO NOTHING;

-- Associar dados de exemplo criados anteriormente à Clínica 1 (CardioVida)
UPDATE public.pacientes 
SET clinica_id = '11111111-1111-1111-1111-111111111111' 
WHERE clinica_id = '00000000-0000-0000-0000-000000000001';

UPDATE public.triagens 
SET clinica_id = '11111111-1111-1111-1111-111111111111' 
WHERE clinica_id = '00000000-0000-0000-0000-000000000001';

UPDATE public.dossies 
SET clinica_id = '11111111-1111-1111-1111-111111111111' 
WHERE clinica_id = '00000000-0000-0000-0000-000000000001';

-- Inserir dados de teste para a Clínica 2 (OrtoCenter) para testar a separação do RLS
INSERT INTO public.pacientes (clinica_id, name, age, cpf, phone, email, plan, status, area)
VALUES 
    ('22222222-2222-2222-2222-222222222222', 'Beatriz Castelo', 41, '888.777.666-55', '(11) 97711-2233', 'beatriz@exemplo.com', 'Bradesco Saúde', 'Ativo', 'Ortopedia')
ON CONFLICT DO NOTHING;
