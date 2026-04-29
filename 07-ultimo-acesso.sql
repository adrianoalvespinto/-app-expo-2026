-- Adiciona coluna de último acesso à tabela de usuários
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMP WITH TIME ZONE;

-- Garante que o perfil gestor existe (caso precise testar)
-- UPDATE usuarios SET perfil = 'gestor' WHERE email = 'seu-email@exemplo.com';
