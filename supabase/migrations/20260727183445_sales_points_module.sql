create table public.sales_points (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  company_name text,
  responsible_name text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  commission_percentage numeric(8, 2) not null default 0 check (commission_percentage >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sales_point_stock (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sales_point_id uuid not null references public.sales_points(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null default 0 check (quantity >= 0),
  minimum_quantity integer not null default 0 check (minimum_quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sales_point_id, product_id)
);

create table public.sales_point_qrcodes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sales_point_id uuid not null references public.sales_points(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  token text not null unique,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sales_point_id, product_id)
);

create table public.sales_point_sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sales_point_id uuid not null references public.sales_points(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  qrcode_id uuid references public.sales_point_qrcodes(id) on delete set null,
  customer_name text,
  customer_phone text,
  customer_email text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  commission_percentage numeric(8, 2) not null default 0,
  commission_amount numeric(12, 2) not null default 0,
  company_amount numeric(12, 2) not null default 0,
  payment_provider text not null default 'asaas',
  payment_id text unique,
  payment_status text not null default 'pending',
  pix_qr_code text,
  pix_copy_paste text,
  pix_expires_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled', 'failed')),
  raw_payload jsonb not null default '{}'::jsonb,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sales_point_commissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sales_point_id uuid not null references public.sales_points(id) on delete restrict,
  sale_id uuid not null unique references public.sales_point_sales(id) on delete cascade,
  percentage numeric(8, 2) not null default 0,
  gross_amount numeric(12, 2) not null default 0,
  commission_amount numeric(12, 2) not null default 0,
  company_amount numeric(12, 2) not null default 0,
  status text not null default 'payable' check (status in ('payable', 'paid', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.sales_point_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sales_point_id uuid references public.sales_points(id) on delete set null,
  product_id uuid not null references public.products(id) on delete restrict,
  movement_type text not null check (movement_type in ('replenishment', 'withdrawal', 'sale', 'adjustment', 'cancellation')),
  quantity integer not null check (quantity <> 0),
  previous_point_balance integer,
  new_point_balance integer,
  previous_main_balance integer,
  new_main_balance integer,
  origin text,
  destination text,
  reason text,
  reference_type text,
  reference_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index sales_points_org_idx on public.sales_points (organization_id);
create index sales_point_stock_point_idx on public.sales_point_stock (sales_point_id);
create index sales_point_stock_product_idx on public.sales_point_stock (product_id);
create index sales_point_qrcodes_token_idx on public.sales_point_qrcodes (token);
create index sales_point_sales_point_idx on public.sales_point_sales (sales_point_id, created_at desc);
create index sales_point_sales_payment_idx on public.sales_point_sales (payment_id);
create index sales_point_movements_point_idx on public.sales_point_movements (sales_point_id, created_at desc);

create trigger sales_points_set_updated_at before update on public.sales_points
for each row execute function public.set_updated_at();

create trigger sales_point_stock_set_updated_at before update on public.sales_point_stock
for each row execute function public.set_updated_at();

create trigger sales_point_qrcodes_set_updated_at before update on public.sales_point_qrcodes
for each row execute function public.set_updated_at();

create trigger sales_point_sales_set_updated_at before update on public.sales_point_sales
for each row execute function public.set_updated_at();

alter table public.sales_points enable row level security;
alter table public.sales_point_stock enable row level security;
alter table public.sales_point_qrcodes enable row level security;
alter table public.sales_point_sales enable row level security;
alter table public.sales_point_commissions enable row level security;
alter table public.sales_point_movements enable row level security;

create policy "Users can manage sales points in their organization" on public.sales_points
for all using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

create policy "Users can manage sales point stock in their organization" on public.sales_point_stock
for all using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

create policy "Users can manage sales point qrcodes in their organization" on public.sales_point_qrcodes
for all using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

create policy "Users can manage sales point sales in their organization" on public.sales_point_sales
for all using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

create policy "Users can manage sales point commissions in their organization" on public.sales_point_commissions
for all using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

create policy "Users can read sales point movements in their organization" on public.sales_point_movements
for select using (organization_id = public.current_organization_id());

create policy "Users can create sales point movements in their organization" on public.sales_point_movements
for insert with check (organization_id = public.current_organization_id());

create or replace function public.ensure_sales_point_qrcode(
  p_sales_point_id uuid,
  p_product_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qrcode_id uuid;
  v_org_id uuid;
  v_token text;
begin
  select organization_id into v_org_id
  from public.sales_points
  where id = p_sales_point_id
    and organization_id = public.current_organization_id();

  if v_org_id is null then
    raise exception 'Ponto de venda invalido.';
  end if;

  select id into v_qrcode_id
  from public.sales_point_qrcodes
  where sales_point_id = p_sales_point_id
    and product_id = p_product_id;

  if v_qrcode_id is not null then
    return v_qrcode_id;
  end if;

  loop
    v_token := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10));
    begin
      insert into public.sales_point_qrcodes (organization_id, sales_point_id, product_id, token)
      values (v_org_id, p_sales_point_id, p_product_id, v_token)
      returning id into v_qrcode_id;
      return v_qrcode_id;
    exception when unique_violation then
    end;
  end loop;
end;
$$;

create or replace function public.transfer_product_to_sales_point(
  p_sales_point_id uuid,
  p_product_id uuid,
  p_quantity integer,
  p_minimum_quantity integer default 0,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_product public.products%rowtype;
  v_stock public.sales_point_stock%rowtype;
  v_previous_point integer := 0;
  v_new_point integer;
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado.';
  end if;
  if p_quantity <= 0 then
    raise exception 'Quantidade deve ser maior que zero.';
  end if;

  select organization_id into v_org_id
  from public.sales_points
  where id = p_sales_point_id
    and organization_id = public.current_organization_id()
    and status = 'active';

  if v_org_id is null then
    raise exception 'Ponto de venda invalido ou inativo.';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id
    and organization_id = v_org_id
  for update;

  if not found then
    raise exception 'Produto invalido.';
  end if;
  if v_product.finished_stock_quantity < p_quantity then
    raise exception 'Estoque principal insuficiente.';
  end if;

  update public.products
  set finished_stock_quantity = finished_stock_quantity - p_quantity
  where id = p_product_id;

  select * into v_stock
  from public.sales_point_stock
  where sales_point_id = p_sales_point_id
    and product_id = p_product_id
  for update;

  if found then
    v_previous_point := v_stock.quantity;
    update public.sales_point_stock
    set quantity = quantity + p_quantity,
        minimum_quantity = greatest(minimum_quantity, greatest(0, p_minimum_quantity))
    where id = v_stock.id
    returning quantity into v_new_point;
  else
    v_new_point := p_quantity;
    insert into public.sales_point_stock (organization_id, sales_point_id, product_id, quantity, minimum_quantity)
    values (v_org_id, p_sales_point_id, p_product_id, p_quantity, greatest(0, p_minimum_quantity));
  end if;

  perform public.ensure_sales_point_qrcode(p_sales_point_id, p_product_id);

  insert into public.finished_product_movements (organization_id, product_id, movement_type, quantity, unit_cost, total_cost, notes, created_by)
  values (v_org_id, p_product_id, 'adjustment', -p_quantity, v_product.calculated_unit_cost, -p_quantity * v_product.calculated_unit_cost, coalesce(p_reason, 'Abastecimento de ponto de venda'), auth.uid());

  insert into public.sales_point_movements (
    organization_id, sales_point_id, product_id, movement_type, quantity,
    previous_point_balance, new_point_balance, previous_main_balance, new_main_balance,
    origin, destination, reason, created_by
  )
  values (
    v_org_id, p_sales_point_id, p_product_id, 'replenishment', p_quantity,
    v_previous_point, v_new_point, v_product.finished_stock_quantity, v_product.finished_stock_quantity - p_quantity,
    'Estoque principal', 'Ponto de venda', p_reason, auth.uid()
  );

  return jsonb_build_object('ok', true, 'point_quantity', v_new_point, 'main_quantity', v_product.finished_stock_quantity - p_quantity);
end;
$$;

create or replace function public.withdraw_product_from_sales_point(
  p_sales_point_id uuid,
  p_product_id uuid,
  p_quantity integer,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_product public.products%rowtype;
  v_stock public.sales_point_stock%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado.';
  end if;
  if p_quantity <= 0 then
    raise exception 'Quantidade deve ser maior que zero.';
  end if;

  select organization_id into v_org_id
  from public.sales_points
  where id = p_sales_point_id
    and organization_id = public.current_organization_id();

  if v_org_id is null then
    raise exception 'Ponto de venda invalido.';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id
    and organization_id = v_org_id
  for update;

  select * into v_stock
  from public.sales_point_stock
  where sales_point_id = p_sales_point_id
    and product_id = p_product_id
  for update;

  if not found or v_stock.quantity < p_quantity then
    raise exception 'Estoque insuficiente no ponto de venda.';
  end if;

  update public.sales_point_stock
  set quantity = quantity - p_quantity
  where id = v_stock.id;

  update public.products
  set finished_stock_quantity = finished_stock_quantity + p_quantity
  where id = p_product_id;

  insert into public.finished_product_movements (organization_id, product_id, movement_type, quantity, unit_cost, total_cost, notes, created_by)
  values (v_org_id, p_product_id, 'return', p_quantity, v_product.calculated_unit_cost, p_quantity * v_product.calculated_unit_cost, coalesce(p_reason, 'Retirada de ponto de venda'), auth.uid());

  insert into public.sales_point_movements (
    organization_id, sales_point_id, product_id, movement_type, quantity,
    previous_point_balance, new_point_balance, previous_main_balance, new_main_balance,
    origin, destination, reason, created_by
  )
  values (
    v_org_id, p_sales_point_id, p_product_id, 'withdrawal', -p_quantity,
    v_stock.quantity, v_stock.quantity - p_quantity, v_product.finished_stock_quantity, v_product.finished_stock_quantity + p_quantity,
    'Ponto de venda', 'Estoque principal', p_reason, auth.uid()
  );

  return jsonb_build_object('ok', true, 'point_quantity', v_stock.quantity - p_quantity, 'main_quantity', v_product.finished_stock_quantity + p_quantity);
end;
$$;

create or replace function public.confirm_sales_point_sale(
  p_sale_id uuid,
  p_payment_id text default null,
  p_raw_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales_point_sales%rowtype;
  v_stock public.sales_point_stock%rowtype;
begin
  select * into v_sale
  from public.sales_point_sales
  where id = p_sale_id
  for update;

  if not found then
    raise exception 'Venda PDV nao encontrada.';
  end if;

  if v_sale.status = 'completed' then
    return jsonb_build_object('ok', true, 'already_completed', true);
  end if;

  select * into v_stock
  from public.sales_point_stock
  where sales_point_id = v_sale.sales_point_id
    and product_id = v_sale.product_id
  for update;

  if not found or v_stock.quantity < v_sale.quantity then
    update public.sales_point_sales
    set status = 'failed',
        payment_status = 'stock_unavailable',
        raw_payload = coalesce(p_raw_payload, '{}'::jsonb)
    where id = p_sale_id;
    raise exception 'Estoque insuficiente no ponto de venda.';
  end if;

  update public.sales_point_stock
  set quantity = quantity - v_sale.quantity
  where id = v_stock.id;

  update public.sales_point_sales
  set status = 'completed',
      payment_status = 'confirmed',
      payment_id = coalesce(p_payment_id, payment_id),
      raw_payload = coalesce(p_raw_payload, '{}'::jsonb),
      confirmed_at = now()
  where id = p_sale_id;

  insert into public.sales_point_commissions (
    organization_id, sales_point_id, sale_id, percentage, gross_amount, commission_amount, company_amount
  )
  values (
    v_sale.organization_id, v_sale.sales_point_id, v_sale.id, v_sale.commission_percentage,
    v_sale.total_amount, v_sale.commission_amount, v_sale.company_amount
  )
  on conflict (sale_id) do nothing;

  insert into public.sales_point_movements (
    organization_id, sales_point_id, product_id, movement_type, quantity,
    previous_point_balance, new_point_balance, origin, destination, reason, reference_type, reference_id
  )
  values (
    v_sale.organization_id, v_sale.sales_point_id, v_sale.product_id, 'sale', -v_sale.quantity,
    v_stock.quantity, v_stock.quantity - v_sale.quantity, 'Ponto de venda', 'Cliente', 'Venda confirmada por Pix',
    'sales_point_sale', v_sale.id
  );

  return jsonb_build_object('ok', true, 'point_quantity', v_stock.quantity - v_sale.quantity);
end;
$$;

revoke all on function public.ensure_sales_point_qrcode(uuid, uuid) from public;
revoke all on function public.transfer_product_to_sales_point(uuid, uuid, integer, integer, text) from public;
revoke all on function public.withdraw_product_from_sales_point(uuid, uuid, integer, text) from public;
revoke all on function public.confirm_sales_point_sale(uuid, text, jsonb) from public;

grant execute on function public.ensure_sales_point_qrcode(uuid, uuid) to authenticated;
grant execute on function public.transfer_product_to_sales_point(uuid, uuid, integer, integer, text) to authenticated;
grant execute on function public.withdraw_product_from_sales_point(uuid, uuid, integer, text) to authenticated;
grant execute on function public.confirm_sales_point_sale(uuid, text, jsonb) to service_role;
