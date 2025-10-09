// src/lib/database.ts
// Database operations for MinRisk using Supabase

import { supabase } from './supabase';
import type { RiskRow, Control } from '../App';

// =====================================================
// TYPES
// =====================================================

export type DbRisk = {
  id: string;
  organization_id: string;
  user_id: string;
  risk_code: string;
  risk_title: string;
  risk_description: string;
  division: string;
  department: string;
  category: string;
  owner: string;
  relevant_period: string | null;
  likelihood_inherent: number;
  impact_inherent: number;
  status: 'Open' | 'In Progress' | 'Closed';
  is_priority: boolean;
  created_at: string;
  updated_at: string;
};

export type DbControl = {
  id: string;
  risk_id: string;
  description: string;
  target: 'Likelihood' | 'Impact';
  design: number;
  implementation: number;
  monitoring: number;
  effectiveness_evaluation: number;
  created_at: string;
  updated_at: string;
};

export type AppConfig = {
  id?: string;
  organization_id?: string;
  user_id?: string;
  matrix_size: 5 | 6;
  likelihood_labels: string[];
  impact_labels: string[];
  divisions: string[];
  departments: string[];
  categories: string[];
  owners: string[];
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Convert database risk + controls to app RiskRow format
 */
function dbToAppRisk(dbRisk: DbRisk, controls: DbControl[], userEmail?: string): RiskRow {
  return {
    risk_code: dbRisk.risk_code,
    risk_title: dbRisk.risk_title,
    risk_description: dbRisk.risk_description || '',
    division: dbRisk.division,
    department: dbRisk.department,
    category: dbRisk.category,
    owner: dbRisk.owner,
    relevant_period: dbRisk.relevant_period || null,
    likelihood_inherent: dbRisk.likelihood_inherent,
    impact_inherent: dbRisk.impact_inherent,
    status: dbRisk.status,
    user_id: dbRisk.user_id,
    user_email: userEmail,
    controls: controls.map(c => ({
      id: c.id,
      description: c.description,
      target: c.target,
      design: c.design,
      implementation: c.implementation,
      monitoring: c.monitoring,
      effectiveness_evaluation: c.effectiveness_evaluation,
    })),
  };
}

/**
 * Convert app RiskRow to database format
 */
function appToDbRisk(risk: Omit<RiskRow, 'controls'>, userId: string, orgId: string): Partial<DbRisk> {
  return {
    user_id: userId,
    organization_id: orgId,
    risk_code: risk.risk_code,
    risk_title: risk.risk_title,
    risk_description: risk.risk_description,
    division: risk.division,
    department: risk.department,
    category: risk.category,
    owner: risk.owner,
    likelihood_inherent: risk.likelihood_inherent,
    impact_inherent: risk.impact_inherent,
    status: risk.status,
  };
}

// =====================================================
// USER & ORGANIZATION
// =====================================================

/**
 * Get or create user profile
 */
export async function getOrCreateUserProfile(userId: string) {
  console.log('Checking/creating user profile for:', userId);

  // Check if profile exists
  const { data: profile, error: fetchError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle(); // Use maybeSingle() instead of single() to avoid error when no rows

  if (fetchError) {
    console.error('Error checking user profile:', fetchError);
    return { data: null, error: fetchError };
  }

  if (profile) {
    console.log('User profile found:', profile);
    return { data: profile, error: null };
  }

  console.log('No profile found, creating new user profile...');
  // Create profile if doesn't exist
  const { data: newProfile, error: createError } = await supabase
    .from('user_profiles')
    .insert({
      id: userId,
      organization_id: '00000000-0000-0000-0000-000000000001', // Demo org
    })
    .select()
    .single();

  if (createError) {
    // If duplicate key error (profile was created between check and insert), fetch it
    if (createError.code === '23505') {
      console.log('Profile already exists (race condition), fetching...');
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      return { data: existingProfile, error: null };
    }
    console.error('Error creating user profile:', createError);
    return { data: null, error: createError };
  }

  console.log('User profile created:', newProfile);
  return { data: newProfile, error: null };
}

/**
 * Get current user's organization ID
 */
export async function getUserOrganizationId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log('❌ getUserOrganizationId: No user authenticated');
    return null;
  }

  console.log('🔍 getUserOrganizationId: Fetching profile for user:', user.id);

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('❌ getUserOrganizationId: Error fetching profile:', error);
    return null;
  }

  if (!profile) {
    console.log('❌ getUserOrganizationId: No profile found for user:', user.id);
    return null;
  }

  console.log('✅ getUserOrganizationId: Found org:', profile.organization_id);
  return profile.organization_id;
}

// =====================================================
// CONFIGURATION
// =====================================================

/**
 * Load user's app configuration
 */
export async function loadConfig(): Promise<AppConfig | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log('❌ loadConfig: No user authenticated');
    return null;
  }

  console.log('🔍 loadConfig: Starting for user:', user.id);

  // Get user's organization ID first
  const orgId = await getUserOrganizationId();
  if (!orgId) {
    console.log('❌ loadConfig: No organization found for user');
    return null;
  }

  console.log('🔍 loadConfig: Querying config for org:', orgId);

  // Load config by organization_id so all users in the org share the same config
  const { data, error } = await supabase
    .from('app_configs')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle();

  if (error) {
    console.error('❌ loadConfig: Error loading config:', error);
    return null;
  }

  if (!data) {
    console.log('❌ loadConfig: No config found for organization:', orgId);
    return null;
  }

  console.log('✅ loadConfig: Config loaded successfully:', {
    org: data.organization_id,
    divisions: data.divisions,
    departments: data.departments,
  });

  return {
    id: data.id,
    organization_id: data.organization_id,
    user_id: data.user_id,
    matrix_size: data.matrix_size,
    likelihood_labels: data.likelihood_labels,
    impact_labels: data.impact_labels,
    divisions: data.divisions,
    departments: data.departments,
    categories: data.categories,
    owners: data.owners,
  };
}

/**
 * Save user's app configuration
 */
export async function saveConfig(config: AppConfig): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const orgId = await getUserOrganizationId();
  if (!orgId) return { success: false, error: 'No organization found' };

  const configData = {
    organization_id: orgId,
    user_id: user.id, // Track who last updated it
    matrix_size: config.matrix_size,
    likelihood_labels: config.likelihood_labels,
    impact_labels: config.impact_labels,
    divisions: config.divisions,
    departments: config.departments,
    categories: config.categories,
    owners: config.owners,
  };

  const { error } = await supabase
    .from('app_configs')
    .upsert(configData, { onConflict: 'organization_id' });

  return { success: !error, error: error?.message };
}

// =====================================================
// RISKS
// =====================================================

/**
 * Load all risks with their controls
 */
export async function loadRisks(): Promise<RiskRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch risks
  const { data: risks, error: risksError } = await supabase
    .from('risks')
    .select('*')
    .order('created_at', { ascending: false });

  if (risksError || !risks) return [];

  // Fetch all controls for these risks
  const riskIds = risks.map(r => r.id);
  const { data: controls } = await supabase
    .from('controls')
    .select('*')
    .in('risk_id', riskIds);

  // Group controls by risk_id
  const controlsByRisk = new Map<string, DbControl[]>();
  (controls || []).forEach(control => {
    const existing = controlsByRisk.get(control.risk_id) || [];
    controlsByRisk.set(control.risk_id, [...existing, control]);
  });

  // Fetch user emails for all unique user_ids
  const userIds = [...new Set(risks.map(r => r.user_id))];
  const { data: users } = await supabase
    .from('admin_users_view')
    .select('id, email')
    .in('id', userIds);

  const userEmailMap = new Map<string, string>();
  (users || []).forEach(u => {
    if (u.email) userEmailMap.set(u.id, u.email);
  });

  // Convert to app format
  return risks.map(risk => dbToAppRisk(risk, controlsByRisk.get(risk.id) || [], userEmailMap.get(risk.user_id)));
}

/**
 * Create a new risk
 */
export async function createRisk(risk: Omit<RiskRow, 'risk_code'> & { risk_code: string }): Promise<{ success: boolean; data?: RiskRow; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const orgId = await getUserOrganizationId();
  if (!orgId) return { success: false, error: 'No organization found' };

  // Insert risk
  const { controls, ...riskData } = risk;
  const { data: newRisk, error: riskError } = await supabase
    .from('risks')
    .insert(appToDbRisk(riskData, user.id, orgId))
    .select()
    .single();

  if (riskError || !newRisk) {
    return { success: false, error: riskError?.message };
  }

  // Insert controls
  if (controls && controls.length > 0) {
    const controlsData = controls.map(c => ({
      risk_id: newRisk.id,
      description: c.description,
      target: c.target,
      design: c.design,
      implementation: c.implementation,
      monitoring: c.monitoring,
      effectiveness_evaluation: c.effectiveness_evaluation,
    }));

    await supabase.from('controls').insert(controlsData);
  }

  // Fetch the complete risk with controls
  const { data: controlsData } = await supabase
    .from('controls')
    .select('*')
    .eq('risk_id', newRisk.id);

  return {
    success: true,
    data: dbToAppRisk(newRisk, controlsData || []),
  };
}

/**
 * Update an existing risk
 */
export async function updateRisk(riskCode: string, updates: Omit<RiskRow, 'risk_code'>): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Find risk by code
  const { data: existingRisk } = await supabase
    .from('risks')
    .select('id')
    .eq('risk_code', riskCode)
    .single();

  if (!existingRisk) return { success: false, error: 'Risk not found' };

  const orgId = await getUserOrganizationId();
  if (!orgId) return { success: false, error: 'No organization found' };

  // Update risk
  const { controls, ...riskData } = updates;
  const { error: updateError } = await supabase
    .from('risks')
    .update(appToDbRisk({ ...riskData, risk_code: riskCode }, user.id, orgId))
    .eq('id', existingRisk.id);

  if (updateError) return { success: false, error: updateError.message };

  // Delete existing controls and insert new ones
  await supabase.from('controls').delete().eq('risk_id', existingRisk.id);

  if (controls && controls.length > 0) {
    const controlsData = controls.map(c => ({
      risk_id: existingRisk.id,
      description: c.description,
      target: c.target,
      design: c.design,
      implementation: c.implementation,
      monitoring: c.monitoring,
      effectiveness_evaluation: c.effectiveness_evaluation,
    }));

    await supabase.from('controls').insert(controlsData);
  }

  return { success: true };
}

/**
 * Delete a risk
 */
export async function deleteRisk(riskCode: string): Promise<{ success: boolean; error?: string }> {
  const { data: existingRisk } = await supabase
    .from('risks')
    .select('id')
    .eq('risk_code', riskCode)
    .single();

  if (!existingRisk) return { success: false, error: 'Risk not found' };

  // Controls will be deleted automatically via CASCADE
  const { error } = await supabase
    .from('risks')
    .delete()
    .eq('id', existingRisk.id);

  return { success: !error, error: error?.message };
}

/**
 * Toggle risk priority status
 */
export async function toggleRiskPriority(riskCode: string, isPriority: boolean): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('risks')
    .update({ is_priority: isPriority })
    .eq('risk_code', riskCode);

  return { success: !error, error: error?.message };
}

// =====================================================
// BULK OPERATIONS
// =====================================================

/**
 * Bulk import risks
 */
export async function bulkImportRisks(risks: Array<Omit<RiskRow, 'risk_code'> & { risk_code: string }>): Promise<{ success: boolean; count: number; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, count: 0, error: 'Not authenticated' };

  const orgId = await getUserOrganizationId();
  if (!orgId) return { success: false, count: 0, error: 'No organization found' };

  // Insert risks
  const risksData = risks.map(r => {
    const { controls, ...riskData } = r;
    return appToDbRisk(riskData, user.id, orgId);
  });

  const { data: insertedRisks, error } = await supabase
    .from('risks')
    .insert(risksData)
    .select();

  if (error || !insertedRisks) {
    return { success: false, count: 0, error: error?.message };
  }

  // Insert controls for each risk
  const allControls: any[] = [];
  insertedRisks.forEach((dbRisk, index) => {
    const appRisk = risks[index];
    if (appRisk.controls && appRisk.controls.length > 0) {
      appRisk.controls.forEach(c => {
        allControls.push({
          risk_id: dbRisk.id,
          description: c.description,
          target: c.target,
          design: c.design,
          implementation: c.implementation,
          monitoring: c.monitoring,
          effectiveness_evaluation: c.effectiveness_evaluation,
        });
      });
    }
  });

  if (allControls.length > 0) {
    await supabase.from('controls').insert(allControls);
  }

  return { success: true, count: insertedRisks.length };
}
