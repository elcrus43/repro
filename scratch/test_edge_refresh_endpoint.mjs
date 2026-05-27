const EDGE_FN_URL = 'https://hxivaohzugahjyuaahxc.supabase.co/functions/v1/google-calendar-token/refresh';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUxNzI4MSwiZXhwIjoyMDg4MDkzMjgxfQ.MBQxRxGfzihFn-aK-7-bGSJ80qoP-jjvU_MxlIH5t8k';
const USER_ID = 'f31f0301-62bf-4821-a625-d3e7a9a2dd7d';

async function run() {
  console.log('Testing Edge Function /refresh endpoint...');
  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Test-User-Id': USER_ID,
      'X-Test-Secret': SERVICE_KEY
    }
  });

  const status = res.status;
  const data = await res.json();
  console.log('Status:', status);
  console.log('Response:', data);
}

run().catch(console.error);
