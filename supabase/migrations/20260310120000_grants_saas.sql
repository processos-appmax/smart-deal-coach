-- Concede permissões no schema saas para os roles anon e authenticated do Supabase
-- Necessário para que o frontend consiga ler/escrever nas tabelas via publishable key

-- Acesso ao schema
grant usage on schema saas to anon, authenticated;

-- Permissões em todas as tabelas existentes
grant select, insert, update, delete on all tables in schema saas to anon, authenticated;

-- Permissões em sequências (para auto-increment se houver)
grant usage, select on all sequences in schema saas to anon, authenticated;

-- Garantir que tabelas criadas no futuro também tenham permissão
alter default privileges in schema saas
  grant select, insert, update, delete on tables to anon, authenticated;

alter default privileges in schema saas
  grant usage, select on sequences to anon, authenticated;
