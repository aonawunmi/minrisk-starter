/**
 * SEC (Securities and Exchange Commission) Report Template
 * Focus: Market integrity, investor protection, exposure limits, client asset protection, conduct risk
 */

import { ReportTemplate, ReportSectionTemplate, ReportData } from '../../types/report-types';
import { generateReportSectionNarrative } from '../narrative-generator';
import {
  generateExecutiveSummaryData,
  generateTopRisksData,
  generateControlExceptionsData,
  generateAppetiteStatusData,
} from './index';

export function getSECTemplate(): ReportTemplate {
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
          audience: 'regulator',
          regulator_type: 'SEC',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => generateExecutiveSummaryData(data),
    },
    {
      title: 'Market Risk & Exposure Limits',
      order: 2,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const marketRisks = data.risks.filter(r =>
          r.category === 'Market' || r.category === 'Liquidity'
        );
        return await generateReportSectionNarrative({
          section_title: 'Market Risk & Exposure Limits',
          section_type: 'other',
          data: {
            market_risks: marketRisks.length,
            high_market_risks: marketRisks.filter(r => r.residual_score >= 15).length,
            period: data.period,
          },
          audience: 'regulator',
          regulator_type: 'SEC',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => {
        const marketRisks = data.risks.filter(r =>
          r.category === 'Market' || r.category === 'Liquidity'
        );
        return {
          market_risks: marketRisks.map(r => ({
            risk_code: r.risk_code,
            risk_title: r.risk_title,
            category: r.category,
            residual_score: r.residual_score,
          })),
        };
      },
    },
    {
      title: 'Client Asset Protection & Segregation',
      order: 3,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const operationalRisks = data.risks.filter(r => r.category === 'Operational');
        return await generateReportSectionNarrative({
          section_title: 'Client Asset Protection & Segregation',
          section_type: 'other',
          data: {
            operational_risks: operationalRisks.length,
            high_operational_risks: operationalRisks.filter(r => r.residual_score >= 15).length,
            period: data.period,
          },
          audience: 'regulator',
          regulator_type: 'SEC',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => {
        const operationalRisks = data.risks.filter(r => r.category === 'Operational');
        return {
          operational_risks: operationalRisks.map(r => ({
            risk_code: r.risk_code,
            risk_title: r.risk_title,
            residual_score: r.residual_score,
            owner: r.owner,
          })),
        };
      },
    },
    {
      title: 'Concentration Risk & Single Exposure Limits',
      order: 4,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const creditRisks = data.risks.filter(r => r.category === 'Credit' || r.category === 'Counterparty');
        return await generateReportSectionNarrative({
          section_title: 'Concentration Risk & Single Exposure Limits',
          section_type: 'other',
          data: {
            concentration_risks: creditRisks.length,
            high_concentration_risks: creditRisks.filter(r => r.residual_score >= 15).length,
            period: data.period,
          },
          audience: 'regulator',
          regulator_type: 'SEC',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => {
        const creditRisks = data.risks.filter(r => r.category === 'Credit' || r.category === 'Counterparty');
        return {
          concentration_risks: creditRisks.map(r => ({
            risk_code: r.risk_code,
            risk_title: r.risk_title,
            residual_score: r.residual_score,
          })),
        };
      },
    },
    {
      title: 'Conduct Risk & Market Abuse',
      order: 5,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const complianceRisks = data.risks.filter(r =>
          r.category === 'Compliance' || r.category === 'Regulatory'
        );
        const incidents = data.incidents || [];
        return await generateReportSectionNarrative({
          section_title: 'Conduct Risk & Market Abuse',
          section_type: 'other',
          data: {
            compliance_risks: complianceRisks.length,
            incidents: incidents.length,
            material_incidents: incidents.filter(i => i.financial_impact > 0).length,
            period: data.period,
          },
          audience: 'regulator',
          regulator_type: 'SEC',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => {
        const incidents = (data.incidents || []).map(i => ({
          incident_id: i.id,
          incident_type: i.incident_type,
          description: i.description,
          financial_impact: i.financial_impact,
          date: i.incident_date,
        }));
        return { incidents };
      },
    },
    {
      title: 'Stress Test Results',
      order: 6,
      content_type: 'narrative',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        return await generateReportSectionNarrative({
          section_title: 'Stress Test Results',
          section_type: 'other',
          data: {
            total_risks: data.risks.length,
            stress_scenarios: 'N/A',  // Would come from stress testing module
            period: data.period,
          },
          audience: 'regulator',
          regulator_type: 'SEC',
          period: data.period,
        });
      },
    },
    {
      title: 'Control Exceptions & System Deficiencies',
      order: 7,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const exceptionsData = generateControlExceptionsData(data);
        return await generateReportSectionNarrative({
          section_title: 'Control Exceptions & System Deficiencies',
          section_type: 'control_exceptions',
          data: exceptionsData,
          audience: 'regulator',
          regulator_type: 'SEC',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => generateControlExceptionsData(data),
    },
    {
      title: 'Risk Appetite Breaches & Remediation',
      order: 8,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const appetiteData = generateAppetiteStatusData(data);
        return await generateReportSectionNarrative({
          section_title: 'Risk Appetite Breaches',
          section_type: 'appetite_status',
          data: appetiteData,
          audience: 'regulator',
          regulator_type: 'SEC',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => generateAppetiteStatusData(data),
    },
    {
      title: 'Forward-Looking Risk Assessment',
      order: 9,
      content_type: 'narrative',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        return await generateReportSectionNarrative({
          section_title: 'Forward-Looking Risk Assessment',
          section_type: 'forward_look',
          data: {
            rising_risks: data.risk_movements.filter(m => m.velocity === 'rising').length,
            emerging_risks: 'To be assessed',  // Would come from intelligence module
            period: data.period,
          },
          audience: 'regulator',
          regulator_type: 'SEC',
          period: data.period,
        });
      },
    },
    {
      title: 'Appendices: Risk Register Extract',
      order: 10,
      content_type: 'table',
      default_included: false,  // Optional appendix
      narrative_generator: async () => {
        return 'Complete risk register extract attached.';
      },
      data_generator: (data: ReportData) => {
        return {
          risks: data.risks.map(r => ({
            risk_code: r.risk_code,
            risk_title: r.risk_title,
            category: r.category,
            inherent_score: r.inherent_score,
            residual_score: r.residual_score,
            owner: r.owner,
            status: r.status,
          })),
        };
      },
    },
  ];

  return {
    audience: 'regulator',
    regulator_type: 'SEC',
    sections,
  };
}
