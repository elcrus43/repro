/**
 * Google Calendar integration via Google Identity Services (GSI)
 * Uses OAuth 2.0 implicit flow — no backend needed
 *
 * Token persistence: access tokens are stored in sessionStorage
 * so they survive page reloads within the same browser tab session.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

let tokenClient = null;
let accessToken = null;
let tokenExpiry = 0;

const STORAGE_KEY = 'gcal_access_token';
const STORAGE_EXPIRY_KEY = 'gcal_token_expiry';

/** Restore token from sessionStorage if available */
function restoreToken() {
    if (accessToken) return true;
    try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        const expiry = sessionStorage.getItem(STORAGE_EXPIRY_KEY);
        if (stored && expiry && Date.now() < Number(expiry)) {
            accessToken = stored;
            tokenExpiry = Number(expiry);
            return true;
        }
    } catch {
        // sessionStorage may be disabled
    }
    return false;
}

/** Persist token to sessionStorage */
function persistToken(token, expiryMs) {
    try {
        sessionStorage.setItem(STORAGE_KEY, token);
        sessionStorage.setItem(STORAGE_EXPIRY_KEY, String(expiryMs));
    } catch {
        // sessionStorage may be disabled — non-critical
    }
}

/** Clear persisted token */
function clearPersistedToken() {
    try {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_EXPIRY_KEY);
    } catch { /* ignore */ }
}

/** Load the GSI script dynamically */
function loadGsiScript() {
    return new Promise((resolve, reject) => {
        if (window.google?.accounts) return resolve();
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/** Initialize or get token client */
async function getTokenClient() {
    await loadGsiScript();
    if (!tokenClient) {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: () => { }, // will be overridden per-request
        });
    }
    return tokenClient;
}

/**
 * Check if Google Calendar is configured and connected.
 * @returns {boolean}
 */
export function isCalendarConfigured() {
    return !!CLIENT_ID && CLIENT_ID !== 'your_google_client_id.apps.googleusercontent.com';
}

/**
 * Check if user has a valid access token (connected their Google Calendar).
 * @returns {boolean}
 */
export function isCalendarConnected() {
    return !!accessToken && Date.now() < tokenExpiry;
}

/**
 * Request access token (shows Google consent popup if needed).
 * @param {boolean} forceConsent - if true, always show consent popup
 * @returns {Promise<string>} access token
 */
export function requestAccessToken(forceConsent = false) {
    return new Promise((resolve, reject) => {
        // Try to restore token from sessionStorage first
        if (!forceConsent && restoreToken()) {
            resolve(accessToken);
            return;
        }

        getTokenClient().then(client => {
            client.callback = (response) => {
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    accessToken = response.access_token;
                    tokenExpiry = Date.now() + (response.expires_in - 60) * 1000;
                    persistToken(accessToken, tokenExpiry);
                    resolve(accessToken);
                }
            };
            // If we have a valid token and not forcing consent, skip popup
            if (!forceConsent && accessToken && Date.now() < tokenExpiry) {
                resolve(accessToken);
                return;
            }
            client.requestAccessToken({ prompt: forceConsent ? 'consent' : '' });
        }).catch(reject);
    });
}

/**
 * Disconnect Google Calendar (clear tokens).
 * This revokes the access token and clears local storage.
 */
export async function disconnectCalendar() {
    if (accessToken) {
        try {
            // Revoke the token on Google's side
            await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
                method: 'POST',
            });
        } catch {
            // Token revocation may fail — non-critical
        }
    }
    accessToken = null;
    tokenExpiry = 0;
    clearPersistedToken();
    tokenClient = null;
}

/**
 * Add an event to the user's primary Google Calendar
 * @param {Object} params
 * @param {string} params.title - Event title
 * @param {string} params.description - Event description
 * @param {string} params.startDateTime - ISO datetime string (e.g. "2025-03-10T14:00:00")
 * @param {number} [params.durationMinutes=60] - Duration in minutes
 * @returns {Promise<Object>} Created event object from Google API
 */
export async function addEventToCalendar({ title, description = '', startDateTime, durationMinutes = 60 }) {
    const token = await requestAccessToken();

    const start = new Date(startDateTime);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    const event = {
        summary: title,
        description,
        start: {
            dateTime: start.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
            dateTime: end.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
    };

    const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(event),
        }
    );

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Google Calendar API error');
    }

    return response.json();
}

/**
 * Update an existing event in the user's primary Google Calendar
 * @param {string} eventId - Google Calendar event ID
 * @param {Object} params - Event data (title, description, startDateTime, durationMinutes)
 */
export async function updateEventInCalendar(eventId, { title, description = '', startDateTime, durationMinutes = 60 }) {
    if (!eventId) throw new Error('Google Event ID is required for update');
    const token = await requestAccessToken();

    const start = new Date(startDateTime);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    const event = {
        summary: title,
        description,
        start: {
            dateTime: start.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
            dateTime: end.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
    };

    const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(event),
        }
    );

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Google Calendar API update error');
    }

    return response.json();
}

/**
 * Delete an event from the user's primary Google Calendar
 * @param {string} eventId - Google Calendar event ID
 */
export async function deleteEventFromCalendar(eventId) {
    if (!eventId) return; // Silent return if no ID
    const token = await requestAccessToken();

    const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json',
            },
        }
    );

    if (!response.ok && response.status !== 404) { // Ignore 404 if already deleted
        const err = await response.json();
        throw new Error(err.error?.message || 'Google Calendar API deletion error');
    }

    return true;
}
