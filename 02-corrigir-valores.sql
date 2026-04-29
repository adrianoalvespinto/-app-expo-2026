-- ============================================
-- SQL Helper: Correção de Casas Decimais (Dividir valores por 100)
-- ============================================

-- Correção retroativa dos valores numéricos inflacionados nas exposições já cadastradas.
-- ATENÇÃO: Rodar apenas uma vez!
UPDATE exposicoes 
SET 
  valor_estimado   = ROUND(valor_estimado / 100.0, 2),
  cache_curadoria  = ROUND(cache_curadoria / 100.0, 2),
  valor_cenotecnia = ROUND(valor_cenotecnia / 100.0, 2)
WHERE valor_estimado > 0 OR cache_curadoria > 0 OR valor_cenotecnia > 0;
