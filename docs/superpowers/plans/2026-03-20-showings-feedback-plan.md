# Showings Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a frontend-only reminder system for showings that asks realtors to provide feedback if a showing planned time has passed 24 hours.

**Architecture:** We will compute a list of pending showings on the fly in `ShowingsPage.jsx`. When a showing is pending, we present a UI block asking for feedback. The feedback submission uses the existing `UPDATE_SHOWING` action.

**Tech Stack:** React, CSS

---

### Task 1: Add Pending Feedback UI in ShowingsPage

**Files:**
- Modify: `c:\Users\Office-40\.gemini\antigravity\scratch\realtor-match\src\pages\Showings\ShowingsPage.jsx`

- [ ] **Step 1: Compute pending showings**
```javascript
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const pendingFeedbackShowings = myShowings.filter(s => {
    if (s.status !== 'planned' || !s.showing_date) return false;
    const showingTime = new Date(s.showing_date).getTime();
    return (now.getTime() - showingTime) > TWENTY_FOUR_HOURS;
});
```

- [ ] **Step 2: Render the Pending Section UI**
Render a new section above the calendar with a distinct title "📋 Ожидают подтверждения".

- [ ] **Step 3: Implement Feedback Handlers**
Use existing `saveFeedback` for when the user clicks 'Понравилось', 'Думает', 'Не заинтересован'.
Implement 'Не состоялся' using `saveFeedback(showing, 'failed')`.

- [ ] **Step 4: Verify Changes Locally**
Run: `npm run dev`
Manual checking: Start the application, create a showing manually with a date > 24 hours in the past, and observe the "Ожидают подтверждения" block. Click the options and make sure they save correctly.

- [ ] **Step 5: Commit changes**
```bash
git add src/pages/Showings/ShowingsPage.jsx
git commit -m "feat: add pending feedback prompt for past showings"
```
