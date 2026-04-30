-- ── 16. GESTÃO DE EDUCADORES E ESPAÇOS PARA CURSOS ──

-- Tabela de Educadores (Funcionários Fixos)
CREATE TABLE IF NOT EXISTS educadores (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    nome text NOT NULL,
    especialidade text,
    unidade_id uuid REFERENCES unidades(id), -- Unidade fixa atual
    historico_unidades text, -- Texto livre sobre por onde passou
    email text,
    ativo boolean DEFAULT true
);

-- Tabela de ligação (Muitos educadores para muitos cursos)
CREATE TABLE IF NOT EXISTS atividade_educadores (
    atividade_id uuid REFERENCES atividades_complementares(id) ON DELETE CASCADE,
    educador_id uuid REFERENCES educadores(id) ON DELETE CASCADE,
    PRIMARY KEY (atividade_id, educador_id)
);

-- Habilitar RLS
ALTER TABLE educadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividade_educadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_educadores" ON educadores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_atv_educ" ON atividade_educadores FOR ALL TO authenticated USING (true) WITH CHECK (true);
