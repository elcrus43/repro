-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Realtor-Match — Supabase Schema                           ║
-- ║  Вставьте весь этот SQL в Supabase → SQL Editor → Run      ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Profiles (linked to Supabase Auth)
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  phone text,
  agency_name text,
  role text default 'realtor',
  created_at timestamptz default now()
);

-- Clients
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  realtor_id uuid references profiles(id) on delete cascade,
  full_name text not null,
  phone text,
  phone_2 text,
  email text,
  messenger text,
  client_type text default 'buyer',
  source text,
  status text default 'active',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Properties
create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  realtor_id uuid references profiles(id) on delete cascade,
  client_id uuid references clients(id),
  status text default 'active',
  property_type text,
  market_type text,
  city text,
  district text,
  address text,
  residential_complex text,
  price numeric,
  price_min numeric,
  rooms integer,
  area_total numeric,
  area_living numeric,
  area_kitchen numeric,
  floor integer,
  floors_total integer,
  building_type text,
  year_built integer,
  renovation text,
  bathroom text,
  balcony text,
  parking text,
  furniture boolean default false,
  mortgage_available boolean default true,
  matcapital_available boolean default false,
  encumbrance boolean default false,
  minor_owners boolean default false,
  sale_type text,
  docs_ready boolean default false,
  ownership_type text,
  urgency text default 'medium',
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Requests (buyer search criteria)
create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  realtor_id uuid references profiles(id) on delete cascade,
  client_id uuid references clients(id),
  status text default 'active',
  property_types text[],
  market_types text[],
  city text,
  districts text[],
  budget_min numeric,
  budget_max numeric,
  rooms integer[],
  area_min numeric,
  area_max numeric,
  kitchen_area_min numeric,
  floor_min integer,
  floor_max integer,
  not_first_floor boolean default false,
  not_last_floor boolean default false,
  building_types text[],
  renovation_min text,
  balcony_required boolean default false,
  parking_required boolean default false,
  payment_type text default 'mortgage',
  mortgage_approved boolean default false,
  mortgage_bank text,
  mortgage_amount numeric,
  urgency text default 'medium',
  desired_move_date date,
  must_have_notes text,
  nice_to_have_notes text,
  deal_breakers text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Matches
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  realtor_id uuid references profiles(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  request_id uuid references requests(id) on delete cascade,
  score integer,
  match_level text,
  matched_params text[],
  mismatched_params text[],
  status text default 'new',
  rejection_reason text,
  realtor_comment text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Showings
create table if not exists showings (
  id uuid primary key default gen_random_uuid(),
  realtor_id uuid references profiles(id) on delete cascade,
  match_id uuid references matches(id),
  property_id uuid references properties(id),
  client_id uuid references clients(id),
  showing_date timestamptz,
  status text default 'planned',
  client_feedback text,
  feedback_comment text,
  created_at timestamptz default now()
);

-- Tasks
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  realtor_id uuid references profiles(id) on delete cascade,
  client_id uuid references clients(id),
  property_id uuid references properties(id),
  title text not null,
  description text,
  due_date timestamptz,
  priority text default 'medium',
  status text default 'pending',
  created_at timestamptz default now()
);

-- ══════════════════════════════════════════════════════
--  Row Level Security (каждый видит только свои данные)
-- ══════════════════════════════════════════════════════

-- Сначала удаляем старые политики, если они есть
drop policy if exists "profile_self" on profiles;
drop policy if exists "profile_select_own" on profiles;
drop policy if exists "profile_insert_self" on profiles;
drop policy if exists "profile_update_own" on profiles;

drop policy if exists "clients_own" on clients;
drop policy if exists "properties_own" on properties;
drop policy if exists "requests_own" on requests;
drop policy if exists "matches_own" on matches;
drop policy if exists "showings_own" on showings;
drop policy if exists "tasks_own" on tasks;

alter table profiles enable row level security;
alter table clients enable row level security;
alter table properties enable row level security;
alter table requests enable row level security;
alter table matches enable row level security;
alter table showings enable row level security;
alter table tasks enable row level security;

-- Profiles
create policy "profile_select_own" on profiles for select using (auth.uid() = id);
create policy "profile_insert_self" on profiles for insert with check (auth.uid() = id);
create policy "profile_update_own" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Clients, Properties, Requests, Matches, Showings, Tasks
create policy "clients_own" on clients for all using (auth.uid() = realtor_id) with check (auth.uid() = realtor_id);
create policy "properties_own" on properties for all using (auth.uid() = realtor_id) with check (auth.uid() = realtor_id);
create policy "requests_own" on requests for all using (auth.uid() = realtor_id) with check (auth.uid() = realtor_id);
create policy "matches_own" on matches for all using (auth.uid() = realtor_id) with check (auth.uid() = realtor_id);
create policy "showings_own" on showings for all using (auth.uid() = realtor_id) with check (auth.uid() = realtor_id);
create policy "tasks_own" on tasks for all using (auth.uid() = realtor_id) with check (auth.uid() = realtor_id);
