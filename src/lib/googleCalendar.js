/**
 * Google Calendar integration — Authorization Code Flow with Refresh Tokens
 *
 * Architecture:
 *  - Frontend: gets authorization code via Google Identity Services
 *  - Edge Function: exchanges code for tokens, stores refresh_token server-side
 *  - Access token: cached in localStorage (~1 hour), auto-refreshed via Edge Function
 *  - Refresh token: stored in profiles.google_refresh_token (never sent to client)
 */

const CLIENT_ID   = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES      = 'https://www.googleapis.com/auth/calendar.events';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const EDGE_FN_URL  = `${SUPABASE_URL}/functions/v1/google-calendar-token`;

// Redirect URI must match what's registered in Google Cloud Console
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-calendar-token/callback`;

// localStorage keys
const STORAGE_ACCESS_TOKEN = 'gcal_access_token';
const STORAGE_EXPIRY       = 'gcal_token_expiry';

// In-memory state
let accessToken    = null;
let tokenExpiry    = 0;
let autoRefreshTimer    = null;
let silentRefreshPromise = null;
let hasRefreshToken = false;

// Supabase auth token — set by init() so Edge Function can authenticate us
let supabaseAuthToken = null;

/* ─── Init ─────────────────────────────────────────────────────────────────── */

/**
 * Initialize with current Supabase session token and refresh token status.
 * Call this once after user logs in (from AppContext or auth listener).
 */
export function initCalendarAuth(sessionToken, userHasRefreshToken = false) {
    supabaseAuthToken = sessionToken;
    if (userHasRefreshToken) {
        hasRefreshToken = true;
    }
    // Try to restore cached access token
    restoreToken();
}

/* ─── Storage ───────────────────────────────────────────────────────────────── */

function restoreToken() {
    if (accessToken && Date.now() < tokenExpiry) return true;
    try {
        const stored = localStorage.getItem(STORAGE_ACCESS_TOKEN);
        const expiry = localStorage.getItem(STORAGE_EXPIRY);
        if (stored && expiry && Date.now() < Number(expiry)) {
            accessToken = stored;
            tokenExpiry = Number(expiry);
            scheduleAutoRefresh();
            return true;
        }
    } catch { /* localStorage disabled */ }
    return false;
}

function saveToken(token, expiresInSeconds) {
    accessToken = token;
    tokenExpiry = Date.now() + (expiresInSeconds - 60) * 1000;
    try {
        localStorage.setItem(STORAGE_ACCESS_TOKEN, token);
        localStorage.setItem(STORAGE_EXPIRY, String(tokenExpiry));
    } catch { /* non-critical */ }
    scheduleAutoRefresh();
}

function clearToken() {
    accessToken = null;
    tokenExpiry = 0;
    if (autoRefreshTimer) { clearTimeout(autoRefreshTimer); autoRefreshTimer = null; }
    try {
        localStorage.removeItem(STORAGE_ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_EXPIRY);
    } catch { /* ignore */ }
}

/* ─── Auto-refresh ──────────────────────────────────────────────────────────── */

const REFRESH_BEFORE_MS = 5 * 60 * 1000; // refresh 5 min before expiry

function scheduleAutoRefresh() {
    if (autoRefreshTimer) clearTimeout(autoRefreshTimer);
    if (!tokenExpiry) return;

    const delay = tokenExpiry - Date.now() - REFRESH_BEFORE_MS;
    if (delay <= 0) {
        refreshViaEdgeFunction();
        return;
    }

    console.info(`[Google Calendar] Auto-refresh in ${Math.round(delay / 60000)} min`);
    autoRefreshTimer = setTimeout(() => {
        autoRefreshTimer = null;
        refreshViaEdgeFunction();
    }, delay);
}

async function refreshViaEdgeFunction() {
    if (silentRefreshPromise) return silentRefreshPromise;

    silentRefreshPromise = (async () => {
        try {
            if (!supabaseAuthToken) {
                console.info('[Google Calendar] No Supabase session — skip refresh');
                return false;
            }

            const res = await fetch(`${EDGE_FN_URL}/refresh`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${supabaseAuthToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                console.warn('[Google Calendar] Refresh failed:', body.error);
                // 401 = refresh token revoked — clear local cache
                if (res.status === 401) clearToken();
                return false;
            }

            const { access_token, expires_in } = await res.json();
            saveToken(access_token, expires_in);
            console.info('[Google Calendar] Token refreshed via Edge Function ✓');
            return true;
        } catch (e) {
            console.warn('[Google Calendar] Refresh error:', e.message);
            return false;
        } finally {
            silentRefreshPromise = null;
        }
    })();

    return silentRefreshPromise;
}

/* ─── GSI helpers ───────────────────────────────────────────────────────────── */

function loadGsiScript() {
    return new Promise((resolve, reject) => {
        if (window.google?.accounts) return resolve();
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true; s.defer = true;
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
    });
}

/* ─── Public API ─────────────────────────────────────────────────────────────── */

export function isCalendarConfigured() {
    return !!CLIENT_ID && CLIENT_ID !== 'your_google_client_id.apps.googleusercontent.com';
}

export function isCalendarConnected() {
    if (accessToken && Date.now() < tokenExpiry) return true;
    if (restoreToken()) return true;
    return hasRefreshToken;
}

/**
 * Connect Google Calendar — shows consent popup, exchanges code via Edge Function.
 * @returns {Promise<void>}
 */
export async function connectCalendar() {
    return new Promise((resolve, reject) => {
        loadGsiScript().then(() => {
            try {
                const codeClient = window.google.accounts.oauth2.initCodeClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    ux_mode: 'popup',
                    prompt: 'consent',
                    // access_type=offline tells Google to return a refresh_token
                    callback: async (response) => {
                        if (response.error) {
                            return reject(new Error(response.error_description || response.error));
                        }

                        try {
                            // Exchange code for tokens via Edge Function (server-side)
                            const res = await fetch(`${EDGE_FN_URL}/exchange`, {
                                method: 'POST',
                                headers: {
                                    Authorization: `Bearer ${supabaseAuthToken}`,
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    code: response.code,
                                    redirect_uri: window.location.origin,
                                }),
                            });

                            if (!res.ok) {
                                const err = await res.json().catch(() => ({}));
                                throw new Error(err.error || 'Ошибка обмена токена');
                            }

                            const { access_token, expires_in } = await res.json();
                            saveToken(access_token, expires_in);
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    },
                });

                // prompt=consent + access_type=offline → Google returns refresh_token
                codeClient.requestCode();
            } catch (e) {
                reject(e);
            }
        }).catch(reject);
    });
}

/**
 * Get current valid access token (auto-refreshes if needed).
 * Used internally by calendar API calls.
 */
async function getAccessToken() {
    // 1. Valid token in memory/localStorage
    if (restoreToken()) return accessToken;

    // 2. Try to refresh via Edge Function
    const refreshed = await refreshViaEdgeFunction();
    if (refreshed && accessToken) return accessToken;

    throw new Error('Google Calendar не подключён. Зайдите в Профиль и нажмите «Подключить Google Календарь».');
}

/**
 * Disconnect — revokes tokens server-side and clears local cache.
 */
export async function disconnectCalendar() {
    clearToken();

    if (!supabaseAuthToken) return;
    try {
        await fetch(`${EDGE_FN_URL}/revoke`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${supabaseAuthToken}` },
        });
    } catch { /* non-critical */ }
}

/* ─── Calendar API ───────────────────────────────────────────────────────────── */

async function handleApiError(response) {
    const err = await response.json().catch(() => ({}));
    const status = response.status;
    if (status === 401) clearToken();
    const msg = err.error?.message || `HTTP ${status}`;
    const hint = status === 403
        ? ' (Проверьте что Google Calendar API включён в Google Cloud Console)'
        : status === 401
        ? ' (Токен истёк — переподключите Google Calendar в профиле)'
        : '';
    throw new Error(msg + hint);
}

function buildEvent(title, description, startDateTime, durationMinutes) {
    const start = new Date(startDateTime);
    if (isNaN(start.getTime())) throw new Error(`Некорректная дата: ${startDateTime}`);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return {
        summary: title,
        description,
        start: { dateTime: start.toISOString(), timeZone },
        end:   { dateTime: end.toISOString(),   timeZone },
    };
}

export async function addEventToCalendar({ title, description = '', startDateTime, durationMinutes = 60 }) {
    const token = await getAccessToken();
    const event = buildEvent(title, description, startDateTime, durationMinutes);

    console.info('[Google Calendar] Creating event:', { title, start: event.start.dateTime });

    const res = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
        }
    );
    if (!res.ok) await handleApiError(res);

    const created = await res.json();
    console.info('[Google Calendar] Event created:', created.id, created.htmlLink);
    return created;
}

export async function updateEventInCalendar(eventId, { title, description = '', startDateTime, durationMinutes = 60 }) {
    if (!eventId) throw new Error('Google Event ID is required');
    const token = await getAccessToken();
    const event = buildEvent(title, description, startDateTime, durationMinutes);

    const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
        }
    );
    if (!res.ok) await handleApiError(res);
    return res.json();
}

export async function deleteEventFromCalendar(eventId) {
    if (!eventId) return;
    const token = await getAccessToken();
    const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        }
    );
    if (!res.ok && res.status !== 404) await handleApiError(res);
    return true;
}

// Legacy compatibility (used in calendarSync.js checks)
export { isCalendarConfigured as default };
