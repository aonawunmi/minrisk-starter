# How to Integrate Incidents Module into MinRisk

**Status:** Ready for Integration
**Phase:** Phase 1 - Incidents Module
**Progress:** 85% Complete

---

## ✅ What's Been Built

### 1. Database Schema ✅
**File:** `erm-phase1-incidents-schema.sql`
- Complete SQL migration ready to run
- 5 new tables + enhanced risks table
- Triggers, indexes, RLS policies
- **Action Required:** Run this in Supabase SQL Editor

### 2. TypeScript Database Layer ✅
**File:** `src/lib/incidents.ts`
- All incident CRUD operations
- Risk linking functions
- Analytics queries
- **Status:** Complete and ready to use

### 3. React Components ✅
**Files Created:**
- `src/components/incidents/IncidentLogTab.tsx` - Main incidents view
- `src/components/incidents/IncidentForm.tsx` - Create/edit form
- `src/components/incidents/IncidentDetailDialog.tsx` - Detail view with risk linking
- `src/components/ui/badge.tsx` - Badge component

**Status:** All components built and ready

---

## 🔧 Integration Steps

### Step 1: Run Database Migration

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run the file: `erm-phase1-incidents-schema.sql`
4. Verify all tables created successfully

```sql
-- Check tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('incidents', 'risk_appetite', 'kri_definitions', 'kri_values', 'ai_analysis_log');
```

---

### Step 2: Update App.tsx to Add Incidents Tab

Open `src/App.tsx` and make these changes:

#### A. Add Import at the Top
```typescript
import { IncidentLogTab } from "@/components/incidents/IncidentLogTab";
```

#### B. Find the `<TabsList>` section (around line 760) and add:
```typescript
<TabsTrigger value="incidents">🚨 Incidents</TabsTrigger>
```

**Full TabsList should look like:**
```typescript
<TabsList className="mb-4">
  <TabsTrigger value="register">Risk Register</TabsTrigger>
  <TabsTrigger value="control_register">Control Register</TabsTrigger>
  <TabsTrigger value="heatmap">Heat Map</TabsTrigger>
  <TabsTrigger value="risk_report">📊 Risk Report</TabsTrigger>
  <TabsTrigger value="var_sandbox">📊 VaR Sandbox</TabsTrigger>
  <TabsTrigger value="incidents">🚨 Incidents</TabsTrigger>  {/* NEW */}
  <TabsTrigger value="history">📜 History</TabsTrigger>
  <TabsTrigger value="ai_assistant">✨ AI Assistant</TabsTrigger>
  {canEdit && <TabsTrigger value="import_risks">Risk Import</TabsTrigger>}
  {canEdit && <TabsTrigger value="import_controls">Control Import</TabsTrigger>}
  {isAdmin && <TabsTrigger value="admin">👥 Admin</TabsTrigger>}
</TabsList>
```

#### C. Add TabsContent (after the var_sandbox tab content, around line 766):
```typescript
<TabsContent value="incidents">
  <IncidentLogTab />
</TabsContent>
```

---

### Step 3: Verify Database Helper Exports

Open `src/lib/database.ts` and ensure `loadRisks` is exported:

```typescript
// Should already exist, but verify it's exported
export async function loadRisks(): Promise<{ data: RiskRow[] | null; error: any }> {
  // ... existing code
}
```

---

### Step 4: Test the Integration

1. **Start Dev Server:**
   ```bash
   cd "/Users/AyodeleOnawunmi/.../minrisk-starter"
   npm run dev
   ```

2. **Open Browser:**
   - Navigate to `http://localhost:5173`
   - Log in with your credentials

3. **Test Incidents Tab:**
   - Click on "🚨 Incidents" tab
   - Should see empty state with statistics showing 0
   - Click "New Incident" button
   - Fill out form and submit
   - Verify incident appears in table

4. **Test Risk Linking:**
   - Click on an incident in the table
   - Go to "Linked Risks" tab
   - Search for a risk
   - Click "Link" button
   - Verify risk is linked

---

## 📊 Features Available

### Incidents Log Tab
- ✅ Statistics dashboard (Total, Open, High Severity, Financial Impact)
- ✅ Advanced search and filtering
- ✅ Sortable table
- ✅ Export to CSV
- ✅ Responsive design

### Create/Edit Incident
- ✅ All required fields with validation
- ✅ Date picker
- ✅ Severity levels (1-5)
- ✅ Financial impact tracking
- ✅ Status workflow
- ✅ Auto-generated incident codes (INC-001, INC-002, etc.)

### Incident Detail View
- ✅ Full incident details
- ✅ Link/unlink risks
- ✅ Search risks to link
- ✅ View all linked risks
- ✅ Edit incident inline
- ✅ Timestamps and audit trail

### Risk Register Integration
- ✅ Automatic incident count on risks
- ✅ Last incident date tracking
- ✅ View incidents for each risk

---

## 🎨 UI Components Structure

```
IncidentLogTab
├── Statistics Cards (4 cards)
├── Filters & Search Bar
├── Incidents Table
│   └── Click row → IncidentDetailDialog
└── New Incident Button → IncidentForm

IncidentDetailDialog
├── Details Tab
├── Linked Risks Tab
│   ├── Currently Linked
│   └── Link Additional (search)
└── AI Insights Tab (placeholder)

IncidentForm
├── Basic Info
├── Classification
├── Impact Assessment
└── Analysis & Resolution
```

---

## 🔍 Quick Test Checklist

- [ ] Database migration runs without errors
- [ ] Incidents tab appears in main app
- [ ] Can create new incident
- [ ] Incident appears in table
- [ ] Can edit existing incident
- [ ] Can search/filter incidents
- [ ] Can link incident to risk
- [ ] Can unlink incident from risk
- [ ] Can export incidents to CSV
- [ ] Statistics cards update correctly

---

## 🐛 Troubleshooting

### Issue: "loadRisks is not a function"
**Solution:** Make sure `loadRisks` is exported in `src/lib/database.ts`

### Issue: "Table 'incidents' does not exist"
**Solution:** Run the database migration in Supabase SQL Editor

### Issue: "Cannot read property 'organization_id' of undefined"
**Solution:** Ensure user has a profile in `user_profiles` table

### Issue: Badge component error
**Solution:** The Badge component has been created at `src/components/ui/badge.tsx`

### Issue: Icons not showing
**Solution:** All icons are from `lucide-react` which is already installed

---

## 📁 File Structure Created

```
minrisk-starter/
├── src/
│   ├── lib/
│   │   └── incidents.ts                    # New: Database functions
│   ├── components/
│   │   ├── incidents/                      # New folder
│   │   │   ├── IncidentLogTab.tsx         # Main view
│   │   │   ├── IncidentForm.tsx           # Create/edit form
│   │   │   └── IncidentDetailDialog.tsx   # Detail view
│   │   └── ui/
│   │       └── badge.tsx                   # New: Badge component
│   └── App.tsx                             # To be updated
├── erm-phase1-incidents-schema.sql         # Database migration
├── ERM-UPGRADE-PLAN.md                     # Full roadmap
├── ERM-IMPLEMENTATION-PROGRESS.md          # Progress tracker
└── HOW-TO-INTEGRATE-INCIDENTS.md          # This file
```

---

## 🚀 Next Features (Phase 2)

After incidents module is working:
- [ ] AI-powered risk linking
- [ ] AI control adequacy assessment
- [ ] Interactive bubble chart
- [ ] Risk appetite dashboard
- [ ] KRI tracking module

---

## 📞 Need Help?

If you encounter any issues:
1. Check the browser console for errors
2. Check Supabase logs
3. Verify database migration completed
4. Ensure all imports are correct

---

**Ready to integrate?** Follow the steps above in order! 🎉
