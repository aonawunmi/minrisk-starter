# User Authentication Setup

## ✅ What's Been Added:

1. **Login/Signup Screen** - Beautiful tabbed interface
2. **Email/Password Authentication** - Full registration system
3. **Anonymous Guest Access** - Continue as guest option
4. **User Profile Menu** - Shows user info and logout button
5. **Session Management** - Automatic session handling

---

## 🔧 Enable Email Authentication (1 minute):

The Supabase Auth Providers page should be open. If not:
```
https://supabase.com/dashboard/project/cnywkjfkhnwptceluvzs/auth/providers
```

**Steps:**
1. Find **"Email"** provider in the list
2. Make sure it's **enabled** (toggle ON)
3. Click **"Save"** if you made changes

That's it! Email authentication is now enabled.

---

## 🧪 Testing the Authentication System:

### **Test 1: Create an Account**
1. Refresh your browser: http://localhost:5174/
2. Click the **"Sign Up"** tab
3. Fill in:
   - Full Name: `Test User`
   - Email: `test@example.com`
   - Password: `password123`
   - Confirm Password: `password123`
4. Click **"Create Account"**
5. ✅ You should see: "Account created! Please check your email..."

**Note:** Supabase sends verification emails by default. For testing, you can:
- Check your email for the verification link
- OR disable email verification in Supabase settings temporarily

### **Test 2: Login**
1. Click the **"Login"** tab
2. Enter your email and password
3. Click **"Login"**
4. ✅ You should be logged in and see the app

### **Test 3: User Profile**
1. Look in the top right corner
2. Click your **username button**
3. ✅ You should see:
   - Your name
   - Your email
   - User ID
   - Session type
   - Logout button

### **Test 4: Logout**
1. Click your username in top right
2. Click **"Logout"**
3. ✅ You should be returned to the login screen

### **Test 5: Guest Access**
1. On login screen, click **"Continue as Guest"**
2. ✅ You should enter as anonymous user
3. Check user menu - it shows "Anonymous User"

---

## 🔒 Security Features:

- ✅ Password minimum 6 characters
- ✅ Password confirmation required
- ✅ Email validation
- ✅ Secure session tokens
- ✅ Row Level Security (RLS) - users only see their own data
- ✅ Automatic session persistence
- ✅ Logout clears session

---

## 👥 User Data Isolation:

Each user's data is completely isolated:
- ✅ Users with email accounts get permanent storage
- ✅ Anonymous users get temporary storage (until they logout)
- ✅ Users cannot see other users' risks or controls
- ✅ Each user automatically gets a profile in the `user_profiles` table

---

## 📊 Viewing Users in Database:

### **Supabase Dashboard:**
```
https://supabase.com/dashboard/project/cnywkjfkhnwptceluvzs/editor
```

Click on **"user_profiles"** table to see all registered users.

### **Or use SQL:**
```sql
-- View all users
SELECT
  up.id,
  up.full_name,
  au.email,
  up.role,
  up.created_at
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id;

-- Count risks per user
SELECT
  up.full_name,
  au.email,
  COUNT(r.id) as risk_count
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
LEFT JOIN risks r ON up.id = r.user_id
GROUP BY up.id, up.full_name, au.email;
```

---

## 🎯 What Users Can Do:

### **Registered Users (Email/Password):**
- ✅ Permanent account
- ✅ Data persists forever
- ✅ Can login from any device
- ✅ Email verification (optional)
- ✅ Password reset (can be configured)

### **Anonymous Users (Guests):**
- ✅ Quick access without registration
- ✅ Data persists during session
- ✅ Great for demos and testing
- ⚠️ Data lost when they logout

---

## 🔄 Next Steps Available:

After confirming this works, we can add:
1. **Password reset functionality**
2. **Email verification enforcement**
3. **Social login (Google, GitHub, etc.)**
4. **User roles (Admin, User, Viewer)**
5. **Admin dashboard to manage users**
6. **User profile editing**
7. **Organization management**

---

## 🆘 Troubleshooting:

**"Email not working":**
- Check Supabase Auth Settings → Email Templates
- For testing, you can disable email confirmation temporarily

**"Can't see data after login":**
- Check that user profile was created (should be automatic)
- Check console logs for errors

**"Session not persisting":**
- Check browser console for errors
- Clear browser cache and try again

---

## ✅ Test Checklist:

- [ ] Email provider enabled in Supabase
- [ ] Can create new account
- [ ] Can login with email/password
- [ ] User menu shows correct info
- [ ] Can logout successfully
- [ ] Can login as guest
- [ ] Each user sees only their own data
- [ ] Data persists after refresh

---

**Ready to test! Refresh your browser and try creating an account!** 🚀
