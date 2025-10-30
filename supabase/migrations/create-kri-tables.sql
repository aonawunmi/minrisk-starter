-- KRI (Key Risk Indicators) Module
-- ISO 31000 compliant KRI tracking and monitoring system

-- KRI Definitions Table
-- Stores metadata for each Key Risk Indicator
CREATE TABLE IF NOT EXISTS kri_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,

  -- Basic Information
  kri_code TEXT NOT NULL, -- e.g., "KRI-001"
  kri_name TEXT NOT NULL,
  description TEXT,

  -- Classification
  risk_category TEXT, -- Links to risk categories
  linked_risk_code TEXT, -- Optional link to specific risk
  indicator_type TEXT NOT NULL, -- 'leading', 'lagging', 'concurrent'
  measurement_unit TEXT NOT NULL, -- e.g., '%', 'count', 'days', 'USD'

  -- Data Collection
  data_source TEXT, -- Where the data comes from
  collection_frequency TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'annually'
  responsible_user TEXT, -- Email of person responsible for data entry

  -- Thresholds
  target_value NUMERIC, -- Ideal/target value
  lower_threshold NUMERIC, -- Below this = yellow alert
  upper_threshold NUMERIC, -- Above this = red alert
  threshold_direction TEXT NOT NULL DEFAULT 'above', -- 'above', 'below', 'between' - which direction triggers alert

  -- Status
  enabled BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,

  UNIQUE(organization_id, kri_code)
);

-- KRI Data Entries Table
-- Time-series data for KRI measurements
CREATE TABLE IF NOT EXISTS kri_data_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL REFERENCES kri_definitions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,

  -- Measurement Data
  measurement_date DATE NOT NULL,
  measurement_value NUMERIC NOT NULL,

  -- Context
  notes TEXT,
  data_quality TEXT, -- 'verified', 'estimated', 'provisional'

  -- Alert Status (calculated)
  alert_status TEXT, -- 'green', 'yellow', 'red', null

  -- Metadata
  entered_at TIMESTAMPTZ DEFAULT now(),
  entered_by TEXT,

  UNIQUE(kri_id, measurement_date)
);

-- KRI Alerts Table
-- Tracks threshold breaches and alert notifications
CREATE TABLE IF NOT EXISTS kri_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL REFERENCES kri_definitions(id) ON DELETE CASCADE,
  data_entry_id UUID REFERENCES kri_data_entries(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,

  -- Alert Details
  alert_level TEXT NOT NULL, -- 'yellow', 'red'
  alert_date DATE NOT NULL,
  measured_value NUMERIC NOT NULL,
  threshold_breached NUMERIC NOT NULL,

  -- Status
  status TEXT DEFAULT 'open', -- 'open', 'acknowledged', 'resolved', 'dismissed'
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

-- KRI Comments Table
-- Discussion and notes on KRIs
CREATE TABLE IF NOT EXISTS kri_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_id UUID NOT NULL REFERENCES kri_definitions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,

  comment_text TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_kri_definitions_org ON kri_definitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_kri_definitions_category ON kri_definitions(risk_category);
CREATE INDEX IF NOT EXISTS idx_kri_definitions_enabled ON kri_definitions(enabled);

CREATE INDEX IF NOT EXISTS idx_kri_data_entries_kri ON kri_data_entries(kri_id);
CREATE INDEX IF NOT EXISTS idx_kri_data_entries_org ON kri_data_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_kri_data_entries_date ON kri_data_entries(measurement_date);
CREATE INDEX IF NOT EXISTS idx_kri_data_entries_alert_status ON kri_data_entries(alert_status);

CREATE INDEX IF NOT EXISTS idx_kri_alerts_kri ON kri_alerts(kri_id);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_org ON kri_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_status ON kri_alerts(status);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_level ON kri_alerts(alert_level);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_date ON kri_alerts(alert_date);

CREATE INDEX IF NOT EXISTS idx_kri_comments_kri ON kri_comments(kri_id);

-- Row Level Security (RLS) Policies
ALTER TABLE kri_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_data_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kri_comments ENABLE ROW LEVEL SECURITY;

-- KRI Definitions Policies
CREATE POLICY "Users can view KRI definitions in their organization"
  ON kri_definitions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert KRI definitions"
  ON kri_definitions FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update KRI definitions"
  ON kri_definitions FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete KRI definitions"
  ON kri_definitions FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- KRI Data Entries Policies
CREATE POLICY "Users can view KRI data in their organization"
  ON kri_data_entries FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert KRI data entries"
  ON kri_data_entries FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own KRI data entries"
  ON kri_data_entries FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete KRI data entries"
  ON kri_data_entries FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- KRI Alerts Policies
CREATE POLICY "Users can view KRI alerts in their organization"
  ON kri_alerts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can create KRI alerts"
  ON kri_alerts FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update KRI alerts"
  ON kri_alerts FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- KRI Comments Policies
CREATE POLICY "Users can view KRI comments in their organization"
  ON kri_comments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert KRI comments"
  ON kri_comments FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_kri_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kri_definitions_updated_at
  BEFORE UPDATE ON kri_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_kri_definitions_updated_at();

-- Function to calculate alert status based on thresholds
CREATE OR REPLACE FUNCTION calculate_kri_alert_status(
  p_kri_id UUID,
  p_measurement_value NUMERIC
)
RETURNS TEXT AS $$
DECLARE
  v_target_value NUMERIC;
  v_lower_threshold NUMERIC;
  v_upper_threshold NUMERIC;
  v_threshold_direction TEXT;
BEGIN
  -- Get thresholds for this KRI
  SELECT target_value, lower_threshold, upper_threshold, threshold_direction
  INTO v_target_value, v_lower_threshold, v_upper_threshold, v_threshold_direction
  FROM kri_definitions
  WHERE id = p_kri_id;

  -- If no thresholds set, return null
  IF v_lower_threshold IS NULL AND v_upper_threshold IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate alert status based on direction
  IF v_threshold_direction = 'above' THEN
    -- Higher values are bad
    IF v_upper_threshold IS NOT NULL AND p_measurement_value >= v_upper_threshold THEN
      RETURN 'red';
    ELSIF v_lower_threshold IS NOT NULL AND p_measurement_value >= v_lower_threshold THEN
      RETURN 'yellow';
    ELSE
      RETURN 'green';
    END IF;
  ELSIF v_threshold_direction = 'below' THEN
    -- Lower values are bad
    IF v_lower_threshold IS NOT NULL AND p_measurement_value <= v_lower_threshold THEN
      RETURN 'red';
    ELSIF v_upper_threshold IS NOT NULL AND p_measurement_value <= v_upper_threshold THEN
      RETURN 'yellow';
    ELSE
      RETURN 'green';
    END IF;
  ELSIF v_threshold_direction = 'between' THEN
    -- Values outside range are bad
    IF (v_lower_threshold IS NOT NULL AND p_measurement_value < v_lower_threshold) OR
       (v_upper_threshold IS NOT NULL AND p_measurement_value > v_upper_threshold) THEN
      RETURN 'red';
    ELSE
      RETURN 'green';
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate alert status on data entry
CREATE OR REPLACE FUNCTION auto_calculate_kri_alert_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.alert_status = calculate_kri_alert_status(NEW.kri_id, NEW.measurement_value);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kri_data_entry_calculate_alert
  BEFORE INSERT OR UPDATE ON kri_data_entries
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_kri_alert_status();

-- Trigger to create alerts when thresholds are breached
CREATE OR REPLACE FUNCTION create_kri_alert_on_breach()
RETURNS TRIGGER AS $$
DECLARE
  v_kri_def RECORD;
  v_threshold_breached NUMERIC;
BEGIN
  -- Only create alerts for red or yellow status
  IF NEW.alert_status NOT IN ('red', 'yellow') THEN
    RETURN NEW;
  END IF;

  -- Get KRI definition
  SELECT * INTO v_kri_def FROM kri_definitions WHERE id = NEW.kri_id;

  -- Determine which threshold was breached
  IF NEW.alert_status = 'red' THEN
    v_threshold_breached = COALESCE(v_kri_def.upper_threshold, v_kri_def.lower_threshold);
  ELSE
    v_threshold_breached = COALESCE(v_kri_def.lower_threshold, v_kri_def.upper_threshold);
  END IF;

  -- Create alert if one doesn't already exist for this entry
  INSERT INTO kri_alerts (
    kri_id,
    data_entry_id,
    organization_id,
    alert_level,
    alert_date,
    measured_value,
    threshold_breached,
    status
  ) VALUES (
    NEW.kri_id,
    NEW.id,
    NEW.organization_id,
    NEW.alert_status,
    NEW.measurement_date,
    NEW.measurement_value,
    v_threshold_breached,
    'open'
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kri_data_entry_create_alert
  AFTER INSERT OR UPDATE ON kri_data_entries
  FOR EACH ROW
  EXECUTE FUNCTION create_kri_alert_on_breach();
