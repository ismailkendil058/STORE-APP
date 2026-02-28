
-- Create app_role enum
create type public.app_role as enum ('admin');

-- User roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- Security definer function for role checking
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- RLS for user_roles
create policy "Admins can manage roles" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Workers table
create table public.workers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin text not null,
  created_at timestamptz default now()
);
alter table public.workers enable row level security;
create policy "Admins can manage workers" on public.workers
  for all to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Categories table
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);
alter table public.categories enable row level security;
create policy "Anyone can read categories" on public.categories
  for select using (true);
create policy "Admins can manage categories" on public.categories
  for all to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Products table
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  purchase_price numeric not null default 0,
  selling_price numeric not null default 0,
  barcode text,
  category_id uuid references public.categories(id) on delete set null,
  quantity_type text not null default 'unit',
  stock integer not null default 0,
  created_at timestamptz default now()
);
alter table public.products enable row level security;
create policy "Anyone can read products" on public.products
  for select using (true);
create policy "Admins can manage products" on public.products
  for all to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Product sizes (for ML-based products)
create table public.product_sizes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade not null,
  size_ml integer not null,
  selling_price numeric not null default 0,
  purchase_price numeric not null default 0,
  stock integer not null default 0
);
alter table public.product_sizes enable row level security;
create policy "Anyone can read product_sizes" on public.product_sizes
  for select using (true);
create policy "Admins can manage product_sizes" on public.product_sizes
  for all to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Sessions table
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid references public.workers(id) on delete cascade not null,
  started_at timestamptz default now(),
  closed_at timestamptz,
  total_revenue numeric default 0
);
alter table public.sessions enable row level security;
create policy "Anyone can read sessions" on public.sessions for select using (true);
create policy "Anyone can insert sessions" on public.sessions for insert with check (true);
create policy "Anyone can update sessions" on public.sessions for update using (true);

-- Sales table
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade not null,
  worker_id uuid references public.workers(id) on delete cascade not null,
  total numeric not null default 0,
  profit numeric not null default 0,
  created_at timestamptz default now()
);
alter table public.sales enable row level security;
create policy "Anyone can read sales" on public.sales for select using (true);
create policy "Anyone can insert sales" on public.sales for insert with check (true);

-- Sale items table
create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references public.sales(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  product_name text not null,
  size_ml integer,
  quantity integer not null default 1,
  unit_price numeric not null default 0,
  purchase_price numeric not null default 0
);
alter table public.sale_items enable row level security;
create policy "Anyone can read sale_items" on public.sale_items for select using (true);
create policy "Anyone can insert sale_items" on public.sale_items for insert with check (true);

-- Function to update product stock after sale
create or replace function public.decrease_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.size_ml is not null then
    update public.product_sizes
    set stock = stock - NEW.quantity
    where product_id = NEW.product_id and size_ml = NEW.size_ml;
  else
    update public.products
    set stock = stock - NEW.quantity
    where id = NEW.product_id;
  end if;
  return NEW;
end;
$$;

create trigger on_sale_item_insert
  after insert on public.sale_items
  for each row execute function public.decrease_stock();
