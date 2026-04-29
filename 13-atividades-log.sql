DROP POLICY IF EXISTS "log_select" ON atividades_log;
DROP POLICY IF EXISTS "log_insert" ON atividades_log;
DROP POLICY IF EXISTS "Usuarios autenticados podem ler logs" ON atividades_log;
DROP POLICY IF EXISTS "Usuarios autenticados podem inserir logs" ON atividades_log;

CREATE POLICY "log_select" ON atividades_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "log_insert" ON atividades_log FOR INSERT TO authenticated WITH CHECK (true);