-- Tabela unificada de avaliações de desempenho (WhatsApp + Reuniões)
-- Armazena score por conversa/reunião, critérios detalhados, e controla unicidade.

-- Adicionar unique constraint na analises_ia para evitar duplicatas
-- Usamos analises_ia como tabela principal, adicionando campos necessários.

-- 1. Adicionar campo vendedor_id e instancia_id para facilitar queries de desempenho
alter table saas.analises_ia
  add column if not exists vendedor_id uuid references saas.usuarios(id) on delete set null,
  add column if not exists instancia_nome text,
  add column if not exists contato_telefone text,
  add column if not exists periodo_ref date;

-- 2. Unique constraint: uma avaliação por entidade por período
-- Para WhatsApp: (tipo_contexto, instancia_nome, contato_telefone, periodo_ref)
-- Para Reuniões: (tipo_contexto, entidade_id)
create unique index if not exists idx_analises_ia_wa_unico
  on saas.analises_ia (tipo_contexto, instancia_nome, contato_telefone, periodo_ref)
  where tipo_contexto = 'whatsapp' and instancia_nome is not null and contato_telefone is not null;

create unique index if not exists idx_analises_ia_reuniao_unico
  on saas.analises_ia (tipo_contexto, entidade_id)
  where tipo_contexto = 'reuniao' and entidade_id is not null;

-- 3. Índices para performance
create index if not exists idx_analises_ia_vendedor on saas.analises_ia (vendedor_id);
create index if not exists idx_analises_ia_empresa_tipo on saas.analises_ia (empresa_id, tipo_contexto);
create index if not exists idx_analises_ia_periodo on saas.analises_ia (periodo_ref);

-- 4. Trigger de atualizado_em
drop trigger if exists trg_analises_ia_atualizado on saas.analises_ia;
create trigger trg_analises_ia_atualizado
  before update on saas.analises_ia
  for each row execute function saas.definir_atualizado_em();

-- 5. Função RPC para o cron de avaliação buscar dados necessários
create or replace function saas.buscar_conversas_para_avaliar(
  p_empresa_id uuid,
  p_data date default current_date
)
returns table (
  instancia_nome text,
  contato_telefone text,
  contato_nome text,
  vendedor_id uuid,
  ja_avaliada boolean
)
language sql
stable
as $$
  select
    iw.nome as instancia_nome,
    cw.contato_telefone,
    cw.contato_nome,
    iw.usuario_id as vendedor_id,
    exists(
      select 1 from saas.analises_ia ai
      where ai.tipo_contexto = 'whatsapp'
        and ai.instancia_nome = iw.nome
        and ai.contato_telefone = cw.contato_telefone
        and ai.periodo_ref = p_data
    ) as ja_avaliada
  from saas.conversas_whatsapp cw
  join saas.instancias_whatsapp iw on cw.instancia_id = iw.id
  where iw.empresa_id = p_empresa_id
    and cw.ultima_mensagem_em >= p_data::timestamptz
    and cw.ultima_mensagem_em < (p_data + interval '1 day')::timestamptz;
$$;

grant execute on function saas.buscar_conversas_para_avaliar to anon, authenticated;

-- 6. Função RPC para buscar reuniões pendentes de avaliação
create or replace function saas.buscar_reunioes_para_avaliar(
  p_empresa_id uuid
)
returns table (
  reuniao_id uuid,
  titulo text,
  transcricao text,
  vendedor_id uuid,
  ja_avaliada boolean
)
language sql
stable
as $$
  select
    r.id as reuniao_id,
    r.titulo,
    r.transcricao,
    r.vendedor_id,
    exists(
      select 1 from saas.analises_ia ai
      where ai.tipo_contexto = 'reuniao'
        and ai.entidade_id = r.id
    ) as ja_avaliada
  from saas.reunioes r
  where r.empresa_id = p_empresa_id
    and r.transcricao is not null
    and r.transcricao != ''
    and r.status = 'concluida';
$$;

grant execute on function saas.buscar_reunioes_para_avaliar to anon, authenticated;

-- 7. Função RPC para buscar scores de desempenho com filtro por role
create or replace function saas.buscar_scores_desempenho(
  p_empresa_id uuid,
  p_tipo_contexto text default null,
  p_vendedor_id uuid default null,
  p_data_inicio date default null,
  p_data_fim date default null
)
returns table (
  id uuid,
  tipo_contexto text,
  vendedor_id uuid,
  score smallint,
  criterios jsonb,
  resumo text,
  instancia_nome text,
  contato_telefone text,
  periodo_ref date,
  entidade_id uuid,
  criado_em timestamptz
)
language sql
stable
as $$
  select
    ai.id,
    ai.tipo_contexto,
    ai.vendedor_id,
    ai.score,
    ai.criterios,
    ai.resumo,
    ai.instancia_nome,
    ai.contato_telefone,
    ai.periodo_ref,
    ai.entidade_id,
    ai.criado_em
  from saas.analises_ia ai
  where ai.empresa_id = p_empresa_id
    and (p_tipo_contexto is null or ai.tipo_contexto = p_tipo_contexto)
    and (p_vendedor_id is null or ai.vendedor_id = p_vendedor_id)
    and (p_data_inicio is null or ai.periodo_ref >= p_data_inicio)
    and (p_data_fim is null or ai.periodo_ref <= p_data_fim)
  order by ai.criado_em desc;
$$;

grant execute on function saas.buscar_scores_desempenho to anon, authenticated;
