-- ============================================
-- SQL: Converter 'funcao' para array de funções
-- Rodar UMA vez no SQL Editor do Supabase
-- ============================================

-- Passo 1: Adicionar coluna temporária
ALTER TABLE colaboradores ADD COLUMN funcoes text[];

-- Passo 2: Migrar dados existentes (texto → array de 1 item)
UPDATE colaboradores
  SET funcoes = ARRAY[funcao]
  WHERE funcao IS NOT NULL AND funcao <> '';

-- Passo 3: Remover coluna antiga
ALTER TABLE colaboradores DROP COLUMN funcao;

-- Passo 4: Renomear nova coluna
ALTER TABLE colaboradores RENAME COLUMN funcoes TO funcao;
