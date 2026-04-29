-- 05-unidades-premium.sql
-- Adiciona campos para visitação e repositório de arquivos

-- 1. Adicionar campo de visitação na tabela de exposições
ALTER TABLE IF EXISTS public.exposicoes
ADD COLUMN IF NOT EXISTS visitacao integer DEFAULT 0;

-- 2. Adicionar campo de repositório (JSONB) na tabela de unidades
-- Isso permitirá armazenar uma lista de objetos: { "titulo": "...", "url": "..." }
ALTER TABLE IF EXISTS public.unidades
ADD COLUMN IF NOT EXISTS repositorio jsonb DEFAULT '[]';

-- 3. Comentários para documentação
COMMENT ON COLUMN public.exposicoes.visitacao IS 'Número total de visitantes da exposição';
COMMENT ON COLUMN public.unidades.repositorio IS 'Lista de links para imagens, plantas e documentos da unidade';
