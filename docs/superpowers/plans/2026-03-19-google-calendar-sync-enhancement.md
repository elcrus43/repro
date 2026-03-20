# Google Calendar Sync Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the Google Calendar integration in `realtor-match` to support synchronization on task updates and deletions, using a stored `google_event_id` in Supabase.

**Architecture:** 
1. Add `google_event_id` column to the `tasks` table.
2. Extend `googleCalendar.js` with `PATCH` and `DELETE` methods for the Google Calendar API.
3. Update `TasksPage.jsx` to store, update, and delete calendar events in sync with CRM tasks.

**Tech Stack:** React, Supabase, Google Calendar API (OAuth 2.0 Implicit Flow).

---

### Task 1: Database Schema Update

**Files:**
- Create: `C:/Users/Office-40/.gemini/antigravity/scratch/realtor-match/migration_tasks_google_id.sql`

- [ ] **Step 1: Create SQL migration file**
  
```sql
-- Add google_event_id column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS google_event_id TEXT;
```

- [ ] **Step 2: Ask user to run SQL in Supabase Dashboard**
  Expected: Success message in Supabase.

### Task 2: Extend Google Calendar Library

**Files:**
- Modify: `C:/Users/Office-40/.gemini/antigravity/scratch/realtor-match/src/lib/googleCalendar.js`

- [ ] **Step 1: Implement `updateEventInCalendar`**
  Add a function that takes `eventId`, `title`, `description`, `startDateTime`, and `durationMinutes`. Use `PATCH` to `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`.

- [ ] **Step 2: Implement `deleteEventFromCalendar`**
  Add a function that takes `eventId`. Use `DELETE` to `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`.

- [ ] **Step 3: Export new functions**

### Task 3: Update TasksPage Creation Logic

**Files:**
- Modify: `C:/Users/Office-40/.gemini/antigravity/scratch/realtor-match/src/pages/Tasks/TasksPage.jsx`

- [ ] **Step 1: Capture `google_event_id` from API response**
  In `addTask`, after calling `addEventToCalendar`, capture the `id` from the result. Note: Google API returns the ID in the top level of the response object.
  Add it to `taskToSave.google_event_id`.

- [ ] **Step 2: Save the updated `taskToSave` with the ID**
  Ensure the local state and Supabase are updated with the `google_event_id`.

### Task 4: Update TasksPage Edit/Sync Logic

**Files:**
- Modify: `C:/Users/Office-40/.gemini/antigravity/scratch/realtor-match/src/pages/Tasks/TasksPage.jsx`

- [ ] **Step 1: Handle updates in `addTask` (for existing tasks)**
  - If `newTask.id` exists and `taskToSave.google_event_id` is present:
    - If `taskToSave.due_date` is now null/empty, call `deleteEventFromCalendar` and clear the ID.
    - Else, call `updateEventInCalendar`.
  - If `google_event_id` is NOT present but has a `due_date`, call `addEventToCalendar` (handle legacy tasks).

- [ ] **Step 2: Handle deletions in `deleteTask`**
  If `task.google_event_id` is present, call `deleteEventFromCalendar`. Ensure CRM deletion proceeds even if calendar deletion fails (with a warning).

- [ ] **Step 3: Add error handling for Google API calls**
  Wrap calendar calls in try/catch to ensure CRM state is not blocked by calendar errors. Show a toast on error.

### Task 5: Verification

- [ ] **Step 1: Verify Adding a Task**
  Check if a task is added to Google Calendar and if its ID is stored in the `tasks` table.

- [ ] **Step 2: Verify Editing a Task**
  Change the title or date and verify the Google Calendar event updates.

- [ ] **Step 3: Verify Deleting a Task**
  Delete the task and verify the Google Calendar event is gone.
