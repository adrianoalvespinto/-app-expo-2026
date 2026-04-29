-- Adicionando coluna valor_pre_producao na tabela de exposições
ALTER TABLE exposicoes
  ADD COLUMN IF NOT EXISTS valor_pre_producao numeric;
