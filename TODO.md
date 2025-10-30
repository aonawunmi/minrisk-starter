# MinRisk TODO List

## ✅ Completed Features

### 1. Configuration Protection
- [x] Archive instead of delete for config values
- [x] Show warning when config values are in use
- [x] Archive risks when config values are removed
- [x] Lock config changes if risks exist (matrix size change blocked if risks use level 6)
- [x] Require affected risks be archived before allowing 6×6 to 5×5 change
- [x] Give ADMIN right to permanently delete from archive (with password validation)

### 2. User Deletion Protection
- [x] Soft delete implemented - archives user's risks instead of hard delete
- [x] Show warning with risk count before deletion
- [x] Archive all user risks when user is deleted
- [x] Bulk Deletion feature - allows archive or permanent delete of multiple risks
- [x] Risk deletion requires admin approval for "edit" users

### 3. Data Migration on Config Changes
- [x] Validate all existing risks when matrix size changes
- [x] Block config changes if risks exist with out-of-range values
- [x] Require archive of affected risks before allowing changes

### 4. Audit Trail
- [x] Complete audit trail system with database triggers
- [x] Track all CRUD operations automatically
- [x] Log user approval/rejection
- [x] Log archive operations
- [x] Log bulk deletion operations
- [x] Formatted detail views (not just JSON)
- [x] Filter by action type, entity type, search
- [x] Load limit controls

### 5. Time Period Features (Phase 2A)
- [x] Database migration - added `relevant_period` field to risks table
- [x] Period selector in risk creation/update dialog
- [x] Period column in Risk Register
- [x] Period filter in Risk Register (multi-select)
- [x] Period filter in Heatmap (multi-select, independent filtering)
- [x] Help documentation updated

### 6. Audit Trail Enhancements (Phase 2B)
- [x] CSV export functionality with Download button
- [x] Date range filtering (start date and end date)
- [x] User-specific filtering dropdown
- [x] Risk code search filter
- [x] Enhanced filter UI (8 filters in 2-row grid)
- [x] Help documentation updated

### 7. Commit Confirmation Feature (Phase 2C)
- [x] Toast notification system implemented
- [x] Success toast on risk creation
- [x] Success toast on risk update
- [x] Auto-dismiss after 3 seconds
- [x] Help documentation updated

### 8. VaR Analysis Module (Phase 3)
- [x] VaR scale configuration in Admin dashboard
- [x] Volatility thresholds configuration (5 or 6 levels)
- [x] Portfolio value thresholds configuration (in millions NGN)
- [x] Database table for VaR scale config
- [x] VaR Sandbox tab implementation
- [x] Excel template download (Portfolio_Holdings, Price_History, Configuration sheets)
- [x] File upload with validation
- [x] Variance-covariance VaR calculation engine
- [x] Returns matrix calculation
- [x] Covariance and correlation matrix calculation
- [x] Portfolio variance calculation
- [x] Standalone VaR calculation (capped at market value)
- [x] Diversification benefit calculation
- [x] Asset contribution to VaR analysis
- [x] Risk score mapping (volatility → likelihood, value → impact)
- [x] VaR results display with summary cards
- [x] Diversification benefit highlight card
- [x] Asset contribution table
- [x] Correlation matrix visualization
- [x] Overall Risk display (separate Likelihood and Impact scores)
- [x] Help documentation updated with VaR section
- [x] Deployed to production

### 9. User-Level Data Isolation (Phase 4)
- [x] Admin cross-user visibility for Risk Register
- [x] User-level filtering for regular users (own risks only)
- [x] Admin role logic in database.ts (loadRisks function)
- [x] User-level filtering for Intelligence Alerts
- [x] Admin cross-user visibility for alerts (org-wide)
- [x] Backend API admin role filtering (api/scan-news.js)
- [x] Fixed admin 500 error with no personal risks
- [x] Safe user ID extraction in backend
- [x] Removed large response payload issues
- [x] Alert persistence after news analysis
- [x] Role-based news analysis (admins analyze org-wide risks)
- [x] Help documentation updated (HELP-INTELLIGENCE-UPGRADES.md)
- [x] Debugging logs added for troubleshooting
- [x] Deployed to production

---

## 🔲 Remaining Tasks

### 1. Transfer Risks to Another User (Optional Feature)
**Priority:** Medium
**Status:** Not started

**Description:**
When deleting a user, provide admin with option to transfer their risks to another user instead of archiving them.

**Current behavior:**
User deletion always archives all their risks

**Requested behavior:**
Give admin choice in delete dialog:
- Option 1: "Archive all risks" (current default)
- Option 2: "Transfer to another user" (new option)
  - Show dropdown to select target user
  - Transfer all risks and controls to selected user
  - Log the transfer in audit trail

**Implementation notes:**
- Update UserManagement.tsx delete dialog
- Add user selection dropdown
- Update delete_user() function to support transfer option
- Add audit logging for transfer action

---

### 2. Migration Tool for Remapping Risk Scores
**Priority:** Low
**Status:** Not started

**Description:**
Provide a tool to help admin remap risk score values when changing matrix size.

**What exists:**
System blocks 6×6 to 5×5 change if any risks use level 6

**What's missing:**
A tool to bulk-remap level 6 values to level 5:
- Example: "All likelihood=6 become likelihood=5"
- Example: "All impact=6 become impact=5"
- Show preview of affected risks before applying
- Log all changes in audit trail

**Implementation notes:**
- Create new "Migration Tool" component in Configuration
- Show when matrix size change is blocked
- Display list of affected risks
- Provide mapping options (e.g., 6→5, 6→4, etc.)
- Preview changes before applying
- Batch update with transaction
- Log to audit trail

**Alternative approach:**
Instead of a migration tool, keep current behavior of requiring manual archive of affected risks before allowing matrix size change.

---

### 3. Add "Commit" Button for Risk Managers
**Priority:** Medium
**Status:** Not started

**Description:**
Implement a "Commit" button in the risk register interface for risk managers to explicitly save and log their changes.

**Implementation details:**
- Add "Commit" button when creating/updating/deleting risks
- Button triggers save-and-log event
- Record every commit in audit trail with timestamp
- Provide visual feedback on successful commit

**Implementation notes:**
- Add commit button to RiskDialog component
- Update risk creation/update flow to include commit action
- Ensure all commits are logged to audit trail with proper metadata
- Show confirmation toast on successful commit

---


---

## 🚀 Deployment Plan

### Phase 2A - Time Period Features ✅ COMPLETE
**Status:** Deployed to development

#### Completed Steps:
- ✅ Database Schema Update - added `relevant_period` VARCHAR(50) field
- ✅ Period selector in RiskDialog with predefined options
- ✅ Period column in Risk Register table
- ✅ Multi-select period filter in Risk Register
- ✅ Independent period filter in Heatmap
- ✅ Help documentation updated

**Testing Checklist:**
- ✅ Create new risk with period field
- ✅ Update existing risk to add period
- ✅ Filter Risk Register by period
- ✅ Filter Heatmap by single period
- ✅ Filter Heatmap by multiple periods
- ✅ Verify period shows in audit trail

---

### Phase 2B - Audit Trail Enhancements ✅ COMPLETE
**Status:** Deployed to development

#### Completed Steps:
- ✅ CSV export functionality with Download button
- ✅ Date range filtering (start date, end date)
- ✅ User-specific filtering dropdown
- ✅ Risk code search filter
- ✅ Enhanced 2-row filter UI (8 total filters)
- ✅ Help documentation updated

**Testing Checklist:**
- ✅ Export audit trail to CSV
- ✅ Filter by date range
- ✅ Filter by specific user
- ✅ Search by risk code
- ✅ Verify CSV contains all expected columns

---

### Phase 2C - Commit Confirmation Feature ✅ COMPLETE
**Status:** Deployed to development

#### Completed Steps:
- ✅ Toast notification system implemented
- ✅ Success toast on risk creation with risk code
- ✅ Success toast on risk update with risk code
- ✅ Auto-dismiss after 3 seconds
- ✅ Green background with checkmark for success
- ✅ Help documentation updated

**Testing Checklist:**
- ✅ Create risk and see confirmation toast
- ✅ Update risk and see confirmation toast
- ✅ Verify audit trail logs changes (existing functionality)
- ✅ Verify toast notification appears and dismisses

---

### Phase 3 - Optional Features (Low Priority)
**Target:** Future / As needed
**Status:** Not scheduled

#### Task 1: Transfer Risks to Another User
- Useful when user leaves organization
- Prevents need to archive all their work
- Estimated time: 3-4 days

#### Task 2: Risk Score Migration Tool
- Helpful for matrix size changes
- Alternative: Keep current "archive first" approach
- Estimated time: 4-5 days

---

## 📊 Implementation Summary

### ✅ Phase 1 - COMPLETE (Deployed)
- Configuration Protection
- User Deletion with Archiving
- Audit Trail System
- Bulk Deletion
- Archive Management
- **Status:** 100% complete, tested, in production

### ✅ Phase 2A - COMPLETE (Deployed to Development)
- Time Period Features
- Database migration with relevant_period field
- Period selector, filters, and documentation
- **Status:** 100% complete, ready for production deployment

### ✅ Phase 2B - COMPLETE (Deployed to Development)
- Audit Trail Enhancements
- CSV export, date range filtering, user filtering, risk code search
- Enhanced 8-filter UI in 2-row grid
- **Status:** 100% complete, ready for production deployment

### ✅ Phase 2C - COMPLETE (Deployed to Development)
- Commit Confirmation Feature
- Toast notification system for risk create/update operations
- Green success messages with auto-dismiss
- Enhanced visibility for risk managers
- **Status:** 100% complete, ready for production deployment

### ✅ Phase 3 - VaR Analysis Module - COMPLETE (Deployed to Production)
- VaR scale configuration system
- Variance-covariance calculation engine
- Standalone VaR with diversification benefits
- Asset contribution analysis
- Correlation matrix visualization
- Risk score mapping (volatility and portfolio value)
- Excel template and file upload
- Comprehensive results display
- **Status:** 100% complete, tested, in production

### ✅ Phase 4 - User-Level Data Isolation - COMPLETE (Deployed to Production)
- Admin cross-user visibility for risks and alerts
- User-level filtering (users see only their own data)
- Backend API role-based filtering
- Fixed admin 500 errors with no personal risks
- Alert persistence and proper role detection
- News analysis against org-wide risks for admins
- Debugging logs for troubleshooting
- **Status:** 100% complete, tested, in production

### 🔮 Phase 5 - FUTURE
- User risk transfer
- Risk score migration tool
- Email notifications
- Advanced analytics
- VaR historical tracking
- Stress testing scenarios

---

## 📝 Notes

**Last Updated:** October 9, 2025 (Updated after Phase 3 VaR Analysis completion)
**Status:** Phase 1, 2A, 2B, 2C, and 3 complete and deployed to production.
**Production Status:** All Phase 1-3 features live in production.

**Known Issues:**
- None

**Recommended Implementation Order:**
1. **Start with Phase 2A** (Time Period features) - Highest priority, most user value
2. **Then Phase 2B** (Export/filtering) - Quick win, extends existing features
3. **Finally Phase 2C** (Commit button) - Nice-to-have, minimal complexity
4. **Phase 3** - Defer until Phase 2 is complete and evaluated

**Development Workflow:**
- Implement in development environment first
- Test thoroughly with sample data
- Run database migrations in dev Supabase
- Deploy to production after validation
- Monitor audit trail for any issues
- Update user documentation (Help tab)

**Future Enhancements (Beyond Phase 3):**
- Export audit trail to PDF reports
- Scheduled automatic archiving of old risks
- Email notifications for pending approvals
- Dashboard with risk analytics and trends
- Risk comparison across time periods
- Trend analysis (period over period changes)
- Risk appetite/tolerance thresholds
