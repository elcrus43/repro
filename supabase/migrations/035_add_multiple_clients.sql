-- Migration 035: add support for multiple clients (owners/buyers)
-- Adds client_ids text array to properties, requests, and showings.
-- This allows linking multiple clients to a single object or transaction.

alter table properties add column if not exists client_ids text[] default '{}';
alter table requests add column if not exists client_ids text[] default '{}';
alter table showings add column if not exists client_ids text[] default '{}';

-- Migration: sync client_id to client_ids for existing data
update properties 
set client_ids = array[client_id] 
where client_id is not null 
  and (client_ids is null or array_length(client_ids, 1) is null or array_length(client_ids, 1) = 0);

update requests 
set client_ids = array[client_id] 
where client_id is not null 
  and (client_ids is null or array_length(client_ids, 1) is null or array_length(client_ids, 1) = 0);

update showings 
set client_ids = array[client_id] 
where client_id is not null 
  and (client_ids is null or array_length(client_ids, 1) is null or array_length(client_ids, 1) = 0);
