-- =====================================================
-- MINRISK: ARCHIVE & AUDIT TRAIL MIGRATION
-- =====================================================
-- This migration adds:
-- 1. Archived risks table
-- 2. Archived config values table
-- 3. Audit trail table
-- 4. Pending deletions table (for admin approval workflow)
-- 5. Helper functions

-- =====================================================
-- 1. ARCHIVED RISKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS archived_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_risk_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  risk_code text NOT NULL,
  risk_title text NOT NULL,
  risk_description text,
  division text NOT NULL,
  department text NOT NULL,
  category text NOT NULL,
  owner text NOT NULL,
  likelihood_inherent integer NOT NULL,
  impact_inherent integer NOT NULL,
  status text NOT NULL,
  is_priority boolean DEFAULT false,

  -- Archival metadata
  archived_at timestamptz DEFAULT now(),
  archived_by uuid NOT NULL,
  archive_reason text NOT NULL, -- 'user_deleted', 'config_change', 'admin_archived', 'user_requested'
  archive_notes text,

  -- Original timestamps
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,

  -- Constraints
  CONSTRAINT fk_archived_by FOREIGN KEY (archived_by) REFERENCES auth.users(id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_archived_risks_org ON archived_risks(organization_id);
CREATE INDEX IF NOT EXISTS idx_archived_risks_user ON archived_risks(user_id);
CREATE INDEX IF NOT EXISTS idx_archived_risks_archived_at ON archived_risks(archived_at);
CREATE INDEX IF NOT EXISTS idx_archived_risks_archived_by ON archived_risks(archived_by);

-- RLS Policies
ALTER TABLE archived_risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's archived risks"
  ON archived_risks FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage archived risks"
  ON archived_risks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND organization_id = archived_risks.organization_id
    )
  );

-- =====================================================
-- 2. ARCHIVED CONTROLS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS archived_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_control_id uuid NOT NULL,
  archived_risk_id uuid NOT NULL,
  risk_code text NOT NULL,
  description text NOT NULL,
  target text NOT NULL,
  design integer NOT NULL,
  implementation integer NOT NULL,
  monitoring integer NOT NULL,
  effectiveness_evaluation integer NOT NULL,

  -- Archival metadata
  archived_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,

  -- Constraints
  CONSTRAINT fk_archived_risk FOREIGN KEY (archived_risk_id) REFERENCES archived_risks(id) ON DELETE CASCADE
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_archived_controls_risk ON archived_controls(archived_risk_id);

-- RLS Policies
ALTER TABLE archived_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view archived controls in their organization"
  ON archived_controls FOR SELECT
  USING (
    archived_risk_id IN (
      SELECT id FROM archived_risks
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage archived controls"
  ON archived_controls FOR ALL
  USING (
    archived_risk_id IN (
      SELECT id FROM archived_risks
      WHERE organization_id IN (
        SELECT organization_id FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- =====================================================
-- 3. ARCHIVED CONFIG VALUES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS archived_config_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  config_type text NOT NULL, -- 'division', 'department', 'category', 'likelihood_label', 'impact_label'
  config_value text NOT NULL,
  usage_count integer DEFAULT 0, -- How many risks used this value when archived

  -- Archival metadata
  archived_at timestamptz DEFAULT now(),
  archived_by uuid NOT NULL,
  archive_reason text,

  -- Constraints
  CONSTRAINT fk_archived_config_by FOREIGN KEY (archived_by) REFERENCES auth.users(id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_archived_config_org ON archived_config_values(organization_id);
CREATE INDEX IF NOT EXISTS idx_archived_config_type ON archived_config_values(config_type);

-- RLS Policies
ALTER TABLE archived_config_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's archived configs"
  ON archived_config_values FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage archived configs"
  ON archived_config_values FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND organization_id = archived_config_values.organization_id
    )
  );

-- =====================================================
-- 4. AUDIT TRAIL TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action_type text NOT NULL, -- 'create', 'update', 'delete', 'archive', 'restore', 'config_change', 'user_approved', 'user_rejected', 'user_deleted'
  entity_type text NOT NULL, -- 'risk', 'control', 'config', 'user'
  entity_id text, -- ID of affected entity
  entity_code text, -- Risk code or user email for readability
  old_values jsonb, -- Previous state
  new_values jsonb, -- New state
  metadata jsonb, -- Additional context
  ip_address text,
  user_agent text,
  performed_at timestamptz DEFAULT now(),

  -- Constraints
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_trail(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed_at ON audit_trail(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action_type ON audit_trail(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_entity_type ON audit_trail(entity_type);

-- RLS Policies
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's audit trail"
  ON audit_trail FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert audit records"
  ON audit_trail FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 5. PENDING DELETIONS TABLE (Admin Approval Workflow)
-- =====================================================
CREATE TABLE IF NOT EXISTS pending_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  entity_type text NOT NULL, -- 'risk', 'control'
  entity_id text NOT NULL, -- Risk code or control ID
  risk_code text, -- For display
  risk_title text, -- For display
  request_reason text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'

  -- Request metadata
  requested_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_notes text,

  -- Constraints
  CONSTRAINT fk_pending_del_requested_by FOREIGN KEY (requested_by) REFERENCES auth.users(id),
  CONSTRAINT fk_pending_del_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pending_del_org ON pending_deletions(organization_id);
CREATE INDEX IF NOT EXISTS idx_pending_del_status ON pending_deletions(status);
CREATE INDEX IF NOT EXISTS idx_pending_del_requested_by ON pending_deletions(requested_by);

-- RLS Policies
ALTER TABLE pending_deletions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's pending deletions"
  ON pending_deletions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create deletion requests"
  ON pending_deletions FOR INSERT
  WITH CHECK (
    requested_by = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage deletion requests"
  ON pending_deletions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND organization_id = pending_deletions.organization_id
    )
  );

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function: Archive a risk (with controls)
CREATE OR REPLACE FUNCTION archive_risk(
  target_risk_code text,
  archive_reason text DEFAULT 'admin_archived',
  archive_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_risk record;
  v_control record;
  v_archived_risk_id uuid;
  v_user_id uuid;
  v_org_id uuid;
  v_control_count integer := 0;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get user's organization
  SELECT organization_id INTO v_org_id
  FROM user_profiles
  WHERE id = v_user_id;

  -- Get the risk
  SELECT * INTO v_risk
  FROM risks
  WHERE risk_code = target_risk_code;

  IF v_risk IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Risk not found');
  END IF;

  -- Insert into archived_risks
  INSERT INTO archived_risks (
    original_risk_id, organization_id, user_id, risk_code, risk_title,
    risk_description, division, department, category, owner,
    likelihood_inherent, impact_inherent, status, is_priority,
    archived_by, archive_reason, archive_notes,
    created_at, updated_at
  )
  VALUES (
    v_risk.id, v_risk.organization_id, v_risk.user_id, v_risk.risk_code, v_risk.risk_title,
    v_risk.risk_description, v_risk.division, v_risk.department, v_risk.category, v_risk.owner,
    v_risk.likelihood_inherent, v_risk.impact_inherent, v_risk.status, v_risk.is_priority,
    v_user_id, archive_reason, archive_notes,
    v_risk.created_at, v_risk.updated_at
  )
  RETURNING id INTO v_archived_risk_id;

  -- Archive all controls
  FOR v_control IN
    SELECT * FROM controls WHERE risk_id = v_risk.id
  LOOP
    INSERT INTO archived_controls (
      original_control_id, archived_risk_id, risk_code, description, target,
      design, implementation, monitoring, effectiveness_evaluation,
      created_at, updated_at
    )
    VALUES (
      v_control.id, v_archived_risk_id, v_risk.risk_code, v_control.description, v_control.target,
      v_control.design, v_control.implementation, v_control.monitoring, v_control.effectiveness_evaluation,
      v_control.created_at, v_control.updated_at
    );
    v_control_count := v_control_count + 1;
  END LOOP;

  -- Log to audit trail
  INSERT INTO audit_trail (
    organization_id, user_id, action_type, entity_type, entity_id, entity_code,
    old_values, metadata
  )
  VALUES (
    v_org_id, v_user_id, 'archive', 'risk', v_risk.id::text, v_risk.risk_code,
    to_jsonb(v_risk),
    jsonb_build_object('reason', archive_reason, 'notes', archive_notes, 'control_count', v_control_count)
  );

  -- Delete the risk (cascade will delete controls)
  DELETE FROM risks WHERE id = v_risk.id;

  RETURN jsonb_build_object(
    'success', true,
    'archived_risk_id', v_archived_risk_id,
    'control_count', v_control_count
  );
END;
$$;

-- Function: Count risks using a specific config value
CREATE OR REPLACE FUNCTION count_risks_with_config_value(
  config_type text, -- 'division', 'department', 'category'
  config_value text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_org_id uuid;
BEGIN
  -- Get current user's organization
  SELECT organization_id INTO v_org_id
  FROM user_profiles
  WHERE id = auth.uid();

  IF config_type = 'division' THEN
    SELECT COUNT(*) INTO v_count FROM risks
    WHERE organization_id = v_org_id AND division = config_value;
  ELSIF config_type = 'department' THEN
    SELECT COUNT(*) INTO v_count FROM risks
    WHERE organization_id = v_org_id AND department = config_value;
  ELSIF config_type = 'category' THEN
    SELECT COUNT(*) INTO v_count FROM risks
    WHERE organization_id = v_org_id AND category = config_value;
  ELSE
    v_count := 0;
  END IF;

  RETURN v_count;
END;
$$;

-- Function: Archive config value
CREATE OR REPLACE FUNCTION archive_config_value(
  config_type text,
  config_value text,
  archive_reason text DEFAULT 'admin_removed'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_usage_count integer;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT organization_id INTO v_org_id
  FROM user_profiles
  WHERE id = v_user_id;

  -- Count usage
  v_usage_count := count_risks_with_config_value(config_type, config_value);

  -- Insert into archived_config_values
  INSERT INTO archived_config_values (
    organization_id, config_type, config_value, usage_count,
    archived_by, archive_reason
  )
  VALUES (
    v_org_id, config_type, config_value, v_usage_count,
    v_user_id, archive_reason
  );

  -- Log to audit trail
  INSERT INTO audit_trail (
    organization_id, user_id, action_type, entity_type, entity_code,
    metadata
  )
  VALUES (
    v_org_id, v_user_id, 'archive', 'config', config_value,
    jsonb_build_object('config_type', config_type, 'usage_count', v_usage_count, 'reason', archive_reason)
  );

  RETURN jsonb_build_object('success', true, 'usage_count', v_usage_count);
END;
$$;

-- Function: Permanently delete archived risk (admin only, requires password verification)
CREATE OR REPLACE FUNCTION permanent_delete_archived_risk(
  archived_risk_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_is_admin boolean;
  v_risk_code text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if user is admin
  SELECT organization_id, role = 'admin' INTO v_org_id, v_is_admin
  FROM user_profiles
  WHERE id = v_user_id;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can permanently delete archives');
  END IF;

  -- Get risk code for audit
  SELECT risk_code INTO v_risk_code
  FROM archived_risks
  WHERE id = archived_risk_id;

  IF v_risk_code IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Archived risk not found');
  END IF;

  -- Log to audit trail
  INSERT INTO audit_trail (
    organization_id, user_id, action_type, entity_type, entity_id, entity_code,
    metadata
  )
  VALUES (
    v_org_id, v_user_id, 'permanent_delete', 'archived_risk', archived_risk_id::text, v_risk_code,
    jsonb_build_object('warning', 'PERMANENT DELETION')
  );

  -- Delete archived risk (cascade will delete controls)
  DELETE FROM archived_risks WHERE id = archived_risk_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function: Request deletion (for non-admin users)
CREATE OR REPLACE FUNCTION request_deletion(
  risk_code text,
  request_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_risk record;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT organization_id INTO v_org_id
  FROM user_profiles
  WHERE id = v_user_id;

  -- Get risk details
  SELECT * INTO v_risk
  FROM risks
  WHERE risks.risk_code = request_deletion.risk_code;

  IF v_risk IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Risk not found');
  END IF;

  -- Insert pending deletion
  INSERT INTO pending_deletions (
    organization_id, requested_by, entity_type, entity_id,
    risk_code, risk_title, request_reason
  )
  VALUES (
    v_org_id, v_user_id, 'risk', v_risk.id::text,
    v_risk.risk_code, v_risk.risk_title, request_reason
  );

  -- Log to audit trail
  INSERT INTO audit_trail (
    organization_id, user_id, action_type, entity_type, entity_id, entity_code,
    metadata
  )
  VALUES (
    v_org_id, v_user_id, 'request_deletion', 'risk', v_risk.id::text, v_risk.risk_code,
    jsonb_build_object('reason', request_reason)
  );

  RETURN jsonb_build_object('success', true, 'message', 'Deletion request submitted for admin approval');
END;
$$;

-- Function: Approve deletion request (admin only)
CREATE OR REPLACE FUNCTION approve_deletion(
  pending_deletion_id uuid,
  review_notes text DEFAULT NULL,
  should_archive boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_is_admin boolean;
  v_pending record;
  v_archive_result jsonb;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if user is admin
  SELECT organization_id, role = 'admin' INTO v_org_id, v_is_admin
  FROM user_profiles
  WHERE id = v_user_id;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can approve deletions');
  END IF;

  -- Get pending deletion
  SELECT * INTO v_pending
  FROM pending_deletions
  WHERE id = pending_deletion_id;

  IF v_pending IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pending deletion not found');
  END IF;

  -- Update pending deletion status
  UPDATE pending_deletions
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = v_user_id,
      review_notes = approve_deletion.review_notes
  WHERE id = pending_deletion_id;

  -- Archive or delete the risk
  IF should_archive THEN
    v_archive_result := archive_risk(
      v_pending.risk_code,
      'user_requested_admin_approved',
      'Requested by user, approved by admin. ' || COALESCE(review_notes, '')
    );

    IF NOT (v_archive_result->>'success')::boolean THEN
      RETURN v_archive_result;
    END IF;
  ELSE
    -- Direct delete without archiving
    DELETE FROM risks WHERE risk_code = v_pending.risk_code;

    -- Log to audit trail
    INSERT INTO audit_trail (
      organization_id, user_id, action_type, entity_type, entity_code,
      metadata
    )
    VALUES (
      v_org_id, v_user_id, 'delete', 'risk', v_pending.risk_code,
      jsonb_build_object('archived', false, 'notes', review_notes)
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'archived', should_archive);
END;
$$;

-- Function: Reject deletion request (admin only)
CREATE OR REPLACE FUNCTION reject_deletion(
  pending_deletion_id uuid,
  review_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if user is admin
  SELECT role = 'admin' INTO v_is_admin
  FROM user_profiles
  WHERE id = v_user_id;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can reject deletions');
  END IF;

  -- Update pending deletion status
  UPDATE pending_deletions
  SET status = 'rejected',
      reviewed_at = now(),
      reviewed_by = v_user_id,
      review_notes = reject_deletion.review_notes
  WHERE id = pending_deletion_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE archived_risks IS 'Stores archived risks that have been removed from active use';
COMMENT ON TABLE archived_controls IS 'Stores controls associated with archived risks';
COMMENT ON TABLE archived_config_values IS 'Stores archived configuration values (divisions, departments, categories)';
COMMENT ON TABLE audit_trail IS 'Complete audit log of all system actions';
COMMENT ON TABLE pending_deletions IS 'Deletion requests awaiting admin approval';
COMMENT ON FUNCTION archive_risk IS 'Archives a risk and its controls, then deletes from active tables';
COMMENT ON FUNCTION count_risks_with_config_value IS 'Counts how many risks use a specific config value';
COMMENT ON FUNCTION archive_config_value IS 'Archives a config value when removed';
COMMENT ON FUNCTION permanent_delete_archived_risk IS 'Permanently deletes an archived risk (admin only)';
COMMENT ON FUNCTION request_deletion IS 'Users request deletion of their risk (requires admin approval)';
COMMENT ON FUNCTION approve_deletion IS 'Admin approves a deletion request';
COMMENT ON FUNCTION reject_deletion IS 'Admin rejects a deletion request';
