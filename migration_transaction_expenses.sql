-- 1. Таблица прейскуранта услуг (управляется администратором)
CREATE TABLE IF NOT EXISTS pricelist (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    price numeric DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- 2. Добавляем поле для хранения выбранных расходов в объект
ALTER TABLE properties ADD COLUMN IF NOT EXISTS deal_expenses jsonb DEFAULT '[]';

-- 3. Настройка RLS для прейскуранта
ALTER TABLE pricelist ENABLE ROW LEVEL SECURITY;

-- Все авторизованные пользователи могут видеть прейскурант
CREATE POLICY "pricelist_select_all" ON pricelist FOR SELECT USING (auth.role() = 'authenticated');

-- Только администраторы могут редактировать прейскурант
CREATE POLICY "pricelist_admin_all" ON pricelist 
FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. Предзаполняем прейскурант базовыми услугами (можно будет изменить в UI)
INSERT INTO pricelist (name, price) VALUES 
('Выделение долей', 5000),
('СЭР+СБР', 12000),
('Нотариальные', 15000),
('Страхование', 10000),
('Сделка', 10000)
ON CONFLICT DO NOTHING;
