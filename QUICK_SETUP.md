# 🚀 Quick Database Setup (2 Minutes)

## ⚠️ Unable to Automate Fully

Unfortunately, Supabase doesn't provide an API to execute SQL remotely for security reasons.

**You need to complete these 2 simple steps manually:**

---

## Step 1: Run Database Schema (1 minute)

1. **Open this URL in your browser:**
   ```
   https://supabase.com/dashboard/project/cnywkjfkhnwptceluvzs/sql/new
   ```

2. **Copy the entire contents of `supabase-schema.sql`** (it's in your project folder)

3. **Paste into the SQL editor**

4. **Click "RUN"** (or press Ctrl+Enter)

5. **You should see:** ✅ "Success. No rows returned"

---

## Step 2: Enable Anonymous Authentication (30 seconds)

1. **Open this URL:**
   ```
   https://supabase.com/dashboard/project/cnywkjfkhnwptceluvzs/auth/providers
   ```

2. **Find "Anonymous" in the providers list**

3. **Toggle it ON** (enable it)

4. **Click "Save"**

---

## ✅ That's It!

After completing these 2 steps, run:

```bash
npm run dev
```

Then:
1. Click "Continue as Guest" on the login screen
2. Add a risk
3. Refresh the page
4. **The risk should still be there!** 🎉

---

## 🔒 Security Reminder

**IMPORTANT:** After setup, you should rotate your service role key:

1. Go to: https://supabase.com/dashboard/project/cnywkjfkhnwptceluvzs/settings/api
2. Click "Rotate" next to the Service Role key
3. This invalidates the key you shared earlier

---

## 🆘 Troubleshooting

If you get errors when running the schema:

1. Some tables might already exist (that's OK - the script uses `IF NOT EXISTS`)
2. If you see policy errors, they might already exist (safe to ignore)
3. The key thing is that all 5 tables are created:
   - ✅ organizations
   - ✅ user_profiles
   - ✅ app_configs
   - ✅ risks
   - ✅ controls

You can verify this by going to:
```
https://supabase.com/dashboard/project/cnywkjfkhnwptceluvzs/editor
```

And checking the "Tables" list on the left.
