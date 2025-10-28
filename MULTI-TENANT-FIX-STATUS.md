# Multi-Tenant Fix - Incomplete Work

## THE CRITICAL BUG DISCOVERED:
Events were being stored WITHOUT `organization_id`, making them orphaned and invisible to users. This is why zero alerts were being created.

### Root Cause:
1. Backend had no way to know which user was making requests (no auth token)
2. Events stored without `organization_id` field (line 227-236 in api/scan-news.js)
3. All queries failed because they filter by `organization_id` but events had none
4. Result: 0 events found → 0 analysis → 0 alerts

---

## ✅ COMPLETED (3 commits):

### 1. Frontend - Auth Token Support
**Files:** `src/components/intelligence/IntelligenceDashboard.tsx`
- Added `import { supabase } from '../../lib/supabase';`
- Updated `handleScanNews()` to get session and send Bearer token
- Updated `handleAnalyzeExisting()` to send Bearer token
- Updated `handleResetAnalysis()` to send Bearer token

### 2. Backend - Auth Verification
**File:** `api/scan-news.js` (lines 478-518)
- Added 'Authorization' to CORS headers
- Extract JWT token from `Authorization: Bearer` header
- Verify token with `supabase.auth.getUser(token)`
- Extract `user.id` as `organizationId`
- Return 401 if not authenticated

### 3. Event Storage - organization_id Field
**File:** `api/scan-news.js` (line 236)
- Added `organization_id: parsedFeeds.organizationId` to event object
- New events will now be linked to organization

### 4. Added Utility Buttons
- "Clear All Events" button in EventBrowser
- "Reset Analysis" button in IntelligenceDashboard
- Detailed diagnostic logging for Claude AI analysis

---

## ❌ INCOMPLETE - CRITICAL WORK REMAINING:

The `organizationId` is extracted but NOT being passed through the system. All database operations still fail because:

### Functions That Need organizationId Parameter:

1. **loadNewsSources** (line ~116)
   ```javascript
   // CHANGE FROM:
   async function loadNewsSources() {

   // TO:
   async function loadNewsSources(organizationId) {
     const { data, error } = await supabase
       .from('news_sources')
       .select('*')
       .eq('organization_id', organizationId)  // ADD THIS
       .eq('enabled', true);
   ```

2. **loadRiskKeywords** (line ~127)
   ```javascript
   // CHANGE FROM:
   async function loadRiskKeywords() {

   // TO:
   async function loadRiskKeywords(organizationId) {
     const { data, error } = await supabase
       .from('risk_keywords')
       .select('*')
       .eq('organization_id', organizationId)  // ADD THIS
       .eq('enabled', true);
   ```

3. **loadRisks** (line ~139)
   ```javascript
   // CHANGE FROM:
   async function loadRisks() {

   // TO:
   async function loadRisks(organizationId) {
     const { data, error } = await supabase
       .from('risks')
       .select('*')
       .eq('organization_id', organizationId);  // ADD THIS
   ```

4. **storeEvents** (line ~167)
   ```javascript
   // CHANGE FROM:
   async function storeEvents(parsedFeeds, maxAgeDays = 7, riskKeywords) {

   // TO:
   async function storeEvents(parsedFeeds, maxAgeDays, riskKeywords, organizationId) {
     // Then pass organizationId in parsedFeeds object:
     parsedFeeds.organizationId = organizationId;
   ```

### API Endpoints That Need organizationId Filtering:

5. **analyzeExisting** (line ~516)
   ```javascript
   const { data: events, error: eventsError } = await supabase
     .from('external_events')
     .select('*')
     .eq('organization_id', organizationId)  // ADD THIS
     .is('analyzed_at', null)
   ```

6. **resetAnalysis** (line ~651)
   ```javascript
   const { error: updateError } = await supabase
     .from('external_events')
     .update({ analyzed_at: null })
     .eq('organization_id', organizationId)  // ADD THIS
     .not('analyzed_at', 'is', null);
   ```

7. **clearUnanalyzed** (line ~555)
   ```javascript
   const { error: deleteError } = await supabase
     .from('external_events')
     .delete()
     .eq('organization_id', organizationId)  // ADD THIS
     .is('analyzed_at', null);
   ```

8. **clearAll** (line ~597)
   ```javascript
   const { error: deleteError } = await supabase
     .from('external_events')
     .delete()
     .eq('organization_id', organizationId)  // ADD THIS
     .neq('id', '00000000-0000-0000-0000-000000000000');
   ```

### Main Scan Flow (line ~695+):
   ```javascript
   // UPDATE ALL THESE CALLS:
   const sourcesToScan = await loadNewsSources(organizationId);
   const riskKeywords = await loadRiskKeywords(organizationId);

   // When calling storeEvents, pass organizationId:
   const { stored, storedEvents, allItems } = await storeEvents(
     parsedFeeds,
     maxAgeDays,
     riskKeywords,
     organizationId  // ADD THIS
   );

   // When loading risks for analysis:
   const risks = await loadRisks(organizationId);
   ```

---

## 🚨 CRITICAL ISSUE:
The 24 existing events in database have **NULL organization_id**. They are orphaned and unusable. Two options:

### Option A: Delete Orphaned Events
```sql
-- Run in Supabase SQL Editor:
DELETE FROM external_events WHERE organization_id IS NULL;
```

### Option B: Assign to Current User
```sql
-- Run in Supabase SQL Editor (if you're the only user):
UPDATE external_events
SET organization_id = auth.uid()
WHERE organization_id IS NULL;
```

---

## 🎯 NEXT SESSION PLAN:

1. **Make systematic edits** to pass `organizationId` through all 8+ functions
2. **Test each change** incrementally
3. **Clean up orphaned events** (delete or reassign)
4. **Run fresh scan** - events will be properly linked
5. **Analyze events** - should finally create alerts!

---

## 📋 TESTING CHECKLIST (After Fix Complete):

- [ ] Scan News - events stored with correct organization_id
- [ ] Check Event Browser - see YOUR events only
- [ ] Analyze Events - finds YOUR events, YOUR risks
- [ ] Alerts Created - intelligence alerts appear
- [ ] Multi-User Test - create test user, verify data isolation

---

## 📊 CURRENT STATE:

**Commits Made:** 3 (WIP commits with partial fix)
**Files Modified:**
- `src/components/intelligence/IntelligenceDashboard.tsx`
- `api/scan-news.js`

**Database State:**
- 24 orphaned events (NULL organization_id)
- 5 sample risks (linked to your organization)
- 0 alerts

**What Works:**
- Auth token extraction ✅
- Frontend sends tokens ✅
- Event storage includes organization_id field ✅

**What's Broken:**
- All database queries (missing organization_id filters) ❌
- Function calls (not passing organizationId parameter) ❌
- Orphaned events (NULL organization_id) ❌

---

## 🔥 PRIORITY 1 FIX:
Update `analyzeExisting` endpoint first (line ~516) - this is what's stuck in "Analyzing..." state right now!

```javascript
// IMMEDIATE FIX NEEDED:
const { data: events, error: eventsError } = await supabase
  .from('external_events')
  .select('*')
  .eq('organization_id', organizationId)  // ← ADD THIS LINE
  .is('analyzed_at', null)
  .order('published_date', { ascending: false })
  .limit(50);
```

---

Generated: 2025-10-28
Session: Continuation needed for systematic refactor
