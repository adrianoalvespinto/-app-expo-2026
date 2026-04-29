-- Adicionando coluna imagem_url na tabela de exposições
ALTER TABLE exposicoes
  ADD COLUMN IF NOT EXISTS imagem_url text;
