/**
 * Board Risk Committee (BRC) Report Template
 * Focus: Strategic oversight, top risks, trends, appetite, decisions required
 */

import { ReportTemplate, ReportSectionTemplate, ReportData } from '../../types/report-types';
import { generateReportSectionNarrative } from '../narrative-generator';
import {
  generateExecutiveSummaryData,
  generateTopRisksData,
  generateControlExceptionsData,
  generateAppetiteStatusData,
  generateRiskMovementsData,
} from './index';

export function getBoardTemplate(): ReportTemplate {
  const sections: ReportSectionTemplate[] = [
    {
      title: 'Executive Summary',
      order: 1,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const summaryData = generateExecutiveSummaryData(data);
        return await generateReportSectionNarrative({
          section_title: 'Executive Summary',
          section_type: 'executive_summary',
          data: summaryData,
          audience: 'board',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => generateExecutiveSummaryData(data),
    },
    {
      title: 'Top 10 Risks & Risk Movement',
      order: 2,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const topRisksData = generateTopRisksData(data, 10);
        const movementsData = generateRiskMovementsData(data);
        return await generateReportSectionNarrative({
          section_title: 'Top 10 Risks',
          section_type: 'top_risks',
          data: { ...topRisksData, ...movementsData },
          audience: 'board',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => {
        const topRisks = generateTopRisksData(data, 10);
        const movements = generateRiskMovementsData(data);
        return { ...topRisks, ...movements };
      },
    },
    {
      title: 'Risk Appetite Utilization',
      order: 3,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const appetiteData = generateAppetiteStatusData(data);
        return await generateReportSectionNarrative({
          section_title: 'Risk Appetite Utilization',
          section_type: 'appetite_status',
          data: appetiteData,
          audience: 'board',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => generateAppetiteStatusData(data),
    },
    {
      title: 'Emerging Risks',
      order: 4,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const risingRisks = data.risk_movements.filter(m => m.velocity === 'rising');
        return await generateReportSectionNarrative({
          section_title: 'Emerging Risks',
          section_type: 'forward_look',
          data: {
            rising_risks: risingRisks.length,
            new_risks: data.risks.filter(r => r.status === 'Open').length,
            period: data.period,
          },
          audience: 'board',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => {
        const risingRisks = data.risk_movements.filter(m => m.velocity === 'rising');
        return {
          rising_risks: risingRisks.map(m => ({
            risk_code: m.risk_code,
            risk_title: m.risk_title,
            change: m.change_from_previous || 0,
            narrative: m.narrative || '',
          })),
        };
      },
    },
    {
      title: 'Control Effectiveness (DIME Dashboard)',
      order: 5,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const exceptionsData = generateControlExceptionsData(data);
        const totalControls = data.controls.length;
        const effectiveControls = totalControls - exceptionsData.total_exceptions;
        return await generateReportSectionNarrative({
          section_title: 'Control Effectiveness',
          section_type: 'control_exceptions',
          data: {
            ...exceptionsData,
            total_controls: totalControls,
            effective_controls: effectiveControls,
            effectiveness_rate: totalControls > 0 ? (effectiveControls / totalControls * 100).toFixed(1) : 0,
          },
          audience: 'board',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => {
        const exceptionsData = generateControlExceptionsData(data);
        const totalControls = data.controls.length;
        const effectiveControls = totalControls - exceptionsData.total_exceptions;
        return {
          ...exceptionsData,
          total_controls: totalControls,
          effective_controls: effectiveControls,
          effectiveness_rate: totalControls > 0 ? (effectiveControls / totalControls * 100).toFixed(1) : 0,
        };
      },
    },
    {
      title: 'KRI Performance & Breaches',
      order: 6,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const totalAlerts = data.kri_alerts.length;
        const openAlerts = data.kri_alerts.filter(a => a.status === 'open').length;
        const redAlerts = data.kri_alerts.filter(a => a.alert_level === 'red').length;
        return await generateReportSectionNarrative({
          section_title: 'KRI Performance',
          section_type: 'other',
          data: {
            total_alerts: totalAlerts,
            open_alerts: openAlerts,
            red_alerts: redAlerts,
            period: data.period,
          },
          audience: 'board',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => {
        return {
          kri_alerts: data.kri_alerts.map(a => ({
            kri_name: a.kri_name,
            alert_level: a.alert_level,
            measured_value: a.measured_value,
            threshold: a.threshold_breached,
            status: a.status,
            narrative: a.narrative,
          })),
        };
      },
    },
    {
      title: 'Decisions Required',
      order: 7,
      content_type: 'narrative',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const pendingExceptions = data.appetite_exceptions.filter(e => e.status === 'pending');
        const highRisks = data.risks.filter(r => r.residual_score >= 20);
        return await generateReportSectionNarrative({
          section_title: 'Decisions Required',
          section_type: 'other',
          data: {
            pending_appetite_exceptions: pendingExceptions.length,
            high_risks_requiring_action: highRisks.length,
            period: data.period,
          },
          audience: 'board',
          period: data.period,
        });
      },
    },
    {
      title: 'Appendices: Risk Register Extract',
      order: 8,
      content_type: 'table',
      default_included: false,  // Optional
      narrative_generator: async () => {
        return 'Full risk register extract for the period.';
      },
      data_generator: (data: ReportData) => {
        return {
          risks: data.risks.map(r => ({
            risk_code: r.risk_code,
            risk_title: r.risk_title,
            category: r.category,
            residual_score: r.residual_score,
            owner: r.owner,
            status: r.status,
          })),
        };
      },
    },
  ];

  return {
    audience: 'board',
    sections,
  };
}
