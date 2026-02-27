

## Plan: Multi-event support + delete event

Currently the dashboard only fetches and displays a single event (`limit(1)`). We need to refactor it to support 1-5 events with a selector/list, plus add delete functionality.

### Implementation Steps

1. **Refactor state to support multiple events**
   - Change `event` state from `EventData | null` to `events: EventData[]` and `selectedEvent: EventData | null`
   - Change `fetchEvent` to fetch all events for the user (up to 5)
   - Track stats per selected event

2. **Add event selector UI**
   - When user has 1+ events, show a horizontal list/tabs of event cards at the top
   - Clicking an event card selects it and shows its stats/actions below
   - Show a "+ New Event" card if user has fewer than 5 events (enforced with count check before create)

3. **Add delete event functionality**
   - Add a "Delete" button (with `Trash2` icon) next to the Edit button in the event info banner
   - Show a confirmation dialog (using AlertDialog) before deleting
   - On confirm: delete the event from the database (cascade will handle guests/tables/photos via foreign keys — but since there are no FK constraints, we need to manually delete related guests, seating_tables, and event_photos first)
   - After deletion, remove from local state and select the next event or show the empty/create state

4. **Enforce 5-event limit**
   - In `handlePurchaseAndCreate`, check `events.length >= 5` and show an error toast if at max
   - Update the purchase flow header text to reflect "Create Another Invitation" when events exist

5. **Fix existing bugs in same file**
   - Replace custom `ChevronRight` with lucide-react import
   - Fix UTC date parsing on lines 139 and 339

### Files to modify
- `src/pages/DashboardPage.tsx` — main refactor (multi-event state, event list UI, delete handler, limit enforcement)

