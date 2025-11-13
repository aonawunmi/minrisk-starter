/**
 * Report Generation Engine
 * Core logic for generating report drafts from templates
 */

import { supabase } from './supabase';
import { ReportDraft, ReportSection, ReportAudience, RegulatorType, ReportData, RiskMovement } from '../types/report-types';
import { getReportTemplate } from './report-templates';
import { getRegulatorForReport, getOrganizationSettings } from './regulator-routing';
import { getRiskMovements } from './risk-velocity';
import { ProcessedRisk } from '../App';

/**
 * Generate a new report draft
 */
export async function generateReportDraft(
  organizationId: string,
  userId: string,
  userEmail: string,
  audience: ReportAudience,
  period: string,
  regulatorOverride?: RegulatorType
): Promise<{ success: boolean; draft?: ReportDraft; error?: string; existing?: boolean }> {
  try {
    // Get organization settings
    const orgSettings = await getOrganizationSettings(organizationId);
    if (!orgSettings) {
      return { success: false, error: 'Organization settings not found. Please configure institution type first.' };
    }

    // Determine regulator type
    let regulatorType: RegulatorType | undefined;
    if (audience === 'regulator') {
      regulatorType = regulatorOverride || orgSettings.default_regulator;
    }

    // Check if a draft already exists for this combination
    const { data: existingDrafts } = await supabase
      .from('report_drafts')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('audience', audience)
      .eq('period', period)
      .eq('status', 'draft')
      .eq('regulator_type', regulatorType || null);

    if (existingDrafts && existingDrafts.length > 0) {
      // Load and return the existing draft
      const existingDraft = await loadReportDraft(existingDrafts[0].id);
      return {
        success: true,
        draft: existingDraft!,
        existing: true
      };
    }

    // Fetch data for report
    const reportData = await fetchReportData(organizationId, period);
    reportData.institution_type = orgSettings.institution_type;

    // Get template
    const template = getReportTemplate(audience, regulatorType);

    // Generate sections from template
    const sections: Omit<ReportSection, 'report_draft_id'>[] = [];

    for (const sectionTemplate of template.sections) {
      // Generate narrative
      const narrative = await sectionTemplate.narrative_generator(reportData);

      // Generate data if data_generator exists
      const data = sectionTemplate.data_generator ? sectionTemplate.data_generator(reportData) : null;

      sections.push({
        id: crypto.randomUUID(),
        title: sectionTemplate.title,
        section_order: sectionTemplate.order,
        included: sectionTemplate.default_included,
        content_type: sectionTemplate.content_type,
        narrative,
        data,
      });
    }

    // Create report draft in database
    const { data: draftData, error: draftError } = await supabase
      .from('report_drafts')
      .insert({
        organization_id: organizationId,
        audience,
        regulator_type: regulatorType,
        regulator_override: !!regulatorOverride,
        period,
        status: 'draft',
        created_by: userId,
        created_by_email: userEmail,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (draftError) throw draftError;

    // Insert sections
    const sectionsToInsert = sections.map(s => ({
      ...s,
      report_draft_id: draftData.id,
    }));

    const { error: sectionsError } = await supabase
      .from('report_sections')
      .insert(sectionsToInsert);

    if (sectionsError) throw sectionsError;

    // Create audit trail entry
    await supabase.from('report_audit_trail').insert({
      report_draft_id: draftData.id,
      user_id: userId,
      user_email: userEmail,
      action: 'create',
      timestamp: new Date().toISOString(),
    });

    // Load full draft with sections
    const draft = await loadReportDraft(draftData.id);

    return { success: true, draft: draft! };
  } catch (error: any) {
    console.error('Error generating report draft:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch all data needed for report generation
 */
async function fetchReportData(organizationId: string, period: string): Promise<ReportData> {
  // Fetch risks for the specific period from BOTH active and history
  // This allows proper period-specific reporting and trend analysis

  // First, get active risks for this period
  const { data: activeRisks } = await supabase
    .from('risks')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('relevant_period', period);

  // Then, get archived risks for this period from risk_history
  const { data: archivedRisks } = await supabase
    .from('risk_history')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('relevant_period', period);

  // Combine active and archived risks for complete period view
  const risks = [...(activeRisks || []), ...(archivedRisks || [])];

  // Fetch controls (through risk relationship)
  const riskIds = risks?.map(r => r.id) || [];
  let controls: any[] = [];
  if (riskIds.length > 0) {
    const { data: controlsData } = await supabase
      .from('controls')
      .select('*')
      .in('risk_id', riskIds);
    controls = controlsData || [];
  }

  // Fetch KRI alerts
  const { data: kriAlerts } = await supabase
    .from('kri_alerts')
    .select('*')
    .eq('organization_id', organizationId);

  // Fetch appetite exceptions
  const { data: appetiteExceptions } = await supabase
    .from('risk_appetite_exceptions')
    .select('*')
    .eq('organization_id', organizationId);

  // Fetch incidents
  const { data: incidents } = await supabase
    .from('incidents')
    .select('*')
    .eq('organization_id', organizationId);

  // Fetch risk movements
  const riskMovements = await getRiskMovements(organizationId, period);

  return {
    organization_id: organizationId,
    period,
    risks: risks || [],
    controls: controls,
    kri_alerts: kriAlerts || [],
    appetite_exceptions: appetiteExceptions || [],
    incidents: incidents || [],
    risk_movements: riskMovements,
    institution_type: 'Bank',  // Will be set from org settings
  };
}

/**
 * Load existing report draft
 */
export async function loadReportDraft(draftId: string): Promise<ReportDraft | null> {
  try {
    const { data: draftData, error: draftError } = await supabase
      .from('report_drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (draftError) throw draftError;

    const { data: sectionsData, error: sectionsError } = await supabase
      .from('report_sections')
      .select('*')
      .eq('report_draft_id', draftId)
      .order('section_order', { ascending: true });

    if (sectionsError) throw sectionsError;

    const { data: auditData, error: auditError } = await supabase
      .from('report_audit_trail')
      .select('*')
      .eq('report_draft_id', draftId)
      .order('timestamp', { ascending: false });

    if (auditError) throw auditError;

    return {
      ...draftData,
      sections: sectionsData || [],
      audit_trail: auditData || [],
    };
  } catch (error) {
    console.error('Error loading report draft:', error);
    return null;
  }
}

/**
 * Update section narrative
 */
export async function updateSectionNarrative(
  sectionId: string,
  newNarrative: string,
  userId: string,
  userEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get old narrative for audit trail
    const { data: oldSection } = await supabase
      .from('report_sections')
      .select('narrative, report_draft_id')
      .eq('id', sectionId)
      .single();

    // Update section
    const { error: updateError } = await supabase
      .from('report_sections')
      .update({
        narrative: newNarrative,
        last_edited_by: userEmail,
        last_edited_at: new Date().toISOString(),
      })
      .eq('id', sectionId);

    if (updateError) throw updateError;

    // Log in audit trail
    if (oldSection) {
      await supabase.from('report_audit_trail').insert({
        report_draft_id: oldSection.report_draft_id,
        user_id: userId,
        user_email: userEmail,
        section_id: sectionId,
        action: 'edit_narrative',
        old_value: oldSection.narrative,
        new_value: newNarrative,
        timestamp: new Date().toISOString(),
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating section narrative:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Toggle section inclusion
 */
export async function toggleSection(
  sectionId: string,
  included: boolean,
  userId: string,
  userEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: section } = await supabase
      .from('report_sections')
      .select('report_draft_id')
      .eq('id', sectionId)
      .single();

    const { error } = await supabase
      .from('report_sections')
      .update({ included })
      .eq('id', sectionId);

    if (error) throw error;

    // Log in audit trail
    if (section) {
      await supabase.from('report_audit_trail').insert({
        report_draft_id: section.report_draft_id,
        user_id: userId,
        user_email: userEmail,
        section_id: sectionId,
        action: 'toggle_section',
        new_value: included ? 'included' : 'excluded',
        timestamp: new Date().toISOString(),
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error toggling section:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Finalize report (mark as final)
 */
export async function finalizeReport(
  draftId: string,
  userId: string,
  userEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('report_drafts')
      .update({
        status: 'final',
        finalized_at: new Date().toISOString(),
        finalized_by: userId,
        finalized_by_email: userEmail,
      })
      .eq('id', draftId);

    if (error) throw error;

    // Log in audit trail
    await supabase.from('report_audit_trail').insert({
      report_draft_id: draftId,
      user_id: userId,
      user_email: userEmail,
      action: 'finalize',
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error finalizing report:', error);
    return { success: false, error: error.message };
  }
}

/**
 * List all drafts for an organization
 */
export async function listReportDrafts(
  organizationId: string,
  audience?: ReportAudience,
  status?: 'draft' | 'final'
): Promise<ReportDraft[]> {
  try {
    let query = supabase
      .from('report_drafts')
      .select('*')
      .eq('organization_id', organizationId);

    if (audience) {
      query = query.eq('audience', audience);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // For each draft, load sections and audit trail
    const drafts: ReportDraft[] = [];
    for (const draftData of data || []) {
      const draft = await loadReportDraft(draftData.id);
      if (draft) drafts.push(draft);
    }

    return drafts;
  } catch (error) {
    console.error('Error listing report drafts:', error);
    return [];
  }
}

/**
 * Delete a draft (only if status is draft)
 */
export async function deleteReportDraft(draftId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if draft
    const { data: draft } = await supabase
      .from('report_drafts')
      .select('status')
      .eq('id', draftId)
      .single();

    if (draft?.status === 'final') {
      return { success: false, error: 'Cannot delete finalized reports' };
    }

    const { error } = await supabase
      .from('report_drafts')
      .delete()
      .eq('id', draftId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting report draft:', error);
    return { success: false, error: error.message };
  }
}
