-- Migration 031: add building detail columns to properties table
-- Fields parsed from open sources (dom.mingkh.ru, reformagkh.ru, etc.)
--
-- ВАЖНО: Если получаете ошибку "relation does not exist" — сначала
-- запустите 004_supabase_schema.sql, затем эту миграцию.
-- Если таблица уже существует, эта миграция только добавит колонки.

-- Создаём таблицу если вдруг её нет (idempotent)
create table if not exists properties (
    id              uuid primary key default gen_random_uuid(),
    realtor_id      uuid,
    client_id       uuid,
    status          text default 'active',
    property_type   text,
    market_type     text,
    deal_type       text default 'sale',
    city            text,
    district        text,
    microdistrict   text,
    address         text,
    residential_complex text,
    price           numeric,
    price_min       numeric,
    commission      numeric,
    rooms           integer,
    area_total      numeric,
    area_living     numeric,
    area_kitchen    numeric,
    floor           integer,
    floors_total    integer,
    build_year      integer,
    building_type   text,
    renovation      text,
    bathroom        text,
    balcony         text,
    parking         text,
    furniture       boolean default false,
    mortgage_available   boolean default true,
    matcapital_available boolean default false,
    certificate_available boolean default false,
    encumbrance     boolean default false,
    minor_owners    boolean default false,
    docs_ready      boolean default false,
    urgency         text default 'medium',
    notes           text,
    images          text[] default '{}',
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

-- Новые колонки (безопасно, не затронут существующие данные)
alter table properties
    add column if not exists apartments_count   integer,
    add column if not exists has_elevator       boolean,
    add column if not exists has_garbage_chute  boolean,
    add column if not exists ceiling_height     numeric,
    add column if not exists house_series       text,
    add column if not exists developer          text,
    add column if not exists management_company text,
    add column if not exists cadastral_number   text;

-- Index for cadastral lookups
create index if not exists idx_properties_cadastral on properties(cadastral_number);
