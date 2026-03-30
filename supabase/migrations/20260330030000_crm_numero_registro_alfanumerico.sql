-- =============================================================================
-- Alterar numero_registro para formato alfanumerico: L + 10 digitos + L
-- Exemplo: A1234567890B — unico globalmente por tipo de objeto
-- URL: /record/0-1/A1234567890B
-- =============================================================================

-- Funcao para gerar numero_registro alfanumerico unico
-- Formato: 1 letra maiuscula + 10 digitos + 1 letra maiuscula
create or replace function saas.gerar_numero_registro()
returns text
language plpgsql
as $$
declare
  letras text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  digitos text := '';
  i integer;
begin
  -- Primeira letra aleatoria
  digitos := substr(letras, floor(random() * 26 + 1)::int, 1);
  -- 10 digitos aleatorios
  for i in 1..10 loop
    digitos := digitos || floor(random() * 10)::int::text;
  end loop;
  -- Ultima letra aleatoria
  digitos := digitos || substr(letras, floor(random() * 26 + 1)::int, 1);
  return digitos;
end;
$$;

-- Funcao trigger para garantir unicidade ao inserir
-- Tenta gerar ate encontrar um valor unico na tabela
create or replace function saas.definir_numero_registro()
returns trigger
language plpgsql
as $$
declare
  novo_numero text;
  tentativas integer := 0;
  existe boolean;
begin
  -- So gera se nao foi informado manualmente
  if new.numero_registro is null or new.numero_registro = '' then
    loop
      novo_numero := saas.gerar_numero_registro();
      -- Verificar unicidade na propria tabela
      execute format(
        'SELECT EXISTS(SELECT 1 FROM %I.%I WHERE numero_registro = $1)',
        tg_table_schema, tg_table_name
      ) into existe using novo_numero;

      exit when not existe;
      tentativas := tentativas + 1;
      if tentativas > 100 then
        raise exception 'Falha ao gerar numero_registro unico apos 100 tentativas';
      end if;
    end loop;
    new.numero_registro := novo_numero;
  end if;
  return new;
end;
$$;

-- =========================
-- MIGRAR crm_contatos
-- =========================
-- Remover indice e default antigos
drop index if exists saas.idx_crm_contatos_numero;
alter table saas.crm_contatos alter column numero_registro drop default;

-- Alterar tipo para text
alter table saas.crm_contatos alter column numero_registro type text using numero_registro::text;

-- Novo indice unico global (nao por empresa — o numero e globalmente unico)
create unique index idx_crm_contatos_numero on saas.crm_contatos (numero_registro);

-- Trigger para auto-gerar
create trigger trg_crm_contatos_numero_registro
  before insert on saas.crm_contatos
  for each row execute function saas.definir_numero_registro();

-- =========================
-- MIGRAR crm_empresas
-- =========================
drop index if exists saas.idx_crm_empresas_numero;
alter table saas.crm_empresas alter column numero_registro drop default;
alter table saas.crm_empresas alter column numero_registro type text using numero_registro::text;
create unique index idx_crm_empresas_numero on saas.crm_empresas (numero_registro);

create trigger trg_crm_empresas_numero_registro
  before insert on saas.crm_empresas
  for each row execute function saas.definir_numero_registro();

-- =========================
-- MIGRAR crm_negocios
-- =========================
drop index if exists saas.idx_crm_negocios_numero;
alter table saas.crm_negocios alter column numero_registro drop default;
alter table saas.crm_negocios alter column numero_registro type text using numero_registro::text;
create unique index idx_crm_negocios_numero on saas.crm_negocios (numero_registro);

create trigger trg_crm_negocios_numero_registro
  before insert on saas.crm_negocios
  for each row execute function saas.definir_numero_registro();

-- =========================
-- MIGRAR crm_tickets
-- =========================
drop index if exists saas.idx_crm_tickets_numero;
alter table saas.crm_tickets alter column numero_registro drop default;
alter table saas.crm_tickets alter column numero_registro type text using numero_registro::text;
create unique index idx_crm_tickets_numero on saas.crm_tickets (numero_registro);

create trigger trg_crm_tickets_numero_registro
  before insert on saas.crm_tickets
  for each row execute function saas.definir_numero_registro();

-- =========================
-- REMOVER SEQUENCES (nao mais necessarias)
-- =========================
drop sequence if exists saas.crm_contatos_numero_seq;
drop sequence if exists saas.crm_empresas_numero_seq;
drop sequence if exists saas.crm_negocios_numero_seq;
drop sequence if exists saas.crm_tickets_numero_seq;

-- =========================
-- ATUALIZAR COMENTARIOS
-- =========================
comment on table saas.crm_contatos is 'Contatos CRM (object_type_id=0-1). URL: /record/0-1/{numero_registro}. Formato: L+10D+L (ex: A1234567890B)';
comment on table saas.crm_empresas is 'Empresas/Contas CRM externas (object_type_id=0-2). URL: /record/0-2/{numero_registro}. Formato: L+10D+L';
comment on table saas.crm_negocios is 'Negocios/Deals CRM (object_type_id=0-3). URL: /record/0-3/{numero_registro}. Formato: L+10D+L';
comment on table saas.crm_tickets is 'Tickets CRM (object_type_id=0-4). URL: /record/0-4/{numero_registro}. Formato: L+10D+L';
