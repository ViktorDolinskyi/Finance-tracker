-- Finance-tracker: схема БД для Supabase (Project → SQL Editor → Run)
-- Кожен рядок належить користувачу (user_id = auth.uid()), доступ обмежено RLS.

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  initial numeric not null default 0,
  type text not null default 'regular',
  currency text not null default 'UAH',
  credit_limit numeric default 0,
  due_date date,
  interest_rate numeric,
  stmt_day int,
  due_day int,
  min_payment numeric,
  in_networth boolean not null default true,
  archived boolean not null default false,
  sort int not null default 0
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null,
  name text not null,
  icon text,
  lucide text,
  color text,
  budget numeric not null default 0,
  sort int not null default 0
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null,
  amount numeric not null,
  account_id uuid references accounts(id) on delete set null,
  to_account_id uuid references accounts(id) on delete set null,
  to_amount numeric,
  category_id uuid references categories(id) on delete set null,
  occurred_at timestamptz not null default now(),
  note text default '',
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  usd_rate numeric not null default 41,
  eur_rate numeric not null default 45
);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  color text,
  sort int not null default 0
);

create table if not exists planned (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null,
  amount numeric not null,
  account_id uuid references accounts(id) on delete set null,
  to_account_id uuid references accounts(id) on delete set null,
  to_amount numeric,
  category_id uuid references categories(id) on delete set null,
  note text default '',
  tags jsonb not null default '[]'::jsonb,
  next_date date not null,
  repeat text not null default 'none',
  active boolean not null default true
);

create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  amount numeric not null default 0,
  account_id uuid references accounts(id) on delete set null,
  to_account_id uuid references accounts(id) on delete set null,
  to_amount numeric,
  category_id uuid references categories(id) on delete set null,
  note text default '',
  tags jsonb not null default '[]'::jsonb,
  sort int not null default 0
);

-- RLS: кожен користувач бачить і змінює лише свої дані
alter table accounts enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table settings enable row level security;
alter table tags enable row level security;
alter table planned enable row level security;
alter table templates enable row level security;

do $$
declare t text;
begin
  foreach t in array array['accounts','categories','transactions','settings','tags','planned','templates']
  loop
    execute format('create policy "own rows select" on %I for select using (user_id = auth.uid())', t);
    execute format('create policy "own rows insert" on %I for insert with check (user_id = auth.uid())', t);
    execute format('create policy "own rows update" on %I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('create policy "own rows delete" on %I for delete using (user_id = auth.uid())', t);
  end loop;
end $$;
