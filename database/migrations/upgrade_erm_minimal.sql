-- MinRisk ERM Upgrade: Database Schema
-- MINIMAL VERSION: Start with tables only, NO RLS initially

-- ===== 1. Organization Settings =====
CREATE TABLE IF NOT EXISTS organization_settings (
    organization_id TEXT PRIMARY KEY,
    institution_type TEXT NOT NULL CHECK (institution_type IN ('Bank', 'Capital Markets', 'Pensions')),
    default_regulator TEXT NOT NULL CHECK (default_regulator IN ('CBN', 'SEC', 'PENCOM')),
    organization_name TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- ===== 2. Add Narrative Fields =====
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'kri_alerts') THEN
        ALTER TABLE kri_alerts
        ADD COLUMN IF NOT EXISTS narrative TEXT,
        ADD COLUMN IF NOT EXISTS narrative_generated_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS narrative_edited_by TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'risk_appetite_exceptions') THEN
        ALTER TABLE risk_appetite_exceptions
        ADD COLUMN IF NOT EXISTS narrative TEXT,
        ADD COLUMN IF NOT EXISTS narrative_generated_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS narrative_edited_by TEXT;
    END IF;
END $$;

-- ===== 3. Report Drafts =====
CREATE TABLE IF NOT EXISTS report_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL,
    audience TEXT NOT NULL CHECK (audience IN ('regulator', 'board', 'ceo')),
    regulator_type TEXT CHECK (regulator_type IN ('CBN', 'SEC', 'PENCOM')),
    regulator_override BOOLEAN DEFAULT FALSE,
    period TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'final')) DEFAULT 'draft',
    created_by UUID NOT NULL,
    created_by_email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    finalized_at TIMESTAMPTZ,
    finalized_by UUID,
    finalized_by_email TEXT,
    UNIQUE(organization_id, audience, period, status)
);

-- ===== 4. Report Sections =====
CREATE TABLE IF NOT EXISTS report_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_draft_id UUID NOT NULL REFERENCES report_drafts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    section_order INTEGER NOT NULL,
    included BOOLEAN DEFAULT TRUE,
    content_type TEXT NOT NULL CHECK (content_type IN ('narrative', 'table', 'chart', 'mixed')),
    narrative TEXT,
    data JSONB,
    last_edited_by TEXT,
    last_edited_at TIMESTAMPTZ,
    UNIQUE(report_draft_id, section_order)
);

-- ===== 5. Report Audit Trail =====
CREATE TABLE IF NOT EXISTS report_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_draft_id UUID NOT NULL REFERENCES report_drafts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    section_id UUID REFERENCES report_sections(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('create', 'edit_narrative', 'toggle_section', 'reorder', 'finalize', 'override_regulator')),
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 6. Risk Movement Tracking =====
CREATE TABLE IF NOT EXISTS risk_movement_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL,
    risk_code TEXT NOT NULL,
    risk_title TEXT NOT NULL,
    category TEXT NOT NULL,
    period TEXT NOT NULL,
    inherent_score NUMERIC NOT NULL,
    residual_score NUMERIC NOT NULL,
    previous_residual_score NUMERIC,
    change_from_previous NUMERIC,
    velocity TEXT CHECK (velocity IN ('rising', 'falling', 'stable')),
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, risk_code, period)
);

-- ===== 7. Indexes =====
CREATE INDEX IF NOT EXISTS idx_organization_settings_org_id ON organization_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_drafts_org_audience ON report_drafts(organization_id, audience);
CREATE INDEX IF NOT EXISTS idx_report_drafts_status ON report_drafts(status);
CREATE INDEX IF NOT EXISTS idx_report_sections_draft_id ON report_sections(report_draft_id);
CREATE INDEX IF NOT EXISTS idx_report_audit_trail_draft_id ON report_audit_trail(report_draft_id);
CREATE INDEX IF NOT EXISTS idx_risk_movement_org_period ON risk_movement_history(organization_id, period);

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'kri_alerts') THEN
        CREATE INDEX IF NOT EXISTS idx_kri_alerts_narrative ON kri_alerts(narrative) WHERE narrative IS NOT NULL;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'risk_appetite_exceptions') THEN
        CREATE INDEX IF NOT EXISTS idx_appetite_exceptions_narrative ON risk_appetite_exceptions(narrative) WHERE narrative IS NOT NULL;
    END IF;
END $$;

-- ===== 8. Function =====
CREATE OR REPLACE FUNCTION set_default_regulator()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.institution_type = 'Bank' THEN
        NEW.default_regulator := 'CBN';
    ELSIF NEW.institution_type = 'Capital Markets' THEN
        NEW.default_regulator := 'SEC';
    ELSIF NEW.institution_type = 'Pensions' THEN
        NEW.default_regulator := 'PENCOM';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_default_regulator_trigger
    BEFORE INSERT OR UPDATE ON organization_settings
    FOR EACH ROW
    EXECUTE FUNCTION set_default_regulator();

-- ===== 9. SUCCESS MESSAGE =====
DO $$
BEGIN
    RAISE NOTICE 'MinRisk ERM tables created successfully!';
    RAISE NOTICE 'Tables: organization_settings, report_drafts, report_sections, report_audit_trail, risk_movement_history';
    RAISE NOTICE 'Note: RLS is NOT enabled - application handles security through organization_id filtering';
END $$;
