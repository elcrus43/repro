-- Migration 032: add missing property columns that may not exist yet
-- Covers fields used in FormPage/DetailsPage but absent from older DB schemas.
-- All ALTER TABLE are IF NOT EXISTS — safe to run multiple times.

alter table properties
    -- Квартира: характеристики (могут отсутствовать в старых схемах)
    add column if not exists renovation      text,
    add column if not exists bathroom        text,
    add column if not exists balcony         text,
    add column if not exists parking         text,
    add column if not exists furniture       boolean default false,

    -- Условия сделки
    add column if not exists mortgage_available    boolean default true,
    add column if not exists matcapital_available  boolean default false,
    add column if not exists certificate_available boolean default false,
    add column if not exists encumbrance           boolean default false,
    add column if not exists minor_owners          boolean default false,
    add column if not exists docs_ready            boolean default false,
    add column if not exists seeking_alternative   boolean default false,

    -- Дом: из парсера (031 уже добавил часть, дублирование IF NOT EXISTS безопасно)
    add column if not exists apartments_count   integer,
    add column if not exists has_elevator       boolean,
    add column if not exists elevator_type      text,      -- none | passenger | cargo | both
    add column if not exists has_garbage_chute  boolean,
    add column if not exists ceiling_height     numeric,
    add column if not exists house_series       text,
    add column if not exists developer          text,
    add column if not exists management_company text,
    add column if not exists cadastral_number   text,
    add column if not exists building_type      text,

    -- Прочие поля формы
    add column if not exists urgency            text default 'medium',
    add column if not exists price_min          numeric,
    add column if not exists market_type        text,
    add column if not exists residential_complex text;

-- Indexes
create index if not exists idx_properties_cadastral   on properties(cadastral_number);
create index if not exists idx_properties_building_type on properties(building_type);
