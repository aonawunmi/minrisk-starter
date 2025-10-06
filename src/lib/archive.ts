// src/lib/archive.ts
// Archive and Audit Trail operations for MinRisk

import { supabase } from './supabase';

// =====================================================
// TYPES
// =====================================================

export type ArchivedRisk = {
  id: string;
  original_risk_id: string;
  organization_id: string;
  user_id: string;
  risk_code: string;
  risk_title: string;
  risk_description: string;
  division: string;
  department: string;
  category: string;
  owner: string;
  likelihood_inherent: number;
  impact_inherent: number;
  status: string;
  is_priority: boolean;
  archived_at: string;
  archived_by: string;
  archive_reason: string;
  archive_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ArchivedControl = {
  id: string;
  original_control_id: string;
  archived_risk_id: string;
  risk_code: string;
  description: string;
  target: string;
  design: number;
  implementation: number;
  monitoring: number;
  effectiveness_evaluation: number;
  archived_at: string;
  created_at: string;
  updated_at: string;
};

export type AuditTrailEntry = {
  id: string;
  organization_id: string;
  user_id: string;
  user_email?: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  entity_code: string | null;
  old_values: any;
  new_values: any;
  metadata: any;
  ip_address: string | null;
  user_agent: string | null;
  performed_at: string;
};

export type PendingDeletion = {
  id: string;
  organization_id: string;
  requested_by: string;
  requester_email?: string;
  entity_type: string;
  entity_id: string;
  risk_code: string | null;
  risk_title: string | null;
  request_reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewer_email?: string;
  review_notes: string | null;
};

// =====================================================
// ARCHIVE OPERATIONS
// =====================================================

/**
 * Archive a risk (moves to archive, deletes from active)
 */
export async function archiveRisk(
  riskCode: string,
  reason: string = 'admin_archived',
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('archive_risk', {
      target_risk_code: riskCode,
      archive_reason: reason,
      archive_notes: notes || null,
    });

    if (error) throw error;

    const result = data as { success: boolean; error?: string };
    return result;
  } catch (error: any) {
    console.error('Error archiving risk:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load all archived risks
 */
export async function loadArchivedRisks(): Promise<ArchivedRisk[]> {
  try {
    const { data, error } = await supabase
      .from('archived_risks')
      .select('*')
      .order('archived_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error loading archived risks:', error);
    return [];
  }
}

/**
 * Load controls for an archived risk
 */
export async function loadArchivedControls(archivedRiskId: string): Promise<ArchivedControl[]> {
  try {
    const { data, error } = await supabase
      .from('archived_controls')
      .select('*')
      .eq('archived_risk_id', archivedRiskId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error loading archived controls:', error);
    return [];
  }
}

/**
 * Permanently delete an archived risk (admin only, requires password verification)
 */
export async function permanentDeleteArchivedRisk(
  archivedRiskId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('permanent_delete_archived_risk', {
      archived_risk_id: archivedRiskId,
    });

    if (error) throw error;

    const result = data as { success: boolean; error?: string };
    return result;
  } catch (error: any) {
    console.error('Error permanently deleting archived risk:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Count risks using a specific config value
 */
export async function countRisksWithConfigValue(
  configType: 'division' | 'department' | 'category',
  configValue: string
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('count_risks_with_config_value', {
      config_type: configType,
      config_value: configValue,
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error counting risks with config value:', error);
    return 0;
  }
}

/**
 * Archive a config value
 */
export async function archiveConfigValue(
  configType: 'division' | 'department' | 'category',
  configValue: string,
  reason: string = 'admin_removed'
): Promise<{ success: boolean; usage_count?: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('archive_config_value', {
      config_type: configType,
      config_value: configValue,
      archive_reason: reason,
    });

    if (error) throw error;

    const result = data as { success: boolean; usage_count?: number; error?: string };
    return result;
  } catch (error: any) {
    console.error('Error archiving config value:', error);
    return { success: false, error: error.message };
  }
}

// =====================================================
// AUDIT TRAIL
// =====================================================

/**
 * Load audit trail entries
 */
export async function loadAuditTrail(limit: number = 100): Promise<AuditTrailEntry[]> {
  try {
    const { data: entries, error } = await supabase
      .from('audit_trail')
      .select('*')
      .order('performed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    if (!entries || entries.length === 0) return [];

    // Fetch user emails for all unique user_ids
    const userIds = [...new Set(entries.map(e => e.user_id))];
    const { data: users } = await supabase
      .from('admin_users_view')
      .select('id, email')
      .in('id', userIds);

    const userEmailMap = new Map<string, string>();
    (users || []).forEach(u => {
      if (u.email) userEmailMap.set(u.id, u.email);
    });

    // Add user emails to entries
    return entries.map(entry => ({
      ...entry,
      user_email: userEmailMap.get(entry.user_id),
    }));
  } catch (error) {
    console.error('Error loading audit trail:', error);
    return [];
  }
}

/**
 * Log an audit trail entry (client-side)
 */
export async function logAuditEntry(
  actionType: string,
  entityType: string,
  entityCode: string,
  metadata?: any
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) return;

    await supabase.from('audit_trail').insert({
      organization_id: profile.organization_id,
      user_id: user.id,
      action_type: actionType,
      entity_type: entityType,
      entity_code: entityCode,
      metadata: metadata || {},
    });
  } catch (error) {
    console.error('Error logging audit entry:', error);
  }
}

// =====================================================
// PENDING DELETIONS (ADMIN APPROVAL WORKFLOW)
// =====================================================

/**
 * Request deletion of a risk (non-admin users)
 */
export async function requestDeletion(
  riskCode: string,
  reason?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('request_deletion', {
      risk_code: riskCode,
      request_reason: reason || null,
    });

    if (error) throw error;

    const result = data as { success: boolean; message?: string; error?: string };
    return result;
  } catch (error: any) {
    console.error('Error requesting deletion:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load all pending deletions
 */
export async function loadPendingDeletions(): Promise<PendingDeletion[]> {
  try {
    const { data: deletions, error } = await supabase
      .from('pending_deletions')
      .select('*')
      .order('requested_at', { ascending: false });

    if (error) throw error;

    if (!deletions || deletions.length === 0) return [];

    // Fetch user emails
    const requesterIds = [...new Set(deletions.map(d => d.requested_by))];
    const reviewerIds = [...new Set(deletions.map(d => d.reviewed_by).filter(Boolean))];
    const allUserIds = [...new Set([...requesterIds, ...reviewerIds])];

    const { data: users } = await supabase
      .from('admin_users_view')
      .select('id, email')
      .in('id', allUserIds);

    const userEmailMap = new Map<string, string>();
    (users || []).forEach(u => {
      if (u.email) userEmailMap.set(u.id, u.email);
    });

    return deletions.map(deletion => ({
      ...deletion,
      requester_email: userEmailMap.get(deletion.requested_by),
      reviewer_email: deletion.reviewed_by ? userEmailMap.get(deletion.reviewed_by) : undefined,
    }));
  } catch (error) {
    console.error('Error loading pending deletions:', error);
    return [];
  }
}

/**
 * Approve a deletion request (admin only)
 */
export async function approveDeletion(
  pendingDeletionId: string,
  reviewNotes?: string,
  shouldArchive: boolean = true
): Promise<{ success: boolean; archived?: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('approve_deletion', {
      pending_deletion_id: pendingDeletionId,
      review_notes: reviewNotes || null,
      should_archive: shouldArchive,
    });

    if (error) throw error;

    const result = data as { success: boolean; archived?: boolean; error?: string };
    return result;
  } catch (error: any) {
    console.error('Error approving deletion:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject a deletion request (admin only)
 */
export async function rejectDeletion(
  pendingDeletionId: string,
  reviewNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('reject_deletion', {
      pending_deletion_id: pendingDeletionId,
      review_notes: reviewNotes || null,
    });

    if (error) throw error;

    const result = data as { success: boolean; error?: string };
    return result;
  } catch (error: any) {
    console.error('Error rejecting deletion:', error);
    return { success: false, error: error.message };
  }
}
