-- =====================================================================
-- QuadAgents Finance — Database Schema
-- Paste this whole file into Supabase → SQL Editor → Run.
-- Safe to run once. Do NOT run twice unless you want to drop & recreate.
-- =====================================================================

-- enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'txn_type') then
    create type txn_type as enum ('income', 'expense');
  end if;
  if not exists (select 1 from pg_type where typname = 'brand_enum') then
    create type brand_enum as enum ('QuadAgents', 'Mansatak', 'Shared');
  end if;
  if not exists (select 1 from pg_type where typname = 'client_type') then
    create type client_type as enum ('client', 'vendor');
  end if;
  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type invoice_status as enum ('draft', 'sent', 'paid', 'overdue');
  end if;
end$$;

-- categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type txn_type not null,
  brand brand_enum,
  created_at timestamptz default now()
);

-- clients / vendors
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type client_type not null default 'client',
  email text, phone text, address text, notes text,
  created_at timestamptz default now()
);

-- exchange rates (currency as PK)
create table if not exists exchange_rates (
  currency text primary key,
  rate_to_sdg numeric not null,
  updated_at timestamptz default now()
);

-- recurring expenses
create table if not exists recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric not null,
  currency text not null default 'SDG',
  brand brand_enum not null default 'Shared',
  category_id uuid references categories(id),
  day_of_month int not null check (day_of_month between 1 and 28),
  active boolean not null default true,
  last_logged_month text, -- 'YYYY-MM'
  created_at timestamptz default now()
);

-- invoices
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,
  client_id uuid references clients(id),
  brand brand_enum not null default 'QuadAgents',
  issue_date date not null,
  due_date date not null,
  status invoice_status not null default 'draft',
  currency text not null default 'SDG',
  subtotal numeric not null default 0,
  tax_rate numeric not null default 0,
  tax_amount numeric not null default 0,
  total numeric not null default 0,
  sdg_total numeric not null default 0,
  notes text,
  paid_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id) on delete cascade,
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  total numeric not null default 0
);

-- transactions
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  type txn_type not null,
  date date not null,
  amount numeric not null,
  currency text not null default 'SDG',
  sdg_amount numeric not null,
  brand brand_enum not null default 'Shared',
  category_id uuid references categories(id),
  description text,
  client_id uuid references clients(id),
  invoice_id uuid references invoices(id),
  is_from_recurring boolean default false,
  recurring_id uuid references recurring_expenses(id),
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- company settings singleton
create table if not exists company_settings (
  id int primary key default 1,
  name text default 'QuadAgents Group',
  address text,
  logo_url text,
  tax_id text,
  default_currency text default 'SDG',
  check (id = 1)
);

-- RLS: open to authenticated, closed to anon
alter table categories enable row level security;
alter table clients enable row level security;
alter table exchange_rates enable row level security;
alter table recurring_expenses enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table transactions enable row level security;
alter table company_settings enable row level security;

drop policy if exists "auth all" on categories;
drop policy if exists "auth all" on clients;
drop policy if exists "auth all" on exchange_rates;
drop policy if exists "auth all" on recurring_expenses;
drop policy if exists "auth all" on invoices;
drop policy if exists "auth all" on invoice_items;
drop policy if exists "auth all" on transactions;
drop policy if exists "auth all" on company_settings;

create policy "auth all" on categories for all to authenticated using (true) with check (true);
create policy "auth all" on clients for all to authenticated using (true) with check (true);
create policy "auth all" on exchange_rates for all to authenticated using (true) with check (true);
create policy "auth all" on recurring_expenses for all to authenticated using (true) with check (true);
create policy "auth all" on invoices for all to authenticated using (true) with check (true);
create policy "auth all" on invoice_items for all to authenticated using (true) with check (true);
create policy "auth all" on transactions for all to authenticated using (true) with check (true);
create policy "auth all" on company_settings for all to authenticated using (true) with check (true);

-- seed exchange rates (placeholder values — update in Settings)
insert into exchange_rates (currency, rate_to_sdg) values
  ('SDG', 1), ('USD', 2500), ('EUR', 2700), ('SAR', 670)
on conflict (currency) do nothing;

-- seed categories
insert into categories (name, type) values
  ('Client Revenue', 'income'),
  ('Consulting Fees', 'income'),
  ('Subscription Revenue', 'income'),
  ('Other Income', 'income'),
  ('Salaries', 'expense'),
  ('Rent', 'expense'),
  ('Software & Tools', 'expense'),
  ('Cloud & Hosting', 'expense'),
  ('Marketing', 'expense'),
  ('Office Supplies', 'expense'),
  ('Travel', 'expense'),
  ('Taxes & Fees', 'expense'),
  ('Other Expense', 'expense')
on conflict do nothing;

-- seed company settings singleton
insert into company_settings (id, name, default_currency)
  values (1, 'QuadAgents Group', 'SDG')
on conflict (id) do nothing;
