// src/lib/riskIntelligence.ts
// Risk Intelligence Monitor - Real-time Risk Intelligence from Web Sources

import { supabase } from './supabase';
import type { RiskRow } from './database';
import { askClaude } from './ai';

// =====================================================
// TYPES
// =====================================================

export type EventCategory = 'cybersecurity' | 'regulatory' | 'market' | 'environmental' | 'operational';
export type AlertStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export type ExternalEvent = {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  source_name: string;
  source_url: string;
  published_date: string;
  event_category: EventCategory;
  keywords: string[];
  country: string;
  relevance_score: number;
  affected_risk_categories: string[];
  created_at: string;
};

export type RiskIntelligenceAlert = {
  id: string;
  organization_id: string;
  risk_code: string;
  risk_title?: string;
  risk_description?: string;
  event_id: string;
  suggested_likelihood_change: number;
  reasoning: string;
  confidence_score: number;
  suggested_controls: string[];
  impact_assessment: string;
  status: AlertStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  applied_to_risk?: boolean;
  applied_at?: string;
  applied_by?: string;
  treatment_notes?: string;
  created_at: string;
  expires_at: string;
};

export type RiskAlertWithEvent = RiskIntelligenceAlert & {
  event: ExternalEvent;
};

export type NewsSource = {
  name: string;
  url: string;
  categories: EventCategory[];
  country?: string;
};

// AI Analysis Result
export type EventRiskAnalysis = {
  is_relevant: boolean;
  reasoning: string;
  likelihood_change: number; // -2, -1, 0, +1, +2
  confidence: number; // 0-1
  suggested_controls: string[];
  impact_assessment: string;
};

// =====================================================
// NEWS SOURCES CONFIGURATION (FREE)
// =====================================================

export const NEWS_SOURCES: {
  nigeria: { regulatory: NewsSource[]; news: NewsSource[] };
  global: { cybersecurity: NewsSource[]; environmental: NewsSource[] };
} = {
  nigeria: {
    regulatory: [
      {
        name: 'Central Bank of Nigeria',
        url: 'https://www.cbn.gov.ng/rss/news.xml',
        categories: ['market', 'regulatory'],
        country: 'Nigeria',
      },
      {
        name: 'SEC Nigeria',
        url: 'https://sec.gov.ng/feed/',
        categories: ['regulatory', 'market'],
        country: 'Nigeria',
      },
      {
        name: 'FMDQ Group',
        url: 'https://fmdqgroup.com/feed/',
        categories: ['market'],
        country: 'Nigeria',
      },
    ],
    news: [
      {
        name: 'BusinessDay Nigeria',
        url: 'https://businessday.ng/feed/',
        categories: ['market', 'operational'],
        country: 'Nigeria',
      },
      {
        name: 'The Guardian Nigeria',
        url: 'https://guardian.ng/feed/',
        categories: ['market', 'operational', 'environmental'],
        country: 'Nigeria',
      },
      {
        name: 'Premium Times',
        url: 'https://www.premiumtimesng.com/feed',
        categories: ['market', 'operational', 'regulatory'],
        country: 'Nigeria',
      },
    ],
  },
  global: {
    cybersecurity: [
      {
        name: 'US-CERT Alerts',
        url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
        categories: ['cybersecurity'],
      },
      {
        name: 'SANS ISC',
        url: 'https://isc.sans.edu/rssfeed.xml',
        categories: ['cybersecurity'],
      },
    ],
    environmental: [
      {
        name: 'UN Environment',
        url: 'https://www.unep.org/news-and-stories/rss.xml',
        categories: ['environmental'],
      },
    ],
  },
};

// =====================================================
// DATABASE OPERATIONS - EXTERNAL EVENTS
// =====================================================

/**
 * Store external event
 */
export async function storeExternalEvent(
  eventData: Omit<ExternalEvent, 'id' | 'organization_id' | 'created_at'>
): Promise<{ data: ExternalEvent | null; error: any }> {
  try {
    // Get current user's organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!profile) {
      return { data: null, error: 'User profile not found' };
    }

    const { data, error } = await supabase
      .from('external_events')
      .insert({
        organization_id: profile.organization_id,
        ...eventData,
      })
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error storing external event:', error);
    return { data: null, error };
  }
}

/**
 * Load recent external events
 */
export async function loadExternalEvents(
  limit: number = 50,
  category?: EventCategory
): Promise<{ data: ExternalEvent[] | null; error: any }> {
  try {
    // Get current user's organization_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!profile) {
      return { data: null, error: 'User profile not found' };
    }

    let query = supabase
      .from('external_events')
      .select('*')
      .eq('organization_id', profile.organization_id) // CRITICAL: Filter by organization
      .order('published_date', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('event_category', category);
    }

    const { data, error } = await query;

    return { data, error };
  } catch (error) {
    console.error('Error loading external events:', error);
    return { data: null, error };
  }
}

// =====================================================
// DATABASE OPERATIONS - RISK INTELLIGENCE ALERTS
// =====================================================

/**
 * Create risk intelligence alert
 */
export async function createRiskAlert(
  risk_code: string,
  event_id: string,
  analysis: EventRiskAnalysis
): Promise<{ data: RiskIntelligenceAlert | null; error: any }> {
  try {
    // Get current user's organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!profile) {
      return { data: null, error: 'User profile not found' };
    }

    const { data, error } = await supabase
      .from('risk_intelligence_alerts')
      .insert({
        organization_id: profile.organization_id,
        risk_code,
        event_id,
        suggested_likelihood_change: analysis.likelihood_change,
        reasoning: analysis.reasoning,
        confidence_score: analysis.confidence,
        suggested_controls: analysis.suggested_controls,
        impact_assessment: analysis.impact_assessment,
        status: 'pending',
      })
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error creating risk alert:', error);
    return { data: null, error };
  }
}

/**
 * Load risk intelligence alerts
 */
export async function loadRiskAlerts(
  status?: AlertStatus,
  risk_code?: string
): Promise<{ data: RiskAlertWithEvent[] | null; error: any }> {
  try {
    // Get current user's organization_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!profile) {
      return { data: null, error: 'User profile not found' };
    }

    let query = supabase
      .from('risk_intelligence_alerts')
      .select(`
        *,
        event:external_events(*)
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (risk_code) {
      query = query.eq('risk_code', risk_code);
    }

    const { data, error } = await query;

    // Transform to include event object
    const transformedData = data?.map(alert => ({
      ...alert,
      event: Array.isArray(alert.event) ? alert.event[0] : alert.event,
    })) as RiskAlertWithEvent[];

    return { data: transformedData, error };
  } catch (error) {
    console.error('Error loading risk alerts:', error);
    return { data: null, error };
  }
}

/**
 * Update risk alert status (accept/reject)
 * Note: Accepted alerts are NOT automatically applied to risks.
 * User must manually apply them using applyAlertTreatment()
 */
export async function updateAlertStatus(
  alert_id: string,
  status: AlertStatus,
  review_notes?: string
): Promise<{ success: boolean; error: any }> {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user's organization_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return { success: false, error: 'User profile not found' };
    }

    // Update alert status (NO automatic risk update)
    // Only update if alert belongs to user's organization
    const { error: updateError } = await supabase
      .from('risk_intelligence_alerts')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes,
      })
      .eq('id', alert_id)
      .eq('organization_id', profile.organization_id);

    if (updateError) {
      return { success: false, error: updateError };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating alert status:', error);
    return { success: false, error };
  }
}

/**
 * Apply accepted alert treatment to risk register
 * This manually updates the risk's likelihood based on the alert
 */
export async function applyAlertTreatment(
  alert_id: string,
  treatment_notes?: string
): Promise<{ success: boolean; error: any }> {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user's organization_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return { success: false, error: 'User profile not found' };
    }

    // Load the alert (with organization verification)
    const { data: alert } = await supabase
      .from('risk_intelligence_alerts')
      .select('*')
      .eq('id', alert_id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!alert) {
      return { success: false, error: 'Alert not found' };
    }

    if (alert.status !== 'accepted') {
      return { success: false, error: 'Only accepted alerts can be applied' };
    }

    if (alert.applied_to_risk) {
      return { success: false, error: 'Alert already applied to risk' };
    }

    // Update the risk's likelihood
    const { data: risk } = await supabase
      .from('risks')
      .select('likelihood_inherent')
      .eq('risk_code', alert.risk_code)
      .single();

    if (!risk) {
      return { success: false, error: 'Risk not found' };
    }

    const newLikelihood = Math.max(
      1,
      Math.min(5, risk.likelihood_inherent + alert.suggested_likelihood_change)
    );

    const { error: riskUpdateError } = await supabase
      .from('risks')
      .update({
        likelihood_inherent: newLikelihood,
        last_intelligence_check: new Date().toISOString(),
      })
      .eq('risk_code', alert.risk_code);

    if (riskUpdateError) {
      return { success: false, error: riskUpdateError };
    }

    // Mark alert as applied
    const { error: alertUpdateError } = await supabase
      .from('risk_intelligence_alerts')
      .update({
        applied_to_risk: true,
        applied_at: new Date().toISOString(),
        applied_by: user.id,
        treatment_notes,
      })
      .eq('id', alert_id);

    if (alertUpdateError) {
      return { success: false, error: alertUpdateError };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error applying alert treatment:', error);
    return { success: false, error };
  }
}

/**
 * Bulk delete pending alerts
 */
export async function bulkDeletePendingAlerts(): Promise<{ success: boolean; count: number; error: any }> {
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!profile) {
      return { success: false, count: 0, error: 'User profile not found' };
    }

    // Count pending alerts before deletion
    const { count } = await supabase
      .from('risk_intelligence_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', profile.organization_id)
      .eq('status', 'pending');

    // Delete all pending alerts
    const { error } = await supabase
      .from('risk_intelligence_alerts')
      .delete()
      .eq('organization_id', profile.organization_id)
      .eq('status', 'pending');

    if (error) {
      return { success: false, count: 0, error };
    }

    return { success: true, count: count || 0, error: null };
  } catch (error) {
    console.error('Error bulk deleting pending alerts:', error);
    return { success: false, count: 0, error };
  }
}

/**
 * Expire old alerts
 */
export async function expireOldAlerts(): Promise<{ success: boolean; error: any }> {
  try {
    const { error } = await supabase.rpc('expire_old_alerts');

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error expiring old alerts:', error);
    return { success: false, error };
  }
}

/**
 * Get alerts statistics
 */
export async function getAlertsStatistics(): Promise<{
  data: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    high_confidence: number;
  } | null;
  error: any;
}> {
  try {
    // Get current user's organization_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!profile) {
      return { data: null, error: 'User profile not found' };
    }

    const { data: alerts, error } = await supabase
      .from('risk_intelligence_alerts')
      .select('status, confidence_score')
      .eq('organization_id', profile.organization_id);

    if (error) {
      return { data: null, error };
    }

    const stats = {
      total: alerts?.length || 0,
      pending: 0,
      accepted: 0,
      rejected: 0,
      high_confidence: 0,
    };

    alerts?.forEach(alert => {
      if (alert.status === 'pending') stats.pending++;
      else if (alert.status === 'accepted') stats.accepted++;
      else if (alert.status === 'rejected') stats.rejected++;

      if (alert.confidence_score >= 0.7) stats.high_confidence++;
    });

    return { data: stats, error: null };
  } catch (error) {
    console.error('Error getting alerts statistics:', error);
    return { data: null, error };
  }
}

// =====================================================
// RSS FEED PARSING
// =====================================================

/**
 * Parse RSS feed (to be implemented with rss-parser package)
 * For now, this is a placeholder that will be completed after installing the package
 */
export async function parseRSSFeed(url: string): Promise<{
  items: Array<{
    title: string;
    description: string;
    link: string;
    pubDate: string;
  }>;
  error: any;
}> {
  try {
    // TODO: Install and use rss-parser npm package
    // const Parser = require('rss-parser');
    // const parser = new Parser();
    // const feed = await parser.parseURL(url);

    // Placeholder implementation
    console.log('RSS parsing not yet implemented. Install rss-parser package.');
    return { items: [], error: null };
  } catch (error) {
    console.error('Error parsing RSS feed:', error);
    return { items: [], error };
  }
}

// =====================================================
// AI ANALYSIS
// =====================================================

/**
 * Analyze if an event is relevant to a specific risk
 * Uses AI to determine relevance and suggest likelihood changes
 */
export async function analyzeEventRelevance(
  risk: RiskRow,
  event: ExternalEvent
): Promise<EventRiskAnalysis | null> {
  try {
    const prompt = `You are a risk intelligence analyst for a Nigerian financial institution (FMDQ Securities Exchange).

RISK BEING ANALYZED:
- Code: ${risk.risk_code}
- Title: ${risk.risk_title}
- Category: ${risk.category}
- Current Likelihood: ${risk.likelihood_inherent}/5
- Description: ${risk.risk_description || 'N/A'}

RECENT EVENT:
- Title: ${event.title}
- Description: ${event.description}
- Source: ${event.source_name}
- Date: ${event.published_date}
- Category: ${event.event_category}

TASK:
Analyze if this event affects the likelihood of this risk occurring.

Consider:
1. Direct impact: Does this event make the risk more or less likely?
2. Industry relevance: Is this event relevant to financial services/securities exchange?
3. Geographic relevance: For Nigerian events, consider local context
4. Temporal relevance: Recent events are more relevant than old ones

OUTPUT FORMAT (JSON only, no explanation):
{
  "is_relevant": boolean,
  "reasoning": "2-3 sentences explaining why",
  "likelihood_change": integer (-2 to +2, where 0 = no change),
  "confidence": float (0.0 to 1.0),
  "suggested_controls": ["control 1", "control 2"] or [],
  "impact_assessment": "Brief assessment of potential impact"
}

Rules:
- Only suggest likelihood changes if clearly justified
- Be conservative: most events won't affect most risks
- For cybersecurity events, consider if technology/systems are affected
- For regulatory events, consider if compliance/legal aspects are affected
- Confidence should be high (>0.7) only for clear, direct impacts`;

    // Call Claude AI API directly
    const responseText = await askClaude(prompt);

    // Parse AI response - handle JSON wrapped in markdown code blocks
    let jsonText = responseText.trim();

    // Remove markdown code fences if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').trim();
    }

    const analysis: EventRiskAnalysis = JSON.parse(jsonText);

    return analysis;
  } catch (error) {
    console.error('Error analyzing event relevance:', error);
    return null;
  }
}

/**
 * Scan news and create alerts for all risks
 * Main intelligence gathering function
 */
export async function scanNewsForRisks(): Promise<{
  events_processed: number;
  alerts_created: number;
  error: any;
}> {
  try {
    // TODO: This will be completed after RSS parser is installed
    // For now, return placeholder
    console.log('News scanning not yet fully implemented');
    return { events_processed: 0, alerts_created: 0, error: null };
  } catch (error) {
    console.error('Error scanning news for risks:', error);
    return { events_processed: 0, alerts_created: 0, error };
  }
}
