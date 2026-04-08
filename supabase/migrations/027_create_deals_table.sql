-- 027_create_deals_table.sql
-- Создание таблицы для учета сделок (Купля-Продажа)

CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    realtor_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Основные данные
    title TEXT NOT NULL,
    seller_id UUID REFERENCES clients(id),
    buyer_id UUID REFERENCES clients(id),
    property_id UUID REFERENCES properties(id),
    
    -- Финансы и дата
    price NUMERIC DEFAULT 0,
    deal_date TIMESTAMPTZ,
    commission NUMERIC DEFAULT 0,
    
    -- Статус и мета
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deals select policy" ON deals;
CREATE POLICY "Deals select policy" ON deals FOR SELECT
    USING (auth.uid() = realtor_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Deals insert policy" ON deals;
CREATE POLICY "Deals insert policy" ON deals FOR INSERT
    WITH CHECK (auth.uid() = realtor_id);

DROP POLICY IF EXISTS "Deals update policy" ON deals;
CREATE POLICY "Deals update policy" ON deals FOR UPDATE
    USING (auth.uid() = realtor_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Deals delete policy" ON deals;
CREATE POLICY "Deals delete policy" ON deals FOR DELETE
    USING (auth.uid() = realtor_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_deals_realtor_id ON deals(realtor_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
