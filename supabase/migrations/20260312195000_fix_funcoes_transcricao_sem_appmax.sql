-- Corrige funcoes legadas para usar somente schema saas

create or replace function saas.disparar_transcricoes(p_empresa_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = saas, extensions
as $$
declare
  v_rec record;
  v_dispatched int := 0;
  v_skipped int := 0;
  v_keys text[] := '{}';
begin
  for v_rec in
    select mc.conference_key
    from saas.meet_conferences mc
    where coalesce(mc.call_interna, false) = false
      and (mc.transcript_copied_file_id is null or mc.transcript_copied_file_id = '')
      and mc.conference_key is not null
      and (mc.empresa_id = p_empresa_id or p_empresa_id is null)
  loop
    perform net.http_post(
      url := 'https://apiouvidoria.contato-lojavirtual.com/webhook/transcricoes_meet',
      headers := '{"Content-Type": "application/json", "x-webhook-token": "api-meet-comercial"}'::jsonb,
      body := jsonb_build_object('conference_key', v_rec.conference_key)
    );
    v_dispatched := v_dispatched + 1;
    v_keys := array_append(v_keys, v_rec.conference_key);
  end loop;

  select count(*) into v_skipped
  from saas.meet_conferences mc
  where coalesce(mc.call_interna, false) = false
    and mc.transcript_copied_file_id is not null
    and mc.transcript_copied_file_id != ''
    and (mc.empresa_id = p_empresa_id or p_empresa_id is null);

  return jsonb_build_object(
    'dispatched', v_dispatched,
    'skipped', v_skipped,
    'keys', to_jsonb(v_keys)
  );
end;
$$;

grant execute on function saas.disparar_transcricoes(uuid) to authenticated;

create or replace function saas.pull_transcricoes(p_empresa_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = saas
as $$
declare
  v_updated int := 0;
  v_pending int := 0;
  v_total int := 0;
  v_rec record;
  v_text text;
  v_file_id text;
  v_mc_status text;
begin
  select count(*) into v_total
  from saas.reunioes r
  where r.empresa_id = p_empresa_id
    and (r.transcricao is null or r.transcricao like '[Transcrição no Drive:%')
    and r.google_event_id is not null;

  for v_rec in
    select r.id as reuniao_id, r.google_event_id
    from saas.reunioes r
    where r.empresa_id = p_empresa_id
      and (r.transcricao is null or r.transcricao like '[Transcrição no Drive:%')
      and r.google_event_id is not null
  loop
    select mc.transcript_text, mc.transcript_copied_file_id, mc.status
    into v_text, v_file_id, v_mc_status
    from saas.meet_conferences mc
    where mc.conference_key = v_rec.google_event_id
    order by (mc.transcript_text is not null and mc.transcript_text != '') desc,
             mc.id desc
    limit 1;

    if v_mc_status = 'TRANSCRIPT_DONE' then
      update saas.reunioes
      set transcricao = coalesce(nullif(trim(v_text), ''), transcricao),
          transcript_file_id = coalesce(v_file_id, transcript_file_id),
          status = 'concluida'
      where id = v_rec.reuniao_id;
      v_updated := v_updated + 1;
    elsif v_mc_status = 'NEW' or v_mc_status is null then
      v_pending := v_pending + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'updated', v_updated,
    'pending', v_pending,
    'total', v_total
  );
end;
$$;

grant execute on function saas.pull_transcricoes(uuid) to authenticated;
