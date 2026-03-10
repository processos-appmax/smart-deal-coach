-- Remove Google integration types (keeping SSO login, only removing integration entries)
-- Delete any existing Google integration records
delete from saas.integracoes where tipo in ('google_calendar', 'google_meet');

-- Recreate enum without Google types
-- PostgreSQL doesn't support DROP VALUE from enum, so we recreate
alter table saas.integracoes alter column tipo type text;
drop type saas.tipo_integracao;
create type saas.tipo_integracao as enum ('hubspot', 'openai', 'evolution_api', 'n8n');
alter table saas.integracoes alter column tipo type saas.tipo_integracao using tipo::saas.tipo_integracao;
