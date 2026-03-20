/**
 * Google Calendar integration via Google Identity Services (GSI)
 * Uses OAuth 2.0 implicit flow — no backend needed
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

let tokenClient = null;
let accessToken = null;
let tokenExpiry = 0;

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
            callback: () => {}, // will be overridden per-request
        });
    }
    return tokenClient;
}

/** Request access token (shows Google consent popup if needed) */
export function requestAccessToken() {
    return new Promise((resolve, reject) => {
        getTokenClient().then(client => {
            client.callback = (response) => {
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    accessToken = response.access_token;
                    tokenExpiry = Date.now() + (response.expires_in - 60) * 1000;
                    resolve(accessToken);
                }
            };
            // If we have a valid token, skip popup
            if (accessToken && Date.now() < tokenExpiry) {
                resolve(accessToken);
                return;
            }
            client.requestAccessToken({ prompt: '' });
        }).catch(reject);
    });
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
