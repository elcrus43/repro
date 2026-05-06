-- Migration 034: add portfolio files columns
alter table properties
    add column if not exists portfolio_new_builds_files jsonb default '[]'::jsonb,
    add column if not exists portfolio_resale_files jsonb default '[]'::jsonb;
