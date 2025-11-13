/**
 * CEO/EXCO Report Template
 * Focus: One-pager, business impact, cost of risk, time-to-mitigation, accountability
 */

import { ReportTemplate, ReportSectionTemplate, ReportData } from '../../types/report-types';
import { generateReportSectionNarrative } from '../narrative-generator';

export function getCEOTemplate(): ReportTemplate {
  const sections: ReportSectionTemplate[] = [
    {
      title: 'Executive One-Page Summary',
      order: 1,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const highRisks = data.risks.filter(r => r.residual_score >= 15);
        const criticalBreaches = data.kri_alerts.filter(a => a.alert_level === 'red' && a.status === 'open');
        const pendingExceptions = data.appetite_exceptions.filter(e => e.status === 'pending');
        const risingRisks = data.risk_movements.filter(m => m.velocity === 'rising');

        return await generateReportSectionNarrative({
          section_title: 'Executive Summary',
          section_type: 'executive_summary',
          data: {
            total_risks: data.risks.length,
            high_severe_risks: highRisks.length,
            critical_breaches: criticalBreaches.length,
            pending_appetite_exceptions: pendingExceptions.length,
            rising_risks: risingRisks.length,
            period: data.period,
          },
          audience: 'ceo',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => {
        const highRisks = data.risks.filter(r => r.residual_score >= 15);
        const criticalBreaches = data.kri_alerts.filter(a => a.alert_level === 'red' && a.status === 'open');
        const pendingExceptions = data.appetite_exceptions.filter(e => e.status === 'pending');
        const risingRisks = data.risk_movements.filter(m => m.velocity === 'rising');

        return {
          total_risks: data.risks.length,
          high_severe_risks: highRisks.length,
          critical_breaches: criticalBreaches.length,
          pending_appetite_exceptions: pendingExceptions.length,
          rising_risks: risingRisks.length,
          key_metrics: [
            { label: 'Total Risks', value: data.risks.length },
            { label: 'High/Severe Risks', value: highRisks.length },
            { label: 'Critical KRI Breaches', value: criticalBreaches.length },
            { label: 'Pending Appetite Exceptions', value: pendingExceptions.length },
            { label: 'Rising Risks', value: risingRisks.length },
          ],
        };
      },
    },
    {
      title: 'Business Impact Highlights',
      order: 2,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const businessImpactRisks = data.risks
          .filter(r => r.category === 'Strategic' || r.category === 'Operational')
          .filter(r => r.residual_score >= 12);

        return await generateReportSectionNarrative({
          section_title: 'Business Impact',
          section_type: 'other',
          data: {
            business_impact_risks: businessImpactRisks.length,
            top_business_risks: businessImpactRisks.slice(0, 3).map(r => r.risk_title),
            period: data.period,
          },
          audience: 'ceo',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => {
        const businessImpactRisks = data.risks
          .filter(r => r.category === 'Strategic' || r.category === 'Operational')
          .filter(r => r.residual_score >= 12);

        return {
          business_risks: businessImpactRisks.slice(0, 5).map(r => ({
            risk_code: r.risk_code,
            risk_title: r.risk_title,
            category: r.category,
            residual_score: r.residual_score,
            owner: r.owner,
          })),
        };
      },
    },
    {
      title: 'Cost of Risk',
      order: 3,
      content_type: 'mixed',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const totalIncidents = data.incidents.length;
        const financialImpact = data.incidents.reduce((sum, i) => sum + (i.financial_impact || 0), 0);

        return await generateReportSectionNarrative({
          section_title: 'Cost of Risk',
          section_type: 'other',
          data: {
            total_incidents: totalIncidents,
            financial_impact: financialImpact,
            period: data.period,
          },
          audience: 'ceo',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => {
        const totalIncidents = data.incidents.length;
        const financialImpact = data.incidents.reduce((sum, i) => sum + (i.financial_impact || 0), 0);
        const materialIncidents = data.incidents.filter(i => i.financial_impact > 0);

        return {
          total_incidents: totalIncidents,
          financial_impact: financialImpact,
          material_incidents: materialIncidents.map(i => ({
            incident_type: i.incident_type,
            description: i.description,
            financial_impact: i.financial_impact,
            date: i.incident_date,
          })),
        };
      },
    },
    {
      title: 'Time-to-Mitigation for Top Risks',
      order: 4,
      content_type: 'table',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        const topRisks = data.risks
          .filter(r => r.residual_score >= 15)
          .slice(0, 5);

        return await generateReportSectionNarrative({
          section_title: 'Time-to-Mitigation',
          section_type: 'other',
          data: {
            top_risks_count: topRisks.length,
            period: data.period,
          },
          audience: 'ceo',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => {
        const topRisks = data.risks
          .filter(r => r.residual_score >= 15)
          .slice(0, 5);

        return {
          risks_with_timeline: topRisks.map(r => ({
            risk_code: r.risk_code,
            risk_title: r.risk_title,
            residual_score: r.residual_score,
            owner: r.owner,
            target_date: r.target_date || 'TBD',
            days_overdue: r.target_date ? Math.max(0, Math.floor((new Date().getTime() - new Date(r.target_date).getTime()) / (1000 * 60 * 60 * 24))) : 0,
          })),
        };
      },
    },
    {
      title: 'Ownership & Accountability',
      order: 5,
      content_type: 'table',
      default_included: true,
      narrative_generator: async (data: ReportData) => {
        // Group risks by owner
        const risksByOwner = data.risks.reduce((acc: any, r) => {
          if (!acc[r.owner]) {
            acc[r.owner] = [];
          }
          acc[r.owner].push(r);
          return acc;
        }, {});

        const ownerCount = Object.keys(risksByOwner).length;

        return await generateReportSectionNarrative({
          section_title: 'Ownership & Accountability',
          section_type: 'other',
          data: {
            risk_owners: ownerCount,
            total_risks: data.risks.length,
            period: data.period,
          },
          audience: 'ceo',
          period: data.period,
        });
      },
      data_generator: (data: ReportData) => {
        // Group risks by owner
        const risksByOwner = data.risks.reduce((acc: any, r) => {
          if (!acc[r.owner]) {
            acc[r.owner] = {
              owner: r.owner,
              total_risks: 0,
              high_risks: 0,
              open_risks: 0,
            };
          }
          acc[r.owner].total_risks++;
          if (r.residual_score >= 15) acc[r.owner].high_risks++;
          if (r.status === 'Open') acc[r.owner].open_risks++;
          return acc;
        }, {});

        return {
          ownership_summary: Object.values(risksByOwner),
        };
      },
    },
  ];

  return {
    audience: 'ceo',
    sections,
  };
}
