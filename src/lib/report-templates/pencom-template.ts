/**
 * PENCOM (National Pension Commission) Report Template
 * Focus: Investment allocation vs caps, concentration risk, ALM/duration management, operational/fraud risk, RSA operations
 */

import { ReportTemplate, ReportSectionTemplate, ReportData } from '../../types/report-types';
import { generateReportSectionNarrative } from '../narrative-generator';
import {
  generateExecutiveSummaryData,
  generateTopRisksData,
  generateControlExceptionsData,
  generateAppetiteStatusData,
} from './index';

export function getPENCOMTemplate(): ReportTemplate {
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
          regulator_type: 'PENCOM',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => generateExecutiveSummaryData(data),
    },
    {
      title: 'Investment Allocation vs Regulatory Caps',
      order: 2,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const marketRisks = data.risks.filter(r =>
          r.category === 'Market' || r.category === 'Investment'
        );
        return await generateReportSectionNarrative({
          section_title: 'Investment Allocation vs Regulatory Caps',
          section_type: 'other',
          data: {
            investment_risks: marketRisks.length,
            high_investment_risks: marketRisks.filter(r => r.residual_score >= 15).length,
            period: data.period,
          },
          audience: 'regulator',
          regulator_type: 'PENCOM',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => {
        const marketRisks = data.risks.filter(r =>
          r.category === 'Market' || r.category === 'Investment'
        );
        return {
          investment_risks: marketRisks.map(r => ({
            risk_code: r.risk_code,
            risk_title: r.risk_title,
            category: r.category,
            residual_score: r.residual_score,
          })),
        };
      },
    },
    {
      title: 'Concentration Risk & Issuer Limits',
      order: 3,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const concentrationRisks = data.risks.filter(r =>
          r.category === 'Credit' || r.category === 'Counterparty'
        );
        return await generateReportSectionNarrative({
          section_title: 'Concentration Risk & Issuer Limits',
          section_type: 'other',
          data: {
            concentration_risks: concentrationRisks.length,
            high_concentration_risks: concentrationRisks.filter(r => r.residual_score >= 15).length,
            period: data.period,
          },
          audience: 'regulator',
          regulator_type: 'PENCOM',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => {
        const concentrationRisks = data.risks.filter(r =>
          r.category === 'Credit' || r.category === 'Counterparty'
        );
        return {
          concentration_risks: concentrationRisks.map(r => ({
            risk_code: r.risk_code,
            risk_title: r.risk_title,
            residual_score: r.residual_score,
            owner: r.owner,
          })),
        };
      },
    },
    {
      title: 'ALM & Duration Management',
      order: 4,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const liquidityRisks = data.risks.filter(r => r.category === 'Liquidity');
        return await generateReportSectionNarrative({
          section_title: 'ALM & Duration Management',
          section_type: 'other',
          data: {
            alm_risks: liquidityRisks.length,
            high_alm_risks: liquidityRisks.filter(r => r.residual_score >= 15).length,
            period: data.period,
          },
          audience: 'regulator',
          regulator_type: 'PENCOM',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => {
        const liquidityRisks = data.risks.filter(r => r.category === 'Liquidity');
        return {
          alm_risks: liquidityRisks.map(r => ({
            risk_code: r.risk_code,
            risk_title: r.risk_title,
            residual_score: r.residual_score,
          })),
        };
      },
    },
    {
      title: 'RSA Operations & Contributor Protection',
      order: 5,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const operationalRisks = data.risks.filter(r =>
          r.category === 'Operational' || r.category === 'Technology'
        );
        const incidents = data.incidents || [];
        return await generateReportSectionNarrative({
          section_title: 'RSA Operations & Contributor Protection',
          section_type: 'other',
          data: {
            operational_risks: operationalRisks.length,
            incidents: incidents.length,
            material_incidents: incidents.filter(i => i.financial_impact > 0).length,
            period: data.period,
          },
          audience: 'regulator',
          regulator_type: 'PENCOM',
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
      title: 'Fraud Risk & Custody Controls',
      order: 6,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const fraudRisks = data.risks.filter(r =>
          r.category === 'Compliance' || r.category === 'Fraud'
        );
        return await generateReportSectionNarrative({
          section_title: 'Fraud Risk & Custody Controls',
          section_type: 'other',
          data: {
            fraud_risks: fraudRisks.length,
            high_fraud_risks: fraudRisks.filter(r => r.residual_score >= 15).length,
            period: data.period,
          },
          audience: 'regulator',
          regulator_type: 'PENCOM',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => {
        const fraudRisks = data.risks.filter(r =>
          r.category === 'Compliance' || r.category === 'Fraud'
        );
        return {
          fraud_risks: fraudRisks.map(r => ({
            risk_code: r.risk_code,
            risk_title: r.risk_title,
            residual_score: r.residual_score,
            owner: r.owner,
          })),
        };
      },
    },
    {
      title: 'Performance & Fund Management',
      order: 7,
      content_type: 'narrative',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        return await generateReportSectionNarrative({
          section_title: 'Performance & Fund Management',
          section_type: 'other',
          data: {
            total_risks: data.risks.length,
            performance_metrics: 'To be reported',  // Would come from fund performance module
            period: data.period,
          },
          audience: 'regulator',
          regulator_type: 'PENCOM',
          period: data.period,
        });
      },
    },
    {
      title: 'Control Exceptions & System Deficiencies',
      order: 8,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const exceptionsData = generateControlExceptionsData(data);
        return await generateReportSectionNarrative({
          section_title: 'Control Exceptions & System Deficiencies',
          section_type: 'control_exceptions',
          data: exceptionsData,
          audience: 'regulator',
          regulator_type: 'PENCOM',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => generateControlExceptionsData(data),
    },
    {
      title: 'Risk Appetite Breaches & Remediation',
      order: 9,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const appetiteData = generateAppetiteStatusData(data);
        return await generateReportSectionNarrative({
          section_title: 'Risk Appetite Breaches',
          section_type: 'appetite_status',
          data: appetiteData,
          audience: 'regulator',
          regulator_type: 'PENCOM',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => generateAppetiteStatusData(data),
    },
    {
      title: 'Forward-Looking Risk Assessment',
      order: 10,
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
          regulator_type: 'PENCOM',
          period: data.period,
        });
      },
    },
    {
      title: 'Appendices: Risk Register Extract',
      order: 11,
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
    regulator_type: 'PENCOM',
    sections,
  };
}
