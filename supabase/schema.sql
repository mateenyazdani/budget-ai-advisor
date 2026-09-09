-- Budget AI schema.
-- Paste into the Supabase SQL editor and run. Safe to re-run.
--
-- Every table below carries a user_id and has row level security enabled, so
-- Postgres itself refuses to return one user's rows to another. That guarantee
-- does not depend on the application remembering to filter.

-- ---------------------------------------------------------------- profiles

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique,
  country text default 'spain',
  city text default 'Madrid',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "own profile: read" on public.profiles;
create policy "own profile: read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "own profile: write" on public.profiles;
create policy "own profile: write" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Create the profile row automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------- budgets

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  country text not null,
  currency text not null default '€',
  monthly_income numeric(12,2) not null,
  age integer,
  -- The full category breakdown, kept as-is so the shape can evolve without a
  -- migration. Aggregates that need to be queried get their own columns.
  categories jsonb not null default '{}'::jsonb,
  total_expenses numeric(12,2) not null default 0,
  surplus numeric(12,2) not null default 0,
  savings_rate numeric(5,2),
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists budgets_user_created_idx
  on public.budgets (user_id, created_at desc);

alter table public.budgets enable row level security;

drop policy if exists "own budgets" on public.budgets;
create policy "own budgets" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------- expenses

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  category text not null,
  note text,
  spent_at date not null default current_date,
  -- Set when the row came from a bank feed rather than being typed in, so a
  -- resync cannot create duplicates.
  external_id text,
  created_at timestamptz not null default now(),
  unique (user_id, external_id)
);

create index if not exists expenses_user_date_idx
  on public.expenses (user_id, spent_at desc);

alter table public.expenses enable row level security;

drop policy if exists "own expenses" on public.expenses;
create policy "own expenses" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------- saved places

create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  place_id text not null,
  name text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, place_id)
);

alter table public.saved_places enable row level security;

drop policy if exists "own saved places" on public.saved_places;
create policy "own saved places" on public.saved_places
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------- bank connections

-- Replaces keeping the requisition id in localStorage, where anyone holding
-- the id could read the account through the API.
create table if not exists public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  requisition_id text not null unique,
  institution_id text not null,
  institution_name text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists bank_connections_user_idx
  on public.bank_connections (user_id);

alter table public.bank_connections enable row level security;

drop policy if exists "own bank connections" on public.bank_connections;
create policy "own bank connections" on public.bank_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------ rate limits

-- The deals and prices endpoints each cost a Claude call. Without a limit one
-- visitor on a refresh loop can run up the bill.
create table if not exists public.api_usage (
  id bigserial primary key,
  user_id uuid references auth.users on delete cascade,
  endpoint text not null,
  called_at timestamptz not null default now()
);

create index if not exists api_usage_lookup_idx
  on public.api_usage (user_id, endpoint, called_at desc);

alter table public.api_usage enable row level security;
-- No policy: only the server (service role) touches this table, and the service
-- role bypasses RLS. Clients get nothing.

-- Returns true when the call is allowed, and records it.
create or replace function public.check_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_limit integer,
  p_window interval
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  recent_calls integer;
begin
  select count(*) into recent_calls
  from public.api_usage
  where user_id = p_user_id
    and endpoint = p_endpoint
    and called_at > now() - p_window;

  if recent_calls >= p_limit then
    return false;
  end if;

  insert into public.api_usage (user_id, endpoint) values (p_user_id, p_endpoint);
  return true;
end;
$$;

-- Housekeeping: api_usage only matters for the recent window.
create or replace function public.prune_api_usage()
returns void
language sql
security definer set search_path = public
as $$
  delete from public.api_usage where called_at < now() - interval '2 days';
$$;
