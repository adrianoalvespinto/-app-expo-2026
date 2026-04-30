-- ── 15. TABELA DE ATIVIDADES COMPLEMENTARES (CURSOS, OFICINAS, ETA) ──

CREATE TABLE IF NOT EXISTS atividades_complementares (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    titulo text NOT NULL,
    tipo text NOT NULL, -- 'Curso', 'Oficina', 'ETA'
    unidade_id uuid REFERENCES unidades(id),
    data_inicio date,
    data_fim date,
    ano integer,
    status text DEFAULT 'Em planejamento',
    publico_estimado integer DEFAULT 0,
    publico_real integer DEFAULT 0,
    valor_estimado numeric DEFAULT 0,
    docente_orientador text,
    carga_horaria text,
    descricao text
);

-- Habilitar RLS
ALTER TABLE atividades_complementares ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso (Todos autenticados podem ver e editar)
CREATE POLICY "auth_all_atividades_comp" ON atividades_complementares 
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Adicionar ao sistema de logs (opcional, mas recomendado)
-- Se quiser que apareça no Log de Atividades, o código já está preparado no JS.
