/**
 * Narrative Generation Engine
 * Uses Claude AI to generate decision-oriented narratives for:
 * - KRI breaches
 * - Risk appetite exceptions
 * - Report sections
 */

import Anthropic from '@anthropic-ai/sdk';

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
const anthropic = new Anthropic({ apiKey: API_KEY, dangerouslyAllowBrowser: true });

// ===== KRI BREACH NARRATIVE =====
export interface KRIBreachData {
  kri_name: string;
  category: string;
  threshold_breached: number;
  measured_value: number;
  breach_date: string;
  alert_level: 'yellow' | 'red';
  owner?: string;
  remediation_status?: string;
  eta?: string;
}

/**
 * Generate narrative for a KRI breach
 * Format: "[Category] risk breached [threshold] on [date]; measured at [value];
 * remediation [status]; owner: [name]; ETA: [date]."
 */
export async function generateKRIBreachNarrative(breach: KRIBreachData): Promise<string> {
  const prompt = `You are a risk management analyst writing concise breach narratives for board reports.

Generate a 1-2 sentence narrative for this KRI breach:

KRI Name: ${breach.kri_name}
Category: ${breach.category}
Threshold: ${breach.threshold_breached}
Measured Value: ${breach.measured_value}
Breach Date: ${breach.breach_date}
Alert Level: ${breach.alert_level === 'red' ? 'Critical' : 'Warning'}
${breach.owner ? `Owner: ${breach.owner}` : ''}
${breach.remediation_status ? `Remediation Status: ${breach.remediation_status}` : ''}
${breach.eta ? `Expected Resolution: ${breach.eta}` : ''}

Write a decision-oriented narrative following this format:
"[Category] risk breached [threshold] on [date]; measured at [value]; remediation [status]; owner: [name]; ETA: [date]."

Keep it factual, concise, and action-focused. Do not add unnecessary context.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text.trim();
    }
    return `${breach.category} risk breached threshold (${breach.threshold_breached}) on ${breach.breach_date}.`;
  } catch (error) {
    console.error('Error generating KRI breach narrative:', error);
    // Fallback to template
    return `${breach.category} risk breached threshold (${breach.threshold_breached}) on ${breach.breach_date}; measured at ${breach.measured_value}${breach.owner ? `; owner: ${breach.owner}` : ''}${breach.eta ? `; ETA: ${breach.eta}` : ''}.`;
  }
}

// ===== APPETITE EXCEPTION NARRATIVE =====
export interface AppetiteExceptionData {
  risk_code: string;
  risk_title: string;
  category: string;
  appetite_threshold: number;
  actual_score: number;
  exception_date: string;
  status: 'pending' | 'approved' | 'rejected';
  owner?: string;
  remediation_plan?: string;
  target_date?: string;
}

/**
 * Generate narrative for risk appetite exception
 */
export async function generateAppetiteExceptionNarrative(exception: AppetiteExceptionData): Promise<string> {
  const prompt = `You are a risk management analyst writing concise narratives for risk appetite breaches.

Generate a 1-2 sentence narrative for this appetite exception:

Risk Code: ${exception.risk_code}
Risk Title: ${exception.risk_title}
Category: ${exception.category}
Appetite Threshold: ${exception.appetite_threshold}
Actual Score: ${exception.actual_score}
Breach Date: ${exception.exception_date}
Status: ${exception.status}
${exception.owner ? `Owner: ${exception.owner}` : ''}
${exception.remediation_plan ? `Remediation Plan: ${exception.remediation_plan}` : ''}
${exception.target_date ? `Target Completion: ${exception.target_date}` : ''}

Write a decision-oriented narrative explaining:
1. What exceeded appetite
2. By how much (risk score vs threshold)
3. Current status and action plan

Keep it factual, concise, and board-ready.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 250,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text.trim();
    }
    return `${exception.risk_title} (${exception.risk_code}) exceeded appetite threshold of ${exception.appetite_threshold} with actual score ${exception.actual_score}.`;
  } catch (error) {
    console.error('Error generating appetite exception narrative:', error);
    // Fallback to template
    return `${exception.risk_title} (${exception.risk_code}) exceeded appetite threshold of ${exception.appetite_threshold} with actual score ${exception.actual_score} on ${exception.exception_date}${exception.status === 'approved' ? '; exception approved' : exception.status === 'rejected' ? '; exception rejected' : '; pending approval'}${exception.target_date ? `; remediation target: ${exception.target_date}` : ''}.`;
  }
}

// ===== REPORT SECTION NARRATIVE =====
export interface ReportSectionData {
  section_title: string;
  section_type: 'executive_summary' | 'top_risks' | 'control_exceptions' | 'appetite_status' | 'forward_look' | 'other';
  data: any;
  audience: 'regulator' | 'board' | 'ceo';
  regulator_type?: 'CBN' | 'SEC' | 'PENCOM';
  period: string;
}

/**
 * Generate narrative for report sections
 * Used in automated report generation
 */
export async function generateReportSectionNarrative(sectionData: ReportSectionData): Promise<string> {
  let contextPrompt = '';

  // Audience-specific instructions
  if (sectionData.audience === 'regulator') {
    if (sectionData.regulator_type === 'CBN') {
      contextPrompt = 'This is for the Central Bank of Nigeria (CBN). Focus on prudential soundness, capital adequacy, liquidity, credit quality, operational resilience, and regulatory compliance.';
    } else if (sectionData.regulator_type === 'SEC') {
      contextPrompt = 'This is for the Securities and Exchange Commission (SEC). Focus on market integrity, investor protection, exposure limits, client asset protection, and conduct risk.';
    } else if (sectionData.regulator_type === 'PENCOM') {
      contextPrompt = 'This is for the National Pension Commission (PENCOM). Focus on investment allocation vs caps, concentration risk, ALM/duration management, and operational/fraud risk.';
    }
  } else if (sectionData.audience === 'board') {
    contextPrompt = 'This is for the Board Risk Committee (BRC). Focus on strategic oversight, top risks, trend analysis, appetite utilization, and decisions required. Be direct and highlight actionable items.';
  } else if (sectionData.audience === 'ceo') {
    contextPrompt = 'This is for the CEO/EXCO. Be extremely concise (one-pager). Focus on business impact, cost of risk, time-to-mitigation, and ownership accountability.';
  }

  const prompt = `You are a Chief Risk Officer writing a ${sectionData.section_title} section for a risk management report.

**Audience Context:** ${contextPrompt}

**Section Type:** ${sectionData.section_type}
**Period:** ${sectionData.period}

**Data:**
${JSON.stringify(sectionData.data, null, 2)}

Generate a professional, decision-oriented narrative for this section.
- Use clear, direct language
- Focus on material issues and actions
- Avoid jargon unless industry-standard
- Include specific numbers and dates where relevant
- Make it board-ready

Length: ${sectionData.audience === 'ceo' ? '2-3 sentences' : '3-5 sentences'}.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: sectionData.audience === 'ceo' ? 300 : 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text.trim();
    }
    return '[Narrative generation in progress...]';
  } catch (error) {
    console.error('Error generating report section narrative:', error);
    return '[AI narrative generation unavailable. Please add narrative manually.]';
  }
}

// ===== RISK MOVEMENT NARRATIVE =====
export interface RiskMovementData {
  risk_code: string;
  risk_title: string;
  category: string;
  previous_score: number;
  current_score: number;
  change: number;
  velocity: 'rising' | 'falling' | 'stable';
  period: string;
  reason?: string;
}

/**
 * Generate narrative for risk movement/velocity
 * Used in trend analysis sections
 */
export async function generateRiskMovementNarrative(movement: RiskMovementData): Promise<string> {
  const direction = movement.velocity === 'rising' ? 'increased' : movement.velocity === 'falling' ? 'decreased' : 'remained stable';
  const bucket_change = Math.abs(movement.change);

  const prompt = `Generate a concise one-sentence narrative for this risk movement:

Risk: ${movement.risk_title} (${movement.risk_code})
Category: ${movement.category}
Previous Score: ${movement.previous_score}
Current Score: ${movement.current_score}
Change: ${movement.velocity === 'rising' ? '+' : movement.velocity === 'falling' ? '-' : ''}${bucket_change}
Period: ${movement.period}
${movement.reason ? `Reason: ${movement.reason}` : ''}

Format: "[Risk name] [increased/decreased/remained stable] from [bucket] to [bucket] in [period] due to [reason]."

Keep it factual and under 25 words.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text.trim();
    }
    return `${movement.risk_title} ${direction} from ${movement.previous_score} to ${movement.current_score} in ${movement.period}.`;
  } catch (error) {
    console.error('Error generating risk movement narrative:', error);
    return `${movement.risk_title} ${direction} from ${movement.previous_score} to ${movement.current_score} in ${movement.period}.`;
  }
}
