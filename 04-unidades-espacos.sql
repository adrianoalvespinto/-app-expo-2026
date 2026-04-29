-- ============================================
-- SQL: Expansão de Unidades e Espaços
-- Rodar no SQL Editor do Supabase
-- ============================================

-- 1. Adicionar campos à tabela unidades
ALTER TABLE unidades
  ADD COLUMN IF NOT EXISTS capital_interior    text,
  ADD COLUMN IF NOT EXISTS gerente             text,
  ADD COLUMN IF NOT EXISTS gerente_adjunto     text,
  ADD COLUMN IF NOT EXISTS coord_programacao   text,
  ADD COLUMN IF NOT EXISTS supervisor_artistico text,
  ADD COLUMN IF NOT EXISTS tecnico_artes       text,
  ADD COLUMN IF NOT EXISTS tecnico_educativo   text;

-- 2. Criar tabela de espaços por unidade
CREATE TABLE IF NOT EXISTS unidade_espacos (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  unidade_id  uuid REFERENCES unidades(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  metragem    numeric,
  created_at  timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE unidade_espacos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON unidade_espacos FOR ALL USING (true) WITH CHECK (true);

-- 3. Adicionar espaco_id na exposicoes
ALTER TABLE exposicoes
  ADD COLUMN IF NOT EXISTS espaco_id uuid REFERENCES unidade_espacos(id) ON DELETE SET NULL;
