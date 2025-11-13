/**
 * Regulator Routing Logic
 * Maps institution types to default regulators
 * Manages organization settings
 */

import { supabase } from './supabase';
import { InstitutionType, RegulatorType, OrganizationSettings } from '../types/report-types';

/**
 * Get default regulator based on institution type
 */
export function getDefaultRegulator(institutionType: InstitutionType): RegulatorType {
  const mapping: Record<InstitutionType, RegulatorType> = {
    'Bank': 'CBN',
    'Capital Markets': 'SEC',
    'Pensions': 'PENCOM',
  };
  return mapping[institutionType];
}

/**
 * Get regulator full name
 */
export function getRegulatorName(regulatorType: RegulatorType): string {
  const names: Record<RegulatorType, string> = {
    'CBN': 'Central Bank of Nigeria',
    'SEC': 'Securities and Exchange Commission',
    'PENCOM': 'National Pension Commission',
  };
  return names[regulatorType];
}

/**
 * Get organization settings
 */
export async function getOrganizationSettings(
  organizationId: string
): Promise<OrganizationSettings | null> {
  try {
    const { data, error } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching organization settings:', error);
    return null;
  }
}

/**
 * Create or update organization settings
 */
export async function saveOrganizationSettings(
  settings: Omit<OrganizationSettings, 'updated_at'>
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('💾 Saving organization settings:', settings);
    const { data, error } = await supabase
      .from('organization_settings')
      .upsert({
        organization_id: settings.organization_id,
        institution_type: settings.institution_type,
        default_regulator: settings.default_regulator,
        organization_name: settings.organization_name,
        updated_by: settings.updated_by,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id',
      })
      .select();

    console.log('✅ Save result - data:', data, 'error:', error);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('❌ Error saving organization settings:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get regulator for report generation
 * Checks for overrides first, then falls back to default
 */
export async function getRegulatorForReport(
  organizationId: string,
  reportDraftId?: string
): Promise<RegulatorType | null> {
  try {
    // If reportDraftId provided, check for override
    if (reportDraftId) {
      const { data: draftData } = await supabase
        .from('report_drafts')
        .select('regulator_type, regulator_override')
        .eq('id', reportDraftId)
        .single();

      if (draftData?.regulator_override && draftData?.regulator_type) {
        return draftData.regulator_type;
      }
    }

    // Get default from organization settings
    const settings = await getOrganizationSettings(organizationId);
    return settings?.default_regulator || null;
  } catch (error) {
    console.error('Error getting regulator for report:', error);
    return null;
  }
}

/**
 * Log regulator override in audit trail
 */
export async function logRegulatorOverride(
  reportDraftId: string,
  userId: string,
  userEmail: string,
  oldRegulator: RegulatorType,
  newRegulator: RegulatorType,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update report draft
    const { error: updateError } = await supabase
      .from('report_drafts')
      .update({
        regulator_type: newRegulator,
        regulator_override: true,
      })
      .eq('id', reportDraftId);

    if (updateError) throw updateError;

    // Log in audit trail
    const { error: auditError } = await supabase
      .from('report_audit_trail')
      .insert({
        report_draft_id: reportDraftId,
        user_id: userId,
        user_email: userEmail,
        action: 'override_regulator',
        old_value: oldRegulator,
        new_value: newRegulator,
        reason,
        timestamp: new Date().toISOString(),
      });

    if (auditError) throw auditError;

    return { success: true };
  } catch (error: any) {
    console.error('Error logging regulator override:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate institution type and regulator combination
 */
export function validateRegulatorForInstitution(
  institutionType: InstitutionType,
  regulatorType: RegulatorType
): { valid: boolean; warning?: string } {
  const defaultRegulator = getDefaultRegulator(institutionType);

  if (regulatorType === defaultRegulator) {
    return { valid: true };
  }

  return {
    valid: true,
    warning: `${regulatorType} is not the default regulator for ${institutionType} organizations. Default is ${defaultRegulator}. Override will be logged in audit trail.`,
  };
}

/**
 * Get all available institution types
 */
export function getInstitutionTypes(): InstitutionType[] {
  return ['Bank', 'Capital Markets', 'Pensions'];
}

/**
 * Get all available regulators
 */
export function getRegulatorTypes(): RegulatorType[] {
  return ['CBN', 'SEC', 'PENCOM'];
}
