create extension if not exists pgcrypto;

create type miner_marketplace_code as enum ('SHOPEE', 'MERCADO_LIVRE');
create type miner_data_source as enum ('OFFICIAL_API', 'PAGE_PUBLIC_DATA', 'HISTORICAL_ESTIMATE', 'AI_ESTIMATE', 'MANUAL');
create type miner_job_status as enum ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
create type miner_trend as enum ('TRENDING_UP', 'STABLE', 'TRENDING_DOWN', 'INSUFFICIENT_DATA');
create type miner_lifecycle as enum ('NEW', 'EMERGING', 'HOT', 'STABLE', 'SATURATED', 'DECLINING');
create type miner_analysis_status as enum ('NOT_ANALYZED', 'WANT_TO_TEST', 'STL_FOUND', 'PRINT_TEST', 'PRODUCING', 'DISCARDED');
create type miner_keyword_suggestion_status as enum ('SUGGESTED', 'APPROVED', 'REJECTED');
create type miner_manufacturing as enum ('FDM', 'RESIN', 'INJECTION', 'OTHER', 'UNKNOWN');
create type miner_material as enum ('PLA', 'PETG', 'ABS', 'TPU', 'RESIN', 'UNKNOWN');
create type miner_complexity as enum ('LOW', 'MEDIUM', 'HIGH');

create table miner_marketplaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  code miner_marketplace_code not null,
  name text not null,
  enabled boolean not null default true,
  collection_method text not null default 'adapter',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table miner_keywords (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  keyword text not null,
  status miner_keyword_suggestion_status not null default 'APPROVED',
  active boolean not null default true,
  max_results integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, keyword)
);

create table miner_sellers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  marketplace miner_marketplace_code not null,
  external_id text,
  name text,
  url text,
  location text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, marketplace, external_id)
);

create table miner_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  marketplace miner_marketplace_code not null,
  external_id text,
  canonical_url text not null,
  title text not null,
  url text not null,
  image_url text,
  seller_id uuid references miner_sellers(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  active boolean not null default true,
  demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, marketplace, external_id),
  unique (organization_id, marketplace, canonical_url)
);

create table miner_product_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  product_id uuid not null references miner_products(id) on delete cascade,
  keyword_id uuid references miner_keywords(id) on delete set null,
  keyword text,
  price numeric(12,2),
  original_price numeric(12,2),
  sold_quantity integer,
  rating numeric(4,2),
  review_count integer,
  search_position integer,
  sponsored boolean,
  collected_at timestamptz not null default now(),
  data_source miner_data_source not null,
  raw_payload jsonb not null default '{}'::jsonb
);

create table miner_product_classifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  product_id uuid not null references miner_products(id) on delete cascade,
  probability_3d_printed integer not null check (probability_3d_printed between 0 and 100),
  likely_manufacturing miner_manufacturing not null default 'UNKNOWN',
  likely_material miner_material not null default 'UNKNOWN',
  print_complexity miner_complexity not null default 'MEDIUM',
  support_probability integer not null default 0 check (support_probability between 0 and 100),
  assembly_required boolean,
  multi_color boolean,
  ams_recommended boolean,
  estimated_print_difficulty integer not null default 50 check (estimated_print_difficulty between 0 and 100),
  confidence integer not null default 0 check (confidence between 0 and 100),
  reason text,
  model text,
  data_source miner_data_source not null default 'AI_ESTIMATE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, product_id)
);

create table miner_product_clusters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  normalized_title text not null,
  competitor_count integer not null default 0,
  min_price numeric(12,2),
  avg_price numeric(12,2),
  max_price numeric(12,2),
  estimated_cluster_sales_30d integer,
  top_seller_concentration numeric(6,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table miner_product_cluster_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  cluster_id uuid not null references miner_product_clusters(id) on delete cascade,
  product_id uuid not null references miner_products(id) on delete cascade,
  similarity numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, cluster_id, product_id)
);

create table miner_opportunity_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  product_id uuid not null references miner_products(id) on delete cascade,
  score numeric(5,2) not null default 0,
  demand_score numeric(5,2) not null default 0,
  growth_score numeric(5,2) not null default 0,
  competition_score numeric(5,2) not null default 0,
  commercial_score numeric(5,2) not null default 0,
  production_ease_score numeric(5,2) not null default 0,
  quality_score numeric(5,2) not null default 0,
  trend miner_trend not null default 'INSUFFICIENT_DATA',
  lifecycle miner_lifecycle not null default 'NEW',
  reasons jsonb not null default '[]'::jsonb,
  calculated_at timestamptz not null default now(),
  unique (organization_id, product_id)
);

create table miner_collection_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  marketplace miner_marketplace_code,
  keyword_id uuid references miner_keywords(id) on delete set null,
  keyword text,
  status miner_job_status not null default 'QUEUED',
  started_at timestamptz,
  finished_at timestamptz,
  results_count integer not null default 0,
  new_products_count integer not null default 0,
  updated_products_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

create table miner_collection_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  job_id uuid references miner_collection_jobs(id) on delete cascade,
  marketplace miner_marketplace_code,
  keyword text,
  level text not null default 'info',
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table miner_ai_keyword_suggestions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  source_keyword text,
  suggested_keyword text not null,
  reason text,
  status miner_keyword_suggestion_status not null default 'SUGGESTED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, suggested_keyword)
);

create table miner_favorites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  product_id uuid not null references miner_products(id) on delete cascade,
  analysis_status miner_analysis_status not null default 'NOT_ANALYZED',
  notes text,
  estimated_weight_g numeric(10,2),
  estimated_print_time_minutes integer,
  filament_cost_per_kg numeric(12,2),
  machine_cost_per_hour numeric(12,2),
  estimated_material_cost numeric(12,2),
  estimated_machine_cost numeric(12,2),
  estimated_total_cost numeric(12,2),
  estimated_marketplace_fee numeric(12,2),
  estimated_profit numeric(12,2),
  estimated_margin numeric(8,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, product_id)
);

create table miner_ignored_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  product_id uuid not null references miner_products(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (organization_id, product_id)
);

create table miner_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade unique,
  probability_threshold integer not null default 70,
  score_weights jsonb not null default '{"demand":35,"growth":20,"competition":15,"commercial":15,"productionEase":10,"quality":5}'::jsonb,
  pla_cost_per_kg numeric(12,2) not null default 99,
  petg_cost_per_kg numeric(12,2) not null default 110,
  machine_cost_per_hour numeric(12,2) not null default 3,
  max_results_per_keyword integer not null default 100,
  collection_interval_hours integer not null default 24,
  openai_model text not null default 'gpt-5-mini',
  shopee_enabled boolean not null default true,
  mercadolivre_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index miner_products_org_last_seen_idx on miner_products (organization_id, last_seen_at desc);
create index miner_snapshots_product_time_idx on miner_product_snapshots (product_id, collected_at desc);
create index miner_scores_org_score_idx on miner_opportunity_scores (organization_id, score desc);
create index miner_keywords_org_active_idx on miner_keywords (organization_id, active, status);

alter table miner_marketplaces enable row level security;
alter table miner_keywords enable row level security;
alter table miner_sellers enable row level security;
alter table miner_products enable row level security;
alter table miner_product_snapshots enable row level security;
alter table miner_product_classifications enable row level security;
alter table miner_product_clusters enable row level security;
alter table miner_product_cluster_members enable row level security;
alter table miner_opportunity_scores enable row level security;
alter table miner_collection_jobs enable row level security;
alter table miner_collection_logs enable row level security;
alter table miner_ai_keyword_suggestions enable row level security;
alter table miner_favorites enable row level security;
alter table miner_ignored_products enable row level security;
alter table miner_settings enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'miner_marketplaces','miner_keywords','miner_sellers','miner_products','miner_product_snapshots',
    'miner_product_classifications','miner_product_clusters','miner_product_cluster_members',
    'miner_opportunity_scores','miner_collection_jobs','miner_collection_logs','miner_ai_keyword_suggestions',
    'miner_favorites','miner_ignored_products','miner_settings'
  ]
  loop
    execute format('create policy %I on %I for all to authenticated using (organization_id in (select organization_id from profiles where id = (select auth.uid()))) with check (organization_id in (select organization_id from profiles where id = (select auth.uid())))', t || '_org_policy', t);
  end loop;
end $$;

grant select, insert, update, delete on all tables in schema public to authenticated;

insert into miner_marketplaces (organization_id, code, name)
select id, 'SHOPEE', 'Shopee' from organizations
on conflict (organization_id, code) do nothing;

insert into miner_marketplaces (organization_id, code, name)
select id, 'MERCADO_LIVRE', 'Mercado Livre' from organizations
on conflict (organization_id, code) do nothing;

insert into miner_settings (organization_id)
select id from organizations
on conflict (organization_id) do nothing;

insert into miner_keywords (organization_id, keyword, status, active)
select org.id, kw.keyword, 'APPROVED', true
from organizations org
cross join (values
  ('impressão 3d'), ('impresso 3d'), ('articulado 3d'), ('fidget 3d'), ('flexi'),
  ('brinquedo articulado'), ('ovo fidget'), ('dragão articulado'), ('boneco articulado'),
  ('dummy articulado'), ('chaveiro 3d'), ('suporte 3d'), ('organizador 3d'),
  ('decoração 3d'), ('miniatura 3d'), ('porta controle'), ('porta celular'),
  ('suporte headset'), ('cortador 3d'), ('brinquedo sensorial'), ('decoração religiosa'),
  ('Nossa Senhora'), ('Jesus'), ('terço'), ('porta terço'), ('santo'), ('santos católicos')
) as kw(keyword)
on conflict (organization_id, keyword) do nothing;
