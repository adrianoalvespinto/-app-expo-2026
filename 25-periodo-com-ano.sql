-- ══════════════════════════════════════════════════════
-- 25 - Período com ano: adiciona campos de ano ao período previsto
-- Permite indicar o ano de início e fim de período previsto,
-- essencial para exposições que "viram o ano" (ex: Nov/2027 a Mar/2028)
-- ══════════════════════════════════════════════════════

ALTER TABLE exposicoes
  ADD COLUMN IF NOT EXISTS periodo_ano_de INTEGER,
  ADD COLUMN IF NOT EXISTS periodo_ano_ate INTEGER;

COMMENT ON COLUMN exposicoes.periodo_ano_de IS 'Ano de início do período previsto (ex: 2027)';
COMMENT ON COLUMN exposicoes.periodo_ano_ate IS 'Ano de encerramento do período previsto (ex: 2028)';
