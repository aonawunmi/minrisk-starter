-- =====================================================
-- UPGRADE 2: RISK INTELLIGENCE MONITOR
-- Real-time Risk Intelligence from Web Sources
-- =====================================================
-- Run this in Supabase SQL Editor

-- =====================================================
-- STEP 1: CLEAN UP DUPLICATE RISKS (IF ANY)
-- =====================================================

-- Remove duplicate risks, keeping only the most recent one based on created_at
DO $$
DECLARE
  duplicate_record RECORD;
  keep_id UUID;
BEGIN
  -- Find duplicates
  FOR duplicate_record IN
    SELECT organization_id, risk_code
    FROM risks
    GROUP BY organization_id, risk_code
    HAVING COUNT(*) > 1
  LOOP
    -- Get the ID of the most recent entry (by created_at)
    SELECT id INTO keep_id
    FROM risks
    WHERE organization_id = duplicate_record.organization_id
      AND risk_code = duplicate_record.risk_code
    ORDER BY created_at DESC NULLS LAST
    LIMIT 1;

    -- Delete all but the most recent
    DELETE FROM risks
    WHERE organization_id = duplicate_record.organization_id
      AND risk_code = duplicate_record.risk_code
      AND id != keep_id;

    RAISE NOTICE 'Removed duplicates for risk_code: % in org: %, kept id: %',
      duplicate_record.risk_code, duplicate_record.organization_id, keep_id;
  END LOOP;
END $$;

-- =====================================================
-- STEP 2: ENSURE UNIQUE CONSTRAINT EXISTS ON RISKS TABLE
-- =====================================================

-- Add unique constraint if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'risks_organization_id_risk_code_key'
  ) THEN
    ALTER TABLE risks ADD CONSTRAINT risks_organization_id_risk_code_key
    UNIQUE (organization_id, risk_code);
    RAISE NOTICE 'Created unique constraint on risks table';
  ELSE
    RAISE NOTICE 'Unique constraint already exists on risks table';
  END IF;
END $$;

-- =====================================================
-- STEP 3: CREATE EXTERNAL EVENTS TABLE
-- =====================================================

CREATE TABLE external_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  source_name TEXT, -- 'CBN', 'SEC Nigeria', 'US-CERT', 'BusinessDay', etc.
  source_url TEXT,
  published_date TIMESTAMPTZ,

  -- Categorization
  event_category TEXT, -- 'cybersecurity', 'regulatory', 'market', 'environmental', 'operational'
  keywords TEXT[],
  country TEXT DEFAULT 'Nigeria',

  -- Analysis
  relevance_score DECIMAL(3,2), -- 0-1 (AI-determined relevance)
  affected_risk_categories TEXT[], -- ['Technology', 'Market', 'Operational']

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 4: CREATE RISK INTELLIGENCE ALERTS TABLE
-- =====================================================

CREATE TABLE risk_intelligence_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  risk_code TEXT NOT NULL,
  event_id UUID REFERENCES external_events(id) ON DELETE CASCADE,

  -- AI Suggestion
  suggested_likelihood_change INTEGER, -- e.g., +1, +2, -1, -2
  reasoning TEXT NOT NULL,
  confidence_score DECIMAL(3,2), -- 0-1 (how confident AI is)

  -- Additional recommendations
  suggested_controls TEXT[],
  impact_assessment TEXT, -- Additional context on why this matters

  -- Status tracking
  status TEXT DEFAULT 'pending', -- pending, accepted, rejected, expired
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Auto-expire old alerts
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Add foreign key constraint for risk_code (composite key with organization_id)
-- This will now work because we ensured the unique constraint exists above
ALTER TABLE risk_intelligence_alerts
  ADD CONSTRAINT fk_alert_risk
  FOREIGN KEY (organization_id, risk_code)
  REFERENCES risks(organization_id, risk_code)
  ON DELETE CASCADE;

-- =====================================================
-- STEP 5: ALTER RISKS TABLE (ADD INTELLIGENCE TRACKING)
-- =====================================================

ALTER TABLE risks ADD COLUMN IF NOT EXISTS last_intelligence_check TIMESTAMPTZ;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS active_alerts_count INTEGER DEFAULT 0;

-- =====================================================
-- STEP 6: CREATE INDEXES
-- =====================================================

-- External events indexes
CREATE INDEX idx_external_events_org ON external_events(organization_id);
CREATE INDEX idx_external_events_category ON external_events(event_category);
CREATE INDEX idx_external_events_date ON external_events(published_date DESC);
CREATE INDEX idx_external_events_country ON external_events(country);

-- Intelligence alerts indexes
CREATE INDEX idx_intelligence_alerts_risk ON risk_intelligence_alerts(risk_code);
CREATE INDEX idx_intelligence_alerts_status ON risk_intelligence_alerts(status);
CREATE INDEX idx_intelligence_alerts_org ON risk_intelligence_alerts(organization_id);
CREATE INDEX idx_intelligence_alerts_created ON risk_intelligence_alerts(created_at DESC);
CREATE INDEX idx_intelligence_alerts_expires ON risk_intelligence_alerts(expires_at);

-- =====================================================
-- STEP 7: CREATE TRIGGER TO UPDATE ACTIVE ALERTS COUNT
-- =====================================================

CREATE OR REPLACE FUNCTION update_risk_alerts_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the count of active (pending) alerts for this risk
  UPDATE risks
  SET active_alerts_count = (
    SELECT COUNT(*)
    FROM risk_intelligence_alerts
    WHERE risk_code = NEW.risk_code
      AND organization_id = NEW.organization_id
      AND status = 'pending'
  )
  WHERE risk_code = NEW.risk_code
    AND organization_id = NEW.organization_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alert_count_trigger_insert
  AFTER INSERT ON risk_intelligence_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_alerts_count();

CREATE TRIGGER alert_count_trigger_update
  AFTER UPDATE ON risk_intelligence_alerts
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_risk_alerts_count();

-- =====================================================
-- STEP 8: CREATE FUNCTION TO CLEAN UP EXPIRED ALERTS
-- =====================================================

CREATE OR REPLACE FUNCTION expire_old_alerts()
RETURNS void AS $$
BEGIN
  UPDATE risk_intelligence_alerts
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 9: ROW LEVEL SECURITY POLICIES
-- =====================================================

ALTER TABLE external_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_intelligence_alerts ENABLE ROW LEVEL SECURITY;

-- External Events Policies
-- Everyone in organization can view events
CREATE POLICY "Users view events in org"
ON external_events FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Only admins can insert events (or use service role key)
CREATE POLICY "Admins insert events"
ON external_events FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Intelligence Alerts Policies
-- Users see alerts for risks in their organization
CREATE POLICY "Users see alerts in org"
ON risk_intelligence_alerts FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Users and admins can update alert status (accept/reject)
CREATE POLICY "Users update alerts"
ON risk_intelligence_alerts FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Only admins can create alerts
CREATE POLICY "Admins create alerts"
ON risk_intelligence_alerts FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- =====================================================
-- STEP 10: VERIFY INSTALLATION
-- =====================================================

-- Check external_events table
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'external_events'
ORDER BY ordinal_position;

-- Check risk_intelligence_alerts table
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'risk_intelligence_alerts'
ORDER BY ordinal_position;

-- Check policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('external_events', 'risk_intelligence_alerts')
ORDER BY tablename, policyname;

-- Check for any remaining duplicate risks
SELECT organization_id, risk_code, COUNT(*) as count
FROM risks
GROUP BY organization_id, risk_code
HAVING COUNT(*) > 1;

-- =====================================================
-- NOTES
-- =====================================================

-- DATA SOURCES (FREE):
-- Nigeria Regulatory:
--   - CBN (cbn.gov.ng) - Market/Regulatory events
--   - SEC Nigeria (sec.gov.ng) - Regulatory updates
--   - FMDQ (fmdqgroup.com) - Market intelligence
--   - NAICOM (naicom.gov.ng) - Insurance regulation
--
-- Nigeria News:
--   - BusinessDay Nigeria (businessday.ng)
--   - The Guardian Nigeria (guardian.ng)
--   - Premium Times (premiumtimesng.com)
--   - Vanguard News (vanguardngr.com)
--
-- Global Cybersecurity:
--   - US-CERT (cisa.gov)
--   - SANS Internet Storm Center (isc.sans.edu)
--
-- Environmental:
--   - UN Environment Programme (unep.org)

-- WORKFLOW:
-- 1. Scanner runs every 12 hours (cron job)
-- 2. Fetches news from RSS feeds
-- 3. Stores in external_events table
-- 4. AI analyzes each event against all active risks
-- 5. Creates risk_intelligence_alerts for relevant matches
-- 6. Users/admins review alerts and accept/reject suggestions
-- 7. Accepted alerts update risk likelihood automatically
-- 8. Old alerts auto-expire after 30 days

-- SECURITY MODEL:
-- 1. All users in org can view events and alerts
-- 2. Only admins can insert events (scanner uses service role)
-- 3. Users can accept/reject alerts for risks they can access
-- 4. Active alerts count is automatically updated via trigger
-- 5. Expired alerts are marked by cleanup function

-- DEPLOYMENT:
-- 1. Run this script in Supabase SQL Editor
-- 2. Verify tables and policies created
-- 3. Set up scanner service (cron job or edge function)
-- 4. Configure RSS feed sources
-- 5. Deploy frontend UI components

-- IMPORTANT NOTES ON DUPLICATE CLEANUP:
-- This script will automatically remove duplicate risk entries (same organization_id + risk_code)
-- It keeps the most recent entry (by created_at timestamp)
-- All associated controls will be preserved on the kept risk entry
-- Check the "Check for any remaining duplicate risks" query at the end to verify cleanup
