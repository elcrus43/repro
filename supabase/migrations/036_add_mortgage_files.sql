-- Migration 036: add portfolio_mortgage_files and replace mortgage_calc_image pattern
alter table properties
    add column if not exists portfolio_mortgage_files jsonb default '[]'::jsonb;
