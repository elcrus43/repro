-- Add passport_details column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS passport_details JSONB DEFAULT NULL;

-- Example of JSON structure:
-- {
--   "series": "1234",
--   "number": "567890",
--   "issued_by": "ОМВД России по г. Москве",
--   "unit_code": "123-456",
--   "issue_date": "2020-01-01",
--   "address": "г. Москва, ул. Пушкина, д. Колотушкина"
-- }
