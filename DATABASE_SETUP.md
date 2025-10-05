# MinRisk Database Setup Guide

This guide will help you set up persistent data storage for MinRisk using Supabase (PostgreSQL).

## 📋 **Prerequisites**

1. Supabase account (free tier works)
2. Environment variables already configured (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)

---

## 🚀 **Step 1: Create Supabase Database**

### **1.1 Go to Supabase SQL Editor**

Visit your Supabase project:
```
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
```

### **1.2 Run the Schema**

1. Click **"New Query"**
2. Copy the entire contents of `supabase-schema.sql`
3. Paste into the SQL editor
4. Click **"Run"** or press `Ctrl+Enter`

This will create:
- ✅ 5 tables: `organizations`, `user_profiles`, `app_configs`, `risks`, `controls`
- ✅ Row Level Security (RLS) policies
- ✅ Indexes for performance
- ✅ Auto-update timestamps
- ✅ Demo organization

---

## 🔐 **Step 2: Enable Authentication** (Optional but Recommended)

### **Option A: Simple Anonymous Auth** (Quick Start)

1. Go to **Authentication** → **Providers** in Supabase dashboard
2. Enable **Anonymous** sign-in
3. Save

This allows users to use the app without creating accounts (session-based).

### **Option B: Email/Password Auth** (Production)

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates (optional)
4. Save

### **Option C: Social Auth** (Google, GitHub, etc.)

1. Go to **Authentication** → **Providers**
2. Enable desired provider (Google, GitHub, Microsoft, etc.)
3. Add OAuth credentials
4. Save

---

## 🔧 **Step 3: Integrate Database into App**

### **3.1 Update App.tsx** (Main changes needed)

Replace the current `useState` storage with database calls:

```typescript
// OLD (in-memory):
const [rows, setRows] = useState<RiskRow[]>(SEED);

// NEW (database):
import { loadRisks, createRisk, updateRisk, deleteRisk } from '@/lib/database';

const [rows, setRows] = useState<RiskRow[]>([]);
const [loading, setLoading] = useState(true);

// Load data on mount
useEffect(() => {
  async function fetchData() {
    setLoading(true);
    const risks = await loadRisks();
    setRows(risks);
    setLoading(false);
  }
  fetchData();
}, []);

// Update CRUD operations
const add = async (payload: Omit<RiskRow, 'risk_code'>) => {
  const result = await createRisk({ ...payload, risk_code: nextRiskCode(rows, payload.division, payload.category) });
  if (result.success && result.data) {
    setRows(prev => [...prev, result.data!]);
  }
};

const save = async (code: string, payload: Omit<RiskRow, 'risk_code'>) => {
  const result = await updateRisk(code, payload);
  if (result.success) {
    setRows(p => p.map(r => r.risk_code === code ? { ...payload, risk_code: code } : r));
  }
};

const remove = async (code: string) => {
  const result = await deleteRisk(code);
  if (result.success) {
    setRows(p => p.filter(r => r.risk_code !== code));
  }
};
```

### **3.2 Add Authentication UI** (Optional)

Create a simple login component:

```typescript
// src/components/AuthGate.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}
```

---

## 📊 **Step 4: Data Migration** (Move existing data to database)

If you have existing risks in the app, export them first:

### **4.1 Export Current Data**

In the browser console:
```javascript
copy(JSON.stringify(localStorage.getItem('minrisk_data')));
```

### **4.2 Import to Database**

Use the bulk import function:
```typescript
import { bulkImportRisks } from '@/lib/database';

// Your existing risks array
const existingRisks = [...]; // from export

await bulkImportRisks(existingRisks);
```

---

## 🎯 **Step 5: Test the Integration**

### **5.1 Manual Testing**

1. **Create a risk:**
   - Click "Add Risk"
   - Fill in details
   - Save
   - ✅ Check Supabase dashboard → Table Editor → `risks` table

2. **Refresh the page:**
   - Data should persist
   - ✅ Risk should still be there

3. **Update a risk:**
   - Edit a risk
   - Save changes
   - Refresh page
   - ✅ Changes should be saved

4. **Delete a risk:**
   - Delete a risk
   - ✅ Check it's removed from database

### **5.2 Verify RLS (Security)**

In Supabase SQL Editor:
```sql
-- Check that users can only see their own data
SELECT * FROM risks;

-- Should only return risks for the logged-in user
```

---

## 🔒 **Security Checklist**

- ✅ RLS enabled on all tables
- ✅ Policies restrict access to user's organization
- ✅ API keys stored in environment variables (never in code)
- ✅ HTTPS only (Vercel/Supabase handle this)
- ⚠️ **Important:** Never expose Supabase service role key

---

## 📈 **Performance Optimization**

### **Enable Realtime** (Optional - for multi-user collaboration)

```typescript
// Subscribe to changes
const channel = supabase
  .channel('risks-changes')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'risks' },
    (payload) => {
      // Refresh data when another user makes changes
      fetchRisks();
    }
  )
  .subscribe();
```

### **Caching Strategy**

```typescript
// Cache risks in memory, sync periodically
const [lastSync, setLastSync] = useState(Date.now());

useEffect(() => {
  const interval = setInterval(async () => {
    const fresh = await loadRisks();
    setRows(fresh);
    setLastSync(Date.now());
  }, 60000); // Sync every 60 seconds

  return () => clearInterval(interval);
}, []);
```

---

## 🐛 **Troubleshooting**

### **Issue: "Row Level Security policy violation"**

**Solution:** Ensure user is authenticated:
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  // Redirect to login or sign in anonymously
  await supabase.auth.signInAnonymously();
}
```

### **Issue: "No organization found"**

**Solution:** Create user profile on first login:
```typescript
import { getOrCreateUserProfile } from '@/lib/database';

const { data: { user } } = await supabase.auth.getUser();
if (user) {
  await getOrCreateUserProfile(user.id);
}
```

### **Issue: Data not persisting**

**Check:**
1. Supabase URL and Anon Key are correct in `.env.local`
2. Database schema was created (check Supabase Table Editor)
3. User is authenticated (check browser console)
4. RLS policies allow the operation

---

## 📚 **Next Steps**

1. ✅ **Add user profiles:** Allow users to customize settings
2. ✅ **Multi-organization support:** Let users switch between organizations
3. ✅ **Audit logging:** Track who changed what and when
4. ✅ **Data export/import:** CSV, Excel, JSON formats
5. ✅ **Collaboration:** Real-time updates, comments, approvals

---

## 🆘 **Need Help?**

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- MinRisk Issues: https://github.com/aonawunmi/minrisk-starter/issues

---

## 📝 **Summary**

You now have:
- ✅ **Persistent storage** - Data survives page refreshes
- ✅ **Multi-user support** - Each user sees their own data
- ✅ **Secure** - Row-level security enabled
- ✅ **Scalable** - PostgreSQL can handle millions of rows
- ✅ **Free** - Supabase free tier includes 500MB database

**Estimated setup time:** 15-30 minutes
