// src/lib/incidents.ts
// Database operations for Incidents (ERM Module)

import { supabase } from './supabase';
import { getUserOrganizationId } from './database';

// =====================================================
// TYPES
// =====================================================

export type IncidentType = 'Loss Event' | 'Near Miss' | 'Control Failure' | 'Breach' | 'Other';
export type IncidentStatus = 'Reported' | 'Under Investigation' | 'Resolved' | 'Closed';

export type Incident = {
  id: string;
  organization_id: string;
  user_id: string;

  // Identification
  incident_code: string;
  title: string;
  description: string;

  // Details
  incident_date: string; // ISO timestamp
  reported_by: string;
  reporter_email?: string;
  division?: string;
  department?: string;

  // Classification
  incident_type: IncidentType;
  severity: number; // 1-5

  // Impact
  financial_impact?: number;
  impact_description?: string;

  // Status
  status: IncidentStatus;
  root_cause?: string;
  corrective_actions?: string;

  // Risk Linkage
  linked_risk_codes: string[];
  ai_suggested_risks: AISuggestedRisk[];
  ai_control_recommendations: AIControlRecommendation;
  manual_risk_links: string[];

  // Timestamps
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
};

export type AISuggestedRisk = {
  risk_code: string;
  risk_title: string;
  confidence: number; // 0-1
  reasoning: string;
  status?: 'pending' | 'accepted' | 'rejected';
};

export type AIControlRecommendation = {
  adequacy_assessment?: 'Adequate' | 'Partially Adequate' | 'Inadequate';
  reasoning?: string;
  dime_adjustments?: Array<{
    control_id: string;
    dimension: 'design' | 'implementation' | 'monitoring' | 'effectiveness_evaluation';
    current: number;
    suggested: number;
    reason: string;
  }>;
  suggested_controls?: Array<{
    description: string;
    type: 'Preventive' | 'Detective' | 'Corrective';
    target: 'Likelihood' | 'Impact';
  }>;
  priority?: 'High' | 'Medium' | 'Low';
  analyzed_at?: string;
};

export type IncidentFormData = Omit<Incident, 'id' | 'organization_id' | 'user_id' | 'incident_code' | 'created_at' | 'updated_at'>;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Generate incident code with timestamp-based uniqueness (INC-XXX-YYYYYYZZ)
 * Format: INC-XXX-YYYYYYZZ where:
 * - XXX: Sequential number (001, 002, etc.)
 * - YYYYYY: Last 6 digits of timestamp (microsecond precision)
 * - ZZ: 2-digit random number
 * This prevents duplicate key errors during concurrent incident creation.
 */
async function generateIncidentCode(orgId: string): Promise<string> {
  const { data, error } = await supabase
    .from('incidents')
    .select('incident_code')
    .eq('organization_id', orgId);

  if (error) {
    console.error('Error fetching incident codes:', error);
    return 'INC-001-' + generateUniqueSuffix();
  }

  // Find the highest INC number for sequential prefix
  const incNumbers = data
    ?.map(r => {
      const match = r.incident_code.match(/^INC-(\d+)/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter(n => n > 0) || [];

  const nextIncNumber = incNumbers.length > 0 ? Math.max(...incNumbers) + 1 : 1;

  // Generate unique suffix to prevent collisions in concurrent operations
  const uniqueSuffix = generateUniqueSuffix();

  return `INC-${String(nextIncNumber).padStart(3, '0')}-${uniqueSuffix}`;
}

/**
 * Generate a unique suffix using timestamp + random number
 * Returns format: YYYYYYZZ (8 characters)
 */
function generateUniqueSuffix(): string {
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0'); // 2-digit random
  return `${timestamp}${random}`;
}

// =====================================================
// CRUD OPERATIONS
// =====================================================

/**
 * Load all incidents for current user's organization
 */
export async function loadIncidents(): Promise<{ data: Incident[] | null; error: any }> {
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    return { data: null, error: { message: 'No organization found' } };
  }

  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('organization_id', orgId)
    .order('incident_date', { ascending: false });

  if (error) {
    console.error('Error loading incidents:', error);
    return { data: null, error };
  }

  return { data: data as Incident[], error: null };
}

/**
 * Load single incident by ID
 */
export async function loadIncident(incidentId: string): Promise<{ data: Incident | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', incidentId)
      .single();

    if (error) {
      console.error('Error loading incident:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return { data: null, error };
    }

    if (!data) {
      console.error('No incident found with ID:', incidentId);
      return { data: null, error: { message: 'Incident not found' } };
    }

    return { data: data as Incident, error: null };
  } catch (err) {
    console.error('Unexpected error in loadIncident:', err);
    return { data: null, error: err };
  }
}

/**
 * Create new incident
 */
export async function createIncident(incidentData: Partial<IncidentFormData>): Promise<{ data: Incident | null; error: any }> {
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    return { data: null, error: { message: 'No organization found' } };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: { message: 'No user authenticated' } };
  }

  // Generate incident code
  const incidentCode = await generateIncidentCode(orgId);

  const newIncident = {
    organization_id: orgId,
    user_id: user.id,
    incident_code: incidentCode,
    title: incidentData.title || '',
    description: incidentData.description || '',
    incident_date: incidentData.incident_date || new Date().toISOString(),
    reported_by: incidentData.reported_by || user.email || 'Unknown',
    reporter_email: incidentData.reporter_email || user.email,
    division: incidentData.division || '',
    department: incidentData.department || '',
    incident_type: incidentData.incident_type || 'Other',
    severity: incidentData.severity || 3,
    financial_impact: incidentData.financial_impact || null,
    impact_description: incidentData.impact_description || '',
    status: incidentData.status || 'Reported',
    root_cause: incidentData.root_cause || '',
    corrective_actions: incidentData.corrective_actions || '',
    linked_risk_codes: incidentData.linked_risk_codes || [],
    ai_suggested_risks: incidentData.ai_suggested_risks || [],
    ai_control_recommendations: incidentData.ai_control_recommendations || {},
    manual_risk_links: incidentData.manual_risk_links || [],
  };

  const { data, error } = await supabase
    .from('incidents')
    .insert(newIncident)
    .select()
    .single();

  if (error) {
    console.error('Error creating incident:', error);
    return { data: null, error };
  }

  return { data: data as Incident, error: null };
}

/**
 * Update existing incident
 */
export async function updateIncident(incidentId: string, updates: Partial<Incident>): Promise<{ data: Incident | null; error: any }> {
  // Remove fields that shouldn't be updated
  const { id, organization_id, user_id, incident_code, created_at, ...updateData } = updates as any;

  const { data, error } = await supabase
    .from('incidents')
    .update(updateData)
    .eq('id', incidentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating incident:', error);
    return { data: null, error };
  }

  return { data: data as Incident, error: null };
}

/**
 * Delete incident
 */
export async function deleteIncident(incidentId: string): Promise<{ success: boolean; error: any }> {
  const { error } = await supabase
    .from('incidents')
    .delete()
    .eq('id', incidentId);

  if (error) {
    console.error('Error deleting incident:', error);
    return { success: false, error };
  }

  return { success: true, error: null };
}

// =====================================================
// RISK LINKING OPERATIONS
// =====================================================

/**
 * Link incident to risk(s)
 */
export async function linkIncidentToRisks(incidentId: string, riskCodes: string[]): Promise<{ success: boolean; error: any }> {
  try {
    // First get current incident
    const { data: incident, error: fetchError } = await loadIncident(incidentId);
    if (fetchError || !incident) {
      console.error('Failed to load incident:', fetchError);
      return { success: false, error: fetchError };
    }

    console.log('Current incident:', incident);
    console.log('Risk codes to add:', riskCodes);

    // Merge with existing risk codes (avoid duplicates)
    const updatedRiskCodes = Array.from(new Set([...incident.linked_risk_codes, ...riskCodes]));
    console.log('Updated risk codes:', updatedRiskCodes);

    const { data, error } = await supabase
      .from('incidents')
      .update({ linked_risk_codes: updatedRiskCodes })
      .eq('id', incidentId)
      .select()
      .single();

    if (error) {
      console.error('Error linking incident to risks:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return { success: false, error };
    }

    console.log('Successfully linked. Updated incident:', data);
    return { success: true, error: null };
  } catch (err) {
    console.error('Unexpected error in linkIncidentToRisks:', err);
    return { success: false, error: err };
  }
}

/**
 * Unlink incident from risk
 */
export async function unlinkIncidentFromRisk(incidentId: string, riskCode: string): Promise<{ success: boolean; error: any }> {
  try {
    console.log('Unlinking risk:', riskCode, 'from incident:', incidentId);

    const { data: incident, error: fetchError } = await loadIncident(incidentId);
    if (fetchError || !incident) {
      console.error('Failed to load incident for unlinking:', fetchError);
      return { success: false, error: fetchError };
    }

    console.log('Current linked risk codes:', incident.linked_risk_codes);
    const updatedRiskCodes = incident.linked_risk_codes.filter(code => code !== riskCode);
    console.log('Updated risk codes after removal:', updatedRiskCodes);

    const { data, error } = await supabase
      .from('incidents')
      .update({ linked_risk_codes: updatedRiskCodes })
      .eq('id', incidentId)
      .select()
      .single();

    if (error) {
      console.error('Error unlinking incident from risk:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return { success: false, error };
    }

    console.log('Successfully unlinked. Updated incident:', data);
    return { success: true, error: null };
  } catch (err) {
    console.error('Unexpected error in unlinkIncidentFromRisk:', err);
    return { success: false, error: err };
  }
}

/**
 * Update AI suggested risks for incident
 */
export async function updateAISuggestedRisks(incidentId: string, suggestions: AISuggestedRisk[]): Promise<{ success: boolean; error: any }> {
  const { error } = await supabase
    .from('incidents')
    .update({ ai_suggested_risks: suggestions })
    .eq('id', incidentId);

  if (error) {
    console.error('Error updating AI suggested risks:', error);
    return { success: false, error };
  }

  return { success: true, error: null };
}

/**
 * Update AI control recommendations for incident
 */
export async function updateAIControlRecommendations(incidentId: string, recommendations: AIControlRecommendation): Promise<{ success: boolean; error: any }> {
  const { error } = await supabase
    .from('incidents')
    .update({
      ai_control_recommendations: {
        ...recommendations,
        analyzed_at: new Date().toISOString(),
      }
    })
    .eq('id', incidentId);

  if (error) {
    console.error('Error updating AI control recommendations:', error);
    return { success: false, error };
  }

  return { success: true, error: null };
}

/**
 * Accept AI suggested risk (move from suggested to linked)
 */
export async function acceptAISuggestedRisk(incidentId: string, riskCode: string): Promise<{ success: boolean; error: any }> {
  const { data: incident, error: fetchError } = await loadIncident(incidentId);
  if (fetchError || !incident) {
    return { success: false, error: fetchError };
  }

  // Update AI suggestion status
  const updatedSuggestions = incident.ai_suggested_risks.map(sugg =>
    sugg.risk_code === riskCode ? { ...sugg, status: 'accepted' as const } : sugg
  );

  // Add to linked risks
  const updatedRiskCodes = Array.from(new Set([...incident.linked_risk_codes, riskCode]));

  const { error } = await supabase
    .from('incidents')
    .update({
      ai_suggested_risks: updatedSuggestions,
      linked_risk_codes: updatedRiskCodes,
    })
    .eq('id', incidentId);

  if (error) {
    console.error('Error accepting AI suggested risk:', error);
    return { success: false, error };
  }

  return { success: true, error: null };
}

/**
 * Reject AI suggested risk
 */
export async function rejectAISuggestedRisk(incidentId: string, riskCode: string): Promise<{ success: boolean; error: any }> {
  const { data: incident, error: fetchError } = await loadIncident(incidentId);
  if (fetchError || !incident) {
    return { success: false, error: fetchError };
  }

  const updatedSuggestions = incident.ai_suggested_risks.map(sugg =>
    sugg.risk_code === riskCode ? { ...sugg, status: 'rejected' as const } : sugg
  );

  const { error } = await supabase
    .from('incidents')
    .update({ ai_suggested_risks: updatedSuggestions })
    .eq('id', incidentId);

  if (error) {
    console.error('Error rejecting AI suggested risk:', error);
    return { success: false, error };
  }

  return { success: true, error: null };
}

// =====================================================
// ANALYTICS & QUERIES
// =====================================================

/**
 * Get incidents for a specific risk
 */
export async function getIncidentsForRisk(riskCode: string): Promise<{ data: Incident[] | null; error: any }> {
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    return { data: null, error: { message: 'No organization found' } };
  }

  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('organization_id', orgId)
    .contains('linked_risk_codes', [riskCode])
    .order('incident_date', { ascending: false });

  if (error) {
    console.error('Error fetching incidents for risk:', error);
    return { data: null, error };
  }

  return { data: data as Incident[], error: null };
}

/**
 * Get incident statistics
 */
export async function getIncidentStatistics(): Promise<{
  data: {
    total: number;
    by_status: Record<IncidentStatus, number>;
    by_type: Record<IncidentType, number>;
    by_severity: Record<number, number>;
    total_financial_impact: number;
    recent_incidents: Incident[];
  } | null;
  error: any;
}> {
  const { data: incidents, error } = await loadIncidents();

  if (error || !incidents) {
    return { data: null, error };
  }

  const stats = {
    total: incidents.length,
    by_status: {} as Record<IncidentStatus, number>,
    by_type: {} as Record<IncidentType, number>,
    by_severity: {} as Record<number, number>,
    total_financial_impact: 0,
    recent_incidents: incidents.slice(0, 5),
  };

  incidents.forEach(incident => {
    // Status
    stats.by_status[incident.status] = (stats.by_status[incident.status] || 0) + 1;

    // Type
    stats.by_type[incident.incident_type] = (stats.by_type[incident.incident_type] || 0) + 1;

    // Severity
    stats.by_severity[incident.severity] = (stats.by_severity[incident.severity] || 0) + 1;

    // Financial impact
    if (incident.financial_impact) {
      stats.total_financial_impact += incident.financial_impact;
    }
  });

  return { data: stats, error: null };
}

/**
 * Log AI analysis for audit trail
 */
export async function logAIAnalysis(params: {
  analysis_type: 'incident_risk_linking' | 'control_adequacy' | 'control_suggestion' | 'risk_generation';
  entity_type?: string;
  entity_id?: string;
  entity_code?: string;
  prompt_sent?: string;
  ai_response?: any;
  model_used?: string;
  user_action?: 'accepted' | 'rejected' | 'modified';
  user_feedback?: string;
  processing_time_ms?: number;
}): Promise<{ success: boolean; error: any }> {
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    return { success: false, error: { message: 'No organization found' } };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: { message: 'No user authenticated' } };
  }

  const { error } = await supabase
    .from('ai_analysis_log')
    .insert({
      organization_id: orgId,
      user_id: user.id,
      ...params,
    });

  if (error) {
    console.error('Error logging AI analysis:', error);
    return { success: false, error };
  }

  return { success: true, error: null };
}
