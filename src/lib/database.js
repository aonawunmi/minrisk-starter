// src/lib/database.ts
// Database operations for MinRisk using Supabase
// UPDATED: Added incident count fields
import { supabase } from './supabase';
// =====================================================
// HELPER FUNCTIONS
// =====================================================
/**
 * Convert database risk + controls to app RiskRow format
 */
function dbToAppRisk(dbRisk, controls, userEmail) {
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
        linked_incident_count: dbRisk.linked_incident_count,
        last_incident_date: dbRisk.last_incident_date,
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
function appToDbRisk(risk, userId, orgId) {
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
export async function getOrCreateUserProfile(userId) {
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
export async function getUserOrganizationId() {
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
export async function loadConfig() {
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
        scanner_mode: data.scanner_mode,
        scanner_confidence_threshold: data.scanner_confidence_threshold,
    };
}
/**
 * Save user's app configuration
 */
export async function saveConfig(config) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        return { success: false, error: 'Not authenticated' };
    const orgId = await getUserOrganizationId();
    if (!orgId)
        return { success: false, error: 'No organization found' };
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
        scanner_mode: config.scanner_mode,
        scanner_confidence_threshold: config.scanner_confidence_threshold,
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
export async function loadRisks() {
    console.log('📥 loadRisks() called in database.ts');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.log('❌ No user found in loadRisks');
        return [];
    }
    // Get user profile to check role
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, organization_id')
        .eq('id', user.id)
        .single();
    if (!profile) {
        console.log('❌ No user profile found in loadRisks');
        return [];
    }
    const isAdmin = profile.role === 'admin';
    // ADMIN: Load ALL risks for organization (cross-user visibility)
    // REGULAR USER: Load ONLY their own risks (user-level isolation)
    console.log(`📡 Fetching risks from Supabase for user ${user.id} (${isAdmin ? 'ADMIN - org-wide' : 'USER - personal only'})...`);
    let query = supabase
        .from('risks')
        .select('*');
    if (isAdmin) {
        // Admin: Load all risks for the organization
        query = query.eq('organization_id', profile.organization_id);
    }
    else {
        // Regular user: Load only their own risks
        query = query.eq('user_id', user.id);
    }
    const { data: risks, error: risksError } = await query.order('created_at', { ascending: false });
    if (risksError) {
        console.error('❌ Error fetching risks:', risksError);
        return [];
    }
    if (!risks) {
        console.log('❌ No risks returned');
        return [];
    }
    console.log('✅ Fetched', risks.length, 'risks from DB');
    // Debug: Check what fields are in the first risk
    if (risks.length > 0) {
        console.log('🔍 Sample risk from DB:', Object.keys(risks[0]));
        console.log('🔍 Has linked_incident_count?', 'linked_incident_count' in risks[0]);
        const riskWithCount = risks.find(r => r.linked_incident_count && r.linked_incident_count > 0);
        if (riskWithCount) {
            console.log('🎯 Found risk with count in DB:', riskWithCount.risk_code, riskWithCount.linked_incident_count);
        }
        else {
            console.log('⚠️ No risks with linked_incident_count > 0 found in DB');
        }
    }
    // Fetch all controls for these risks
    const riskIds = risks.map(r => r.id);
    const { data: controls } = await supabase
        .from('controls')
        .select('*')
        .in('risk_id', riskIds);
    // Group controls by risk_id
    const controlsByRisk = new Map();
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
    const userEmailMap = new Map();
    (users || []).forEach(u => {
        if (u.email)
            userEmailMap.set(u.id, u.email);
    });
    // Convert to app format
    return risks.map(risk => dbToAppRisk(risk, controlsByRisk.get(risk.id) || [], userEmailMap.get(risk.user_id)));
}
/**
 * Create a new risk
 */
export async function createRisk(risk) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        return { success: false, error: 'Not authenticated' };
    const orgId = await getUserOrganizationId();
    if (!orgId)
        return { success: false, error: 'No organization found' };
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
export async function updateRisk(riskCode, updates) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        return { success: false, error: 'Not authenticated' };
    // Find risk by code
    const { data: existingRisk } = await supabase
        .from('risks')
        .select('id')
        .eq('risk_code', riskCode)
        .single();
    if (!existingRisk)
        return { success: false, error: 'Risk not found' };
    const orgId = await getUserOrganizationId();
    if (!orgId)
        return { success: false, error: 'No organization found' };
    // Update risk
    const { controls, ...riskData } = updates;
    const { error: updateError } = await supabase
        .from('risks')
        .update(appToDbRisk({ ...riskData, risk_code: riskCode }, user.id, orgId))
        .eq('id', existingRisk.id);
    if (updateError)
        return { success: false, error: updateError.message };
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
export async function deleteRisk(riskCode) {
    const { data: existingRisk } = await supabase
        .from('risks')
        .select('id')
        .eq('risk_code', riskCode)
        .single();
    if (!existingRisk)
        return { success: false, error: 'Risk not found' };
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
export async function toggleRiskPriority(riskCode, isPriority) {
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
export async function bulkImportRisks(risks) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        return { success: false, count: 0, error: 'Not authenticated' };
    const orgId = await getUserOrganizationId();
    if (!orgId)
        return { success: false, count: 0, error: 'No organization found' };
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
    const allControls = [];
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
export async function loadVarScaleConfig() {
    try {
        const orgId = await getUserOrganizationId();
        if (!orgId) {
            console.error('No organization ID found');
            return null;
        }
        const { data, error } = await supabase
            .from('var_scale_config')
            .select('*')
            .eq('organization_id', orgId)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                // No config found, return default config
                const { data: defaultData } = await supabase
                    .from('var_scale_config')
                    .select('*')
                    .eq('organization_id', 'default')
                    .single();
                if (defaultData) {
                    return {
                        volatility_thresholds: [
                            defaultData.volatility_threshold_1,
                            defaultData.volatility_threshold_2,
                            defaultData.volatility_threshold_3,
                            defaultData.volatility_threshold_4
                        ],
                        value_thresholds: [
                            defaultData.value_threshold_1,
                            defaultData.value_threshold_2,
                            defaultData.value_threshold_3,
                            defaultData.value_threshold_4
                        ]
                    };
                }
            }
            console.error('Error loading VaR scale config:', error);
            return null;
        }
        return {
            volatility_thresholds: [
                data.volatility_threshold_1,
                data.volatility_threshold_2,
                data.volatility_threshold_3,
                data.volatility_threshold_4
            ],
            value_thresholds: [
                data.value_threshold_1,
                data.value_threshold_2,
                data.value_threshold_3,
                data.value_threshold_4
            ]
        };
    }
    catch (error) {
        console.error('Error in loadVarScaleConfig:', error);
        return null;
    }
}
export async function saveVarScaleConfig(config) {
    try {
        const orgId = await getUserOrganizationId();
        if (!orgId) {
            return { success: false, error: 'No organization ID found' };
        }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'Not authenticated' };
        }
        // Check if config exists
        const { data: existing } = await supabase
            .from('var_scale_config')
            .select('id')
            .eq('organization_id', orgId)
            .single();
        const configData = {
            organization_id: orgId,
            volatility_threshold_1: config.volatility_thresholds[0],
            volatility_threshold_2: config.volatility_thresholds[1],
            volatility_threshold_3: config.volatility_thresholds[2],
            volatility_threshold_4: config.volatility_thresholds[3],
            value_threshold_1: config.value_thresholds[0],
            value_threshold_2: config.value_thresholds[1],
            value_threshold_3: config.value_thresholds[2],
            value_threshold_4: config.value_thresholds[3],
            updated_at: new Date().toISOString(),
            updated_by: user.email || null
        };
        if (existing) {
            // Update existing
            const { error } = await supabase
                .from('var_scale_config')
                .update(configData)
                .eq('id', existing.id);
            if (error) {
                console.error('Error updating VaR scale config:', error);
                return { success: false, error: error.message };
            }
        }
        else {
            // Insert new
            const { error } = await supabase
                .from('var_scale_config')
                .insert([configData]);
            if (error) {
                console.error('Error inserting VaR scale config:', error);
                return { success: false, error: error.message };
            }
        }
        return { success: true };
    }
    catch (error) {
        console.error('Error in saveVarScaleConfig:', error);
        return { success: false, error: error.message };
    }
}
