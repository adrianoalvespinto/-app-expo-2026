-- ==============================================================================
-- MIGRAÇÃO 09: CAMPOS DE EQUIPE EDUCATIVA POR EXPOSIÇÃO
-- Adiciona suporte ao registro numérico da equipe educativa em cada exposição
-- ==============================================================================

ALTER TABLE public.exposicoes
ADD COLUMN IF NOT EXISTS edu_estagiarios integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS edu_facilitador1 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS edu_facilitador2 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS edu_educador_social integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS edu_asa integer DEFAULT 0;

COMMENT ON COLUMN public.exposicoes.edu_estagiarios    IS 'Número de estagiários alocados na equipe educativa desta exposição';
COMMENT ON COLUMN public.exposicoes.edu_facilitador1   IS 'Número de Facilitadores I';
COMMENT ON COLUMN public.exposicoes.edu_facilitador2   IS 'Número de Facilitadores II';
COMMENT ON COLUMN public.exposicoes.edu_educador_social IS 'Número de Educadores Sociais';
COMMENT ON COLUMN public.exposicoes.edu_asa            IS 'Número de profissionais ASA';
