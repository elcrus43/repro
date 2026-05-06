-- Migration 033: add mortgage calculation image column
alter table properties
    add column if not exists mortgage_calc_image text;
