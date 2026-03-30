-- =============================================================================
-- CRM Atividades — Tabela unificada para notas, emails, chamadas, tarefas, reuniões
-- =============================================================================

create type saas.tipo_atividade_crm as enum ('nota', 'email', 'chamada', 'tarefa', 'reuniao', 'whatsapp', 'sms', 'linkedin');
create type saas.status_tarefa as enum ('pendente', 'em_andamento', 'concluida', 'cancelada');

create table if not exists saas.crm_atividades (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references saas.empresas(id) on delete cascade,

  -- Tipo
  tipo saas.tipo_atividade_crm not null,

  -- Conteúdo
  titulo text,
  conteudo text, -- corpo da nota/email/observação (rich text HTML)

  -- Email específico
  email_para text,
  email_de text,
  email_cc text,
  email_assunto text,

  -- Chamada específico
  chamada_duracao integer, -- segundos
  chamada_resultado text, -- 'atendida', 'nao_atendida', 'correio_voz', 'ocupado'
  chamada_direcao text, -- 'entrada', 'saida'

  -- Tarefa específico
  tarefa_status saas.status_tarefa default 'pendente',
  tarefa_prioridade text default 'nenhum', -- 'nenhum', 'baixa', 'media', 'alta'
  tarefa_tipo text default 'tarefas', -- 'tarefas', 'ligacao', 'email'
  tarefa_fila text,
  tarefa_data_vencimento timestamptz,
  tarefa_lembrete timestamptz,
  tarefa_repetir boolean default false,

  -- Reunião específico
  reuniao_inicio timestamptz,
  reuniao_fim timestamptz,
  reuniao_tipo text, -- 'presencial', 'video', 'telefone'
  reuniao_localizacao text,
  reuniao_participantes jsonb default '[]', -- [{nome, email}]
  reuniao_lembretes jsonb default '[]', -- [{valor: 10, unidade: 'minutos'}]

  -- Proprietário / Criador
  criado_por uuid references saas.usuarios(id) on delete set null,
  atribuido_para uuid references saas.usuarios(id) on delete set null,

  -- Associações inline (para queries rápidas)
  contato_ids uuid[] default '{}',
  empresa_crm_ids uuid[] default '{}',
  negocio_ids uuid[] default '{}',
  ticket_ids uuid[] default '{}',

  -- Timestamps
  data_atividade timestamptz not null default now(), -- quando a atividade ocorreu/ocorrerá
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index idx_crm_atividades_empresa on saas.crm_atividades (empresa_id, data_atividade desc);
create index idx_crm_atividades_tipo on saas.crm_atividades (empresa_id, tipo);
create index idx_crm_atividades_criado_por on saas.crm_atividades (criado_por);
create index idx_crm_atividades_atribuido on saas.crm_atividades (atribuido_para) where tarefa_status = 'pendente';
create index idx_crm_atividades_contatos on saas.crm_atividades using gin (contato_ids);
create index idx_crm_atividades_negocios on saas.crm_atividades using gin (negocio_ids);
create index idx_crm_atividades_empresas on saas.crm_atividades using gin (empresa_crm_ids);
create index idx_crm_atividades_tickets on saas.crm_atividades using gin (ticket_ids);
create index idx_crm_atividades_tarefas_pendentes on saas.crm_atividades (empresa_id, tarefa_data_vencimento)
  where tipo = 'tarefa' and tarefa_status = 'pendente';

create trigger trg_crm_atividades_atualizado_em
  before update on saas.crm_atividades
  for each row execute function saas.definir_atualizado_em();

alter table saas.crm_atividades enable row level security;
create policy "crm_atividades_por_empresa"
  on saas.crm_atividades for all
  using (empresa_id in (select empresa_id from saas.usuarios where id = auth.uid()))
  with check (empresa_id in (select empresa_id from saas.usuarios where id = auth.uid()));

comment on table saas.crm_atividades is 'Atividades CRM unificadas: notas, emails, chamadas, tarefas, reuniões, WhatsApp, SMS, LinkedIn';
