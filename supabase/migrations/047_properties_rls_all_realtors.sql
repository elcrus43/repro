-- Migration 047: Allow all realtors to see all properties and requests
-- This is needed for cross-realtor matching functionality

-- === PROPERTIES ===
-- Drop restrictive SELECT policies
DROP POLICY IF EXISTS "Users can view own properties" ON properties;
DROP POLICY IF EXISTS "Realtors can view own properties" ON properties;
DROP POLICY IF EXISTS "properties_select_policy" ON properties;
DROP POLICY IF EXISTS "Allow individual read access" ON properties;

-- Allow all authenticated users to SELECT any property
CREATE POLICY "All authenticated can view all properties"
  ON properties FOR SELECT
  TO authenticated
  USING (true);

-- === REQUESTS ===
-- Drop restrictive SELECT policies
DROP POLICY IF EXISTS "Users can view own requests" ON requests;
DROP POLICY IF EXISTS "Realtors can view own requests" ON requests;
DROP POLICY IF EXISTS "requests_select_policy" ON requests;
DROP POLICY IF EXISTS "Allow individual read access" ON requests;

-- Allow all authenticated users to SELECT any request
CREATE POLICY "All authenticated can view all requests"
  ON requests FOR SELECT
  TO authenticated
  USING (true);
