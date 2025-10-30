// src/lib/risk-appetite.ts
// Backend functions for Risk Appetite Framework (Phase 5A)

import { supabase } from './supabase';
import { getUserOrganizationId } from './database';

// =====================================================
// TYPES
// =====================================================

export type RiskAppetiteConfig = {
  id: string;
  organization_id: string;
  category: string;
  appetite_threshold: number;
  tolerance_min: number;
  tolerance_max: number;
  rationale?: string;
  approved_by?: string;
  approved_at?: string;
  effective_from: string;
  effective_to?: string;
  created_at: string;
  updated_at: string;
};

export type RiskAppetiteException = {
  id: string;
  risk_id: string;
  organization_id: string;
  justification: string;
  mitigation_plan: string;
  approved_by?: string;
  approved_at?: string;
  review_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type RiskAppetiteHistory = {
  id: string;
  organization_id: string;
  snapshot_date: string;
  total_risks: number;
  risks_within_appetite: number;
  risks_over_appetite: number;
  avg_risk_score: number;
  appetite_utilization: number;
  category_breakdown?: Record<string, any>;
  created_at: string;
};

export type AppetiteUtilization = {
  total_risks: number;
  risks_within_appetite: number;
  risks_over_appetite: number;
  avg_score: number;
  utilization: number;
};

// =====================================================
// APPETITE CONFIG CRUD OPERATIONS
// =====================================================

/**
 * Load all appetite configurations for the user's organization
 */
export async function loadAppetiteConfigs(): Promise<RiskAppetiteConfig[]> {
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    console.log('❌ loadAppetiteConfigs: No organization found');
    return [];
  }

  console.log('🔍 loadAppetiteConfigs: Loading for org:', orgId);

  const { data, error } = await supabase
    .from('risk_appetite_config')
    .select('*')
    .eq('organization_id', orgId)
    .order('category', { ascending: true });

  if (error) {
    console.error('❌ loadAppetiteConfigs: Error:', error);
    throw new Error(`Failed to load appetite configs: ${error.message}`);
  }

  console.log(`✅ loadAppetiteConfigs: Loaded ${data?.length || 0} configs`);
  return data || [];
}

/**
 * Load active appetite configuration for a specific category
 */
export async function loadActiveAppetiteConfig(category: string): Promise<RiskAppetiteConfig | null> {
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    console.log('❌ loadActiveAppetiteConfig: No organization found');
    return null;
  }

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('risk_appetite_config')
    .select('*')
    .eq('organization_id', orgId)
    .eq('category', category)
    .lte('effective_from', today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('❌ loadActiveAppetiteConfig: Error:', error);
    throw new Error(`Failed to load active appetite config: ${error.message}`);
  }

  return data;
}

/**
 * Create or update appetite configuration
 */
export async function saveAppetiteConfig(
  config: Omit<RiskAppetiteConfig, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
): Promise<RiskAppetiteConfig> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const orgId = await getUserOrganizationId();
  if (!orgId) {
    throw new Error('No organization found for user');
  }

  console.log('💾 saveAppetiteConfig: Saving config for category:', config.category);

  const configData = {
    organization_id: orgId,
    category: config.category,
    appetite_threshold: config.appetite_threshold,
    tolerance_min: config.tolerance_min,
    tolerance_max: config.tolerance_max,
    rationale: config.rationale,
    approved_by: config.approved_by || user.id,
    approved_at: config.approved_at || new Date().toISOString(),
    effective_from: config.effective_from,
    effective_to: config.effective_to,
  };

  const { data, error } = await supabase
    .from('risk_appetite_config')
    .insert(configData)
    .select()
    .single();

  if (error) {
    console.error('❌ saveAppetiteConfig: Error:', error);
    throw new Error(`Failed to save appetite config: ${error.message}`);
  }

  console.log('✅ saveAppetiteConfig: Config saved:', data.id);
  return data;
}

/**
 * Update existing appetite configuration
 */
export async function updateAppetiteConfig(
  id: string,
  updates: Partial<Omit<RiskAppetiteConfig, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>
): Promise<RiskAppetiteConfig> {
  console.log('💾 updateAppetiteConfig: Updating config:', id);

  const { data, error } = await supabase
    .from('risk_appetite_config')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ updateAppetiteConfig: Error:', error);
    throw new Error(`Failed to update appetite config: ${error.message}`);
  }

  console.log('✅ updateAppetiteConfig: Config updated');
  return data;
}

/**
 * Delete appetite configuration
 */
export async function deleteAppetiteConfig(id: string): Promise<void> {
  console.log('🗑️ deleteAppetiteConfig: Deleting config:', id);

  const { error } = await supabase
    .from('risk_appetite_config')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ deleteAppetiteConfig: Error:', error);
    throw new Error(`Failed to delete appetite config: ${error.message}`);
  }

  console.log('✅ deleteAppetiteConfig: Config deleted');
}

// =====================================================
// APPETITE EXCEPTIONS CRUD OPERATIONS
// =====================================================

/**
 * Load all appetite exceptions for the user's organization
 */
export async function loadAppetiteExceptions(status?: string): Promise<RiskAppetiteException[]> {
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    console.log('❌ loadAppetiteExceptions: No organization found');
    return [];
  }

  console.log('🔍 loadAppetiteExceptions: Loading for org:', orgId);

  let query = supabase
    .from('risk_appetite_exceptions')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ loadAppetiteExceptions: Error:', error);
    throw new Error(`Failed to load appetite exceptions: ${error.message}`);
  }

  console.log(`✅ loadAppetiteExceptions: Loaded ${data?.length || 0} exceptions`);
  return data || [];
}

/**
 * Load exception for a specific risk
 */
export async function loadExceptionForRisk(riskId: string): Promise<RiskAppetiteException | null> {
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    console.log('❌ loadExceptionForRisk: No organization found');
    return null;
  }

  const { data, error } = await supabase
    .from('risk_appetite_exceptions')
    .select('*')
    .eq('organization_id', orgId)
    .eq('risk_id', riskId)
    .eq('status', 'approved')
    .maybeSingle();

  if (error) {
    console.error('❌ loadExceptionForRisk: Error:', error);
    throw new Error(`Failed to load exception for risk: ${error.message}`);
  }

  return data;
}

/**
 * Create appetite exception
 */
export async function createAppetiteException(
  exception: Omit<RiskAppetiteException, 'id' | 'organization_id' | 'created_by' | 'created_at' | 'updated_at'>
): Promise<RiskAppetiteException> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const orgId = await getUserOrganizationId();
  if (!orgId) {
    throw new Error('No organization found for user');
  }

  console.log('💾 createAppetiteException: Creating exception for risk:', exception.risk_id);

  const exceptionData = {
    organization_id: orgId,
    created_by: user.id,
    ...exception,
  };

  const { data, error } = await supabase
    .from('risk_appetite_exceptions')
    .insert(exceptionData)
    .select()
    .single();

  if (error) {
    console.error('❌ createAppetiteException: Error:', error);
    throw new Error(`Failed to create appetite exception: ${error.message}`);
  }

  console.log('✅ createAppetiteException: Exception created:', data.id);
  return data;
}

/**
 * Update appetite exception (for approval/rejection)
 */
export async function updateAppetiteException(
  id: string,
  updates: Partial<Pick<RiskAppetiteException, 'status' | 'approved_by' | 'approved_at' | 'notes' | 'review_date'>>
): Promise<RiskAppetiteException> {
  console.log('💾 updateAppetiteException: Updating exception:', id);

  const { data, error } = await supabase
    .from('risk_appetite_exceptions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ updateAppetiteException: Error:', error);
    throw new Error(`Failed to update appetite exception: ${error.message}`);
  }

  console.log('✅ updateAppetiteException: Exception updated');
  return data;
}

/**
 * Approve appetite exception (admin only)
 */
export async function approveAppetiteException(id: string, notes?: string): Promise<RiskAppetiteException> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return updateAppetiteException(id, {
    status: 'approved',
    approved_by: user.id,
    approved_at: new Date().toISOString(),
    notes,
  });
}

/**
 * Reject appetite exception (admin only)
 */
export async function rejectAppetiteException(id: string, notes?: string): Promise<RiskAppetiteException> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return updateAppetiteException(id, {
    status: 'rejected',
    approved_by: user.id,
    approved_at: new Date().toISOString(),
    notes,
  });
}

/**
 * Delete appetite exception
 */
export async function deleteAppetiteException(id: string): Promise<void> {
  console.log('🗑️ deleteAppetiteException: Deleting exception:', id);

  const { error } = await supabase
    .from('risk_appetite_exceptions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ deleteAppetiteException: Error:', error);
    throw new Error(`Failed to delete appetite exception: ${error.message}`);
  }

  console.log('✅ deleteAppetiteException: Exception deleted');
}

// =====================================================
// APPETITE UTILIZATION CALCULATIONS
// =====================================================

/**
 * Calculate current appetite utilization
 * - Admins: See organization-wide data
 * - Regular users: See only their own risks
 */
export async function calculateAppetiteUtilization(): Promise<AppetiteUtilization> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    throw new Error('No user profile found');
  }

  const isAdmin = profile.role === 'admin';

  console.log(`🔍 calculateAppetiteUtilization: ${isAdmin ? 'ADMIN - org-wide' : 'USER - personal only'}`);

  // Call appropriate PostgreSQL function based on role
  let data, error;

  if (isAdmin) {
    // Admin: Organization-wide view
    const result = await supabase.rpc('calculate_appetite_utilization', {
      org_id: profile.organization_id
    });
    data = result.data;
    error = result.error;
  } else {
    // Regular user: Personal view only
    const result = await supabase.rpc('calculate_appetite_utilization_user', {
      target_user_id: user.id
    });
    data = result.data;
    error = result.error;
  }

  if (error) {
    console.error('❌ calculateAppetiteUtilization: Error:', error);
    throw new Error(`Failed to calculate appetite utilization: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.log('⚠️ calculateAppetiteUtilization: No data returned');
    return {
      total_risks: 0,
      risks_within_appetite: 0,
      risks_over_appetite: 0,
      avg_score: 0,
      utilization: 0,
    };
  }

  const result = data[0];
  console.log('✅ calculateAppetiteUtilization: Result:', result);

  return {
    total_risks: result.total_risks,
    risks_within_appetite: result.risks_within_appetite,
    risks_over_appetite: result.risks_over_appetite,
    avg_score: result.avg_score,
    utilization: result.utilization,
  };
}

/**
 * Generate and save daily appetite snapshot
 */
export async function generateAppetiteSnapshot(): Promise<void> {
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    throw new Error('No organization found for user');
  }

  console.log('💾 generateAppetiteSnapshot: Generating snapshot for org:', orgId);

  const { error } = await supabase
    .rpc('generate_appetite_snapshot', { org_id: orgId });

  if (error) {
    console.error('❌ generateAppetiteSnapshot: Error:', error);
    throw new Error(`Failed to generate appetite snapshot: ${error.message}`);
  }

  console.log('✅ generateAppetiteSnapshot: Snapshot generated');
}

// =====================================================
// APPETITE HISTORY
// =====================================================

/**
 * Load appetite history for the organization
 */
export async function loadAppetiteHistory(limit: number = 30): Promise<RiskAppetiteHistory[]> {
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    console.log('❌ loadAppetiteHistory: No organization found');
    return [];
  }

  console.log('🔍 loadAppetiteHistory: Loading history for org:', orgId);

  const { data, error } = await supabase
    .from('risk_appetite_history')
    .select('*')
    .eq('organization_id', orgId)
    .order('snapshot_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ loadAppetiteHistory: Error:', error);
    throw new Error(`Failed to load appetite history: ${error.message}`);
  }

  console.log(`✅ loadAppetiteHistory: Loaded ${data?.length || 0} history records`);
  return data || [];
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Check if a risk exceeds appetite threshold
 * Note: "Exceeds" means beyond tolerance_max, not just above appetite_threshold
 * Risks between appetite_threshold and tolerance_max are still acceptable
 */
export async function checkRiskExceedsAppetite(
  riskScore: number,
  category: string
): Promise<boolean> {
  const config = await loadActiveAppetiteConfig(category);

  if (!config) {
    // If no config exists, use default tolerance_max of 18
    return riskScore > 18;
  }

  return riskScore > config.tolerance_max;
}

/**
 * Get appetite status for a risk
 */
export async function getRiskAppetiteStatus(
  riskScore: number,
  category: string
): Promise<'within' | 'tolerance' | 'exceeded'> {
  const config = await loadActiveAppetiteConfig(category);

  if (!config) {
    // If no config exists, use default thresholds: appetite=15, tolerance=18
    if (riskScore <= 15) return 'within';
    if (riskScore <= 18) return 'tolerance';
    return 'exceeded';
  }

  if (riskScore <= config.appetite_threshold) {
    return 'within';
  } else if (riskScore <= config.tolerance_max) {
    return 'tolerance';
  } else {
    return 'exceeded';
  }
}

/**
 * Get default appetite thresholds for common categories
 */
export function getDefaultAppetiteThresholds(): Record<string, { threshold: number; min: number; max: number; rationale: string }> {
  return {
    'Strategic': {
      threshold: 12,
      min: 10,
      max: 15,
      rationale: 'Moderate appetite for strategic risks aligned with growth objectives',
    },
    'Operational': {
      threshold: 10,
      min: 8,
      max: 12,
      rationale: 'Lower appetite for operational risks to ensure business continuity',
    },
    'Financial': {
      threshold: 15,
      min: 12,
      max: 18,
      rationale: 'Higher appetite for financial risks given market opportunities',
    },
    'Compliance': {
      threshold: 6,
      min: 4,
      max: 8,
      rationale: 'Very low appetite for compliance risks to avoid regulatory penalties',
    },
    'Reputational': {
      threshold: 8,
      min: 6,
      max: 10,
      rationale: 'Low appetite for reputational risks given brand importance',
    },
    'Cyber': {
      threshold: 8,
      min: 6,
      max: 10,
      rationale: 'Low appetite for cyber risks given increasing threat landscape',
    },
  };
}
