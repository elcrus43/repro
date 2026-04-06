-- ═══════════════════════════════════════════════════════════════
-- schema.sql — полная схема базы данных RealtorMatch CRM
--
-- Этот файл — консолидированное представление всех 24 миграций.
-- НЕ используйте для продакшена — используйте миграции из supabase/migrations/
-- Этот файл только для документации и понимания структуры.
--
-- Генерация: 2026-04-06
-- ═══════════════════════════════════════════════════════════════

-- ─── Расширения ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Функции ─────────────────────────────────────────────────

-- Проверка админских прав (security definer, обходит RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Автоматическое обновление updated_at
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
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  agency_name     TEXT,
  role            TEXT DEFAULT 'realtor',
  status          TEXT DEFAULT 'approved',
  inn             TEXT,
  passport_details JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE: clients (ПРИВАТНЫЕ — только владелец) ────────────
CREATE TABLE IF NOT EXISTS clients (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name             TEXT NOT NULL,
  phone                 TEXT,
  email                 TEXT,
  messenger             TEXT,
  client_types          TEXT[] DEFAULT '{buyer}',
  additional_contacts   JSONB DEFAULT '[]',
  source                TEXT,
  status                TEXT DEFAULT 'active',
  notes                 TEXT,
  passport_details      JSONB,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE: properties (публичное чтение, приватная модификация)
CREATE TABLE IF NOT EXISTS properties (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id             UUID REFERENCES clients(id),
  status                TEXT DEFAULT 'active',
  property_type         TEXT,
  market_type           TEXT,
  city                  TEXT,
  district              TEXT,
  microdistrict         TEXT,
  address               TEXT,
  residential_complex   TEXT,
  price                 NUMERIC,
  price_min             NUMERIC,
  rooms                 INTEGER,
  area_total            NUMERIC,
  area_living           NUMERIC,
  area_kitchen          NUMERIC,
  floor                 INTEGER,
  floor_total           INTEGER DEFAULT 9,
  building_type         TEXT,
  year_built            INTEGER,
  renovation            TEXT,
  bathroom              TEXT,
  balcony               TEXT,
  parking               TEXT,
  furniture             BOOLEAN DEFAULT FALSE,
  mortgage_available    BOOLEAN DEFAULT TRUE,
  matcapital_available  BOOLEAN DEFAULT TRUE,
  encumbrance           BOOLEAN DEFAULT FALSE,
  minor_owners          BOOLEAN DEFAULT FALSE,
  sale_type             TEXT,
  docs_ready              BOOLEAN DEFAULT FALSE,
  ownership_type        TEXT,
  urgency               TEXT DEFAULT 'medium',
  description           TEXT,
  notes                 TEXT,
  deal_type             TEXT DEFAULT 'sale',
  commission            NUMERIC DEFAULT 0,
  commission_buyer      NUMERIC DEFAULT 0,
  surcharge             NUMERIC DEFAULT 0,
  contract_end_date     DATE,
  deal_expenses         JSONB DEFAULT '[]',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE: requests (публичное чтение, приватная модификация)
CREATE TABLE IF NOT EXISTS requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id             UUID REFERENCES clients(id),
  parent_property_id    UUID REFERENCES properties(id) ON DELETE SET NULL,
  status                TEXT DEFAULT 'active',
  property_types        TEXT[],
  market_types          TEXT[],
  city                  TEXT,
  districts             TEXT[],
  microdistricts        TEXT[],
  budget_min            NUMERIC,
  budget_max            NUMERIC,
  rooms                 INTEGER[],
  area_min              NUMERIC,
  area_max              NUMERIC,
  kitchen_area_min      NUMERIC,
  floor_min             INTEGER,
  floor_max             INTEGER,
  not_first_floor       BOOLEAN DEFAULT FALSE,
  not_last_floor        BOOLEAN DEFAULT FALSE,
  building_types        TEXT[],
  renovation_min        TEXT,
  balcony_required      BOOLEAN DEFAULT FALSE,
  parking_required      BOOLEAN DEFAULT FALSE,
  payment_types         TEXT[] DEFAULT '{mortgage}',
  mortgage_approved     BOOLEAN DEFAULT FALSE,
  mortgage_bank         TEXT,
  mortgage_amount       NUMERIC,
  urgency               TEXT DEFAULT 'medium',
  desired_move_date     DATE,
  must_have_notes       TEXT,
  nice_to_have_notes    TEXT,
  deal_breakers         TEXT,
  commission            NUMERIC DEFAULT 0,
  deal_expenses         JSONB DEFAULT '[]',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE: matches (публичное чтение, приватная модификация)
CREATE TABLE IF NOT EXISTS matches (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id           UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  request_id            UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  score                 INTEGER,
  match_level           TEXT,
  matched_params        TEXT[],
  mismatched_params     TEXT[],
  status                TEXT DEFAULT 'new',
  rejection_reason      TEXT,
  realtor_comment       TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, request_id)
);

-- ─── TABLE: showings (публичное чтение, приватная модификация)
CREATE TABLE IF NOT EXISTS showings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id            UUID REFERENCES profiles(id),
  match_id              UUID REFERENCES matches(id),
  property_id           UUID REFERENCES properties(id),
  client_id             UUID REFERENCES clients(id),
  showing_date          TIMESTAMPTZ,
  status                TEXT DEFAULT 'planned',
  client_feedback       TEXT,
  feedback_comment      TEXT,
  google_event_id       TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE: tasks (СТРОГО ПРИВАТНЫЕ) ─────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id             UUID REFERENCES clients(id),
  property_id           UUID REFERENCES properties(id),
  title                 TEXT NOT NULL,
  description           TEXT,
  due_date              TIMESTAMPTZ,
  priority              TEXT DEFAULT 'medium',
  status                TEXT DEFAULT 'pending',
  google_event_id       TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE: pricelist (чтение всем, запись только админу) ───
CREATE TABLE IF NOT EXISTS pricelist (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  price                 NUMERIC DEFAULT 0,
  show_in_sale          BOOLEAN DEFAULT TRUE,
  show_in_purchase      BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ИНДЕКСЫ ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_properties_realtor   ON properties(realtor_id);
CREATE INDEX IF NOT EXISTS idx_properties_client    ON properties(client_id);
CREATE INDEX IF NOT EXISTS idx_properties_status    ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city      ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_district  ON properties(district);

CREATE INDEX IF NOT EXISTS idx_clients_realtor      ON clients(realtor_id);

CREATE INDEX IF NOT EXISTS idx_requests_realtor     ON requests(realtor_id);
CREATE INDEX IF NOT EXISTS idx_requests_parent_property ON requests(parent_property_id);

CREATE INDEX IF NOT EXISTS idx_matches_property     ON matches(property_id);
CREATE INDEX IF NOT EXISTS idx_matches_request      ON matches(request_id);

CREATE INDEX IF NOT EXISTS idx_showings_realtor     ON showings(realtor_id);

CREATE INDEX IF NOT EXISTS idx_tasks_realtor        ON tasks(realtor_id);

-- ─── ТРИГГЕРЫ: автоматическое обновление updated_at ─────────

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

-- ─── RLS (Row Level Security) ────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE showings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricelist ENABLE ROW LEVEL SECURITY;

-- profiles: все видят, только свой редактировать
CREATE POLICY profiles_select_all ON profiles FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY profiles_modify_own ON profiles FOR ALL TO authenticated USING (id = auth.uid());

-- clients: только свои
CREATE POLICY clients_select_own ON clients FOR SELECT TO authenticated USING (realtor_id = auth.uid());
CREATE POLICY clients_modify_own ON clients FOR ALL TO authenticated USING (realtor_id = auth.uid());

-- properties: все видят, только свои редактировать
CREATE POLICY properties_select_all ON properties FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY properties_modify_own ON properties FOR ALL TO authenticated USING (realtor_id = auth.uid());

-- requests: все видят, только свои редактировать
CREATE POLICY requests_select_all ON requests FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY requests_modify_own ON requests FOR ALL TO authenticated USING (realtor_id = auth.uid());

-- matches: все видят, только свои редактировать
CREATE POLICY matches_select_all ON matches FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY matches_modify_own ON matches FOR ALL TO authenticated USING (realtor_id = auth.uid());

-- showings: все видят, только свои редактировать
CREATE POLICY showings_select_all ON showings FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY showings_modify_own ON showings FOR ALL TO authenticated USING (realtor_id = auth.uid());

-- tasks: только свои (даже SELECT)
CREATE POLICY tasks_all_own ON tasks FOR ALL TO authenticated USING (realtor_id = auth.uid());

-- pricelist: все читают, только админ редактирует
CREATE POLICY pricelist_select_all ON pricelist FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
CREATE POLICY pricelist_admin_all ON pricelist FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ─── НАЧАЛЬНЫЕ ДАННЫЕ: pricelist ─────────────────────────────

INSERT INTO pricelist (name, price, show_in_sale, show_in_purchase) VALUES
  ('Выделение долей', 5000, TRUE, TRUE),
  ('СЭР+СБР', 12000, TRUE, TRUE),
  ('Нотариальные', 15000, TRUE, TRUE),
  ('Страхование', 10000, TRUE, TRUE),
  ('Сделка', 10000, TRUE, TRUE)
ON CONFLICT DO NOTHING;
