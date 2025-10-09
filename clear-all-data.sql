-- =====================================================
-- CLEAR ALL DATA - For testing Phase 3B from scratch
-- WARNING: This will delete all risks, controls, history, archives, and activity logs
-- =====================================================

-- Delete all risk history
DELETE FROM risk_history;

-- Delete all archived risks and controls
DELETE FROM archived_controls;
DELETE FROM archived_risks;

-- Delete all controls (will cascade from risks, but being explicit)
DELETE FROM controls;

-- Delete all risks
DELETE FROM risks;

-- Delete all audit trail entries (activity logs)
DELETE FROM audit_trail;

-- Verify deletions
SELECT 'risks' as table_name, COUNT(*) as count FROM risks
UNION ALL
SELECT 'controls', COUNT(*) FROM controls
UNION ALL
SELECT 'risk_history', COUNT(*) FROM risk_history
UNION ALL
SELECT 'archived_risks', COUNT(*) FROM archived_risks
UNION ALL
SELECT 'archived_controls', COUNT(*) FROM archived_controls
UNION ALL
SELECT 'audit_trail', COUNT(*) FROM audit_trail;

-- =====================================================
-- DONE! All data cleared for fresh testing
-- =====================================================
