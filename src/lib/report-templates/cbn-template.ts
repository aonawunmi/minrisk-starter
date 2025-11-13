/**
 * CBN (Central Bank of Nigeria) Report Template
 * Focus: Prudential soundness, capital adequacy, liquidity, credit quality, operational resilience
 */

import { ReportTemplate, ReportSectionTemplate, ReportData } from '../../types/report-types';
import { generateReportSectionNarrative } from '../narrative-generator';
import {
  generateExecutiveSummaryData,
  generateTopRisksData,
  generateControlExceptionsData,
  generateAppetiteStatusData,
} from './index';

export function getCBNTemplate(): ReportTemplate {
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
          regulator_type: 'CBN',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => generateExecutiveSummaryData(data),
    },
    {
      title: 'Capital Adequacy & Liquidity',
      order: 2,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const capitalRisks = data.risks.filter(r =>
          r.category === 'Market' || r.category === 'Liquidity'
        );
        return await generateReportSectionNarrative({
          section_title: 'Capital Adequacy & Liquidity',
          section_type: 'other',
          data: {
            capital_risks: capitalRisks.length,
            high_capital_risks: capitalRisks.filter(r => r.residual_score >= 15).length,
            period: data.period,
          },
          audience: 'regulator',
          regulator_type: 'CBN',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => {
        const capitalRisks = data.risks.filter(r =>
          r.category === 'Market' || r.category === 'Liquidity'
        );
        return {
          capital_risks: capitalRisks.map(r => ({
            risk_code: r.risk_code,
            risk_title: r.risk_title,
            category: r.category,
            residual_score: r.residual_score,
          })),
        };
      },
    },
    {
      title: 'Credit Risk Quality & Concentrations',
      order: 3,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const creditRisks = data.risks.filter(r => r.category === 'Credit');
        return await generateReportSectionNarrative({
          section_title: 'Credit Risk Quality & Concentrations',
          section_type: 'other',
          data: {
            credit_risks: creditRisks.length,
            high_credit_risks: creditRisks.filter(r => r.residual_score >= 15).length,
            period: data.period,
          },
          audience: 'regulator',
          regulator_type: 'CBN',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => {
        const creditRisks = data.risks.filter(r => r.category === 'Credit');
        return {
          credit_risks: creditRisks.map(r => ({
            risk_code: r.risk_code,
            risk_title: r.risk_title,
            residual_score: r.residual_score,
            owner: r.owner,
          })),
        };
      },
    },
    {
      title: 'Market Risk Exposures',
      order: 4,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const marketRisks = data.risks.filter(r => r.category === 'Market');
        return await generateReportSectionNarrative({
          section_title: 'Market Risk Exposures',
          section_type: 'other',
          data: {
            market_risks: marketRisks.length,
            high_market_risks: marketRisks.filter(r => r.residual_score >= 15).length,
            period: data.period,
          },
          audience: 'regulator',
          regulator_type: 'CBN',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => {
        const marketRisks = data.risks.filter(r => r.category === 'Market');
        return {
          market_risks: marketRisks.map(r => ({
            risk_code: r.risk_code,
            risk_title: r.risk_title,
            residual_score: r.residual_score,
          })),
        };
      },
    },
    {
      title: 'Operational Loss Events',
      order: 5,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const operationalRisks = data.risks.filter(r =>
          r.category === 'Operational' || r.category === 'Technology'
        );
        const incidents = data.incidents || [];
        return await generateReportSectionNarrative({
          section_title: 'Operational Loss Events',
          section_type: 'other',
          data: {
            operational_risks: operationalRisks.length,
            incidents: incidents.length,
            material_incidents: incidents.filter(i => i.financial_impact > 0).length,
            period: data.period,
          },
          audience: 'regulator',
          regulator_type: 'CBN',
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
      title: 'ICAAP Highlights',
      order: 6,
      content_type: 'narrative',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        return await generateReportSectionNarrative({
          section_title: 'ICAAP Highlights',
          section_type: 'other',
          data: {
            total_risks: data.risks.length,
            stress_scenarios: 'N/A',  // Would come from stress testing module
            period: data.period,
          },
          audience: 'regulator',
          regulator_type: 'CBN',
          period: data.period,
        });
      },
    },
    {
      title: 'Control Exceptions (DIME Failures)',
      order: 7,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const exceptionsData = generateControlExceptionsData(data);
        return await generateReportSectionNarrative({
          section_title: 'Control Exceptions',
          section_type: 'control_exceptions',
          data: exceptionsData,
          audience: 'regulator',
          regulator_type: 'CBN',
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
          regulator_type: 'CBN',
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
          regulator_type: 'CBN',
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
    regulator_type: 'CBN',
    sections,
  };
}
