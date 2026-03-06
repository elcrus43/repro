-- FINAL VISIBILITY FIX: Disable Row Level Security (RLS)
-- This ensures that everyone can see everything, regardless of who created the record.

-- Disable RLS for core tables
ALTER TABLE properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE showings DISABLE ROW LEVEL SECURITY;

-- Re-grant access just in case (though disabling RLS usually bypasses this)
GRANT ALL ON TABLE properties TO authenticated;
GRANT ALL ON TABLE requests TO authenticated;
GRANT ALL ON TABLE clients TO authenticated;
GRANT ALL ON TABLE profiles TO authenticated;
GRANT ALL ON TABLE matches TO authenticated;
GRANT ALL ON TABLE showings TO authenticated;

-- Keep Tasks private (optional)
-- If you want everyone to see each other's tasks, uncomment the line below:
-- ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- Verification query (run this to see if you have data)
-- SELECT count(*) FROM properties;
