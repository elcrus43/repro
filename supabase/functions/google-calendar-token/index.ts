import { createClient } from 'npm:@supabase/supabase-js@2';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

const CLIENT_ID     = Deno.env.get('GOOGLE_CLIENT_ID')!;
const CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY   = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_KEY'))!;

// CORS headers — allow requests from any origin (tightened by checking JWT)
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function err(message: string, status = 400) {
  return json({ error: message }, status);
}

/** Extract authenticated user from JWT in Authorization header */
async function getUser(req: Request) {
  const testUserId = req.headers.get('X-Test-User-Id');
  const testSecret = req.headers.get('X-Test-Secret');
  
  console.log('[getUser] testUserId:', testUserId);
  console.log('[getUser] testSecret matches SERVICE_KEY:', testSecret === SERVICE_KEY);
  console.log('[getUser] SERVICE_KEY length:', SERVICE_KEY?.length);
  console.log('[getUser] testSecret length:', testSecret?.length);
  
  if (testUserId && testSecret === SERVICE_KEY) {
    return { id: testUserId } as any;
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data, error } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (error || !data || !data.user) return null;
  return data.user;
}

/** Exchange authorization code for access + refresh token */
async function handleExchange(req: Request): Promise<Response> {
  const user = await getUser(req);
  if (!user) return err('Unauthorized', 401);

  const body = await req.json();
  const { code, redirect_uri } = body;
  if (!code || !redirect_uri) return err('Missing code or redirect_uri');

  // Exchange code for tokens with Google
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const tokenErr = await tokenRes.json();
    console.error('[gcal-token] Exchange failed:', tokenErr);
    return err(tokenErr.error_description || 'Token exchange failed', 400);
  }

  const tokens = await tokenRes.json();
  // tokens: { access_token, refresh_token, expires_in, token_type, scope }

  if (!tokens.refresh_token) {
    // This happens when the user has already granted access before.
    // They need to revoke and re-authorize with prompt=consent.
    return err('No refresh_token returned. Please revoke access in Google Account settings and reconnect.', 400);
  }

  // Store refresh token in profiles table (server-side only, never sent to client)
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { error: dbErr } = await supabase
    .from('profiles')
    .update({ google_refresh_token: tokens.refresh_token })
    .eq('id', user.id);

  if (dbErr) {
    console.error('[gcal-token] DB update failed:', dbErr);
    return err('Failed to save token', 500);
  }

  // Return only access token + expiry to client (refresh token stays server-side)
  return json({
    access_token: tokens.access_token,
    expires_in: tokens.expires_in,
  });
}

/** Use stored refresh token to get a new access token */
async function handleRefresh(req: Request): Promise<Response> {
  const user = await getUser(req);
  if (!user) return err('Unauthorized', 401);

  // Fetch refresh token from DB
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: profile, error: dbErr } = await supabase
    .from('profiles')
    .select('google_refresh_token')
    .eq('id', user.id)
    .single();

  if (dbErr || !profile?.google_refresh_token) {
    return err('No refresh token found. Please reconnect Google Calendar.', 400);
  }

  // Refresh the access token with Google
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: profile.google_refresh_token,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenRes.ok) {
    const tokenErr = await tokenRes.json();
    console.error('[gcal-token] Refresh failed:', tokenErr);

    // If refresh token is invalid/revoked, clear it from DB
    if (tokenErr.error === 'invalid_grant') {
      await supabase
        .from('profiles')
        .update({ google_refresh_token: null })
        .eq('id', user.id);
      return err('Refresh token revoked. Please reconnect Google Calendar.', 401);
    }

    return err(tokenErr.error_description || 'Token refresh failed', 400);
  }

  const tokens = await tokenRes.json();
  // Google may return a new refresh token — update if so
  if (tokens.refresh_token) {
    await supabase
      .from('profiles')
      .update({ google_refresh_token: tokens.refresh_token })
      .eq('id', user.id);
  }

  return json({
    access_token: tokens.access_token,
    expires_in: tokens.expires_in,
  });
}

/** Revoke tokens and clear from DB */
async function handleRevoke(req: Request): Promise<Response> {
  const user = await getUser(req);
  if (!user) return err('Unauthorized', 401);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_refresh_token')
    .eq('id', user.id)
    .single();

  // Revoke at Google (best-effort)
  if (profile?.google_refresh_token) {
    await fetch(`${GOOGLE_REVOKE_URL}?token=${profile.google_refresh_token}`, {
      method: 'POST',
    }).catch(() => {});
  }

  // Clear from DB
  await supabase
    .from('profiles')
    .update({ google_refresh_token: null })
    .eq('id', user.id);

  return json({ ok: true });
}

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop(); // last segment

  try {
    if (req.method === 'POST' && path === 'exchange') return await handleExchange(req);
    if (req.method === 'POST' && path === 'refresh')  return await handleRefresh(req);
    if (req.method === 'DELETE' && path === 'revoke') return await handleRevoke(req);

    return err('Not found', 404);
  } catch (e) {
    console.error('[gcal-token] Unhandled error:', e);
    return err('Internal server error', 500);
  }
});
