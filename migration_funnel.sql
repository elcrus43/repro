-- Migration: Update property statuses for the new funnel
-- New statuses: meeting (Встреча), agreement (АД), advertising (В рекламе), deposit (Задаток), deal (Сделка), rejected (Отказ)

-- We don't strictly need to change the column type if it's already TEXT, 
-- but we should update the existing data to match the new statuses if possible.

-- Mapping:
-- active -> advertising (В рекламе)
-- reserved -> deposit (Задаток)
-- sold -> deal (Сделка)
-- withdrawn -> rejected (Отказ)

UPDATE properties SET status = 'advertising' WHERE status = 'active';
UPDATE properties SET status = 'deposit' WHERE status = 'reserved';
UPDATE properties SET status = 'deal' WHERE status = 'sold';
UPDATE properties SET status = 'rejected' WHERE status = 'withdrawn';

-- For new status 'meeting' and 'agreement', they will be used for new or transitioned properties.
