-- Tabela de Avaliações de Visitas Mediadas (Baseada no Microsoft Forms)
CREATE TABLE IF NOT EXISTS visitas_mediadas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  unidade_id uuid REFERENCES unidades(id) ON DELETE CASCADE,
  exposicao_id uuid REFERENCES exposicoes(id) ON DELETE SET NULL,
  nota_experiencia integer CHECK (nota_experiencia BETWEEN 1 AND 5),
  nota_relevancia integer CHECK (nota_relevancia BETWEEN 1 AND 5),
  fez_atividades_sala boolean DEFAULT false,
  qtd_alunos_sala integer DEFAULT 0,
  fez_atividades_outros boolean DEFAULT false,
  qtd_alunos_outros integer DEFAULT 0,
  compartilhou_professores boolean DEFAULT false,
  qtd_professores_impactados integer DEFAULT 0,
  recebeu_material boolean DEFAULT false,
  utilizou_material boolean DEFAULT false,
  comentarios text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE visitas_mediadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visitas_select" ON visitas_mediadas FOR SELECT TO authenticated USING (true);
CREATE POLICY "visitas_insert" ON visitas_mediadas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "visitas_update" ON visitas_mediadas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "visitas_delete" ON visitas_mediadas FOR DELETE TO authenticated USING (true);
