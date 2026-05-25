import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

async function getOpenApiSchema() {
  const url = `${supabaseUrl}/rest/v1/`;
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': anonKey,
        'Accept': 'application/openapi+json'
      }
    });
    const schema = await res.json();
    console.log('Response:', schema);
  } catch (err) {
    console.error(err);
  }
}

getOpenApiSchema();
