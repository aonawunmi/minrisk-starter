# MinRisk Feature Backlog

Features and enhancements planned for future releases.

---

## 🔔 SMS/WhatsApp Notifications (HIGH PRIORITY)

**Status:** Parked - To be implemented after news scanner deployment

**Description:**
Real-time SMS alerts for critical risk events and intelligence updates.

**Use Cases:**
- High-confidence intelligence alerts (>75% confidence)
- Risk threshold breaches
- New assigned incidents
- Enhancement plan approvals
- Daily/weekly risk summaries

**Implementation Options:**
1. **Africa's Talking** (Recommended for Nigeria)
   - Cost: ₦5-10 per SMS
   - Good delivery rates in Nigeria
   - API: https://africastalking.com

2. **Twilio** (Global option)
   - More expensive for Nigeria
   - Better for international deployments

3. **Termii** (Nigerian alternative)
   - Local company
   - Good rates

**Technical Requirements:**
```sql
-- Add to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN phone_number TEXT,
ADD COLUMN sms_notifications_enabled BOOLEAN DEFAULT false,
ADD COLUMN sms_alert_types JSONB DEFAULT '["intelligence", "incidents"]';

-- Create SMS logs table
CREATE TABLE sms_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  phone_number TEXT,
  message TEXT,
  alert_type TEXT,
  status TEXT, -- sent, failed, delivered
  cost DECIMAL(10,2),
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP
);
```

**Cost Estimate:**
- Small org (5 users, 10 alerts/day): ₦15,000/month
- Medium org (20 users, 30 alerts/day): ₦150,000/month
- Large org (50 users, 100 alerts/day): ₦600,000/month

**Considerations:**
- Need API key from chosen provider
- Set up billing/budget alerts
- Implement rate limiting to control costs
- Allow users to opt-in/out
- Set quiet hours (e.g., 10 PM - 7 AM)

**UI Components Needed:**
- Phone number input in user profile
- SMS preferences toggle
- Alert type selection
- SMS history log
- Cost tracking dashboard

---

## 📧 Email Notifications (MEDIUM PRIORITY)

**Description:**
Email-based notifications as a free alternative to SMS.

**Benefits:**
- No cost (free)
- Can include more details
- Better for non-urgent notifications

**Use Cases:**
- Daily risk summaries
- Weekly intelligence digest
- Monthly risk reports
- Enhancement plan approvals

---

## 📊 Advanced Analytics Dashboard (MEDIUM PRIORITY)

**Description:**
Executive dashboard with charts and KPIs.

**Features:**
- Risk trend charts (time series)
- Risk heat map evolution
- Top risk categories
- Control effectiveness scores
- Incident frequency analysis

---

## 🔄 Risk Import/Export (LOW PRIORITY)

**Description:**
Bulk import risks from Excel/CSV.

**Use Cases:**
- Migrating from old systems
- Bulk updates to risk register
- Integration with other tools

---

## 🤖 AI Risk Prediction (RESEARCH)

**Description:**
Use AI to predict which risks are likely to materialize.

**Approach:**
- Train on historical incident data
- Analyze patterns in risk scores
- Predict likelihood changes

---

## 📱 Mobile App (FUTURE)

**Description:**
Native mobile app for iOS and Android.

**Benefits:**
- Better mobile experience
- Offline access
- Push notifications
- Camera for incident photos

---

## 🔐 Two-Factor Authentication (SECURITY)

**Description:**
Add 2FA for enhanced security.

**Options:**
- SMS OTP
- Authenticator app
- Email OTP

---

## 📄 Automated Risk Reports (MEDIUM PRIORITY)

**Description:**
Generate PDF reports automatically.

**Types:**
- Executive risk summary
- Detailed risk register
- Incident reports
- Control effectiveness reports

---

## 🔗 API for Integrations (LOW PRIORITY)

**Description:**
REST API for third-party integrations.

**Use Cases:**
- Connect to GRC platforms
- Integrate with incident management tools
- Export to BI tools

---

## Notes:
- Features are prioritized based on user feedback and business value
- Cost implications are documented for paid features
- Technical requirements are outlined for planning
- All features support multi-tenant architecture
