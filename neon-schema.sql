-- ═══════════════════════════════════════════════════════════════
-- neon-schema.sql — Полная схема БД RealtorMatch CRM для Neon
--
-- Отличия от Supabase schema.sql:
--  - Убраны auth.uid(), auth.role(), auth.users (нет Supabase Auth)
--  - Убраны RLS политики (авторизация через API-прокси в neon-query.js)
--  - Убрано расширение uuid-ossp (gen_random_uuid() встроен в PG 13+)
--  - Добавлена таблица user_sessions для JWT-сессий
--  - Добавлены таблицы deals, selection_items, app_errors (по миграциям 027-053)
--  - Добавлено поле password_hash в profiles для встроенной аутентификации
--
-- Запустить в Neon SQL Editor: https://console.neon.tech/
-- ═══════════════════════════════════════════════════════════════

-- ─── Функция: автоматическое обновление updated_at ───────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─── TABLE: profiles ─────────────────────────────────────────
-- Хранит данные риэлторов. В Neon не привязан к auth.users.
-- Аутентификация через password_hash + JWT (neon-auth.js).
CREATE TABLE IF NOT EXISTS profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT UNIQUE NOT NULL,
  password_hash    TEXT,                    -- bcryptjs хэш пароля
  full_name        TEXT NOT NULL DEFAULT '',
  phone            TEXT,
  agency_name      TEXT,
  inn              TEXT,
  role             TEXT DEFAULT 'realtor'   CHECK (role IN ('realtor', 'admin')),
  status           TEXT DEFAULT 'approved'  CHECK (status IN ('pending', 'approved', 'rejected')),
  passport_details JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE: user_sessions ────────────────────────────────────
-- Хранит активные JWT-сессии пользователей.
CREATE TABLE IF NOT EXISTS user_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL,               -- SHA-256 хэш JWT токена
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,
  UNIQUE(token_hash)
);

-- ─── TABLE: clients ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  phone               TEXT,
  phone_2             TEXT,
  email               TEXT,
  messenger           TEXT,
  client_types        TEXT[] DEFAULT '{buyer}',
  additional_contacts JSONB DEFAULT '[]',
  source              TEXT,
  status              TEXT DEFAULT 'active',
  notes               TEXT,
  passport_details    JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE: properties ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id                UUID REFERENCES clients(id),
  client_ids               UUID[] DEFAULT '{}',
  status                   TEXT DEFAULT 'active',
  property_type            TEXT,
  market_type              TEXT,
  city                     TEXT,
  district                 TEXT,
  microdistrict            TEXT,
  address                  TEXT,
  residential_complex      TEXT,
  price                    NUMERIC,
  price_min                NUMERIC,
  rooms                    INTEGER,
  area_total               NUMERIC,
  area_living              NUMERIC,
  area_kitchen             NUMERIC,
  floor                    INTEGER,
  floor_total              INTEGER DEFAULT 9,
  floors_total             INTEGER DEFAULT 9,
  building_type            TEXT,
  year_built               INTEGER,
  build_year               INTEGER,
  renovation               TEXT,
  bathroom                 TEXT,
  balcony                  TEXT,
  parking                  TEXT,
  furniture                BOOLEAN DEFAULT FALSE,
  mortgage                 BOOLEAN DEFAULT FALSE,
  mortgage_available       BOOLEAN DEFAULT TRUE,
  matcapital_available     BOOLEAN DEFAULT TRUE,
  certificate_available    BOOLEAN DEFAULT FALSE,
  encumbrance              BOOLEAN DEFAULT FALSE,
  minor_owners             BOOLEAN DEFAULT FALSE,
  docs_ready               BOOLEAN DEFAULT FALSE,
  sale_type                TEXT,
  ownership_type           TEXT,
  urgency                  TEXT DEFAULT 'medium',
  description              TEXT,
  notes                    TEXT,
  deal_type                TEXT DEFAULT 'sale',
  commission               NUMERIC DEFAULT 0,
  commission_buyer         NUMERIC DEFAULT 0,
  surcharge                NUMERIC DEFAULT 0,
  contract_end_date        DATE,
  deal_expenses            JSONB DEFAULT '[]',
  images                   TEXT[] DEFAULT '{}',
  floorplan_images         TEXT[] DEFAULT '{}',
  seeking_alternative      BOOLEAN DEFAULT FALSE,
  elevator_type            TEXT,
  has_elevator             BOOLEAN DEFAULT FALSE,
  has_garbage_chute        BOOLEAN DEFAULT FALSE,
  ceiling_height           NUMERIC,
  house_series             TEXT,
  developer                TEXT,
  management_company       TEXT,
  cadastral_number         TEXT,
  apartments_count         INTEGER,
  portfolio_analog_links   TEXT[] DEFAULT '{}',
  portfolio_new_builds_files  TEXT[] DEFAULT '{}',
  portfolio_resale_files      TEXT[] DEFAULT '{}',
  portfolio_mortgage_files    TEXT[] DEFAULT '{}',
  latitude                 NUMERIC,
  longitude                NUMERIC,
  contact_name             TEXT,
  contact_phone            TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE: requests ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id           UUID REFERENCES clients(id),
  client_ids          UUID[] DEFAULT '{}',
  parent_property_id  UUID REFERENCES properties(id) ON DELETE SET NULL,
  status              TEXT DEFAULT 'active',
  property_types      TEXT[],
  market_types        TEXT[],
  city                TEXT,
  districts           TEXT[],
  microdistricts      TEXT[],
  budget_min          NUMERIC,
  budget_max          NUMERIC,
  rooms               INTEGER[],
  area_min            NUMERIC,
  area_max            NUMERIC,
  kitchen_area_min    NUMERIC,
  floor_min           INTEGER,
  floor_max           INTEGER,
  not_first_floor     BOOLEAN DEFAULT FALSE,
  not_last_floor      BOOLEAN DEFAULT FALSE,
  building_types      TEXT[],
  renovation_min      TEXT,
  balcony_required    BOOLEAN DEFAULT FALSE,
  parking_required    BOOLEAN DEFAULT FALSE,
  payment_types       TEXT[] DEFAULT '{mortgage}',
  mortgage            BOOLEAN DEFAULT FALSE,
  mortgage_approved   BOOLEAN DEFAULT FALSE,
  mortgage_bank       TEXT,
  mortgage_amount     NUMERIC,
  urgency             TEXT DEFAULT 'medium',
  desired_move_date   DATE,
  must_have_notes     TEXT,
  nice_to_have_notes  TEXT,
  deal_breakers       TEXT,
  notes               TEXT,
  commission          NUMERIC DEFAULT 0,
  deal_expenses       JSONB DEFAULT '[]',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE: matches ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id       UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  request_id        UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  score             INTEGER,
  match_level       TEXT,
  matched_params    TEXT[],
  mismatched_params TEXT[],
  status            TEXT DEFAULT 'new',
  rejection_reason  TEXT,
  realtor_comment   TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, request_id)
);

-- ─── TABLE: showings ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS showings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id       UUID REFERENCES profiles(id),
  match_id         UUID REFERENCES matches(id),
  property_id      UUID REFERENCES properties(id),
  client_id        UUID REFERENCES clients(id),
  client_ids       UUID[] DEFAULT '{}',
  showing_date     TIMESTAMPTZ,
  status           TEXT DEFAULT 'planned',
  client_feedback  TEXT,
  feedback_comment TEXT,
  event_type       TEXT DEFAULT 'showing',
  google_event_id  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE: tasks ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id),
  property_id     UUID REFERENCES properties(id),
  title           TEXT NOT NULL,
  description     TEXT,
  due_date        TIMESTAMPTZ,
  priority        TEXT DEFAULT 'medium',
  status          TEXT DEFAULT 'pending',
  google_event_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE: pricelist ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pricelist (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  price            NUMERIC DEFAULT 0,
  show_in_sale     BOOLEAN DEFAULT TRUE,
  show_in_purchase BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE: deals ────────────────────────────────────────────
-- На основе миграций 027, 029, 037, 040
CREATE TABLE IF NOT EXISTS deals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Основные данные
  title           TEXT NOT NULL,
  seller_id       UUID REFERENCES clients(id),
  buyer_id        UUID REFERENCES clients(id),
  property_id     UUID REFERENCES properties(id),

  -- Несколько продавцов/покупателей (мигр. 037)
  seller_ids      UUID[] DEFAULT '{}',
  buyer_ids       UUID[] DEFAULT '{}',

  -- Финансы
  price           NUMERIC DEFAULT 0,
  commission      NUMERIC DEFAULT 0,
  deal_date       TIMESTAMPTZ,

  -- Задаток (мигр. 029)
  deposit_date    TIMESTAMPTZ,
  deposit_amount  NUMERIC DEFAULT 0,

  -- Ипотека
  mortgage_bank   TEXT,
  mortgage_amount NUMERIC DEFAULT 0,
  mortgage_expiry TIMESTAMPTZ,

  -- Юрист
  lawyer          TEXT,

  -- Расходы (мигр. 040)
  expenses        JSONB DEFAULT '[]',

  -- Заметки (мигр. 029)
  notes           TEXT,

  -- Статус и мета
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'cancelled')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE: selection_items ──────────────────────────────────
-- На основе миграций 048, 049, 050, 051, 052
CREATE TABLE IF NOT EXISTS selection_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id      UUID REFERENCES clients(id) ON DELETE CASCADE,
  client_ids     TEXT[] DEFAULT '{}',       -- Мигр. 052: несколько клиентов
  address        TEXT NOT NULL,
  price          NUMERIC DEFAULT 0,
  contact_name   TEXT,
  contact_phone  TEXT,
  notes          TEXT,
  -- Поля из мигр. 049/050/051
  rooms          INTEGER,
  area_total     NUMERIC,
  floor          INTEGER,
  floors_total   INTEGER,
  property_type  TEXT,
  city           TEXT,
  images         TEXT[] DEFAULT '{}',
  link           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE: app_errors ───────────────────────────────────────
-- На основе миграции 053
CREATE TABLE IF NOT EXISTS app_errors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id    UUID,
  error_message TEXT,
  error_stack   TEXT,
  context_data  JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- ИНДЕКСЫ
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_profiles_email         ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status        ON profiles(status);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id  ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires  ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_clients_realtor        ON clients(realtor_id);

CREATE INDEX IF NOT EXISTS idx_properties_realtor     ON properties(realtor_id);
CREATE INDEX IF NOT EXISTS idx_properties_client      ON properties(client_id);
CREATE INDEX IF NOT EXISTS idx_properties_status      ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city        ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_district    ON properties(district);

CREATE INDEX IF NOT EXISTS idx_requests_realtor       ON requests(realtor_id);
CREATE INDEX IF NOT EXISTS idx_requests_parent_property ON requests(parent_property_id);

CREATE INDEX IF NOT EXISTS idx_matches_property       ON matches(property_id);
CREATE INDEX IF NOT EXISTS idx_matches_request        ON matches(request_id);
CREATE INDEX IF NOT EXISTS idx_matches_realtor        ON matches(realtor_id);

CREATE INDEX IF NOT EXISTS idx_showings_realtor       ON showings(realtor_id);

CREATE INDEX IF NOT EXISTS idx_tasks_realtor          ON tasks(realtor_id);

CREATE INDEX IF NOT EXISTS idx_deals_realtor_id       ON deals(realtor_id);
CREATE INDEX IF NOT EXISTS idx_deals_status           ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_deal_date        ON deals(deal_date);
CREATE INDEX IF NOT EXISTS idx_deals_deposit_date     ON deals(deposit_date);

CREATE INDEX IF NOT EXISTS idx_selection_items_realtor_id ON selection_items(realtor_id);
CREATE INDEX IF NOT EXISTS idx_selection_items_client_id  ON selection_items(client_id);

-- ═══════════════════════════════════════════════════════════════
-- ТРИГГЕРЫ: автоматическое обновление updated_at
-- ═══════════════════════════════════════════════════════════════

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_showings_updated_at
  BEFORE UPDATE ON showings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_selection_items_updated_at
  BEFORE UPDATE ON selection_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- НАЧАЛЬНЫЕ ДАННЫЕ: pricelist
-- ═══════════════════════════════════════════════════════════════

INSERT INTO pricelist (name, price, show_in_sale, show_in_purchase) VALUES
  ('Выделение долей', 5000, TRUE, TRUE),
  ('СЭР+СБР', 12000, TRUE, TRUE),
  ('Нотариальные', 15000, TRUE, TRUE),
  ('Страхование', 10000, TRUE, TRUE),
  ('Сделка', 10000, TRUE, TRUE)
ON CONFLICT DO NOTHING;
