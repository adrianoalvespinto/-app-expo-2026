-- ============================================
-- SQL: Correção de Unidades e Classificação Automática
-- Rodar no SQL Editor do Supabase
-- ============================================

-- 1. Renomear/Adicionar colunas com nomes padronizados e aceitando NULL
ALTER TABLE unidades 
  RENAME COLUMN coord_programacao TO coordenador_programacao;
ALTER TABLE unidades 
  RENAME COLUMN tecnico_artes TO tecnico_artes_visuais;

-- Garantir que as colunas existam caso o rename falhe (se já tiverem o nome certo)
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS coordenador_programacao text;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS tecnico_artes_visuais text;

-- 2. Remover restrições NOT NULL (se existirem) de todos os campos facultativos
ALTER TABLE unidades ALTER COLUMN capital_interior DROP NOT NULL;
ALTER TABLE unidades ALTER COLUMN gerente DROP NOT NULL;
ALTER TABLE unidades ALTER COLUMN gerente_adjunto DROP NOT NULL;
ALTER TABLE unidades ALTER COLUMN coordenador_programacao DROP NOT NULL;
ALTER TABLE unidades ALTER COLUMN supervisor_artistico DROP NOT NULL;
ALTER TABLE unidades ALTER COLUMN tecnico_artes_visuais DROP NOT NULL;
ALTER TABLE unidades ALTER COLUMN tecnico_educativo DROP NOT NULL;

-- 3. Classificação Automática: Capital vs Interior
UPDATE unidades SET capital_interior = 'Capital'
WHERE nome IN (
  '14 Bis', '24 de Maio', 'Av Paulista', 'Belenzinho', 'Bom retiro', 
  'Campo Limpo', 'Carmo', 'Casa Verde', 'Cinesesc', 'Consolação', 
  'CPF', 'Florencio', 'Galeria', 'Interlagos', 'Ipiranga', 
  'Itaquera', 'Parque D. Pedro', 'Pinheiros', 'Pompeia', 
  'Santana', 'Santo Amaro', 'Vila Mariana'
);

UPDATE unidades SET capital_interior = 'Interior'
WHERE capital_interior IS NULL OR capital_interior = '';

-- Especial para Bertioga/Santos/Litoral (dentro da lógica Interior para este app)
UPDATE unidades SET capital_interior = 'Interior'
WHERE nome IN ('Bertioga', 'Santos', 'Guarulhos', 'Osasco', 'Santo André', 'São Caetano');
