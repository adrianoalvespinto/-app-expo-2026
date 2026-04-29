-- Adição de colunas de características da exposição no banco de dados

ALTER TABLE exposicoes
  ADD COLUMN IF NOT EXISTS is_internacional boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_itinerancia boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_inedita boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_monografica boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS parceria text;
