# MinRisk Intelligence System - Current Status

## System Overview

The MinRisk Intelligence System automatically scans news sources, identifies risk-related events, and uses Claude AI to match them to your organizational risks.

### Architecture

```
News Sources (RSS Feeds)
    ↓
Scan & Filter (keywords + date)
    ↓
Store in external_events table
    ↓
Claude AI Analysis (via Anthropic API)
    ↓
Create Alerts in risk_intelligence_alerts table
    ↓
Display in Intelligence Dashboard
```

## What's Been Implemented

### 1. News Scanner API (`api/scan-news.js`)

**Features:**
- Scans 9+ RSS feeds (CBN, SEC Nigeria, BusinessDay, The Guardian, etc.)
- Filters events by:
  - Date (default: last 7 days)
  - Risk keywords (cyber, regulatory, market, etc.)
  - Deduplication (checks for existing URLs)
- Stores events in `external_events` table

**AI Analysis:**
- Uses Claude 3.5 Sonnet to analyze each event
- Matches events to organizational risks
- Comprehensive fallback system with 100+ keywords across 5 risk categories:
  - Cybersecurity (CYB)
  - Regulatory (REG)
  - Market/Financial (MKT/FIN)
  - Operational (OPE)
  - Strategic (STR)
- Creates alerts with confidence scores, reasoning, and suggested controls

**Special Actions Available:**
```javascript
// Analyze existing unanalyzed events
POST /api/scan-news
Body: { action: "analyzeExisting" }

// Create a test alert to verify system
POST /api/scan-news
Body: { action: "testAlert" }

// Clear unanalyzed events only
POST /api/scan-news
Body: { action: "clearUnanalyzed" }

// Clear ALL events (complete reset)
POST /api/scan-news
Body: { action: "clearAll" }

// Reset analysis timestamps (re-analyze events)
POST /api/scan-news
Body: { action: "resetAnalysis" }

// Normal scan
POST /api/scan-news
Body: { maxAgeDays: 7 }  // optional
```

### 2. Database Schema

**Tables:**
- `external_events` - Stores news items
- `risk_intelligence_alerts` - Stores AI-generated alerts
- `news_sources` - Custom news sources (per organization)
- `risk_keywords` - Custom risk keywords (per organization)
- `risks` - Your organizational risk register

**Key Fields in Alerts:**
- `risk_code` - Which risk this affects (e.g., "STR-CYB-001")
- `risk_title` - Risk name
- `risk_description` - Risk details
- `confidence_score` - AI confidence (0-1)
- `reasoning` - Why this event matters
- `impact_assessment` - Potential impact
- `suggested_controls` - Recommended actions
- `status` - pending/reviewed/dismissed

### 3. Intelligence Dashboard

**Location:** Intelligence tab in MinRisk app

**Features:**
- View all pending alerts
- Review with Accept/Dismiss actions
- See event details, AI reasoning, suggested controls
- Filter and sort alerts

## How to Test the System

### Option 1: Use the Intelligence Dashboard (Recommended)

1. Open https://minrisk-starter.vercel.app
2. Log in as ayodele.onawunmi@213.capital
3. Go to Intelligence tab
4. Click "Scan News Sources" button
5. Wait for scan to complete (30-60 seconds)
6. Check if alerts appear

### Option 2: Direct API Testing

```bash
# Get your auth token from browser localStorage
# Then make API call:

curl -X POST https://minrisk-starter.vercel.app/api/scan-news \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"maxAgeDays": 7}'
```

### Option 3: Test Alert Creation

```bash
# Create a test alert to verify the system works
curl -X POST https://minrisk-starter.vercel.app/api/scan-news \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"action": "testAlert"}'
```

## Checking System Status

### View Deployment Logs

```bash
cd "/Users/AyodeleOnawunmi/Library/CloudStorage/OneDrive-FMDQSecuritiesExchange/Desktop/AY/CODING/MinRisk/Project File - MinRisk/minrisk-starter"

# Get latest deployment URL
vercel ls --scope team_Zfl7unYQq6jscSMpTVQpoQnY | head -3

# View logs (replace URL with latest)
vercel logs https://minrisk-starter-XXXXX.vercel.app
```

### Check Database Directly

Option 1: Supabase SQL Editor
```sql
-- Check events count
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE analyzed_at IS NULL) as unanalyzed,
  COUNT(*) FILTER (WHERE analyzed_at IS NOT NULL) as analyzed
FROM external_events
WHERE organization_id = 'YOUR_ORG_ID';

-- Check alerts count
SELECT COUNT(*) as total_alerts
FROM risk_intelligence_alerts
WHERE organization_id = 'YOUR_ORG_ID';

-- See recent alerts
SELECT
  risk_code,
  confidence_score,
  LEFT(reasoning, 100) as reasoning
FROM risk_intelligence_alerts
WHERE organization_id = 'YOUR_ORG_ID'
ORDER BY created_at DESC
LIMIT 10;
```

## Environment Variables Required

**Vercel Production:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for bypassing RLS)
- `ANTHROPIC_API_KEY` - Claude AI API key
- `VITE_SUPABASE_URL` - Same as SUPABASE_URL
- `VITE_SUPABASE_ANON_KEY` - Anon key for frontend
- `VITE_ANTHROPIC_API_KEY` - Claude key (fallback)

**To check:** https://vercel.com/team_Zfl7unYQq6jscSMpTVQpoQnY/minrisk-starter/settings/environment-variables

## Troubleshooting

### No Alerts Being Created

**Possible causes:**
1. **No unanalyzed events** - Run a scan first to generate events
2. **Claude API key not configured** - Check Vercel env vars
3. **No risks in database** - Need risks for alerts to match to
4. **All events filtered out** - Check keyword matches and date range

**Debug steps:**
```bash
# 1. Check Vercel logs for errors
vercel logs https://minrisk-starter.vercel.app

# 2. Look for these log lines:
#    - "📊 Loaded X risks" (should be > 0)
#    - "✅ Stored X events" (should be > 0)
#    - "🔍 Analyzing event: ..." (Claude analysis)
#    - "✅ Created alert for..." (success)
#    - "⚠️ FALLBACK MATCH" (keyword-based matching)

# 3. Create test alert to verify system
curl -X POST https://minrisk-starter.vercel.app/api/scan-news \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"action": "testAlert"}'
```

### Claude AI Not Matching Events

The system has a **comprehensive fallback mechanism** with 100+ keywords:
- If Claude doesn't match, fallback keywords automatically trigger
- Covers: ransomware, breach, regulatory, compliance, market volatility, etc.
- Confidence set to 0.5 (medium) for fallback matches

**Fallback is triggered when:**
- Claude returns `relevant: false`
- Claude returns no risk_codes
- Confidence is below 0.3

### Events Not Being Stored

Check logs for:
- `❌ Insert failed` - Database errors
- `status: 'duplicate'` - Event already exists
- `status: 'filtered'` - No keywords matched or too old
- `Too old (published X days ago)` - Outside date range

## Next Steps

### If Alerts Are Working:
1. ✅ Review alerts in Intelligence Dashboard
2. ✅ Accept or dismiss each alert
3. ✅ Check that accepted alerts update risk register
4. ✅ Set up automated scanning (cron job or scheduled function)

### If Alerts Are NOT Working:
1. Run test alert: `{"action": "testAlert"}`
2. Check if test alert appears in dashboard
3. If test works: Run analysis on existing events: `{"action": "analyzeExisting"}`
4. If test fails: Check Vercel logs for errors
5. Verify environment variables are set

### Recommended Improvements:
1. **Automated Scanning** - Set up Vercel Cron Job to run daily
2. **Custom Sources** - Add organization-specific news sources via dashboard
3. **Custom Keywords** - Add industry-specific risk keywords
4. **Alert Notifications** - Email alerts for high-confidence matches
5. **Trend Analysis** - Track alert frequency over time

## Files Reference

Key files involved:
- `api/scan-news.js` - Main scanner serverless function
- `src/components/intelligence/IntelligenceDashboard.tsx` - Dashboard UI
- `src/components/intelligence/AlertReviewDialog.tsx` - Alert review UI
- `supabase/migrations/*.sql` - Database schema
- `test-claude-local.js` - Local testing script
- `check-unanalyzed-count.sql` - Database query helper

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check Supabase logs (Dashboard → Logs)
3. Run test alert to isolate the problem
4. Verify all environment variables are set
5. Check that risks exist in your risk register

---

**Status:** System deployed and operational
**Last Updated:** 2025-10-28
**Version:** 1.0
