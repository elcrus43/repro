# Google Calendar Sync Enhancement Design Specification

- **Date:** 2026-03-19
- **Topic:** Robustness of Google Calendar integration
- **Goal:** Support synchronization on task updates and deletions, using a stored `google_event_id` in Supabase.

## Architecture

1.  **Database Strategy**: Add `google_event_id` (TEXT) to the `tasks` table. This allows us to track which CRM tasks are linked to which Google Calendar events.
2.  **API Integration**: Use the existing OAuth 2.0 Implicit Flow. Extend the `googleCalendar.js` library to support `PATCH` (update) and `DELETE` (deletion) operations.
3.  **Synchronization Flow**:
    -   **Create**: Store the returned `id` from Google Calendar in the CRM task.
    -   **Update**: If a task with a `google_event_id` is modified (and its `due_date` is changed), update the corresponding event.
    -   **Delete**: If a task is removed, delete its event from Google Calendar if the ID exists.

## Component Changes

### 1. `googleCalendar.js`
-   `updateEventInCalendar(eventId, eventData)`: `PATCH https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`
-   `deleteEventFromCalendar(eventId)`: `DELETE https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`

### 2. `TasksPage.jsx`
-   Modify `addTask` to handle both insert and update.
-   Modify `deleteTask` to trigger calendar deletion.

## Database Changes (SQL)
```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS google_event_id TEXT;
```

## Review Status
-   Brainstorming: ✅ Approved by user.
-   Spec Review: ⏳ Pending.
