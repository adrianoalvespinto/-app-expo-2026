-- ============================================
-- Migração: Múltiplos Assistentes por Exposição
-- ============================================

-- 1. Criação da tabela de relacionamento muitos-para-muitos
CREATE TABLE IF NOT EXISTS exposicao_assistentes (
  exposicao_id UUID REFERENCES exposicoes(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  PRIMARY KEY(exposicao_id, usuario_id)
);

-- 2. Migrar os dados antigos (caso você já tenha salvo algum assistente)
INSERT INTO exposicao_assistentes (exposicao_id, usuario_id)
SELECT id, assistente_id FROM exposicoes WHERE assistente_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. Remover o campo antigo da tabela
ALTER TABLE exposicoes DROP COLUMN IF EXISTS assistente_id;

-- 4. Habilitar segurança na nova tabela
ALTER TABLE exposicao_assistentes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'exposicao_assistentes' 
        AND policyname = 'auth_all_exp_assistentes'
    ) THEN
        CREATE POLICY "auth_all_exp_assistentes" ON exposicao_assistentes 
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END
$$;
