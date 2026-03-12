-- Migration: Expand Match update policy
-- Allow both the request owner (buyer side) and property owner (seller side) to update matches

drop policy if exists "matches_update" on matches;

create policy "matches_update_all_realtors" on matches
for update using (
  auth.uid() = realtor_id -- the request realtor (buyer side)
  OR 
  auth.uid() in (select realtor_id from properties where id = property_id) -- the property realtor (seller side)
)
with check (
  auth.uid() = realtor_id
  OR 
  auth.uid() in (select realtor_id from properties where id = property_id)
);
