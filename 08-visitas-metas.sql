-- ==============================================================================
-- MIGRAÇÃO 08: DETALHAMENTO DE VISITAS E METAS
-- Substitui a antiga coluna "visitacao" por um painel estatístico completo
-- ==============================================================================

-- 1. Adicionar os 4 novos campos de controle numérico (metas e reais)
ALTER TABLE public.exposicoes 
ADD COLUMN IF NOT EXISTS visitas_expo_meta integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS visitas_expo_estatistico integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS visitas_mediadas_meta integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS visitas_mediadas_estatistico integer DEFAULT 0;

-- 2. Migrar dados antigos: se a coluna "visitacao" existir e tiver valores, mover para "visitas_expo_estatistico"
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='exposicoes' AND column_name='visitacao'
    ) THEN
        UPDATE public.exposicoes
        SET visitas_expo_estatistico = visitacao
        WHERE visitacao IS NOT NULL AND visitacao > 0;
    END IF;
END
$$;

-- 3. Nota de Governança
COMMENT ON COLUMN public.exposicoes.visitas_expo_meta IS 'Meta de público esperada para visitações livres na exposição';
COMMENT ON COLUMN public.exposicoes.visitas_expo_estatistico IS 'Público final apurado em visitas livres na exposição (substituto da visitacao)';
COMMENT ON COLUMN public.exposicoes.visitas_mediadas_meta IS 'Meta de público aguardada em visitas guiadas/mediadas';
COMMENT ON COLUMN public.exposicoes.visitas_mediadas_estatistico IS 'Público apurado em visitas guiadas/mediadas reais';

-- OBSERVAÇÃO: A coluna "visitacao" pode ser removida DEPOIS que a migração estiver totalmente testada e validada.
-- Para deletar no futuro: ALTER TABLE public.exposicoes DROP COLUMN visitacao;
