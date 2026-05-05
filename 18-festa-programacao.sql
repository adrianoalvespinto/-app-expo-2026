-- Tabela para Programação do FestA!
CREATE TABLE IF NOT EXISTS festa_programacao (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ano integer NOT NULL,
  unidade_id uuid REFERENCES unidades(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  data_hora timestamptz,
  descricao text,
  educador_id uuid REFERENCES educadores(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE festa_programacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "festa_select" ON festa_programacao FOR SELECT TO authenticated USING (true);
CREATE POLICY "festa_insert" ON festa_programacao FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "festa_update" ON festa_programacao FOR UPDATE TO authenticated USING (true);
CREATE POLICY "festa_delete" ON festa_programacao FOR DELETE TO authenticated USING (true);
