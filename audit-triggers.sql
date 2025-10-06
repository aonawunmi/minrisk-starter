-- Audit Trail Triggers for ALL user actions
-- This will automatically log all risk and control operations to the audit trail
-- Copy and paste this into Supabase SQL editor

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Function to log risk creation
CREATE OR REPLACE FUNCTION log_risk_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_trail (
    organization_id, user_id, action_type, entity_type, entity_id, entity_code,
    new_values, metadata
  )
  VALUES (
    NEW.organization_id, NEW.user_id, 'create', 'risk', NEW.id::text, NEW.risk_code,
    to_jsonb(NEW),
    jsonb_build_object('created_at', NEW.created_at)
  );
  RETURN NEW;
END;
$$;

-- Function to log risk updates
CREATE OR REPLACE FUNCTION log_risk_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_trail (
    organization_id, user_id, action_type, entity_type, entity_id, entity_code,
    old_values, new_values, metadata
  )
  VALUES (
    NEW.organization_id, NEW.user_id, 'update', 'risk', NEW.id::text, NEW.risk_code,
    to_jsonb(OLD),
    to_jsonb(NEW),
    jsonb_build_object('updated_at', NEW.updated_at)
  );
  RETURN NEW;
END;
$$;

-- Function to log risk deletion
CREATE OR REPLACE FUNCTION log_risk_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_trail (
    organization_id, user_id, action_type, entity_type, entity_id, entity_code,
    old_values, metadata
  )
  VALUES (
    OLD.organization_id, OLD.user_id, 'delete', 'risk', OLD.id::text, OLD.risk_code,
    to_jsonb(OLD),
    jsonb_build_object('deleted_at', now())
  );
  RETURN OLD;
END;
$$;

-- Function to log control creation
CREATE OR REPLACE FUNCTION log_control_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_risk_code text;
  v_org_id uuid;
  v_user_id uuid;
BEGIN
  -- Get risk code and organization from the associated risk
  SELECT risk_code, organization_id, user_id INTO v_risk_code, v_org_id, v_user_id
  FROM risks
  WHERE id = NEW.risk_id;

  INSERT INTO audit_trail (
    organization_id, user_id, action_type, entity_type, entity_id, entity_code,
    new_values, metadata
  )
  VALUES (
    v_org_id, v_user_id, 'create', 'control', NEW.id::text, v_risk_code,
    to_jsonb(NEW),
    jsonb_build_object('risk_id', NEW.risk_id, 'risk_code', v_risk_code)
  );
  RETURN NEW;
END;
$$;

-- Function to log control updates
CREATE OR REPLACE FUNCTION log_control_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_risk_code text;
  v_org_id uuid;
  v_user_id uuid;
BEGIN
  -- Get risk code and organization from the associated risk
  SELECT risk_code, organization_id, user_id INTO v_risk_code, v_org_id, v_user_id
  FROM risks
  WHERE id = NEW.risk_id;

  INSERT INTO audit_trail (
    organization_id, user_id, action_type, entity_type, entity_id, entity_code,
    old_values, new_values, metadata
  )
  VALUES (
    v_org_id, v_user_id, 'update', 'control', NEW.id::text, v_risk_code,
    to_jsonb(OLD),
    to_jsonb(NEW),
    jsonb_build_object('risk_id', NEW.risk_id, 'risk_code', v_risk_code)
  );
  RETURN NEW;
END;
$$;

-- Function to log control deletion
CREATE OR REPLACE FUNCTION log_control_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_risk_code text;
  v_org_id uuid;
  v_user_id uuid;
BEGIN
  -- Get risk code and organization from the associated risk
  SELECT risk_code, organization_id, user_id INTO v_risk_code, v_org_id, v_user_id
  FROM risks
  WHERE id = OLD.risk_id;

  INSERT INTO audit_trail (
    organization_id, user_id, action_type, entity_type, entity_id, entity_code,
    old_values, metadata
  )
  VALUES (
    v_org_id, v_user_id, 'delete', 'control', OLD.id::text, v_risk_code,
    to_jsonb(OLD),
    jsonb_build_object('risk_id', OLD.risk_id, 'risk_code', v_risk_code, 'deleted_at', now())
  );
  RETURN OLD;
END;
$$;

-- Function to log user profile creation (signup)
CREATE OR REPLACE FUNCTION log_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email text;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email
  FROM admin_users_view
  WHERE id = NEW.id;

  INSERT INTO audit_trail (
    organization_id, user_id, action_type, entity_type, entity_id, entity_code,
    new_values, metadata
  )
  VALUES (
    NEW.organization_id, NEW.id, 'create', 'user', NEW.id::text, v_user_email,
    jsonb_build_object('role', NEW.role, 'status', NEW.status),
    jsonb_build_object('signup_at', NEW.created_at)
  );
  RETURN NEW;
END;
$$;

-- =====================================================
-- CREATE TRIGGERS
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_risk_create ON risks;
DROP TRIGGER IF EXISTS trg_risk_update ON risks;
DROP TRIGGER IF EXISTS trg_risk_delete ON risks;
DROP TRIGGER IF EXISTS trg_control_create ON controls;
DROP TRIGGER IF EXISTS trg_control_update ON controls;
DROP TRIGGER IF EXISTS trg_control_delete ON controls;
DROP TRIGGER IF EXISTS trg_user_signup ON user_profiles;

-- Risk triggers
CREATE TRIGGER trg_risk_create
  AFTER INSERT ON risks
  FOR EACH ROW
  EXECUTE FUNCTION log_risk_create();

CREATE TRIGGER trg_risk_update
  AFTER UPDATE ON risks
  FOR EACH ROW
  EXECUTE FUNCTION log_risk_update();

CREATE TRIGGER trg_risk_delete
  BEFORE DELETE ON risks
  FOR EACH ROW
  EXECUTE FUNCTION log_risk_delete();

-- Control triggers
CREATE TRIGGER trg_control_create
  AFTER INSERT ON controls
  FOR EACH ROW
  EXECUTE FUNCTION log_control_create();

CREATE TRIGGER trg_control_update
  AFTER UPDATE ON controls
  FOR EACH ROW
  EXECUTE FUNCTION log_control_update();

CREATE TRIGGER trg_control_delete
  BEFORE DELETE ON controls
  FOR EACH ROW
  EXECUTE FUNCTION log_control_delete();

-- User signup trigger
CREATE TRIGGER trg_user_signup
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_user_signup();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION log_risk_create IS 'Automatically logs risk creation to audit trail';
COMMENT ON FUNCTION log_risk_update IS 'Automatically logs risk updates to audit trail';
COMMENT ON FUNCTION log_risk_delete IS 'Automatically logs risk deletion to audit trail';
COMMENT ON FUNCTION log_control_create IS 'Automatically logs control creation to audit trail';
COMMENT ON FUNCTION log_control_update IS 'Automatically logs control updates to audit trail';
COMMENT ON FUNCTION log_control_delete IS 'Automatically logs control deletion to audit trail';
COMMENT ON FUNCTION log_user_signup IS 'Automatically logs user signup to audit trail';
