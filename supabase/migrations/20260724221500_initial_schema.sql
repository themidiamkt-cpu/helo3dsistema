create extension if not exists "pgcrypto";

create type public.user_role as enum ('owner', 'admin', 'operator');
create type public.printer_status as enum ('available', 'printing', 'maintenance', 'inactive');
create type public.production_status as enum ('draft', 'waiting', 'slicing', 'printing', 'finishing', 'completed', 'failed', 'cancelled');
create type public.movement_type as enum ('initial', 'purchase', 'production_consumption', 'production_output', 'sale', 'loss', 'adjustment', 'return', 'cancellation');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id),
  full_name text,
  email text not null,
  role public.user_role not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  energy_cost_per_kwh numeric(12,2) not null default 1.10 check (energy_cost_per_kwh >= 0),
  default_printer_power_watts numeric(12,2) not null default 80 check (default_printer_power_watts >= 0),
  default_machine_cost_per_hour numeric(12,2) not null default 3.00 check (default_machine_cost_per_hour >= 0),
  default_labor_cost_per_hour numeric(12,2) not null default 0 check (default_labor_cost_per_hour >= 0),
  default_waste_percentage numeric(6,2) not null default 5 check (default_waste_percentage >= 0 and default_waste_percentage <= 100),
  default_markup numeric(8,2) not null default 2.50 check (default_markup > 0),
  minimum_profit_margin numeric(6,2) not null default 40 check (minimum_profit_margin >= 0),
  rounding_rule text not null default 'none',
  currency text not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.filaments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  brand text,
  material text not null check (material in ('PLA', 'PLA+', 'PETG', 'ABS', 'ASA', 'TPU', 'Nylon', 'Outro')),
  color_name text,
  color_hex text check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  supplier text,
  initial_weight_grams numeric(12,3) not null check (initial_weight_grams > 0),
  current_weight_grams numeric(12,3) not null default 0 check (current_weight_grams >= 0),
  spool_weight_grams numeric(12,3) not null default 0 check (spool_weight_grams >= 0),
  purchase_price numeric(12,2) not null check (purchase_price >= 0),
  cost_per_gram numeric(12,6) generated always as (purchase_price / nullif(initial_weight_grams, 0)) stored,
  minimum_stock_grams numeric(12,3) not null default 0 check (minimum_stock_grams >= 0),
  purchase_date date,
  lot_number text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_supplies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  sku text,
  category text not null,
  unit text not null check (unit in ('unidade', 'pacote', 'metro', 'grama', 'quilograma')),
  current_quantity numeric(12,3) not null default 0 check (current_quantity >= 0),
  minimum_quantity numeric(12,3) not null default 0 check (minimum_quantity >= 0),
  purchase_quantity numeric(12,3) not null check (purchase_quantity > 0),
  purchase_price numeric(12,2) not null check (purchase_price >= 0),
  unit_cost numeric(12,6) generated always as (purchase_price / nullif(purchase_quantity, 0)) stored,
  supplier text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sku)
);

create table public.printers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  model text,
  power_watts numeric(12,2) not null default 80 check (power_watts >= 0),
  machine_cost_per_hour numeric(12,2) not null default 3 check (machine_cost_per_hour >= 0),
  purchase_price numeric(12,2) check (purchase_price is null or purchase_price >= 0),
  purchase_date date,
  status public.printer_status not null default 'available',
  total_printed_hours numeric(12,2) not null default 0 check (total_printed_hours >= 0),
  maintenance_interval_hours numeric(12,2) check (maintenance_interval_hours is null or maintenance_interval_hours >= 0),
  next_maintenance_at_hours numeric(12,2) check (next_maintenance_at_hours is null or next_maintenance_at_hours >= 0),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  sku text,
  category text,
  description text,
  image_url text,
  printer_id uuid references public.printers(id),
  print_time_minutes integer not null check (print_time_minutes >= 0),
  batch_quantity integer not null default 1 check (batch_quantity > 0),
  packaging_cost numeric(12,2) not null default 0 check (packaging_cost >= 0),
  fixed_labor_cost numeric(12,2) not null default 0 check (fixed_labor_cost >= 0),
  labor_time_minutes integer not null default 0 check (labor_time_minutes >= 0),
  machine_cost_per_hour numeric(12,2) not null default 3 check (machine_cost_per_hour >= 0),
  energy_cost_per_kwh numeric(12,2) not null default 1.10 check (energy_cost_per_kwh >= 0),
  printer_power_watts numeric(12,2) not null default 80 check (printer_power_watts >= 0),
  waste_percentage numeric(6,2) not null default 5 check (waste_percentage >= 0 and waste_percentage <= 100),
  desired_markup numeric(8,2) not null default 2.5 check (desired_markup > 0),
  manual_sale_price numeric(12,2) check (manual_sale_price is null or manual_sale_price >= 0),
  calculated_cost numeric(12,2) not null default 0 check (calculated_cost >= 0),
  calculated_unit_cost numeric(12,2) not null default 0 check (calculated_unit_cost >= 0),
  calculated_sale_price numeric(12,2) not null default 0 check (calculated_sale_price >= 0),
  finished_stock_quantity integer not null default 0 check (finished_stock_quantity >= 0),
  minimum_finished_stock integer not null default 0 check (minimum_finished_stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sku)
);

create table public.product_filaments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  filament_id uuid not null references public.filaments(id),
  weight_grams numeric(12,3) not null check (weight_grams >= 0)
);

create table public.product_supplies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  supply_id uuid not null references public.inventory_supplies(id),
  quantity numeric(12,3) not null check (quantity >= 0)
);

create table public.production_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_number text not null,
  product_id uuid not null references public.products(id),
  printer_id uuid references public.printers(id),
  planned_quantity integer not null check (planned_quantity > 0),
  produced_quantity integer not null default 0 check (produced_quantity >= 0),
  failed_quantity integer not null default 0 check (failed_quantity >= 0),
  status public.production_status not null default 'draft',
  planned_start_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  estimated_minutes integer not null default 0 check (estimated_minutes >= 0),
  actual_minutes integer check (actual_minutes is null or actual_minutes >= 0),
  estimated_material_cost numeric(12,2) not null default 0 check (estimated_material_cost >= 0),
  actual_material_cost numeric(12,2) check (actual_material_cost is null or actual_material_cost >= 0),
  estimated_total_cost numeric(12,2) not null default 0 check (estimated_total_cost >= 0),
  actual_total_cost numeric(12,2) check (actual_total_cost is null or actual_total_cost >= 0),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, order_number)
);

create table public.production_order_filaments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  production_order_id uuid not null references public.production_orders(id) on delete cascade,
  filament_id uuid not null references public.filaments(id),
  planned_weight_grams numeric(12,3) not null default 0,
  actual_weight_grams numeric(12,3) not null default 0,
  wasted_weight_grams numeric(12,3) not null default 0,
  unit_cost_snapshot numeric(12,6) not null default 0,
  total_cost numeric(12,2) not null default 0
);

create table public.production_order_supplies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  production_order_id uuid not null references public.production_orders(id) on delete cascade,
  supply_id uuid not null references public.inventory_supplies(id),
  planned_quantity numeric(12,3) not null default 0,
  actual_quantity numeric(12,3) not null default 0,
  unit_cost_snapshot numeric(12,6) not null default 0,
  total_cost numeric(12,2) not null default 0
);

create table public.filament_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  item_id uuid not null references public.filaments(id),
  movement_type public.movement_type not null,
  quantity numeric(12,3) not null,
  previous_balance numeric(12,3) not null,
  new_balance numeric(12,3) not null check (new_balance >= 0),
  unit_cost numeric(12,6) not null default 0,
  total_cost numeric(12,2) not null default 0,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.supply_movements (like public.filament_movements including defaults including constraints);
alter table public.supply_movements add constraint supply_movements_item_id_fkey foreign key (item_id) references public.inventory_supplies(id);
alter table public.supply_movements add constraint supply_movements_org_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.supply_movements add constraint supply_movements_created_by_fkey foreign key (created_by) references auth.users(id);

create table public.finished_product_movements (like public.filament_movements including defaults including constraints);
alter table public.finished_product_movements add constraint finished_product_movements_item_id_fkey foreign key (item_id) references public.products(id);
alter table public.finished_product_movements add constraint finished_product_movements_org_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.finished_product_movements add constraint finished_product_movements_created_by_fkey foreign key (created_by) references auth.users(id);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  document text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id),
  status text not null default 'draft',
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  shipping numeric(12,2) not null default 0,
  platform_fee numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_method text,
  payment_status text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  unit_cost_snapshot numeric(12,2) not null check (unit_cost_snapshot >= 0),
  total numeric(12,2) not null check (total >= 0)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger organization_settings_updated_at before update on public.organization_settings for each row execute function public.set_updated_at();
create trigger filaments_updated_at before update on public.filaments for each row execute function public.set_updated_at();
create trigger inventory_supplies_updated_at before update on public.inventory_supplies for each row execute function public.set_updated_at();
create trigger printers_updated_at before update on public.printers for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger production_orders_updated_at before update on public.production_orders for each row execute function public.set_updated_at();

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = (select auth.uid())
$$;
revoke all on function public.current_organization_id() from public;
grant execute on function public.current_organization_id() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
  org_name text;
  org_slug text;
begin
  org_name := coalesce(new.raw_user_meta_data->>'organization_name', split_part(new.email, '@', 1));
  org_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(new.id::text, 1, 8);

  insert into public.organizations (name, slug) values (org_name, org_slug) returning id into org_id;
  insert into public.profiles (id, organization_id, full_name, email, role)
  values (new.id, org_id, new.raw_user_meta_data->>'full_name', new.email, 'owner');
  insert into public.organization_settings (organization_id) values (org_id);

  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.register_filament_purchase(p_filament_id uuid, p_quantity numeric, p_total_cost numeric, p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item filaments%rowtype;
  previous numeric;
  new_balance numeric;
begin
  if (select auth.uid()) is null then raise exception 'Nao autenticado'; end if;
  if p_quantity <= 0 or p_total_cost < 0 then raise exception 'Valores invalidos'; end if;

  select * into item from public.filaments where id = p_filament_id and organization_id = public.current_organization_id() for update;
  if not found then raise exception 'Filamento nao encontrado'; end if;

  previous := item.current_weight_grams;
  new_balance := previous + p_quantity;

  update public.filaments set current_weight_grams = new_balance where id = p_filament_id;
  insert into public.filament_movements (organization_id, item_id, movement_type, quantity, previous_balance, new_balance, unit_cost, total_cost, reference_type, notes, created_by)
  values (item.organization_id, item.id, 'purchase', p_quantity, previous, new_balance, p_total_cost / nullif(p_quantity, 0), p_total_cost, 'manual', p_notes, auth.uid());

  return jsonb_build_object('new_balance', new_balance);
end;
$$;

create or replace function public.register_supply_purchase(p_supply_id uuid, p_quantity numeric, p_total_cost numeric, p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item inventory_supplies%rowtype;
  previous numeric;
  new_balance numeric;
begin
  if (select auth.uid()) is null then raise exception 'Nao autenticado'; end if;
  if p_quantity <= 0 or p_total_cost < 0 then raise exception 'Valores invalidos'; end if;

  select * into item from public.inventory_supplies where id = p_supply_id and organization_id = public.current_organization_id() for update;
  if not found then raise exception 'Componente nao encontrado'; end if;

  previous := item.current_quantity;
  new_balance := previous + p_quantity;

  update public.inventory_supplies set current_quantity = new_balance where id = p_supply_id;
  insert into public.supply_movements (organization_id, item_id, movement_type, quantity, previous_balance, new_balance, unit_cost, total_cost, reference_type, notes, created_by)
  values (item.organization_id, item.id, 'purchase', p_quantity, previous, new_balance, p_total_cost / nullif(p_quantity, 0), p_total_cost, 'manual', p_notes, auth.uid());

  return jsonb_build_object('new_balance', new_balance);
end;
$$;

create or replace function public.adjust_finished_product_stock(p_product_id uuid, p_quantity_delta integer, p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item products%rowtype;
  previous integer;
  new_balance integer;
  move_type public.movement_type;
begin
  if (select auth.uid()) is null then raise exception 'Nao autenticado'; end if;
  select * into item from public.products where id = p_product_id and organization_id = public.current_organization_id() for update;
  if not found then raise exception 'Produto nao encontrado'; end if;

  previous := item.finished_stock_quantity;
  new_balance := previous + p_quantity_delta;
  if new_balance < 0 then raise exception 'Estoque insuficiente'; end if;
  move_type := case when p_quantity_delta >= 0 then 'adjustment'::public.movement_type else 'sale'::public.movement_type end;

  update public.products set finished_stock_quantity = new_balance where id = p_product_id;
  insert into public.finished_product_movements (organization_id, item_id, movement_type, quantity, previous_balance, new_balance, unit_cost, total_cost, reference_type, notes, created_by)
  values (item.organization_id, item.id, move_type, p_quantity_delta, previous, new_balance, item.calculated_unit_cost, abs(p_quantity_delta) * item.calculated_unit_cost, 'manual', p_notes, auth.uid());

  return jsonb_build_object('new_balance', new_balance);
end;
$$;

create or replace function public.finish_production_order(p_order_id uuid, p_produced_quantity integer, p_failed_quantity integer, p_actual_minutes integer, p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row production_orders%rowtype;
  product_row products%rowtype;
  filament_row record;
  supply_row record;
  previous numeric;
  new_balance numeric;
  actual_total numeric := 0;
begin
  if (select auth.uid()) is null then raise exception 'Nao autenticado'; end if;
  if p_produced_quantity < 0 or p_failed_quantity < 0 or p_actual_minutes < 0 then raise exception 'Valores invalidos'; end if;

  select * into order_row from public.production_orders where id = p_order_id and organization_id = public.current_organization_id() for update;
  if not found then raise exception 'Ordem nao encontrada'; end if;
  if order_row.status in ('completed', 'failed', 'cancelled') then
    return jsonb_build_object('status', order_row.status, 'idempotent', true);
  end if;

  select * into product_row from public.products where id = order_row.product_id and organization_id = order_row.organization_id for update;

  for filament_row in
    select f.id, f.current_weight_grams, pf.weight_grams, f.cost_per_gram
    from public.product_filaments pf
    join public.filaments f on f.id = pf.filament_id
    where pf.product_id = order_row.product_id and pf.organization_id = order_row.organization_id
  loop
    previous := filament_row.current_weight_grams;
    new_balance := previous - filament_row.weight_grams;
    if new_balance < 0 then raise exception 'Estoque de filamento insuficiente'; end if;
    update public.filaments set current_weight_grams = new_balance where id = filament_row.id;
    insert into public.filament_movements (organization_id, item_id, movement_type, quantity, previous_balance, new_balance, unit_cost, total_cost, reference_type, reference_id, notes, created_by)
    values (order_row.organization_id, filament_row.id, 'production_consumption', -filament_row.weight_grams, previous, new_balance, filament_row.cost_per_gram, filament_row.weight_grams * filament_row.cost_per_gram, 'production_order', order_row.id, p_notes, auth.uid());
    actual_total := actual_total + filament_row.weight_grams * filament_row.cost_per_gram;
  end loop;

  for supply_row in
    select s.id, s.current_quantity, ps.quantity, s.unit_cost
    from public.product_supplies ps
    join public.inventory_supplies s on s.id = ps.supply_id
    where ps.product_id = order_row.product_id and ps.organization_id = order_row.organization_id
  loop
    previous := supply_row.current_quantity;
    new_balance := previous - supply_row.quantity;
    if new_balance < 0 then raise exception 'Estoque de componente insuficiente'; end if;
    update public.inventory_supplies set current_quantity = new_balance where id = supply_row.id;
    insert into public.supply_movements (organization_id, item_id, movement_type, quantity, previous_balance, new_balance, unit_cost, total_cost, reference_type, reference_id, notes, created_by)
    values (order_row.organization_id, supply_row.id, 'production_consumption', -supply_row.quantity, previous, new_balance, supply_row.unit_cost, supply_row.quantity * supply_row.unit_cost, 'production_order', order_row.id, p_notes, auth.uid());
    actual_total := actual_total + supply_row.quantity * supply_row.unit_cost;
  end loop;

  if p_produced_quantity > 0 then
    previous := product_row.finished_stock_quantity;
    new_balance := previous + p_produced_quantity;
    update public.products set finished_stock_quantity = new_balance where id = product_row.id;
    insert into public.finished_product_movements (organization_id, item_id, movement_type, quantity, previous_balance, new_balance, unit_cost, total_cost, reference_type, reference_id, notes, created_by)
    values (order_row.organization_id, product_row.id, 'production_output', p_produced_quantity, previous, new_balance, product_row.calculated_unit_cost, p_produced_quantity * product_row.calculated_unit_cost, 'production_order', order_row.id, p_notes, auth.uid());
  end if;

  update public.production_orders
  set status = case when p_produced_quantity > 0 then 'completed' else 'failed' end,
      produced_quantity = p_produced_quantity,
      failed_quantity = p_failed_quantity,
      actual_minutes = p_actual_minutes,
      actual_material_cost = actual_total,
      actual_total_cost = greatest(actual_total, estimated_total_cost),
      finished_at = now(),
      notes = coalesce(p_notes, notes)
  where id = order_row.id;

  if order_row.printer_id is not null then
    update public.printers
    set status = 'available',
        total_printed_hours = total_printed_hours + (p_actual_minutes::numeric / 60)
    where id = order_row.printer_id and organization_id = order_row.organization_id;
  end if;

  return jsonb_build_object('status', case when p_produced_quantity > 0 then 'completed' else 'failed' end, 'actual_total', actual_total);
end;
$$;

revoke all on function public.register_filament_purchase(uuid, numeric, numeric, text) from public;
revoke all on function public.register_supply_purchase(uuid, numeric, numeric, text) from public;
revoke all on function public.adjust_finished_product_stock(uuid, integer, text) from public;
revoke all on function public.finish_production_order(uuid, integer, integer, integer, text) from public;
grant execute on function public.register_filament_purchase(uuid, numeric, numeric, text) to authenticated;
grant execute on function public.register_supply_purchase(uuid, numeric, numeric, text) to authenticated;
grant execute on function public.adjust_finished_product_stock(uuid, integer, text) to authenticated;
grant execute on function public.finish_production_order(uuid, integer, integer, integer, text) to authenticated;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_settings enable row level security;
alter table public.filaments enable row level security;
alter table public.inventory_supplies enable row level security;
alter table public.printers enable row level security;
alter table public.products enable row level security;
alter table public.product_filaments enable row level security;
alter table public.product_supplies enable row level security;
alter table public.production_orders enable row level security;
alter table public.production_order_filaments enable row level security;
alter table public.production_order_supplies enable row level security;
alter table public.filament_movements enable row level security;
alter table public.supply_movements enable row level security;
alter table public.finished_product_movements enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

create policy "profiles own organization read" on public.profiles for select to authenticated using (organization_id = public.current_organization_id() or id = auth.uid());
create policy "profiles own update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "organizations own read" on public.organizations for select to authenticated using (id = public.current_organization_id());

create policy "organization_settings org access" on public.organization_settings for all to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id());
create policy "filaments org access" on public.filaments for all to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id());
create policy "inventory_supplies org access" on public.inventory_supplies for all to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id());
create policy "printers org access" on public.printers for all to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id());
create policy "products org access" on public.products for all to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id());
create policy "product_filaments org access" on public.product_filaments for all to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id());
create policy "product_supplies org access" on public.product_supplies for all to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id());
create policy "production_orders org access" on public.production_orders for all to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id());
create policy "production_order_filaments org access" on public.production_order_filaments for all to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id());
create policy "production_order_supplies org access" on public.production_order_supplies for all to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id());
create policy "filament_movements org read" on public.filament_movements for select to authenticated using (organization_id = public.current_organization_id());
create policy "supply_movements org read" on public.supply_movements for select to authenticated using (organization_id = public.current_organization_id());
create policy "finished_product_movements org read" on public.finished_product_movements for select to authenticated using (organization_id = public.current_organization_id());
create policy "customers org access" on public.customers for all to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id());
create policy "sales org access" on public.sales for all to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id());
create policy "sale_items org access" on public.sale_items for all to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id());

create index on public.profiles (organization_id);
create index on public.filaments (organization_id, material, created_at);
create index on public.inventory_supplies (organization_id, sku, created_at);
create index on public.printers (organization_id, status, created_at);
create index on public.products (organization_id, sku, printer_id, created_at);
create index on public.product_filaments (organization_id, product_id, filament_id);
create index on public.product_supplies (organization_id, product_id, supply_id);
create index on public.production_orders (organization_id, product_id, printer_id, status, order_number, created_at);
create index on public.production_order_filaments (organization_id, production_order_id, filament_id);
create index on public.production_order_supplies (organization_id, production_order_id, supply_id);
create index on public.filament_movements (organization_id, item_id, movement_type, created_at);
create index on public.supply_movements (organization_id, item_id, movement_type, created_at);
create index on public.finished_product_movements (organization_id, item_id, movement_type, created_at);
create index on public.customers (organization_id, created_at);
create index on public.sales (organization_id, status, created_at);
create index on public.sale_items (organization_id, sale_id, product_id);

