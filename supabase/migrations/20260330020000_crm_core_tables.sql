-- =============================================================================
-- CRM Core Tables — Smart Deal Coach
-- Padrão HubSpot de URLs: /{objeto}/{object_type_id}/{numero_registro}
--   contact/0-1/XXX | company/0-2/XXX | deal/0-3/XXX | ticket/0-4/XXX
-- =============================================================================

-- =========================
-- ENUMS CRM
-- =========================
create type saas.status_contato as enum ('lead', 'qualified', 'customer', 'churned');
create type saas.fonte_contato as enum (
  'website', 'linkedin', 'referencia', 'campanha',
  'whatsapp', 'email', 'telefone', 'evento', 'importacao', 'outros'
);
create type saas.status_negocio as enum ('aberto', 'ganho', 'perdido');
create type saas.prioridade_ticket as enum ('low', 'medium', 'high', 'urgent');
create type saas.status_ticket as enum ('aberto', 'em_andamento', 'aguardando', 'resolvido', 'fechado');

-- =========================
-- SEQUENCES para numero_registro por object_type
-- Simula o padrão HubSpot: cada tipo de objeto tem seu próprio contador
-- =========================
create sequence saas.crm_contatos_numero_seq;
create sequence saas.crm_empresas_numero_seq;
create sequence saas.crm_negocios_numero_seq;
create sequence saas.crm_tickets_numero_seq;

-- =========================
-- TABELA: crm_pipelines
-- Pipelines configuráveis (vendas, suporte, etc.)
-- =========================
create table if not exists saas.crm_pipelines (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references saas.empresas(id) on delete cascade,
  nome text not null,
  tipo text not null default 'deal', -- 'deal' ou 'ticket'
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, nome, tipo)
);

create trigger trg_crm_pipelines_atualizado_em
  before update on saas.crm_pipelines
  for each row execute function saas.definir_atualizado_em();

-- =========================
-- TABELA: crm_pipeline_estagios
-- Estágios de cada pipeline (kanban columns)
-- =========================
create table if not exists saas.crm_pipeline_estagios (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references saas.crm_pipelines(id) on delete cascade,
  nome text not null,
  cor text default '#6B7280',
  ordem integer not null default 0,
  probabilidade integer default 0 check (probabilidade >= 0 and probabilidade <= 100),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (pipeline_id, nome)
);

create trigger trg_crm_pipeline_estagios_atualizado_em
  before update on saas.crm_pipeline_estagios
  for each row execute function saas.definir_atualizado_em();

-- =========================
-- TABELA: crm_contatos (object_type_id = 0-1)
-- URL: /contact/0-1/{numero_registro}
-- =========================
create table if not exists saas.crm_contatos (
  id uuid primary key default gen_random_uuid(),
  numero_registro bigint not null default nextval('saas.crm_contatos_numero_seq'),
  empresa_id uuid not null references saas.empresas(id) on delete cascade,

  -- dados basicos
  nome text not null,
  email citext,
  telefone text,
  cargo text,
  avatar_url text,

  -- classificacao
  status saas.status_contato not null default 'lead',
  fonte saas.fonte_contato default 'outros',
  score integer default 0 check (score >= 0 and score <= 100),
  tags text[] default '{}',

  -- proprietario
  proprietario_id uuid references saas.usuarios(id) on delete set null,

  -- campos customizaveis (JSONB flexivel)
  dados_custom jsonb default '{}',

  -- timestamps
  ultima_atividade_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  deletado_em timestamptz -- soft delete
);

-- Indice unico para numero_registro por empresa (URL-friendly)
create unique index idx_crm_contatos_numero on saas.crm_contatos (empresa_id, numero_registro);
create index idx_crm_contatos_empresa_status on saas.crm_contatos (empresa_id, status) where deletado_em is null;
create index idx_crm_contatos_empresa_criado on saas.crm_contatos (empresa_id, criado_em desc) where deletado_em is null;
create index idx_crm_contatos_proprietario on saas.crm_contatos (proprietario_id) where deletado_em is null;
create index idx_crm_contatos_email on saas.crm_contatos (empresa_id, email) where email is not null and deletado_em is null;
create index idx_crm_contatos_tags on saas.crm_contatos using gin (tags) where deletado_em is null;
create index idx_crm_contatos_dados_custom on saas.crm_contatos using gin (dados_custom) where deletado_em is null;

-- Trigram para busca por nome (full-text search)
create extension if not exists pg_trgm;
create index idx_crm_contatos_nome_trgm on saas.crm_contatos using gin (nome gin_trgm_ops) where deletado_em is null;

create trigger trg_crm_contatos_atualizado_em
  before update on saas.crm_contatos
  for each row execute function saas.definir_atualizado_em();

-- =========================
-- TABELA: crm_empresas (object_type_id = 0-2)
-- URL: /company/0-2/{numero_registro}
-- Empresas/contas EXTERNAS (clientes/prospectos), diferente de saas.empresas (tenants)
-- =========================
create table if not exists saas.crm_empresas (
  id uuid primary key default gen_random_uuid(),
  numero_registro bigint not null default nextval('saas.crm_empresas_numero_seq'),
  empresa_id uuid not null references saas.empresas(id) on delete cascade,

  -- dados basicos
  nome text not null,
  dominio citext,
  cnpj text,
  telefone text,
  website text,
  logo_url text,

  -- endereco
  endereco text,
  cidade text,
  estado text,
  pais text default 'Brazil',
  cep text,

  -- classificacao
  setor text, -- industria/segmento
  porte text, -- 'startup', 'pmb', 'medio', 'enterprise'
  plataforma text, -- 'VTEX', 'Shopify', 'Tray', etc.
  tags text[] default '{}',

  -- proprietario
  proprietario_id uuid references saas.usuarios(id) on delete set null,

  -- hierarquia
  empresa_pai_id uuid references saas.crm_empresas(id) on delete set null,

  -- campos customizaveis
  dados_custom jsonb default '{}',

  -- timestamps
  ultima_atividade_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  deletado_em timestamptz
);

create unique index idx_crm_empresas_numero on saas.crm_empresas (empresa_id, numero_registro);
create index idx_crm_empresas_empresa_criado on saas.crm_empresas (empresa_id, criado_em desc) where deletado_em is null;
create index idx_crm_empresas_proprietario on saas.crm_empresas (proprietario_id) where deletado_em is null;
create index idx_crm_empresas_dominio on saas.crm_empresas (empresa_id, dominio) where dominio is not null and deletado_em is null;
create index idx_crm_empresas_tags on saas.crm_empresas using gin (tags) where deletado_em is null;
create index idx_crm_empresas_nome_trgm on saas.crm_empresas using gin (nome gin_trgm_ops) where deletado_em is null;
create index idx_crm_empresas_dados_custom on saas.crm_empresas using gin (dados_custom) where deletado_em is null;

create trigger trg_crm_empresas_atualizado_em
  before update on saas.crm_empresas
  for each row execute function saas.definir_atualizado_em();

-- =========================
-- TABELA: crm_negocios (object_type_id = 0-3)
-- URL: /deal/0-3/{numero_registro}
-- =========================
create table if not exists saas.crm_negocios (
  id uuid primary key default gen_random_uuid(),
  numero_registro bigint not null default nextval('saas.crm_negocios_numero_seq'),
  empresa_id uuid not null references saas.empresas(id) on delete cascade,

  -- dados basicos
  nome text not null,
  valor numeric(14,2) default 0,
  moeda text default 'BRL',

  -- pipeline e estagio
  pipeline_id uuid references saas.crm_pipelines(id) on delete set null,
  estagio_id uuid references saas.crm_pipeline_estagios(id) on delete set null,
  probabilidade integer default 0 check (probabilidade >= 0 and probabilidade <= 100),

  -- resultado
  status saas.status_negocio not null default 'aberto',
  motivo_perda text, -- preenchido quando status = 'perdido'

  -- datas
  data_fechamento_prevista date,
  data_fechamento date, -- preenchido quando ganho/perdido

  -- proprietario
  proprietario_id uuid references saas.usuarios(id) on delete set null,

  -- classificacao
  plataforma text,
  tags text[] default '{}',

  -- campos customizaveis
  dados_custom jsonb default '{}',

  -- timestamps
  ultima_atividade_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  deletado_em timestamptz
);

create unique index idx_crm_negocios_numero on saas.crm_negocios (empresa_id, numero_registro);
create index idx_crm_negocios_empresa_status on saas.crm_negocios (empresa_id, status) where deletado_em is null;
create index idx_crm_negocios_pipeline_estagio on saas.crm_negocios (pipeline_id, estagio_id) where deletado_em is null;
create index idx_crm_negocios_proprietario on saas.crm_negocios (proprietario_id) where deletado_em is null;
create index idx_crm_negocios_empresa_criado on saas.crm_negocios (empresa_id, criado_em desc) where deletado_em is null;
create index idx_crm_negocios_fechamento on saas.crm_negocios (empresa_id, data_fechamento_prevista) where status = 'aberto' and deletado_em is null;
create index idx_crm_negocios_tags on saas.crm_negocios using gin (tags) where deletado_em is null;
create index idx_crm_negocios_nome_trgm on saas.crm_negocios using gin (nome gin_trgm_ops) where deletado_em is null;
create index idx_crm_negocios_dados_custom on saas.crm_negocios using gin (dados_custom) where deletado_em is null;

create trigger trg_crm_negocios_atualizado_em
  before update on saas.crm_negocios
  for each row execute function saas.definir_atualizado_em();

-- =========================
-- TABELA: crm_tickets (object_type_id = 0-4)
-- URL: /ticket/0-4/{numero_registro}
-- =========================
create table if not exists saas.crm_tickets (
  id uuid primary key default gen_random_uuid(),
  numero_registro bigint not null default nextval('saas.crm_tickets_numero_seq'),
  empresa_id uuid not null references saas.empresas(id) on delete cascade,

  -- dados basicos
  titulo text not null,
  descricao text,

  -- pipeline e estagio
  pipeline_id uuid references saas.crm_pipelines(id) on delete set null,
  estagio_id uuid references saas.crm_pipeline_estagios(id) on delete set null,

  -- classificacao
  prioridade saas.prioridade_ticket not null default 'medium',
  status saas.status_ticket not null default 'aberto',
  categoria text,
  plataforma text,
  tags text[] default '{}',

  -- proprietario
  proprietario_id uuid references saas.usuarios(id) on delete set null,

  -- SLA
  sla_minutos integer, -- tempo maximo para resolucao
  primeira_resposta_em timestamptz,

  -- campos customizaveis
  dados_custom jsonb default '{}',

  -- timestamps
  ultima_atividade_em timestamptz,
  resolvido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  deletado_em timestamptz
);

create unique index idx_crm_tickets_numero on saas.crm_tickets (empresa_id, numero_registro);
create index idx_crm_tickets_empresa_status on saas.crm_tickets (empresa_id, status) where deletado_em is null;
create index idx_crm_tickets_pipeline_estagio on saas.crm_tickets (pipeline_id, estagio_id) where deletado_em is null;
create index idx_crm_tickets_proprietario on saas.crm_tickets (proprietario_id) where deletado_em is null;
create index idx_crm_tickets_prioridade on saas.crm_tickets (empresa_id, prioridade) where status in ('aberto', 'em_andamento') and deletado_em is null;
create index idx_crm_tickets_empresa_criado on saas.crm_tickets (empresa_id, criado_em desc) where deletado_em is null;
create index idx_crm_tickets_tags on saas.crm_tickets using gin (tags) where deletado_em is null;
create index idx_crm_tickets_titulo_trgm on saas.crm_tickets using gin (titulo gin_trgm_ops) where deletado_em is null;
create index idx_crm_tickets_dados_custom on saas.crm_tickets using gin (dados_custom) where deletado_em is null;

create trigger trg_crm_tickets_atualizado_em
  before update on saas.crm_tickets
  for each row execute function saas.definir_atualizado_em();

-- =========================
-- TABELA: crm_associacoes
-- Associações N:N entre quaisquer objetos CRM (padrão HubSpot)
-- =========================
create table if not exists saas.crm_associacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references saas.empresas(id) on delete cascade,

  -- objeto de origem
  origem_tipo text not null, -- 'contact', 'company', 'deal', 'ticket'
  origem_id uuid not null,

  -- objeto de destino
  destino_tipo text not null, -- 'contact', 'company', 'deal', 'ticket'
  destino_id uuid not null,

  -- tipo de associacao
  tipo_associacao text not null default 'default',
  -- Exemplos:
  --   contact→company: 'trabalha_em', 'ex_funcionario'
  --   contact→deal:    'decisor', 'influenciador', 'usuario_final'
  --   deal→company:    'pertence_a'
  --   ticket→contact:  'solicitante', 'afetado'
  --   ticket→deal:     'relacionado'

  -- metadata
  criado_por uuid references saas.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),

  -- impedir duplicatas (mesma associacao nos dois sentidos)
  unique (empresa_id, origem_tipo, origem_id, destino_tipo, destino_id, tipo_associacao)
);

create index idx_crm_associacoes_origem on saas.crm_associacoes (empresa_id, origem_tipo, origem_id);
create index idx_crm_associacoes_destino on saas.crm_associacoes (empresa_id, destino_tipo, destino_id);
create index idx_crm_associacoes_tipo on saas.crm_associacoes (empresa_id, tipo_associacao);

-- =========================
-- TABELA: crm_historico_estagios
-- Rastreia mudanças de estágio em deals e tickets
-- =========================
create table if not exists saas.crm_historico_estagios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references saas.empresas(id) on delete cascade,
  entidade_tipo text not null, -- 'deal' ou 'ticket'
  entidade_id uuid not null,
  estagio_anterior_id uuid references saas.crm_pipeline_estagios(id) on delete set null,
  estagio_novo_id uuid references saas.crm_pipeline_estagios(id) on delete set null,
  realizado_por uuid references saas.usuarios(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index idx_crm_historico_estagios_entidade on saas.crm_historico_estagios (entidade_tipo, entidade_id, criado_em desc);

-- =========================
-- TABELA: crm_notas
-- Notas/comentarios em qualquer objeto CRM
-- =========================
create table if not exists saas.crm_notas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references saas.empresas(id) on delete cascade,
  entidade_tipo text not null, -- 'contact', 'company', 'deal', 'ticket'
  entidade_id uuid not null,
  conteudo text not null,
  criado_por uuid references saas.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index idx_crm_notas_entidade on saas.crm_notas (empresa_id, entidade_tipo, entidade_id, criado_em desc);

create trigger trg_crm_notas_atualizado_em
  before update on saas.crm_notas
  for each row execute function saas.definir_atualizado_em();

-- =========================
-- RLS POLICIES
-- =========================

-- crm_pipelines
alter table saas.crm_pipelines enable row level security;
create policy "crm_pipelines_por_empresa"
  on saas.crm_pipelines for all
  using (empresa_id in (
    select empresa_id from saas.usuarios where id = auth.uid()
  ))
  with check (empresa_id in (
    select empresa_id from saas.usuarios where id = auth.uid()
  ));

-- crm_pipeline_estagios
alter table saas.crm_pipeline_estagios enable row level security;
create policy "crm_pipeline_estagios_por_empresa"
  on saas.crm_pipeline_estagios for all
  using (pipeline_id in (
    select p.id from saas.crm_pipelines p
    join saas.usuarios u on u.empresa_id = p.empresa_id
    where u.id = auth.uid()
  ))
  with check (pipeline_id in (
    select p.id from saas.crm_pipelines p
    join saas.usuarios u on u.empresa_id = p.empresa_id
    where u.id = auth.uid()
  ));

-- crm_contatos
alter table saas.crm_contatos enable row level security;
create policy "crm_contatos_por_empresa"
  on saas.crm_contatos for all
  using (empresa_id in (
    select empresa_id from saas.usuarios where id = auth.uid()
  ))
  with check (empresa_id in (
    select empresa_id from saas.usuarios where id = auth.uid()
  ));

-- crm_empresas
alter table saas.crm_empresas enable row level security;
create policy "crm_empresas_por_empresa"
  on saas.crm_empresas for all
  using (empresa_id in (
    select empresa_id from saas.usuarios where id = auth.uid()
  ))
  with check (empresa_id in (
    select empresa_id from saas.usuarios where id = auth.uid()
  ));

-- crm_negocios
alter table saas.crm_negocios enable row level security;
create policy "crm_negocios_por_empresa"
  on saas.crm_negocios for all
  using (empresa_id in (
    select empresa_id from saas.usuarios where id = auth.uid()
  ))
  with check (empresa_id in (
    select empresa_id from saas.usuarios where id = auth.uid()
  ));

-- crm_tickets
alter table saas.crm_tickets enable row level security;
create policy "crm_tickets_por_empresa"
  on saas.crm_tickets for all
  using (empresa_id in (
    select empresa_id from saas.usuarios where id = auth.uid()
  ))
  with check (empresa_id in (
    select empresa_id from saas.usuarios where id = auth.uid()
  ));

-- crm_associacoes
alter table saas.crm_associacoes enable row level security;
create policy "crm_associacoes_por_empresa"
  on saas.crm_associacoes for all
  using (empresa_id in (
    select empresa_id from saas.usuarios where id = auth.uid()
  ))
  with check (empresa_id in (
    select empresa_id from saas.usuarios where id = auth.uid()
  ));

-- crm_historico_estagios
alter table saas.crm_historico_estagios enable row level security;
create policy "crm_historico_estagios_por_empresa"
  on saas.crm_historico_estagios for all
  using (empresa_id in (
    select empresa_id from saas.usuarios where id = auth.uid()
  ))
  with check (empresa_id in (
    select empresa_id from saas.usuarios where id = auth.uid()
  ));

-- crm_notas
alter table saas.crm_notas enable row level security;
create policy "crm_notas_por_empresa"
  on saas.crm_notas for all
  using (empresa_id in (
    select empresa_id from saas.usuarios where id = auth.uid()
  ))
  with check (empresa_id in (
    select empresa_id from saas.usuarios where id = auth.uid()
  ));

-- =========================
-- COMENTARIOS DE REFERENCIA
-- =========================
comment on table saas.crm_contatos is 'Contatos CRM (object_type_id=0-1). URL: /contact/0-1/{numero_registro}';
comment on table saas.crm_empresas is 'Empresas/Contas CRM externas (object_type_id=0-2). URL: /company/0-2/{numero_registro}';
comment on table saas.crm_negocios is 'Negocios/Deals CRM (object_type_id=0-3). URL: /deal/0-3/{numero_registro}';
comment on table saas.crm_tickets is 'Tickets CRM (object_type_id=0-4). URL: /ticket/0-4/{numero_registro}';
comment on table saas.crm_associacoes is 'Associacoes N:N entre objetos CRM (contact, company, deal, ticket)';
comment on table saas.crm_pipelines is 'Pipelines configuraveis para deals e tickets';
comment on table saas.crm_pipeline_estagios is 'Estagios/colunas de cada pipeline (kanban)';
comment on table saas.crm_historico_estagios is 'Historico de mudancas de estagio em deals e tickets';
comment on table saas.crm_notas is 'Notas/comentarios em qualquer objeto CRM';
