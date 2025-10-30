// src/lib/kri.ts
// Backend functions for Key Risk Indicators (KRI) Module (Phase 5B)

import { supabase } from './supabase';
import { getUserOrganizationId, loadRisks, type RiskRow } from './database';
import { askClaude } from './ai';

// =====================================================
// TYPES
// =====================================================

export type KRIDefinition = {
  id: string;
  organization_id: string;
  kri_code: string;
  kri_name: string;
  description?: string;
  category?: string;
  linked_risk_code?: string;
  indicator_type: 'leading' | 'lagging' | 'concurrent';
  measurement_unit: string;
  data_source?: string;
  collection_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  responsible_user?: string;
  target_value?: number;
  lower_threshold?: number;
  upper_threshold?: number;
  threshold_direction: 'above' | 'below' | 'between';
  enabled: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // AI-powered risk linking fields
  linked_risk_code?: string | null;
  ai_link_confidence?: number | null;
  linked_at?: string | null;
  linked_by?: string | null;
};

export type KRIDataEntry = {
  id: string;
  kri_id: string;
  organization_id: string;
  measurement_date: string;
  measurement_value: number;
  notes?: string;
  data_quality?: 'verified' | 'estimated' | 'provisional';
  alert_status?: 'green' | 'yellow' | 'red' | null;
  entered_at: string;
  entered_by?: string;
};

export type KRIAlert = {
  id: string;
  kri_id: string;
  data_entry_id?: string;
  organization_id: string;
  alert_level: 'yellow' | 'red';
  alert_date: string;
  measured_value: number;
  threshold_breached: number;
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolution_notes?: string;
  resolved_at?: string;
  created_at: string;
};

export type KRIComment = {
  id: string;
  kri_id: string;
  organization_id: string;
  comment_text: string;
  created_by: string;
  created_at: string;
};

export type KRIPerformanceMetrics = {
  kri_id: string;
  kri_code: string;
  kri_name: string;
  latest_value?: number;
  latest_date?: string;
  previous_value?: number;
  trend: 'up' | 'down' | 'stable';
  percent_change?: number;
  alert_status?: 'green' | 'yellow' | 'red' | null;
  days_since_last_entry?: number;
};

export type KRITrendData = {
  measurement_date: string;
  measurement_value: number;
  alert_status?: string;
};

export type KRIDashboardSummary = {
  totalKRIs: number;
  activeKRIs: number;
  openAlerts: number;
  redAlerts: number;
  yellowAlerts: number;
  greenKRIs: number;
  atRiskKRIs: number;
  staleKRIs: number;
};

// =====================================================
// KRI DEFINITIONS CRUD OPERATIONS
// =====================================================

/**
 * Load all KRI definitions for the user's organization
 */
export async function loadKRIDefinitions(includeDisabled: boolean = false): Promise<KRIDefinition[]> {
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    console.log('❌ loadKRIDefinitions: No organization found');
    return [];
  }

  console.log('🔍 loadKRIDefinitions: Loading for org:', orgId);

  let query = supabase
    .from('kri_definitions')
    .select('*')
    .eq('organization_id', orgId)
    .order('kri_code', { ascending: true });

  if (!includeDisabled) {
    query = query.eq('enabled', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ loadKRIDefinitions: Error:', error);
    throw new Error(`Failed to load KRI definitions: ${error.message}`);
  }

  console.log(`✅ loadKRIDefinitions: Loaded ${data?.length || 0} KRIs`);
  return data || [];
}

/**
 * Load a single KRI definition by ID
 */
export async function loadKRIDefinition(id: string): Promise<KRIDefinition | null> {
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    console.log('❌ loadKRIDefinition: No organization found');
    return null;
  }

  const { data, error } = await supabase
    .from('kri_definitions')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .maybeSingle();

  if (error) {
    console.error('❌ loadKRIDefinition: Error:', error);
    throw new Error(`Failed to load KRI definition: ${error.message}`);
  }

  return data;
}

/**
 * Load KRIs by risk category
 */
export async function loadKRIsByCategory(category: string): Promise<KRIDefinition[]> {
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    console.log('❌ loadKRIsByCategory: No organization found');
    return [];
  }

  const { data, error } = await supabase
    .from('kri_definitions')
    .select('*')
    .eq('organization_id', orgId)
    .eq('risk_category', category)
    .eq('enabled', true)
    .order('kri_code', { ascending: true });

  if (error) {
    console.error('❌ loadKRIsByCategory: Error:', error);
    throw new Error(`Failed to load KRIs by category: ${error.message}`);
  }

  return data || [];
}

/**
 * Create a new KRI definition
 */
export async function createKRIDefinition(
  kri: Omit<KRIDefinition, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
): Promise<KRIDefinition> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const orgId = await getUserOrganizationId();
  if (!orgId) {
    throw new Error('No organization found for user');
  }

  console.log('💾 createKRIDefinition: Creating KRI:', kri.kri_code);

  const kriData = {
    organization_id: orgId,
    created_by: user.id,
    ...kri,
  };

  const { data, error } = await supabase
    .from('kri_definitions')
    .insert(kriData)
    .select()
    .single();

  if (error) {
    console.error('❌ createKRIDefinition: Error:', error);
    throw new Error(`Failed to create KRI definition: ${error.message}`);
  }

  console.log('✅ createKRIDefinition: KRI created:', data.id);
  return data;
}

/**
 * Update existing KRI definition
 */
export async function updateKRIDefinition(
  id: string,
  updates: Partial<Omit<KRIDefinition, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>
): Promise<KRIDefinition> {
  console.log('💾 updateKRIDefinition: Updating KRI:', id);

  const { data, error } = await supabase
    .from('kri_definitions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ updateKRIDefinition: Error:', error);
    throw new Error(`Failed to update KRI definition: ${error.message}`);
  }

  console.log('✅ updateKRIDefinition: KRI updated');
  return data;
}

/**
 * Delete KRI definition
 */
export async function deleteKRIDefinition(id: string): Promise<void> {
  console.log('🗑️ deleteKRIDefinition: Deleting KRI:', id);

  const { error } = await supabase
    .from('kri_definitions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ deleteKRIDefinition: Error:', error);
    throw new Error(`Failed to delete KRI definition: ${error.message}`);
  }

  console.log('✅ deleteKRIDefinition: KRI deleted');
}

// =====================================================
// KRI DATA ENTRIES CRUD OPERATIONS
// =====================================================

/**
 * Load data entries for a specific KRI
 */
export async function loadKRIData(kriId: string, limit: number = 90): Promise<KRIDataEntry[]> {
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    console.log('❌ loadKRIData: No organization found');
    return [];
  }

  const { data, error } = await supabase
    .from('kri_data_entries')
    .select('*')
    .eq('kri_id', kriId)
    .eq('organization_id', orgId)
    .order('measurement_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ loadKRIData: Error:', error);
    throw new Error(`Failed to load KRI data: ${error.message}`);
  }

  return data || [];
}

/**
 * Load all recent data entries across all KRIs
 */
export async function loadAllKRIData(daysBack: number = 30): Promise<KRIDataEntry[]> {
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    console.log('❌ loadAllKRIData: No organization found');
    return [];
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  const cutoff = cutoffDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('kri_data_entries')
    .select('*')
    .eq('organization_id', orgId)
    .gte('measurement_date', cutoff)
    .order('measurement_date', { ascending: false });

  if (error) {
    console.error('❌ loadAllKRIData: Error:', error);
    throw new Error(`Failed to load all KRI data: ${error.message}`);
  }

  return data || [];
}

/**
 * Create a new KRI data entry
 */
export async function createKRIDataEntry(
  entry: Omit<KRIDataEntry, 'id' | 'organization_id' | 'alert_status' | 'entered_at' | 'entered_by'>
): Promise<KRIDataEntry> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const orgId = await getUserOrganizationId();
  if (!orgId) {
    throw new Error('No organization found for user');
  }

  console.log('💾 createKRIDataEntry: Creating data entry for KRI:', entry.kri_id);

  const entryData = {
    organization_id: orgId,
    entered_by: user.id,
    ...entry,
  };

  const { data, error } = await supabase
    .from('kri_data_entries')
    .insert(entryData)
    .select()
    .single();

  if (error) {
    console.error('❌ createKRIDataEntry: Error:', error);
    throw new Error(`Failed to create KRI data entry: ${error.message}`);
  }

  console.log('✅ createKRIDataEntry: Data entry created:', data.id);
  return data;
}

/**
 * Update existing KRI data entry
 */
export async function updateKRIDataEntry(
  id: string,
  updates: Partial<Pick<KRIDataEntry, 'measurement_value' | 'notes' | 'data_quality'>>
): Promise<KRIDataEntry> {
  console.log('💾 updateKRIDataEntry: Updating data entry:', id);

  const { data, error } = await supabase
    .from('kri_data_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ updateKRIDataEntry: Error:', error);
    throw new Error(`Failed to update KRI data entry: ${error.message}`);
  }

  console.log('✅ updateKRIDataEntry: Data entry updated');
  return data;
}

/**
 * Delete KRI data entry
 */
export async function deleteKRIDataEntry(id: string): Promise<void> {
  console.log('🗑️ deleteKRIDataEntry: Deleting data entry:', id);

  const { error } = await supabase
    .from('kri_data_entries')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ deleteKRIDataEntry: Error:', error);
    throw new Error(`Failed to delete KRI data entry: ${error.message}`);
  }

  console.log('✅ deleteKRIDataEntry: Data entry deleted');
}

// =====================================================
// KRI ALERTS CRUD OPERATIONS
// =====================================================

/**
 * Load alerts for a specific KRI
 */
export async function loadKRIAlerts(kriId?: string, status?: string): Promise<KRIAlert[]> {
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    console.log('❌ loadKRIAlerts: No organization found');
    return [];
  }

  console.log('🔍 loadKRIAlerts: Loading alerts for org:', orgId);

  let query = supabase
    .from('kri_alerts')
    .select('*')
    .eq('organization_id', orgId)
    .order('alert_date', { ascending: false });

  if (kriId) {
    query = query.eq('kri_id', kriId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ loadKRIAlerts: Error:', error);
    throw new Error(`Failed to load KRI alerts: ${error.message}`);
  }

  console.log(`✅ loadKRIAlerts: Loaded ${data?.length || 0} alerts`);
  return data || [];
}

/**
 * Acknowledge a KRI alert
 */
export async function acknowledgeKRIAlert(id: string, notes?: string): Promise<KRIAlert> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  console.log('💾 acknowledgeKRIAlert: Acknowledging alert:', id);

  const { data, error } = await supabase
    .from('kri_alerts')
    .update({
      status: 'acknowledged',
      acknowledged_by: user.id,
      acknowledged_at: new Date().toISOString(),
      resolution_notes: notes,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ acknowledgeKRIAlert: Error:', error);
    throw new Error(`Failed to acknowledge KRI alert: ${error.message}`);
  }

  console.log('✅ acknowledgeKRIAlert: Alert acknowledged');
  return data;
}

/**
 * Resolve a KRI alert
 */
export async function resolveKRIAlert(id: string, notes: string): Promise<KRIAlert> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  console.log('💾 resolveKRIAlert: Resolving alert:', id);

  const { data, error } = await supabase
    .from('kri_alerts')
    .update({
      status: 'resolved',
      resolution_notes: notes,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ resolveKRIAlert: Error:', error);
    throw new Error(`Failed to resolve KRI alert: ${error.message}`);
  }

  console.log('✅ resolveKRIAlert: Alert resolved');
  return data;
}

/**
 * Dismiss a KRI alert
 */
export async function dismissKRIAlert(id: string, notes?: string): Promise<KRIAlert> {
  console.log('💾 dismissKRIAlert: Dismissing alert:', id);

  const { data, error } = await supabase
    .from('kri_alerts')
    .update({
      status: 'dismissed',
      resolution_notes: notes,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ dismissKRIAlert: Error:', error);
    throw new Error(`Failed to dismiss KRI alert: ${error.message}`);
  }

  console.log('✅ dismissKRIAlert: Alert dismissed');
  return data;
}

// =====================================================
// KRI COMMENTS CRUD OPERATIONS
// =====================================================

/**
 * Load comments for a specific KRI
 */
export async function loadKRIComments(kriId: string): Promise<KRIComment[]> {
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    console.log('❌ loadKRIComments: No organization found');
    return [];
  }

  const { data, error } = await supabase
    .from('kri_comments')
    .select('*')
    .eq('kri_id', kriId)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ loadKRIComments: Error:', error);
    throw new Error(`Failed to load KRI comments: ${error.message}`);
  }

  return data || [];
}

/**
 * Add a comment to a KRI
 */
export async function addKRIComment(kriId: string, commentText: string): Promise<KRIComment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const orgId = await getUserOrganizationId();
  if (!orgId) {
    throw new Error('No organization found for user');
  }

  console.log('💾 addKRIComment: Adding comment to KRI:', kriId);

  const { data, error } = await supabase
    .from('kri_comments')
    .insert({
      kri_id: kriId,
      organization_id: orgId,
      comment_text: commentText,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ addKRIComment: Error:', error);
    throw new Error(`Failed to add KRI comment: ${error.message}`);
  }

  console.log('✅ addKRIComment: Comment added');
  return data;
}

// =====================================================
// KRI ANALYTICS & CALCULATIONS
// =====================================================

/**
 * Get performance metrics for all KRIs
 */
export async function getKRIPerformanceMetrics(): Promise<KRIPerformanceMetrics[]> {
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    throw new Error('No organization found for user');
  }

  console.log('🔍 getKRIPerformanceMetrics: Calculating for org:', orgId);

  // Load all KRI definitions
  const kris = await loadKRIDefinitions();

  // For each KRI, get latest and previous values
  const metrics: KRIPerformanceMetrics[] = [];

  for (const kri of kris) {
    const data = await loadKRIData(kri.id, 2);

    if (data.length === 0) {
      metrics.push({
        kri_id: kri.id,
        kri_code: kri.kri_code,
        kri_name: kri.kri_name,
        trend: 'stable',
      });
      continue;
    }

    const latest = data[0];
    const previous = data.length > 1 ? data[1] : null;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    let percentChange: number | undefined;

    if (previous) {
      const change = latest.measurement_value - previous.measurement_value;
      percentChange = previous.measurement_value !== 0
        ? (change / previous.measurement_value) * 100
        : undefined;

      if (change > 0) trend = 'up';
      else if (change < 0) trend = 'down';
      else trend = 'stable';
    }

    // Calculate days since last entry
    const daysSince = Math.floor(
      (new Date().getTime() - new Date(latest.measurement_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    metrics.push({
      kri_id: kri.id,
      kri_code: kri.kri_code,
      kri_name: kri.kri_name,
      latest_value: latest.measurement_value,
      latest_date: latest.measurement_date,
      previous_value: previous?.measurement_value,
      trend,
      percent_change: percentChange,
      alert_status: latest.alert_status,
      days_since_last_entry: daysSince,
    });
  }

  console.log(`✅ getKRIPerformanceMetrics: Calculated metrics for ${metrics.length} KRIs`);
  return metrics;
}

/**
 * Get trend data for a specific KRI
 */
export async function getKRITrendData(kriId: string, daysBack: number = 90): Promise<KRITrendData[]> {
  const data = await loadKRIData(kriId, daysBack);

  return data.map(entry => ({
    measurement_date: entry.measurement_date,
    measurement_value: entry.measurement_value,
    alert_status: entry.alert_status || undefined,
  })).reverse(); // Reverse to get chronological order
}

/**
 * Get KRI dashboard summary statistics
 */
export async function getKRIDashboardSummary() {
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    throw new Error('No organization found for user');
  }

  console.log('🔍 getKRIDashboardSummary: Getting summary for org:', orgId);

  const kris = await loadKRIDefinitions();
  const alerts = await loadKRIAlerts();
  const allData = await loadAllKRIData(30);

  // Count KRIs by status
  const totalKRIs = kris.length;
  const activeKRIs = kris.filter(k => k.enabled).length;

  // Count alerts by level and status
  const openAlerts = alerts.filter(a => a.status === 'open').length;
  const redAlerts = alerts.filter(a => a.alert_level === 'red' && a.status === 'open').length;
  const yellowAlerts = alerts.filter(a => a.alert_level === 'yellow' && a.status === 'open').length;

  // Count data entries by alert status
  const greenKRIs = allData.filter(d => d.alert_status === 'green').length;
  const atRiskKRIs = allData.filter(d => d.alert_status === 'yellow' || d.alert_status === 'red').length;

  // KRIs with no recent data
  const recentKriIds = new Set(allData.map(d => d.kri_id));
  const staleKRIs = kris.filter(k => k.enabled && !recentKriIds.has(k.id)).length;

  console.log('✅ getKRIDashboardSummary: Summary calculated');

  return {
    totalKRIs,
    activeKRIs,
    openAlerts,
    redAlerts,
    yellowAlerts,
    greenKRIs,
    atRiskKRIs,
    staleKRIs,
  };
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Generate next KRI code for the organization
 */
export async function generateNextKRICode(): Promise<string> {
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    throw new Error('No organization found for user');
  }

  const kris = await loadKRIDefinitions(true);

  // Extract numeric parts from existing KRI codes
  const maxNum = kris.reduce((max, kri) => {
    const match = kri.kri_code.match(/KRI-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > max ? num : max;
    }
    return max;
  }, 0);

  const nextNum = maxNum + 1;
  return `KRI-${nextNum.toString().padStart(3, '0')}`;
}

/**
 * Validate data entry against collection frequency
 */
export async function canAddDataEntry(kriId: string, measurementDate: string): Promise<{ canAdd: boolean; message?: string }> {
  const kri = await loadKRIDefinition(kriId);
  if (!kri) {
    return { canAdd: false, message: 'KRI not found' };
  }

  // Check if entry already exists for this date
  const existingData = await loadKRIData(kriId, 365);
  const existingEntry = existingData.find(d => d.measurement_date === measurementDate);

  if (existingEntry) {
    return { canAdd: false, message: 'Data entry already exists for this date' };
  }

  // Check frequency constraints
  if (existingData.length > 0) {
    const latestDate = new Date(existingData[0].measurement_date);
    const newDate = new Date(measurementDate);
    const daysDiff = Math.floor((newDate.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));

    const minDaysBetweenEntries: Record<string, number> = {
      daily: 1,
      weekly: 7,
      monthly: 28,
      quarterly: 90,
      annually: 365,
    };

    const minDays = minDaysBetweenEntries[kri.collection_frequency];
    if (Math.abs(daysDiff) < minDays) {
      return { canAdd: false, message: `Data can only be entered ${kri.collection_frequency}. Next entry allowed after ${minDays} days.` };
    }
  }

  return { canAdd: true };
}

/**
 * Export KRI data to CSV format
 */
export function exportKRIDataToCSV(entries: KRIDataEntry[], kriName: string): string {
  const headers = ['Date', 'Value', 'Status', 'Quality', 'Notes'];
  const rows = entries.map(entry => [
    entry.measurement_date,
    entry.measurement_value.toString(),
    entry.alert_status || '',
    entry.data_quality || '',
    entry.notes || '',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csv;
}

// =====================================================
// AI-POWERED KRI-TO-RISK LINKING
// =====================================================

export type RiskSuggestion = {
  risk: RiskRow;
  confidence: number; // 0-100
  reasoning: string;
};

export type KRICoverageAnalysis = {
  risk_id: string;
  risk_code: string;
  risk_title: string;
  risk_category: string | null;
  inherent_likelihood: number | null;
  inherent_impact: number | null;
  kri_count: number;
  linked_kri_codes: string[] | null;
  linked_kri_names: string[] | null;
  coverage_status: 'No Coverage' | 'Basic Coverage' | 'Good Coverage';
};

export type RiskKRIBreach = {
  kri_code: string;
  kri_name: string;
  alert_level: string;
  alert_count: number;
  latest_breach_date: string;
};

/**
 * Use AI to suggest risks that match a KRI
 */
export async function suggestRisksForKRI(kri: KRIDefinition): Promise<RiskSuggestion[]> {
  console.log('🤖 suggestRisksForKRI: Analyzing KRI:', kri.kri_code);

  // Load all risks
  const risks = await loadRisks();
  if (risks.length === 0) {
    console.log('⚠️ No risks found in register');
    return [];
  }

  // Build AI prompt
  const prompt = `You are a risk management expert analyzing Key Risk Indicators (KRIs) and their relationship to organizational risks.

**KRI to Analyze:**
- Code: ${kri.kri_code}
- Name: ${kri.kri_name}
- Description: ${kri.description || 'N/A'}
- Category: ${kri.category || 'N/A'}
- Type: ${kri.indicator_type}
- Unit: ${kri.measurement_unit}
- Frequency: ${kri.collection_frequency}

**Available Risks in Register:**
${risks.slice(0, 50).map(r => `
- ${r.risk_code}: ${r.risk_title}
  Category: ${r.risk_category || 'N/A'}
  Description: ${r.risk_description || 'N/A'}
`).join('\n')}

**Task:**
Analyze which risks from the register this KRI would be most effective at monitoring. Consider:
1. Direct relationship (does the KRI measure something directly related to the risk?)
2. Early warning potential (would the KRI detect risk changes before they materialize?)
3. Category alignment (do they share similar risk domains?)
4. Actionability (would KRI breaches trigger relevant risk responses?)

**Return ONLY a valid JSON array with up to 3 best matches, ordered by relevance:**
[
  {
    "risk_code": "RISK-XXX",
    "confidence": 85,
    "reasoning": "Brief explanation of why this KRI monitors this risk"
  }
]

If no good matches exist, return an empty array: []`;

  try {
    const response = await askClaude(prompt);

    // Parse AI response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log('⚠️ No JSON found in AI response');
      return [];
    }

    const suggestions = JSON.parse(jsonMatch[0]);

    // Map risk codes to full risk objects
    const results: RiskSuggestion[] = suggestions
      .map((s: { risk_code: string; confidence: number; reasoning: string }) => {
        const risk = risks.find(r => r.risk_code === s.risk_code);
        if (!risk) return null;
        return {
          risk,
          confidence: s.confidence,
          reasoning: s.reasoning,
        };
      })
      .filter((s): s is RiskSuggestion => s !== null);

    console.log(`✅ suggestRisksForKRI: Found ${results.length} suggestions`);
    return results;
  } catch (error) {
    console.error('❌ suggestRisksForKRI: Error:', error);
    throw new Error('Failed to analyze KRI for risk suggestions');
  }
}

/**
 * Link a KRI to a risk
 */
export async function linkKRIToRisk(
  kriId: string,
  riskCode: string,
  confidence?: number
): Promise<KRIDefinition> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  console.log('🔗 linkKRIToRisk: Linking KRI', kriId, 'to risk', riskCode);

  const { data, error } = await supabase
    .from('kri_definitions')
    .update({
      linked_risk_code: riskCode,
      ai_link_confidence: confidence,
      linked_at: new Date().toISOString(),
      linked_by: user.id,
    })
    .eq('id', kriId)
    .select()
    .single();

  if (error) {
    console.error('❌ linkKRIToRisk: Error:', error);
    throw new Error(`Failed to link KRI to risk: ${error.message}`);
  }

  console.log('✅ linkKRIToRisk: KRI linked to risk');
  return data;
}

/**
 * Unlink a KRI from its risk
 */
export async function unlinkKRIFromRisk(kriId: string): Promise<KRIDefinition> {
  console.log('🔓 unlinkKRIFromRisk: Unlinking KRI', kriId);

  const { data, error } = await supabase
    .from('kri_definitions')
    .update({
      linked_risk_code: null,
      ai_link_confidence: null,
      linked_at: null,
      linked_by: null,
    })
    .eq('id', kriId)
    .select()
    .single();

  if (error) {
    console.error('❌ unlinkKRIFromRisk: Error:', error);
    throw new Error(`Failed to unlink KRI from risk: ${error.message}`);
  }

  console.log('✅ unlinkKRIFromRisk: KRI unlinked');
  return data;
}

/**
 * Get KRI coverage analysis for all risks
 */
export async function getKRICoverageAnalysis(): Promise<KRICoverageAnalysis[]> {
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    throw new Error('No organization found for user');
  }

  console.log('📊 getKRICoverageAnalysis: Loading coverage analysis');

  const { data, error } = await supabase
    .from('kri_coverage_analysis')
    .select('*')
    .eq('organization_id', orgId)
    .order('kri_count', { ascending: false });

  if (error) {
    console.error('❌ getKRICoverageAnalysis: Error:', error);
    throw new Error(`Failed to load KRI coverage analysis: ${error.message}`);
  }

  console.log(`✅ getKRICoverageAnalysis: Loaded ${data?.length || 0} risks`);
  return data || [];
}

/**
 * Get active KRI breaches for a specific risk
 */
export async function getRiskKRIBreaches(riskCode: string): Promise<RiskKRIBreach[]> {
  console.log('🚨 getRiskKRIBreaches: Loading breaches for risk:', riskCode);

  const { data, error } = await supabase
    .rpc('get_risk_kri_breaches', { p_risk_code: riskCode });

  if (error) {
    console.error('❌ getRiskKRIBreaches: Error:', error);
    throw new Error(`Failed to load risk KRI breaches: ${error.message}`);
  }

  console.log(`✅ getRiskKRIBreaches: Found ${data?.length || 0} breaches`);
  return data || [];
}

/**
 * Get KRIs linked to a specific risk
 */
export async function getKRIsForRisk(riskCode: string): Promise<KRIDefinition[]> {
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    console.log('❌ getKRIsForRisk: No organization found');
    return [];
  }

  console.log('🔍 getKRIsForRisk: Loading KRIs for risk:', riskCode);

  const { data, error } = await supabase
    .from('kri_definitions')
    .select('*')
    .eq('organization_id', orgId)
    .eq('linked_risk_code', riskCode)
    .eq('enabled', true)
    .order('kri_code', { ascending: true });

  if (error) {
    console.error('❌ getKRIsForRisk: Error:', error);
    throw new Error(`Failed to load KRIs for risk: ${error.message}`);
  }

  console.log(`✅ getKRIsForRisk: Found ${data?.length || 0} linked KRIs`);
  return data || [];
}
