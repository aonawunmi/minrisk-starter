# MinRisk ERM Reports - Comprehensive Test Script

**Date Created:** January 30, 2025
**Purpose:** Systematic walkthrough of all ERM Reports features
**Estimated Time:** 45-60 minutes

---

## Pre-Test Setup

### Environment Check
- [ ] Development server running on http://localhost:5174/
- [ ] Supabase connection active
- [ ] Claude API key configured
- [ ] Browser cache cleared
- [ ] Console open for monitoring

### Test Data Requirements
- [ ] At least 10 active risks in system
- [ ] At least 5 controls linked to risks
- [ ] At least 2 KRI alerts configured
- [ ] At least 1 incident recorded
- [ ] User logged in as admin

---

## Test Suite 1: Organization Settings

### Test 1.1: View Current Settings
**Steps:**
1. Navigate to Admin Dashboard
2. Click on "Organization Settings" section
3. Observe loaded values

**Expected Results:**
- ✅ Organization Name: "213 Capital"
- ✅ Institution Type: "Capital Markets"
- ✅ Default Regulator: "SEC"
- ✅ No errors in console

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 1.2: Change Institution Type to Bank
**Steps:**
1. Select "Bank" from Institution Type dropdown
2. Observe Default Regulator field

**Expected Results:**
- ✅ Default Regulator automatically changes to "CBN"
- ✅ No errors in console

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 1.3: Change Institution Type to Pensions
**Steps:**
1. Select "Pensions" from Institution Type dropdown
2. Observe Default Regulator field

**Expected Results:**
- ✅ Default Regulator automatically changes to "PENCOM"
- ✅ No errors in console

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 1.4: Save Settings
**Steps:**
1. Change Organization Name to "Test Organization 123"
2. Select "Capital Markets" as Institution Type
3. Click "Save Settings" button
4. Wait for confirmation

**Expected Results:**
- ✅ Success message appears
- ✅ Settings persist after page refresh
- ✅ No errors in console

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 1.5: Invalid Settings Validation
**Steps:**
1. Clear Organization Name field
2. Try to save

**Expected Results:**
- ✅ Error message appears
- ✅ Settings not saved
- ✅ No console errors

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test Suite 2: Report Generation

### Test 2.1: Generate Board Report
**Steps:**
1. Navigate to "ERM Reports" tab
2. Click "Generate Report" button
3. Select Audience: "Board"
4. Select Period: "Q1 2025"
5. Click "Generate"
6. Wait for generation to complete (may take 30-60 seconds)

**Expected Results:**
- ✅ Loading indicator appears
- ✅ Report generates successfully
- ✅ Console shows "Capital Markets" and "SEC"
- ✅ Multiple sections appear in report
- ✅ Each section has narrative text
- ✅ No errors in console

**Console Logs to Verify:**
```
🔍 ReportComposer: Loading org settings for: [org-id]
📋 ReportComposer: Loaded settings: {institution_type: "Capital Markets", default_regulator: "SEC"}
```

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):
- Number of sections generated: ___
- AI narratives generated: [ ] Yes [ ] No

---

### Test 2.2: Generate Regulator Report (SEC)
**Steps:**
1. Click "Generate Report" button
2. Select Audience: "Regulator"
3. Observe Regulator dropdown
4. Verify default is "SEC"
5. Select Period: "Q2 2025"
6. Click "Generate"

**Expected Results:**
- ✅ Regulator dropdown shows "SEC" by default
- ✅ Report generates successfully
- ✅ SEC-specific sections appear
- ✅ Compliance language in narratives
- ✅ No errors in console

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 2.3: Generate Regulator Report with Override (CBN)
**Steps:**
1. Click "Generate Report" button
2. Select Audience: "Regulator"
3. Override regulator to "CBN"
4. Select Period: "Q3 2025"
5. Click "Generate"

**Expected Results:**
- ✅ Can override default SEC to CBN
- ✅ Report generates with CBN template
- ✅ CBN-specific sections appear
- ✅ No errors in console

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 2.4: Generate CEO Report
**Steps:**
1. Click "Generate Report" button
2. Select Audience: "CEO"
3. Select Period: "Q4 2025"
4. Click "Generate"

**Expected Results:**
- ✅ No regulator dropdown (not applicable)
- ✅ Report generates successfully
- ✅ Executive summary style narratives
- ✅ High-level metrics and insights
- ✅ No errors in console

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 2.5: Duplicate Report Prevention
**Steps:**
1. Try to generate same report twice (same audience + period)

**Expected Results:**
- ✅ Error message about duplicate
- OR ✅ Opens existing draft
- ✅ No duplicate records in database

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test Suite 3: Report Editing

### Test 3.1: View Report Sections
**Steps:**
1. Open any generated report
2. Scroll through all sections

**Expected Results:**
- ✅ All sections render properly
- ✅ Narratives are readable and relevant
- ✅ Section numbers/order correct
- ✅ Toggle switches appear for each section
- ✅ Edit buttons appear for each section

**Sections to Verify:**
- [ ] Executive Summary
- [ ] Risk Overview
- [ ] Top Risks
- [ ] Risk Movements
- [ ] KRI Alerts
- [ ] Appetite Exceptions
- [ ] Control Effectiveness
- [ ] Incidents & Events
- [ ] Emerging Risks
- [ ] Regulatory Compliance (if regulator report)

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 3.2: Toggle Section Inclusion
**Steps:**
1. Open a report draft
2. Find "KRI Alerts" section
3. Toggle it OFF (exclude)
4. Observe changes

**Expected Results:**
- ✅ Section becomes grayed out or marked excluded
- ✅ Change saves automatically
- ✅ Section won't appear in final export
- ✅ Audit trail records the change

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 3.3: Edit Section Narrative
**Steps:**
1. Open a report draft
2. Find "Executive Summary" section
3. Click "Edit" button
4. Modify the narrative text
5. Add: "This is a test edit."
6. Click "Save" or auto-save
7. Refresh page

**Expected Results:**
- ✅ Edit interface appears
- ✅ Can modify text
- ✅ Changes save successfully
- ✅ Edited text persists after refresh
- ✅ Last edited by/at timestamp updates
- ✅ Audit trail records the change

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 3.4: View Table Data Sections
**Steps:**
1. Open a report with table sections
2. Find "Top Risks" or "KRI Alerts" section
3. Verify table displays correctly

**Expected Results:**
- ✅ Table renders with proper formatting
- ✅ All columns appear
- ✅ Data is accurate and up-to-date
- ✅ Headers are clear

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 3.5: Finalize Report
**Steps:**
1. Open a draft report
2. Review all sections
3. Click "Finalize Report" button
4. Confirm finalization

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Report status changes to "Final"
- ✅ Edit buttons disappear or disable
- ✅ Cannot modify finalized report
- ✅ Finalized timestamp appears
- ✅ Audit trail records finalization

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 3.6: Attempt to Edit Finalized Report
**Steps:**
1. Try to edit a finalized report

**Expected Results:**
- ✅ Edit buttons disabled or hidden
- ✅ Toggle switches disabled
- ✅ Message indicates report is finalized

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test Suite 4: Report Export

### Test 4.1: Export Draft Report to Word
**Steps:**
1. Open a draft report
2. Click "Export to Word" button
3. Wait for download
4. Open downloaded .docx file

**Expected Results:**
- ✅ File downloads successfully
- ✅ Filename format: "Report_[Audience]_[Period]_[Date].docx"
- ✅ Document opens in Word/compatible app
- ✅ All included sections appear
- ✅ Excluded sections do not appear
- ✅ Formatting is professional
- ✅ Tables render correctly
- ✅ Organization name in header/footer

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):
- File size: ___ KB
- Sections in export: ___

---

### Test 4.2: Export Finalized Report to Word
**Steps:**
1. Open a finalized report
2. Click "Export to Word" button
3. Download and verify

**Expected Results:**
- ✅ Same as Test 4.1
- ✅ "FINAL" watermark or indicator present

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 4.3: Export Report to PDF
**Steps:**
1. Open any report
2. Click "Export to PDF" button
3. Wait for download
4. Open downloaded .pdf file

**Expected Results:**
- ✅ File downloads successfully
- ✅ Filename format: "Report_[Audience]_[Period]_[Date].pdf"
- ✅ PDF opens correctly
- ✅ All included sections appear
- ✅ Formatting is professional
- ✅ Text is selectable (not image-based)
- ✅ Page breaks are sensible

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):
- File size: ___ KB
- Number of pages: ___

---

### Test 4.4: Large Report Export
**Steps:**
1. Generate report with all sections included
2. Ensure at least 20+ risks in system
3. Export to both Word and PDF
4. Verify large file handling

**Expected Results:**
- ✅ Exports complete without timeout
- ✅ Files are reasonable size (<5MB each)
- ✅ No truncated content
- ✅ Performance is acceptable (<30 seconds)

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):
- Word file size: ___ KB
- PDF file size: ___ KB
- Export time: ___ seconds

---

## Test Suite 5: Data Accuracy

### Test 5.1: Risk Data Verification
**Steps:**
1. Note current risk count in Risks tab
2. Generate a new report
3. Check "Risk Overview" section

**Expected Results:**
- ✅ Risk count matches Risks tab
- ✅ Top risks are actually highest scoring
- ✅ Risk categories are accurate
- ✅ Risk scores are current

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):
- Risks in system: ___
- Risks in report: ___

---

### Test 5.2: Control Effectiveness Verification
**Steps:**
1. Check controls in system
2. Verify controls appear in report
3. Verify effectiveness scores match

**Expected Results:**
- ✅ All controls appear in report
- ✅ Effectiveness ratings match system
- ✅ Control-risk linkages correct

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 5.3: KRI Alerts Verification
**Steps:**
1. Create a KRI alert
2. Generate new report
3. Verify alert appears

**Expected Results:**
- ✅ New KRI alert appears in report
- ✅ Alert severity is correct
- ✅ Alert details are accurate

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 5.4: Incident Data Verification
**Steps:**
1. Check incidents in system
2. Verify incidents in report
3. Check incident details

**Expected Results:**
- ✅ All incidents appear in report
- ✅ Incident dates are correct
- ✅ Incident descriptions match
- ✅ Risk linkages are accurate

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 5.5: Risk Movement Tracking
**Steps:**
1. Modify a risk score
2. Wait for movement to be recorded
3. Generate report for period
4. Check "Risk Movements" section

**Expected Results:**
- ✅ Risk movement appears in report
- ✅ Movement category is correct (escalating/de-escalating/etc.)
- ✅ Previous and current scores are accurate

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test Suite 6: AI Narrative Quality

### Test 6.1: Narrative Relevance
**Steps:**
1. Generate multiple reports
2. Read AI-generated narratives
3. Assess quality

**Expected Results:**
- ✅ Narratives are contextually relevant
- ✅ Grammar and spelling are correct
- ✅ Professional tone and language
- ✅ No placeholder text like "[Company Name]"
- ✅ Numbers and data are referenced correctly

**Quality Rating (1-5):**
- Executive Summary: ___
- Risk Overview: ___
- Risk Movements: ___
- Overall: ___

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issues):

---

### Test 6.2: Audience-Appropriate Language
**Steps:**
1. Generate Board report - note language style
2. Generate CEO report - note language style
3. Generate Regulator report - note language style
4. Compare narratives

**Expected Results:**
- ✅ Board: Strategic, governance-focused
- ✅ CEO: Executive, action-oriented
- ✅ Regulator: Compliance, detailed, formal

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 6.3: Regulator-Specific Content
**Steps:**
1. Generate CBN report
2. Generate SEC report
3. Generate PENCOM report
4. Compare sections and content

**Expected Results:**
- ✅ Different sections for different regulators
- ✅ Appropriate regulatory references
- ✅ Correct compliance requirements mentioned

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 6.4: Narrative Generation Performance
**Steps:**
1. Time AI narrative generation
2. Monitor Claude API calls
3. Check rate limits

**Expected Results:**
- ✅ Narratives generate within 60 seconds total
- ✅ No API timeout errors
- ✅ No rate limit errors
- ✅ Proper error handling if API fails

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):
- Total generation time: ___ seconds
- Number of API calls: ___

---

## Test Suite 7: Audit Trail

### Test 7.1: View Audit Trail
**Steps:**
1. Open a report that has been edited
2. Look for audit trail or history section
3. Review logged actions

**Expected Results:**
- ✅ Audit trail is visible
- ✅ All actions are logged (create, edit, toggle, finalize)
- ✅ User email appears for each action
- ✅ Timestamps are accurate
- ✅ Old and new values shown for edits

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 7.2: Multiple Users Editing
**Steps:**
1. Create draft as User A
2. Log in as User B
3. Edit the draft
4. Check audit trail

**Expected Results:**
- ✅ Both users appear in audit trail
- ✅ Actions attributed to correct user
- ✅ Clear history of who did what

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):
- [ ] Skipped (single user testing)

---

## Test Suite 8: Error Handling

### Test 8.1: Network Interruption During Generation
**Steps:**
1. Start generating report
2. Disconnect network mid-generation
3. Observe behavior

**Expected Results:**
- ✅ Error message appears
- ✅ User can retry
- ✅ No partial/corrupted draft saved
- ✅ App doesn't crash

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):
- [ ] Skipped

---

### Test 8.2: Claude API Failure
**Steps:**
1. Temporarily use invalid API key
2. Try to generate report
3. Observe error handling

**Expected Results:**
- ✅ Clear error message
- ✅ Report still creates with placeholder narratives
- OR ✅ Generation fails gracefully with retry option
- ✅ No console errors break the app

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):
- [ ] Skipped

---

### Test 8.3: Missing Organization Settings
**Steps:**
1. Delete organization settings from database
2. Try to generate report

**Expected Results:**
- ✅ Error message: "Organization settings not configured"
- ✅ Link or button to configure settings
- ✅ No crash or blank screen

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):
- [ ] Skipped

---

### Test 8.4: No Risk Data
**Steps:**
1. Delete all risks from system (or use empty organization)
2. Try to generate report

**Expected Results:**
- ✅ Report generates with "No risks found" messaging
- ✅ Sections handle empty data gracefully
- ✅ No errors in console

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):
- [ ] Skipped

---

## Test Suite 9: Performance & Scale

### Test 9.1: Large Dataset (100+ Risks)
**Steps:**
1. System with 100+ risks
2. Generate report
3. Measure performance

**Expected Results:**
- ✅ Report generates successfully
- ✅ Generation completes within 2 minutes
- ✅ All data renders correctly
- ✅ No performance degradation

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):
- [ ] Skipped (not enough test data)
- Risk count: ___
- Generation time: ___ seconds

---

### Test 9.2: Concurrent Report Generation
**Steps:**
1. Generate 3 reports simultaneously (different periods)
2. Monitor completion

**Expected Results:**
- ✅ All reports generate successfully
- ✅ No race conditions or data conflicts
- ✅ Performance acceptable

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):
- [ ] Skipped

---

### Test 9.3: Memory Usage
**Steps:**
1. Open browser dev tools
2. Monitor memory while generating reports
3. Generate 5 reports in succession

**Expected Results:**
- ✅ No memory leaks
- ✅ Memory usage stays under 500MB
- ✅ Browser remains responsive

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):
- [ ] Skipped
- Peak memory: ___ MB

---

## Test Suite 10: Report Management

### Test 10.1: List All Reports
**Steps:**
1. Generate multiple reports (different audiences/periods)
2. Navigate to reports list
3. Verify all appear

**Expected Results:**
- ✅ All reports appear in list
- ✅ Reports sorted by date (newest first)
- ✅ Audience and period displayed
- ✅ Status (draft/final) indicated
- ✅ Can filter by audience or status

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 10.2: Delete Draft Report
**Steps:**
1. Create a draft report
2. Delete it
3. Verify deletion

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Report deleted successfully
- ✅ No longer appears in list
- ✅ Database record removed

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 10.3: Cannot Delete Finalized Report
**Steps:**
1. Try to delete a finalized report

**Expected Results:**
- ✅ Delete button disabled or hidden
- ✅ Error message if attempted
- ✅ Finalized reports preserved

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 10.4: Reopen Existing Draft
**Steps:**
1. Create draft, close it
2. Later, reopen from list
3. Verify state preserved

**Expected Results:**
- ✅ Draft opens with all sections
- ✅ Previous edits preserved
- ✅ Can continue editing

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

## Test Suite 11: Cross-Browser Compatibility

### Test 11.1: Chrome/Edge
**Steps:**
1. Run key tests in Chrome or Edge

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):

---

### Test 11.2: Safari
**Steps:**
1. Run key tests in Safari

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):
- [ ] Skipped (not available)

---

### Test 11.3: Firefox
**Steps:**
1. Run key tests in Firefox

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue):
- [ ] Skipped (not available)

---

## Critical Issues Log

**Issue #1:**
- **Severity:** [ ] Critical [ ] High [ ] Medium [ ] Low
- **Description:**
- **Steps to Reproduce:**
- **Expected:**
- **Actual:**
- **Workaround:**

**Issue #2:**
- **Severity:** [ ] Critical [ ] High [ ] Medium [ ] Low
- **Description:**
- **Steps to Reproduce:**
- **Expected:**
- **Actual:**
- **Workaround:**

---

## Test Summary

**Date Tested:** _______________
**Tester:** _______________
**Environment:** [ ] Development [ ] Production
**Total Tests:** ___
**Passed:** ___
**Failed:** ___
**Skipped:** ___
**Pass Rate:** ___%

### Overall Assessment
[ ] Ready for production deployment
[ ] Minor issues - can deploy with known issues
[ ] Major issues - not ready for production

### Recommended Actions
1.
2.
3.

### Sign-off
**Tested by:** _____________________
**Date:** _____________________
**Signature:** _____________________

---

## Notes for Tomorrow's Session

### Priority Issues to Address:


### Features to Enhance:


### Questions for Discussion:


### Performance Metrics to Capture:

