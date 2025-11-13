/**
 * Report Templates
 * Defines section templates for CBN, SEC, PENCOM, Board, and CEO reports
 */

import { ReportTemplate, ReportSectionTemplate, ReportData } from '../../types/report-types';
import { generateReportSectionNarrative } from '../narrative-generator';

// Import specific templates
import { getCBNTemplate } from './cbn-template';
import { getSECTemplate } from './sec-template';
import { getPENCOMTemplate } from './pencom-template';
import { getBoardTemplate } from './board-template';
import { getCEOTemplate } from './ceo-template';

/**
 * Get appropriate template based on audience and regulator
 */
export function getReportTemplate(
  audience: 'regulator' | 'board' | 'ceo',
  regulatorType?: 'CBN' | 'SEC' | 'PENCOM'
): ReportTemplate {
  if (audience === 'regulator') {
    if (regulatorType === 'CBN') {
      return getCBNTemplate();
    } else if (regulatorType === 'SEC') {
      return getSECTemplate();
    } else if (regulatorType === 'PENCOM') {
      return getPENCOMTemplate();
    }
    // Default to CBN if not specified
    return getCBNTemplate();
  } else if (audience === 'board') {
    return getBoardTemplate();
  } else {
    return getCEOTemplate();
  }
}

/**
 * Common helper: Generate executive summary data
 */
export function generateExecutiveSummaryData(data: ReportData): any {
  const total_risks = data.risks.length;
  const high_severe_risks = data.risks.filter(r =>
    r.residual_score >= 15
  ).length;
  const kri_breaches = data.kri_alerts.filter(a => a.status === 'open').length;
  const appetite_exceptions = data.appetite_exceptions.filter(e =>
    e.status === 'pending'
  ).length;
  const control_exceptions = data.controls.filter(c =>
    c.design === 0 || c.implementation === 0
  ).length;
  const rising_risks = data.risk_movements.filter(m =>
    m.velocity === 'rising'
  ).length;

  return {
    total_risks,
    high_severe_risks,
    kri_breaches,
    appetite_exceptions,
    control_exceptions,
    rising_risks,
    period: data.period,
  };
}

/**
 * Common helper: Generate top risks data
 */
export function generateTopRisksData(data: ReportData, limit: number = 10): any {
  const topRisks = [...data.risks]
    .sort((a, b) => b.residual_score - a.residual_score)
    .slice(0, limit)
    .map(r => ({
      risk_code: r.risk_code,
      risk_title: r.risk_title,
      category: r.category,
      residual_score: r.residual_score,
      owner: r.owner,
      status: r.status,
    }));

  return { topRisks, period: data.period };
}

/**
 * Common helper: Control exceptions (DIME failures)
 */
export function generateControlExceptionsData(data: ReportData): any {
  const exceptions = data.controls.filter(c =>
    c.design === 0 || c.implementation === 0
  );

  return {
    total_exceptions: exceptions.length,
    exceptions: exceptions.map(c => ({
      risk_code: c.risk_code,
      control_description: c.description,
      design: c.design,
      implementation: c.implementation,
      issue: c.design === 0 ? 'Design not established' : 'Implementation failed',
    })),
  };
}

/**
 * Common helper: Appetite status
 */
export function generateAppetiteStatusData(data: ReportData): any {
  const total = data.appetite_exceptions.length;
  const pending = data.appetite_exceptions.filter(e => e.status === 'pending').length;
  const approved = data.appetite_exceptions.filter(e => e.status === 'approved').length;
  const rejected = data.appetite_exceptions.filter(e => e.status === 'rejected').length;

  return {
    total_exceptions: total,
    pending_exceptions: pending,
    approved_exceptions: approved,
    rejected_exceptions: rejected,
    exceptions: data.appetite_exceptions.map(e => ({
      risk_code: e.risk_code,
      risk_title: e.risk_title,
      threshold: e.appetite_threshold,
      actual: e.actual_score,
      status: e.status,
      narrative: e.narrative,
    })),
  };
}

/**
 * Common helper: Risk movements
 */
export function generateRiskMovementsData(data: ReportData): any {
  const rising = data.risk_movements.filter(m => m.velocity === 'rising');
  const falling = data.risk_movements.filter(m => m.velocity === 'falling');

  return {
    total_movements: data.risk_movements.length,
    rising_count: rising.length,
    falling_count: falling.length,
    rising_risks: rising.slice(0, 5).map(m => ({
      risk_code: m.risk_code,
      risk_title: m.risk_title,
      change: m.change_from_previous || 0,
      narrative: m.narrative || '',
    })),
    falling_risks: falling.slice(0, 5).map(m => ({
      risk_code: m.risk_code,
      risk_title: m.risk_title,
      change: m.change_from_previous || 0,
      narrative: m.narrative || '',
    })),
  };
}

export * from './cbn-template';
export * from './sec-template';
export * from './pencom-template';
export * from './board-template';
export * from './ceo-template';
