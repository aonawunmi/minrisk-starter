// src/lib/ai.ts
import Anthropic from '@anthropic-ai/sdk';

export type ChatMsg = { role: 'user' | 'assistant'; content: string };

export interface RiskContext {
  industry?: string;
  businessUnit?: string;
  riskCategory?: string;
  additionalContext?: string;
  existingRisks?: Array<{ title: string; description: string }>;
}

export interface GeneratedRisk {
  title: string;
  description: string;
  category: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  likelihood: 'Low' | 'Medium' | 'High';
  controlMeasures?: string[];
}

export async function askClaude(
  prompt: string,
  history: ChatMsg[] = []
): Promise<string> {
  console.log('🤖 Calling Claude API with prompt:', prompt.substring(0, 50) + '...');

  try {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_ANTHROPIC_API_KEY not configured');
    }

    const anthropic = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true // Required for client-side usage
    });

    // Convert history to Claude message format
    const messages = [
      ...history.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      {
        role: 'user' as const,
        content: prompt
      }
    ];

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Cost-efficient model
      max_tokens: 2048,
      messages: messages
    });

    const text = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    if (!text) {
      console.error('❌ No text in response:', response);
      throw new Error('No text in Claude response');
    }

    console.log('✅ Claude API response received');
    return text;
  } catch (error: any) {
    console.error('❌ Claude API call failed:', error);
    throw new Error(error.message || 'Failed to call Claude API');
  }
}

/**
 * Generate risks with context-rich prompts
 */
export async function generateRisks(
  context: RiskContext,
  count: number = 5
): Promise<GeneratedRisk[]> {
  const systemPrompt = buildRiskGenerationPrompt(context, count);

  try {
    const response = await askClaude(systemPrompt);
    return parseRisksFromResponse(response);
  } catch (error: any) {
    console.error('❌ Risk generation failed:', error);
    throw error;
  }
}

/**
 * Generate control measures for a specific risk
 */
export async function generateControlMeasures(
  riskTitle: string,
  riskDescription: string,
  context: RiskContext
): Promise<string[]> {
  const prompt = `
You are a risk management expert specializing in ${context.industry || 'enterprise risk management'}.

Risk Details:
- Title: ${riskTitle}
- Description: ${riskDescription}
${context.businessUnit ? `- Business Unit: ${context.businessUnit}` : ''}
${context.riskCategory ? `- Category: ${context.riskCategory}` : ''}

Task: Generate 5-7 specific, actionable control measures to mitigate this risk.

Requirements:
- Each control should be practical and implementable
- Include both preventive and detective controls
- Consider people, process, and technology controls
- Be specific to the risk, not generic advice

Format your response as a numbered list (1., 2., 3., etc.).
`;

  try {
    const response = await askClaude(prompt);
    return parseControlMeasuresFromResponse(response);
  } catch (error: any) {
    console.error('❌ Control measure generation failed:', error);
    throw error;
  }
}

/**
 * Build context-rich prompt for risk generation
 */
function buildRiskGenerationPrompt(context: RiskContext, count: number): string {
  let prompt = `You are a risk management expert with deep expertise in ${context.industry || 'enterprise risk management'}.

Context:`;

  if (context.industry) {
    prompt += `\n- Industry: ${context.industry}`;
  }

  if (context.businessUnit) {
    prompt += `\n- Business Unit/Department: ${context.businessUnit}`;
  }

  if (context.riskCategory) {
    prompt += `\n- Risk Category: ${context.riskCategory}`;
  }

  if (context.additionalContext) {
    prompt += `\n- Additional Context: ${context.additionalContext}`;
  }

  if (context.existingRisks && context.existingRisks.length > 0) {
    prompt += `\n\nExisting Risks Already Identified:\n`;
    context.existingRisks.slice(0, 10).forEach((risk, idx) => {
      prompt += `${idx + 1}. ${risk.title}: ${risk.description}\n`;
    });
    prompt += `\nNote: Suggest NEW risks that are different from these existing ones.`;
  }

  prompt += `

Task: Generate ${count} specific, relevant risks for this context.

For each risk, provide:
1. Title (concise, 5-10 words)
2. Description (2-3 sentences explaining the risk)
3. Category (Operational, Financial, Strategic, Compliance, Technology, Market, Reputational, etc.)
4. Severity (Low/Medium/High/Critical)
5. Likelihood (Low/Medium/High)

Requirements:
- Risks should be specific to the context provided
- Focus on realistic, material risks that could significantly impact operations
- Consider current industry trends and regulatory environment (as of 2025)
- Avoid generic risks; be specific to the industry and business unit
- Each risk should be distinct and actionable

Format your response as JSON array:
[
  {
    "title": "Risk title here",
    "description": "Risk description here",
    "category": "Category name",
    "severity": "High",
    "likelihood": "Medium"
  }
]

IMPORTANT: Respond with ONLY the JSON array, no additional text.`;

  return prompt;
}

/**
 * Parse risks from Claude's JSON response
 */
function parseRisksFromResponse(response: string): GeneratedRisk[] {
  try {
    // Extract JSON from response (in case there's extra text)
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const risks = JSON.parse(jsonMatch[0]) as GeneratedRisk[];

    // Validate each risk has required fields
    return risks.filter(risk =>
      risk.title &&
      risk.description &&
      risk.category &&
      risk.severity &&
      risk.likelihood
    );
  } catch (error) {
    console.error('❌ Failed to parse risks from response:', error);
    console.error('Response was:', response);
    throw new Error('Failed to parse AI response. Please try again.');
  }
}

/**
 * Parse control measures from Claude's response
 */
function parseControlMeasuresFromResponse(response: string): string[] {
  // Extract numbered list items (1., 2., 3., etc.)
  const lines = response.split('\n');
  const controls: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match patterns like "1.", "1)", "1 -", etc.
    const match = trimmed.match(/^(\d+)[\.\)]\s*(.+)$/);
    if (match && match[2]) {
      controls.push(match[2].trim());
    } else if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
      // Also handle bullet points
      controls.push(trimmed.substring(1).trim());
    }
  }

  return controls.filter(c => c.length > 0);
}

/**
 * AI-Powered Incident Risk Linking
 * Analyzes an incident and suggests which risks it should be linked to
 */
export interface IncidentRiskSuggestion {
  risk_code: string;
  risk_title: string;
  confidence: number; // 0-1
  reasoning: string;
}

/**
 * AI Control Adequacy Assessment
 * Analyzes controls for linked risks based on incident occurrence
 */
export interface ControlAdequacyAssessment {
  adequacy_level: 'Adequate' | 'Partially Adequate' | 'Inadequate';
  overall_reasoning: string;
  control_improvements: ControlImprovement[];
  new_control_suggestions: NewControlSuggestion[];
  priority: 'High' | 'Medium' | 'Low';
}

export interface ControlImprovement {
  risk_code: string;
  risk_title: string;
  control_description: string;
  dimension: 'design' | 'implementation' | 'monitoring' | 'effectiveness_evaluation';
  current_score: number;
  suggested_score: number;
  reasoning: string;
}

export interface NewControlSuggestion {
  risk_code: string;
  risk_title: string;
  control_description: string;
  control_type: 'Preventive' | 'Detective' | 'Corrective';
  target: 'Likelihood' | 'Impact';
  reasoning: string;
}

export async function suggestRisksForIncident(
  incident: {
    title: string;
    description: string;
    incident_type: string;
    severity: number;
    impact_description?: string;
    division?: string;
    department?: string;
  },
  availableRisks: Array<{
    risk_code: string;
    risk_title: string;
    risk_description: string;
    category: string;
    division: string;
    department: string;
  }>
): Promise<IncidentRiskSuggestion[]> {
  const prompt = `You are an expert risk analyst helping link incidents to risks in an Enterprise Risk Management (ERM) system.

INCIDENT DETAILS:
- Title: ${incident.title}
- Description: ${incident.description}
- Type: ${incident.incident_type}
- Severity: ${incident.severity}/5
${incident.impact_description ? `- Impact: ${incident.impact_description}` : ''}
${incident.division ? `- Division: ${incident.division}` : ''}
${incident.department ? `- Department: ${incident.department}` : ''}

AVAILABLE RISKS TO CONSIDER:
${availableRisks.map((r, idx) => `
${idx + 1}. [${r.risk_code}] ${r.risk_title}
   Description: ${r.risk_description}
   Category: ${r.category}
   Division: ${r.division} | Department: ${r.department}`).join('\n')}

TASK:
Analyze the incident and identify which risks from the list above should be linked to this incident. Consider:
1. Does the incident demonstrate materialization of the risk?
2. Is the incident a symptom or consequence of the risk?
3. Does the incident provide evidence about the risk's likelihood or impact?
4. Is there a causal relationship between the incident and the risk?

For each suggested risk, provide:
- risk_code: The exact risk code from the list
- confidence: A score from 0.0 to 1.0 indicating how strong the link is
- reasoning: A brief (1-2 sentences) explanation of why this risk should be linked

IMPORTANT:
- Only suggest risks with strong, clear connections (confidence >= 0.6)
- Suggest 1-5 most relevant risks maximum
- If no risks are strongly related, return an empty array

Format your response as JSON array:
[
  {
    "risk_code": "OPE-FIN-001",
    "confidence": 0.85,
    "reasoning": "Brief explanation here"
  }
]

Respond with ONLY the JSON array, no additional text.`;

  try {
    const response = await askClaude(prompt);
    const suggestions = parseSuggestionsFromResponse(response, availableRisks);

    // Enhance with risk titles
    return suggestions.map(sug => {
      const risk = availableRisks.find(r => r.risk_code === sug.risk_code);
      return {
        ...sug,
        risk_title: risk?.risk_title || 'Unknown Risk'
      };
    });
  } catch (error: any) {
    console.error('❌ Risk suggestion failed:', error);
    throw error;
  }
}

/**
 * Parse risk suggestions from Claude's JSON response
 */
function parseSuggestionsFromResponse(
  response: string,
  availableRisks: Array<{ risk_code: string }>
): IncidentRiskSuggestion[] {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log('No JSON array found, returning empty suggestions');
      return [];
    }

    const suggestions = JSON.parse(jsonMatch[0]) as Array<{
      risk_code: string;
      confidence: number;
      reasoning: string;
    }>;

    // Validate and filter suggestions
    return suggestions
      .filter(sug => {
        // Must have required fields
        if (!sug.risk_code || !sug.reasoning || typeof sug.confidence !== 'number') {
          return false;
        }
        // Risk code must exist in available risks
        const riskExists = availableRisks.some(r => r.risk_code === sug.risk_code);
        if (!riskExists) {
          console.warn(`Risk code ${sug.risk_code} not found in available risks`);
          return false;
        }
        // Confidence must be >= 0.6
        return sug.confidence >= 0.6;
      })
      .map(sug => ({
        risk_code: sug.risk_code,
        risk_title: '', // Will be filled in by caller
        confidence: sug.confidence,
        reasoning: sug.reasoning
      }))
      .sort((a, b) => b.confidence - a.confidence); // Sort by confidence descending
  } catch (error) {
    console.error('❌ Failed to parse suggestions:', error);
    console.error('Response was:', response);
    return [];
  }
}

/**
 * AI Control Adequacy Assessment
 * Analyzes if existing controls were adequate given that an incident occurred
 */
export async function assessControlAdequacy(
  incident: {
    title: string;
    description: string;
    incident_type: string;
    severity: number;
    impact_description?: string;
    root_cause?: string;
    corrective_actions?: string;
  },
  linkedRisks: Array<{
    risk_code: string;
    risk_title: string;
    risk_description: string;
    category: string;
    controls: Array<{
      description: string;
      target: 'Likelihood' | 'Impact';
      design: number;
      implementation: number;
      monitoring: number;
      effectiveness_evaluation: number;
    }>;
  }>
): Promise<ControlAdequacyAssessment> {
  const prompt = `You are an expert risk management consultant analyzing control effectiveness after an incident.

INCIDENT DETAILS:
- Title: ${incident.title}
- Description: ${incident.description}
- Type: ${incident.incident_type}
- Severity: ${incident.severity}/5
${incident.impact_description ? `- Impact: ${incident.impact_description}` : ''}
${incident.root_cause ? `- Root Cause: ${incident.root_cause}` : ''}
${incident.corrective_actions ? `- Corrective Actions Taken: ${incident.corrective_actions}` : ''}

LINKED RISKS AND THEIR CONTROLS:
${linkedRisks.map((risk, idx) => `
${idx + 1}. [${risk.risk_code}] ${risk.risk_title}
   Description: ${risk.risk_description}
   Category: ${risk.category}

   Existing Controls:
   ${risk.controls.length === 0 ? '   No controls defined' : risk.controls.map((ctrl, cidx) => `
   ${cidx + 1}. ${ctrl.description}
      Target: ${ctrl.target}
      DIME Scores: Design=${ctrl.design}, Implementation=${ctrl.implementation}, Monitoring=${ctrl.monitoring}, Effectiveness=${ctrl.effectiveness_evaluation}
   `).join('')}`).join('\n')}

TASK:
Since this incident occurred, analyze whether the existing controls were adequate. Consider:
1. Did the controls fail in design, implementation, monitoring, or effectiveness evaluation?
2. Which DIME dimensions need improvement?
3. Are new controls needed?

Provide:
1. adequacy_level: "Adequate" (incident was unavoidable), "Partially Adequate" (some gaps), or "Inadequate" (significant failures)
2. overall_reasoning: 2-3 sentences explaining the assessment
3. control_improvements: Specific DIME score adjustments for existing controls (only suggest if scores need to increase by 2+ points)
4. new_control_suggestions: Recommend new controls if existing ones have significant gaps (max 3 suggestions). Be DETAILED and SPECIFIC - each suggestion should be 2-3 sentences explaining exactly what should be implemented, how it works, and what gap it addresses.
5. priority: "High" (severe gaps), "Medium" (notable gaps), or "Low" (minor improvements)

IMPORTANT:
- All DIME scores (design, implementation, monitoring, effectiveness_evaluation) MUST be between 0 and 3
- DIME Scale: 0=Not Implemented, 1=Partially Implemented, 2=Substantially Implemented, 3=Fully Implemented
- Never suggest current_score or suggested_score below 0 or above 3
- If suggesting improvements, ensure suggested_score stays within 0-3 bounds

Format your response as JSON:
{
  "adequacy_level": "Partially Adequate",
  "overall_reasoning": "Brief explanation here",
  "control_improvements": [
    {
      "risk_code": "OPE-FIN-001",
      "control_description": "Description of the control being improved",
      "dimension": "implementation",
      "current_score": 1,
      "suggested_score": 3,
      "reasoning": "Why this improvement is needed"
    }
  ],
  "new_control_suggestions": [
    {
      "risk_code": "OPE-FIN-001",
      "control_description": "Description of new control",
      "control_type": "Preventive",
      "target": "Likelihood",
      "reasoning": "Why this control is needed"
    }
  ],
  "priority": "High"
}

IMPORTANT:
- Be realistic - not every incident means controls are inadequate
- Only suggest improvements where scores should increase by 2+ points
- Limit new controls to 3 maximum
- Respond with ONLY the JSON object, no additional text`;

  try {
    const response = await askClaude(prompt);
    const assessment = parseControlAssessmentFromResponse(response, linkedRisks);
    return assessment;
  } catch (error: any) {
    console.error('❌ Control adequacy assessment failed:', error);
    throw error;
  }
}

/**
 * Parse control assessment from Claude's JSON response
 */
function parseControlAssessmentFromResponse(
  response: string,
  linkedRisks: Array<{ risk_code: string; risk_title: string }>
): ControlAdequacyAssessment {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Enhance with risk titles and validate DIME score bounds (0-3)
    const controlImprovements = (parsed.control_improvements || []).map((imp: any) => {
      const risk = linkedRisks.find(r => r.risk_code === imp.risk_code);
      return {
        ...imp,
        current_score: Math.max(0, Math.min(3, imp.current_score || 0)),
        suggested_score: Math.max(0, Math.min(3, imp.suggested_score || 0)),
        risk_title: risk?.risk_title || 'Unknown Risk'
      };
    });

    const newControlSuggestions = (parsed.new_control_suggestions || []).map((sug: any) => {
      const risk = linkedRisks.find(r => r.risk_code === sug.risk_code);
      return {
        ...sug,
        risk_title: risk?.risk_title || 'Unknown Risk'
      };
    });

    return {
      adequacy_level: parsed.adequacy_level || 'Partially Adequate',
      overall_reasoning: parsed.overall_reasoning || 'Assessment could not be completed',
      control_improvements: controlImprovements,
      new_control_suggestions: newControlSuggestions,
      priority: parsed.priority || 'Medium'
    };
  } catch (error) {
    console.error('❌ Failed to parse control assessment:', error);
    console.error('Response was:', response);
    throw new Error('Failed to parse AI response. Please try again.');
  }
}
