-- Expandir Visitas Mediadas para Relatório Completo
ALTER TABLE visitas_mediadas 
ADD COLUMN IF NOT EXISTS presencas_totais integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS dias_visitacao integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS presencas_integradas integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS qtd_acoes_integradas integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS qtd_instituicoes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cidades_atendidas text,
ADD COLUMN IF NOT EXISTS detalhamento_acoes jsonb;
