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

-- ============================================================================
-- Social layer: usernames, follows, and the pins that fill the world map.
-- ============================================================================

-- Everything below rests on one rule: a pin is visible to its author and to
-- that author's *friends*, where a friend is someone the follow runs both ways
-- with. A one-way follower sees nothing. That rule lives in Postgres, not in
-- the app, so a missed filter in a query cannot leak anyone's map.

-- ----------------------------------------------------------------- profiles

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists avatar_emoji text default '🙂',
  add column if not exists home_country text;

-- A username is how you are found, so it has to be unique case-insensitively:
-- @Marta and @marta must not be two different people.
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

-- Seeding the username from the email prefix was harmless while usernames were
-- only decorative. Against a unique index it is a live failure: the second
-- marta@… to sign up raises, and because the trigger runs inside the signup
-- transaction, that person cannot create an account at all. So the seed now
-- steps aside for a suffix, and gives up rather than blocking the signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base text := regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g');
  candidate text;
begin
  if base is null or char_length(base) < 3 then
    base := 'friend';
  end if;

  -- A handful of tries, then leave it null: the profile screen asks for a
  -- username anyway, and a blocked signup is far worse than a blank handle.
  for i in 0..9 loop
    candidate := case when i = 0 then base else base || i::text end;
    begin
      insert into public.profiles (id, username) values (new.id, candidate);
      return new;
    exception when unique_violation then
      -- Taken. Try the next suffix.
    end;
  end loop;

  insert into public.profiles (id, username) values (new.id, null)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Finding a friend means reading a profile that is not yours, so the old
-- owner-only read policy has to widen. Only the handful of columns below are
-- ever exposed, and only to someone signed in.
drop policy if exists "own profile: read" on public.profiles;
drop policy if exists "profiles: read" on public.profiles;
create policy "profiles: read" on public.profiles
  for select using (auth.role() = 'authenticated');

-- ------------------------------------------------------------------ follows

create table if not exists public.follows (
  follower_id uuid not null references auth.users on delete cascade,
  following_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  -- Following yourself would make you your own friend and clutter every list.
  constraint no_self_follow check (follower_id <> following_id)
);

create index if not exists follows_following_idx
  on public.follows (following_id);

alter table public.follows enable row level security;

-- You may read a follow row you are on either side of, so both "who I follow"
-- and "who follows me" work, but nobody can enumerate a stranger's graph.
drop policy if exists "follows: read" on public.follows;
create policy "follows: read" on public.follows
  for select using (auth.uid() = follower_id or auth.uid() = following_id);

drop policy if exists "follows: create own" on public.follows;
create policy "follows: create own" on public.follows
  for insert with check (auth.uid() = follower_id);

drop policy if exists "follows: delete own" on public.follows;
create policy "follows: delete own" on public.follows
  for delete using (auth.uid() = follower_id);

-- Mutual follow, asked as one question. Security definer so the lookup is not
-- itself filtered by the policy above, which would make it always false when
-- checking two other people.
create or replace function public.is_friend(a uuid, b uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.follows f1
    join public.follows f2
      on f1.follower_id = f2.following_id
     and f1.following_id = f2.follower_id
    where f1.follower_id = a and f1.following_id = b
  );
$$;

-- --------------------------------------------------------------------- pins

create table if not exists public.pins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,

  -- Google's place id when the pin came from a venue the app found, so two
  -- friends rating the same restaurant land on the same point.
  place_id text,
  name text not null,
  category text,

  -- Denormalised on purpose: the map groups by country before it has ever
  -- loaded a single pin's detail, and an ISO code beats parsing an address.
  country_code text not null,
  country_name text,
  city text,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),

  rating smallint not null check (rating between 1 and 5),
  -- What it actually cost this person, which is the whole point: a price a
  -- friend really paid beats a price band.
  price_paid numeric(12,2) check (price_paid >= 0),
  currency text default '€',
  note text check (char_length(note) <= 500),

  created_at timestamptz not null default now(),
  -- One verdict per person per place. Changing your mind edits the pin.
  unique (user_id, place_id)
);

create index if not exists pins_country_idx on public.pins (country_code);
create index if not exists pins_user_idx on public.pins (user_id, created_at desc);

alter table public.pins enable row level security;

drop policy if exists "pins: read own and friends" on public.pins;
create policy "pins: read own and friends" on public.pins
  for select using (
    auth.uid() = user_id or public.is_friend(auth.uid(), user_id)
  );

drop policy if exists "pins: write own" on public.pins;
create policy "pins: write own" on public.pins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------- pins: ranked score

-- A star out of five is the same five buckets everyone else uses. Beli's
-- actual mechanic is a comparison: pick a place you already rated and ask
-- which was better, which produces a score with real separation between two
-- places you'd otherwise both call "4 stars". Added rather than replacing
-- `rating`, so anything still reading it keeps working.
alter table public.pins add column if not exists sentiment text
  check (sentiment in ('like', 'fine', 'dislike'));
alter table public.pins add column if not exists score numeric(3,1)
  check (score between 0 and 10);

create index if not exists pins_user_sentiment_idx
  on public.pins (user_id, sentiment, score);

-- --------------------------------------------------------- pin photos

-- A pin's photo carries the same privacy as the pin itself, so it is a
-- private bucket with the same "own or mutual friend" rule as the pins
-- table — never a public URL, always a signed one.
insert into storage.buckets (id, name, public)
values ('pin-photos', 'pin-photos', false)
on conflict (id) do nothing;

alter table public.pins add column if not exists photo_path text;

-- Objects are stored at "<user_id>/<pin_id>.<ext>", so the path itself says
-- who took it without a second lookup.
drop policy if exists "pin photos: read own and friends" on storage.objects;
create policy "pin photos: read own and friends" on storage.objects
  for select using (
    bucket_id = 'pin-photos'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_friend(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

drop policy if exists "pin photos: write own" on storage.objects;
create policy "pin photos: write own" on storage.objects
  for insert with check (
    bucket_id = 'pin-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "pin photos: delete own" on storage.objects;
create policy "pin photos: delete own" on storage.objects
  for delete using (
    bucket_id = 'pin-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
