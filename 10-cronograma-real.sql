-- Executar este script no editor SQL do Supabase
-- Adicionar coluna de data_real à tabela de tarefas

ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS data_real DATE;
