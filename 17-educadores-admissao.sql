-- Adicionar campo de data de admissão para cálculo de tempo de casa
ALTER TABLE educadores ADD COLUMN IF NOT EXISTS data_admissao date;
