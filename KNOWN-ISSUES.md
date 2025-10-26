# Known Issues

## Risk Register - Incident Count Auto-Refresh

**Status:** Low Priority - Workaround Available

**Issue:**
When linking or unlinking an incident to a risk from the Incidents tab, the incident count in the Risk Register doesn't automatically update in real-time.

**Impact:**
- Minor UX inconvenience
- Data is correctly saved to database
- Trigger is working correctly (verified via SQL)
- Count updates are persisted

**Workaround:**
Users can see the updated incident count by:
1. Switching to the Risk Register tab and back
2. Refreshing the browser page

**Technical Details:**
- Database trigger `sync_incident_count_to_risk()` is working correctly
- The `linked_incident_count` and `last_incident_date` fields are being updated in the database
- `loadRisksFromDB()` is being called after linking/unlinking
- React state update may not be triggering re-render due to object reference equality

**Potential Fix:**
Force React re-render by creating new array references when updating state, or implement React Context for cross-tab state management.

**Priority:**
Defer until Phase 2 AI features are complete.

---

**Date Created:** 2025-10-26
