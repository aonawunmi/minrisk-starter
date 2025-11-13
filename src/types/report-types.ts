/**
 * MinRisk Report Types
 * Type definitions for the ERM Report Composer system
 */

// Institution & Regulator Types
export type InstitutionType = 'Bank' | 'Capital Markets' | 'Pensions';
export type RegulatorType = 'CBN' | 'SEC' | 'PENCOM';

// Report Audience Types
export type ReportAudience = 'regulator' | 'board' | 'ceo';

// Report Status
export type ReportStatus = 'draft' | 'final';

// Section Content Types
export type SectionContentType = 'narrative' | 'table' | 'chart' | 'mixed';

// Report Section
export interface ReportSection {
  id: string;
  title: string;
  order: number;
  included: boolean;  // Toggle on/off
  content_type: SectionContentType;
  narrative?: string;  // Editable text
  data?: any;  // Structured data (tables, charts)
  last_edited_by?: string;
  last_edited_at?: string;
}

// Report Edit Record (Audit Trail)
export interface ReportEdit {
  id: string;
  report_draft_id: string;
  user_id: string;
  user_email: string;
  section_id?: string;
  action: 'create' | 'edit_narrative' | 'toggle_section' | 'reorder' | 'finalize' | 'override_regulator';
  old_value?: string;
  new_value?: string;
  reason?: string;  // For regulator overrides
  timestamp: string;
}

// Main Report Draft Type
export interface ReportDraft {
  id: string;
  organization_id: string;
  audience: ReportAudience;
  regulator_type?: RegulatorType;
  regulator_override?: boolean;  // True if manually changed from default
  period: string; // 'Q1 2025', 'FY 2025'
  status: ReportStatus;
  created_by: string;
  created_by_email: string;
  created_at: string;
  finalized_at?: string;
  finalized_by?: string;
  sections: ReportSection[];
  audit_trail: ReportEdit[];
}

// Report Template Configuration
export interface ReportTemplate {
  audience: ReportAudience;
  regulator_type?: RegulatorType;
  sections: ReportSectionTemplate[];
}

export interface ReportSectionTemplate {
  title: string;
  order: number;
  content_type: SectionContentType;
  default_included: boolean;
  narrative_generator: (data: ReportData) => Promise<string>;
  data_generator?: (data: ReportData) => any;
}

// Data passed to report generation
export interface ReportData {
  organization_id: string;
  period: string;
  risks: any[];
  controls: any[];
  kri_alerts: any[];
  appetite_exceptions: any[];
  incidents: any[];
  risk_movements: RiskMovement[];
  institution_type: InstitutionType;
}

// Risk Movement/Velocity
export interface RiskMovement {
  id?: string;
  organization_id: string;
  risk_code: string;
  risk_title: string;
  category: string;
  period: string;
  inherent_score: number;
  residual_score: number;
  previous_residual_score?: number;
  change_from_previous?: number;
  velocity?: 'rising' | 'falling' | 'stable';
  narrative?: string;
  captured_at?: string;
}

// Organization Settings (Extended)
export interface OrganizationSettings {
  organization_id: string;
  institution_type: InstitutionType;
  default_regulator: RegulatorType;
  organization_name: string;
  updated_at: string;
  updated_by: string;
}

// Export Format Options
export type ExportFormat = 'word' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  include_watermark: boolean;
  watermark_text?: string;
}
