-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Sсhema Migration — Исправление структуры таблиц            ║
-- ║  Вставьте этот код в Supabase → SQL Editor → Run           ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Добавляем недостающие колонки в таблицу clients
do $$ 
begin 
    if not exists (select from pg_attribute where attrelid = 'public.clients'::regclass and attname = 'messenger' and not attisdropped) then 
        alter table public.clients add column messenger text; 
    end if;
    if not exists (select from pg_attribute where attrelid = 'public.clients'::regclass and attname = 'phone_2' and not attisdropped) then 
        alter table public.clients add column phone_2 text; 
    end if;
end $$;

-- Добавляем колонки в таблицу properties (если они вдруг отсутствуют)
do $$ 
begin 
    if not exists (select from pg_attribute where attrelid = 'public.properties'::regclass and attname = 'client_id' and not attisdropped) then 
        alter table public.properties add column client_id uuid references clients(id); 
    end if;
end $$;

-- Проверяем наличие всех таблиц из основной схемы
-- (на случай, если какая-то из них еще не была создана)

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

-- Перезагружаем кэш PostgREST (применится автоматически после выполнения SQL)
NOTIFY pgrst, 'reload schema';
