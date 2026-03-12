-- ============================================================
-- Unificação de Meet no schema saas
-- - Cria/usa saas.meet_conferences e saas.run_conference_api_logs
-- - Migra dados do schema appmax
-- - Sincroniza automaticamente para saas.reunioes via trigger
-- - Reescreve RPCs para ler somente de saas.*
-- ============================================================

-- 1) Tabela principal de conferências no schema saas
create table if not exists saas.meet_conferences (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references saas.empresas(id) on delete set null,
  source text not null default 'reports_meet',
  conference_key text not null unique,
  meeting_code text,
  organizer_email text,
  participants jsonb,
  source_org_unit text,
  call_interna boolean,
  title text,
  started_at timestamptz,
  ended_at timestamptz,
  status text not null default 'NEW',
  transcript_source_file_id text,
  transcript_copied_file_id text,
  transcript_text text,
  attempts integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_saas_meet_conferences_status on saas.meet_conferences(status);
create index if not exists idx_saas_meet_conferences_started_at on saas.meet_conferences(started_at desc);
create index if not exists idx_saas_meet_conferences_organizer on saas.meet_conferences(organizer_email);
create index if not exists idx_saas_meet_conferences_empresa on saas.meet_conferences(empresa_id);

-- Necessário para ON CONFLICT (empresa_id, google_event_id) em saas.reunioes
create unique index if not exists ux_reunioes_empresa_google_event on saas.reunioes(empresa_id, google_event_id);

-- 2) Logs da API no schema saas
create table if not exists saas.run_conference_api_logs (
  id uuid primary key default gen_random_uuid(),
  conference_key text,
  status_code integer not null,
  ok boolean not null default false,
  duplicated boolean,
  error text,
  request_ip text,
  user_agent text,
  request_query jsonb,
  request_body jsonb,
  response_payload jsonb,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_saas_run_conf_logs_created on saas.run_conference_api_logs(created_at desc);
create index if not exists idx_saas_run_conf_logs_key on saas.run_conference_api_logs(conference_key, created_at desc);

-- 3) Migração de dados do appmax.* -> saas.* (idempotente)
insert into saas.meet_conferences (
  id, source, conference_key, meeting_code, organizer_email, participants,
  source_org_unit, call_interna, title, started_at, ended_at, status,
  transcript_source_file_id, transcript_copied_file_id, transcript_text,
  attempts, error, created_at, updated_at
)
select
  mc.id, mc.source, mc.conference_key, mc.meeting_code, mc.organizer_email, mc.participants,
  mc.source_org_unit, mc.call_interna, mc.title, mc.started_at, mc.ended_at, mc.status,
  mc.transcript_source_file_id, mc.transcript_copied_file_id,
  mc.transcript_text,
  mc.attempts, mc.error, mc.created_at, mc.updated_at
from appmax.meet_conferences mc
on conflict (conference_key) do update
set
  source = excluded.source,
  meeting_code = excluded.meeting_code,
  organizer_email = excluded.organizer_email,
  participants = excluded.participants,
  source_org_unit = excluded.source_org_unit,
  call_interna = excluded.call_interna,
  title = excluded.title,
  started_at = excluded.started_at,
  ended_at = excluded.ended_at,
  status = excluded.status,
  transcript_source_file_id = excluded.transcript_source_file_id,
  transcript_copied_file_id = excluded.transcript_copied_file_id,
  transcript_text = excluded.transcript_text,
  attempts = excluded.attempts,
  error = excluded.error,
  updated_at = greatest(saas.meet_conferences.updated_at, excluded.updated_at);

insert into saas.run_conference_api_logs (
  id, conference_key, status_code, ok, duplicated, error,
  request_ip, user_agent, request_query, request_body, response_payload,
  duration_ms, created_at
)
select
  l.id, l.conference_key, l.status_code, l.ok, l.duplicated, l.error,
  l.request_ip, l.user_agent, l.request_query, l.request_body, l.response_payload,
  l.duration_ms, l.created_at
from appmax.run_conference_api_logs l
on conflict (id) do nothing;

-- 4) Resolve empresa_id automaticamente por domínio
update saas.meet_conferences mc
set empresa_id = e.id
from saas.empresas e
where mc.empresa_id is null
  and mc.organizer_email is not null
  and lower(split_part(mc.organizer_email, '@', 2)) = lower(e.dominio::text);

-- 5) Função de sync unitária (meet_conference -> reunioes)
create or replace function saas.sincronizar_reuniao_meet(
  p_conference_key text,
  p_empresa_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = saas
as $$
declare
  v_rec record;
  v_empresa_id uuid;
  v_vendedor_id uuid;
  v_duracao int;
  v_participantes jsonb;
  v_titulo text;
  v_cliente_email text;
  v_cliente_nome text;
  v_status saas.status_reuniao;
  v_reuniao_id uuid;
begin
  select * into v_rec
  from saas.meet_conferences
  where conference_key = p_conference_key
  limit 1;

  if v_rec is null then
    return null;
  end if;

  v_empresa_id := coalesce(p_empresa_id, v_rec.empresa_id);

  if v_empresa_id is null then
    select e.id into v_empresa_id
    from saas.empresas e
    where v_rec.organizer_email is not null
      and lower(split_part(v_rec.organizer_email, '@', 2)) = lower(e.dominio::text)
    limit 1;
  end if;

  if v_empresa_id is null then
    return null;
  end if;

  if coalesce(v_rec.call_interna, false) = true then
    return null;
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(coalesce(v_rec.participants, '[]'::jsonb)) p
    where coalesce(p->>'email', p #>> '{}') not like '%@appmax.com.br'
  ) then
    return null;
  end if;

  select u.id into v_vendedor_id
  from saas.usuarios u
  where u.empresa_id = v_empresa_id
    and lower(u.email::text) = lower(v_rec.organizer_email)
  limit 1;

  v_duracao := coalesce(extract(epoch from (v_rec.ended_at - v_rec.started_at))::int / 60, 0);

  v_titulo := coalesce(
    nullif(trim(v_rec.title), ''),
    'Reunião ' || to_char(v_rec.started_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI')
  );

  if v_rec.participants is not null and jsonb_typeof(v_rec.participants) = 'array' then
    select jsonb_agg(
      case
        when jsonb_typeof(elem) = 'string' then jsonb_build_object('email', elem #>> '{}')
        when elem ? 'email' then elem
        else jsonb_build_object('email', elem::text)
      end
    )
    into v_participantes
    from jsonb_array_elements(v_rec.participants) elem;
  else
    v_participantes := '[]'::jsonb;
  end if;

  select p->>'email' into v_cliente_email
  from jsonb_array_elements(v_participantes) p
  where (p->>'email') not like '%@appmax.com.br'
  limit 1;

  v_cliente_nome := coalesce(
    (select p->>'name' from jsonb_array_elements(v_participantes) p where p->>'email' = v_cliente_email limit 1),
    split_part(coalesce(v_cliente_email, ''), '@', 1)
  );

  v_status := case when v_rec.ended_at is null then 'agendada'::saas.status_reuniao else 'concluida'::saas.status_reuniao end;

  insert into saas.reunioes (
    empresa_id, vendedor_id, titulo, data_reuniao, duracao_minutos,
    cliente_nome, cliente_email, link_meet, status,
    google_event_id, participantes, transcricao, transcript_file_id
  ) values (
    v_empresa_id, v_vendedor_id, v_titulo, v_rec.started_at, v_duracao,
    v_cliente_nome, v_cliente_email,
    case when v_rec.meeting_code is not null then 'https://meet.google.com/' || v_rec.meeting_code else null end,
    v_status,
    v_rec.conference_key, v_participantes,
    case when coalesce(trim(v_rec.transcript_text), '') <> '' then v_rec.transcript_text else null end,
    v_rec.transcript_copied_file_id
  )
  on conflict (empresa_id, google_event_id)
  do update set
    vendedor_id = excluded.vendedor_id,
    duracao_minutos = excluded.duracao_minutos,
    participantes = excluded.participantes,
    status = excluded.status,
    cliente_nome = coalesce(saas.reunioes.cliente_nome, excluded.cliente_nome),
    cliente_email = coalesce(saas.reunioes.cliente_email, excluded.cliente_email),
    transcricao = coalesce(nullif(trim(excluded.transcricao), ''), saas.reunioes.transcricao),
    transcript_file_id = coalesce(excluded.transcript_file_id, saas.reunioes.transcript_file_id),
    atualizado_em = now()
  returning id into v_reuniao_id;

  return v_reuniao_id;
end;
$$;

grant execute on function saas.sincronizar_reuniao_meet(text, uuid) to authenticated;

-- 6) Trigger automático para manter reunioes sincronizadas sem ação manual
create or replace function saas.trg_sync_reuniao_from_meet_conference()
returns trigger
language plpgsql
security definer
set search_path = saas
as $$
begin
  perform saas.sincronizar_reuniao_meet(new.conference_key, new.empresa_id);
  return new;
end;
$$;

drop trigger if exists trg_sync_reuniao_from_meet_conference on saas.meet_conferences;
create trigger trg_sync_reuniao_from_meet_conference
after insert or update on saas.meet_conferences
for each row
execute function saas.trg_sync_reuniao_from_meet_conference();

-- 7) RPC legado preservado, agora lendo saas.meet_conferences
create or replace function saas.sincronizar_reunioes(p_empresa_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = saas
as $$
declare
  v_inserted int := 0;
  v_updated int := 0;
  v_before_count int;
  v_after_count int;
  v_rec record;
begin
  select count(*) into v_before_count from saas.reunioes where empresa_id = p_empresa_id;

  for v_rec in
    select conference_key
    from saas.meet_conferences
    where coalesce(call_interna, false) = false
      and (
        empresa_id = p_empresa_id
        or (
          empresa_id is null
          and exists (
            select 1
            from saas.empresas e
            where e.id = p_empresa_id
              and organizer_email is not null
              and lower(split_part(organizer_email, '@', 2)) = lower(e.dominio::text)
          )
        )
      )
  loop
    perform saas.sincronizar_reuniao_meet(v_rec.conference_key, p_empresa_id);
  end loop;

  select count(*) into v_after_count from saas.reunioes where empresa_id = p_empresa_id;
  v_inserted := greatest(v_after_count - v_before_count, 0);

  return jsonb_build_object('inserted', v_inserted, 'updated', v_after_count - v_inserted);
end;
$$;

grant execute on function saas.sincronizar_reunioes(uuid) to authenticated;

create or replace function saas.buscar_transcript_file(p_conference_key text)
returns jsonb
language plpgsql
security definer
set search_path = saas
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'transcript_source_file_id', mc.transcript_source_file_id,
    'transcript_copied_file_id', mc.transcript_copied_file_id,
    'transcript_text', mc.transcript_text,
    'meeting_code', mc.meeting_code,
    'status', mc.status
  )
  into v_result
  from saas.meet_conferences mc
  where mc.conference_key = p_conference_key
  limit 1;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

grant execute on function saas.buscar_transcript_file(text) to authenticated;

-- 8) Backfill inicial de reunioes após criação do trigger/funções
with empresas_alvo as (
  select distinct coalesce(mc.empresa_id, e.id) as empresa_id
  from saas.meet_conferences mc
  left join saas.empresas e
    on mc.organizer_email is not null
   and lower(split_part(mc.organizer_email, '@', 2)) = lower(e.dominio::text)
  where coalesce(mc.call_interna, false) = false
)
select saas.sincronizar_reunioes(empresas_alvo.empresa_id)
from empresas_alvo
where empresas_alvo.empresa_id is not null;
