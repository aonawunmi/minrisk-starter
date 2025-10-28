// api/scan-news.js
// Vercel serverless function to run news scanner on the backend

import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// Serverless functions need non-VITE_ prefixed env vars
// Use SERVICE_ROLE key to bypass RLS and access all organization data
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// DEBUG: Check if SERVICE_ROLE key is configured
console.log('🔑 Supabase configuration:', {
  url_present: !!supabaseUrl,
  service_key_present: !!supabaseServiceKey,
  service_key_length: supabaseServiceKey?.length,
  service_key_prefix: supabaseServiceKey?.substring(0, 20)
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// News sources configuration
const NEWS_SOURCES = [
  // Nigeria Regulatory
  { name: 'Central Bank of Nigeria', url: 'https://www.cbn.gov.ng/rss/news.xml', category: 'regulatory', country: 'Nigeria' },
  { name: 'SEC Nigeria', url: 'https://sec.gov.ng/feed/', category: 'regulatory', country: 'Nigeria' },
  { name: 'FMDQ Group', url: 'https://fmdqgroup.com/feed/', category: 'market', country: 'Nigeria' },

  // Nigeria News
  { name: 'BusinessDay Nigeria', url: 'https://businessday.ng/feed/', category: 'business', country: 'Nigeria' },
  { name: 'The Guardian Nigeria', url: 'https://guardian.ng/feed/', category: 'business', country: 'Nigeria' },
  { name: 'Premium Times', url: 'https://www.premiumtimesng.com/feed', category: 'business', country: 'Nigeria' },

  // Global Cybersecurity
  { name: 'US-CERT Alerts', url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml', category: 'cybersecurity', country: 'Global' },
  { name: 'SANS ISC', url: 'https://isc.sans.edu/rssfeed.xml', category: 'cybersecurity', country: 'Global' },

  // Global Environmental
  { name: 'UN Environment', url: 'https://www.unep.org/news-and-stories/rss.xml', category: 'environmental', country: 'Global' },
];

// Default risk-related keywords (fallback if database query fails)
const DEFAULT_RISK_KEYWORDS = [
  'risk', 'threat', 'vulnerability', 'breach', 'attack', 'fraud',
  'compliance', 'regulation', 'penalty', 'fine', 'sanction',
  'cybersecurity', 'data breach', 'ransomware', 'phishing',
  'operational', 'disruption', 'outage', 'failure',
  'financial loss', 'market volatility', 'credit risk',
  'liquidity', 'default', 'bankruptcy',
  'environmental', 'climate', 'ESG', 'sustainability',
  'reputation', 'scandal', 'investigation',
  'audit', 'control', 'governance',
];

/**
 * Load active news sources from database
 */
async function loadNewsSources(organizationId) {
  try {
    const { data, error } = await supabase
      .from('news_sources')
      .select('name, url, category, country')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    console.log(`📊 Loaded ${data.length} active sources from database`);
    if (data.length > 0) {
      console.log(`📊 Sample sources: ${data.slice(0, 3).map(s => s.name).join(', ')}`);
      // Convert to scanner format
      return data.map(source => ({
        name: source.name,
        url: source.url,
        category: source.category,
        country: source.country
      }));
    } else {
      console.log(`⚠️ No sources in database, using ${NEWS_SOURCES.length} default sources`);
      return NEWS_SOURCES;
    }
  } catch (error) {
    console.error('Error loading news sources from database:', error);
    console.log(`⚠️ Falling back to ${NEWS_SOURCES.length} default sources`);
    // Return default sources as fallback
    return NEWS_SOURCES;
  }
}

/**
 * Load active risk keywords from database
 */
async function loadRiskKeywords(organizationId) {
  try {
    const { data, error } = await supabase
      .from('risk_keywords')
      .select('keyword')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (error) throw error;

    const keywords = data.map(k => k.keyword);
    console.log(`📊 Loaded ${keywords.length} active keywords from database`);
    if (keywords.length > 0) {
      console.log(`📊 Sample keywords: ${keywords.slice(0, 5).join(', ')}`);
      return keywords;
    } else {
      console.log(`⚠️ No keywords in database, using ${DEFAULT_RISK_KEYWORDS.length} default keywords`);
      return DEFAULT_RISK_KEYWORDS;
    }
  } catch (error) {
    console.error('Error loading risk keywords from database:', error);
    console.log(`⚠️ Falling back to ${DEFAULT_RISK_KEYWORDS.length} default keywords`);
    // Return default keywords as fallback
    return DEFAULT_RISK_KEYWORDS;
  }
}

/**
 * Parse a single RSS feed
 */
async function parseSingleFeed(source) {
  try {
    const parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'MinRisk/1.0 (Risk Intelligence Monitor)',
      },
    });

    console.log(`Parsing feed from ${source.name}: ${source.url}`);
    const feed = await parser.parseURL(source.url);

    const items = feed.items.slice(0, 10).map(item => ({
      title: item.title || 'Untitled',
      description: item.contentSnippet || item.content || item.title || '',
      link: item.link || item.guid || '',
      pubDate: item.pubDate || new Date().toISOString(),
    }));

    console.log(`✅ Parsed ${items.length} items from ${source.name}`);
    return { items, error: null };
  } catch (error) {
    console.error(`❌ Error parsing ${source.name}:`, error.message);
    return { items: [], error: error.message };
  }
}

/**
 * Extract risk-related keywords from text
 */
function extractKeywords(text, keywords) {
  const lowerText = text.toLowerCase();
  return keywords.filter(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * Categorize event based on content
 */
function categorizeEvent(title, description) {
  const text = (title + ' ' + description).toLowerCase();

  if (text.match(/cyber|hack|breach|malware|ransomware|phishing/i)) return 'cybersecurity';
  if (text.match(/regulat|compliance|SEC|CBN|penalty|fine/i)) return 'regulatory';
  if (text.match(/market|trading|stock|bond|forex|financial/i)) return 'market';
  if (text.match(/environment|climate|ESG|sustainab|carbon/i)) return 'environmental';
  if (text.match(/operation|system|outage|failure|disruption/i)) return 'operational';

  return 'other';
}

/**
 * Store events in database and return detailed results
 */
async function storeEvents(parsedFeeds, maxAgeDays, riskKeywords, organizationId) {
  // Attach organizationId to parsedFeeds for event storage
  parsedFeeds.organizationId = organizationId;

  // DEBUG: Log what we're starting with
  console.log(`🔍 storeEvents called with organizationId: ${organizationId}, maxAgeDays: ${maxAgeDays}, riskKeywords: ${riskKeywords.length}`);

  let stored = 0;
  const storedEvents = [];
  const allItems = []; // Track all items with their status

  // Calculate cutoff date (only process news from last N days)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

  for (const feedData of parsedFeeds.events) {
    for (const item of feedData.items) {
      const keywords = extractKeywords(item.title + ' ' + item.description, riskKeywords);
      const category = categorizeEvent(item.title, item.description);
      const publishedDate = new Date(item.pubDate);

      const itemDetail = {
        title: item.title,
        description: item.description,
        link: item.link,
        pubDate: item.pubDate,
        source_name: feedData.source.name,
        source_category: feedData.source.category,
        country: feedData.source.country,
        category,
        keywords,
        status: 'pending',
        reason: null
      };

      // Check if news is too old
      if (publishedDate < cutoffDate) {
        itemDetail.status = 'filtered';
        itemDetail.reason = `Too old (published ${Math.floor((Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24))} days ago)`;
        allItems.push(itemDetail);
        continue;
      }

      if (keywords.length === 0) {
        itemDetail.status = 'filtered';
        itemDetail.reason = 'No risk-related keywords found';
        allItems.push(itemDetail);
        continue; // Skip non-risk-related events
      }

      // Check for duplicates by URL (more reliable)
      const { data: existingByUrl } = await supabase
        .from('external_events')
        .select('id')
        .eq('organization_id', parsedFeeds.organizationId)
        .eq('source_url', item.link)
        .limit(1);

      if (existingByUrl && existingByUrl.length > 0) {
        itemDetail.status = 'duplicate';
        itemDetail.reason = 'Event URL already exists in database';
        allItems.push(itemDetail);
        continue;
      }

      const event = {
        title: item.title.substring(0, 500),
        description: item.description.substring(0, 2000),
        source_name: feedData.source.name,
        source_url: item.link,
        published_date: new Date(item.pubDate),
        event_category: category,
        keywords,
        country: feedData.source.country,
        organization_id: parsedFeeds.organizationId,
        relevance_score: 0.5,  // Default relevance score, will be updated by analysis
        affected_risk_categories: [],  // Will be populated during analysis
      };

      // DEBUG: Log before insert
      console.log(`🔍 Attempting INSERT for "${item.title.substring(0, 50)}..." with organization_id: ${parsedFeeds.organizationId}`);

      // Insert the event
      const { data, error, status, statusText, count } = await supabase
        .from('external_events')
        .insert(event)
        .select();

      // DEBUG: Log full response
      console.log(`📝 INSERT response:`, {
        data_length: data?.length,
        has_error: !!error,
        status,
        statusText,
        count,
        error_code: error?.code,
        error_message: error?.message
      });

      if (!error && data && data.length > 0) {
        stored++;
        storedEvents.push(data[0]);
        itemDetail.status = 'stored';
        itemDetail.eventId = data[0].id;
      } else if (error?.code === '23505') {
        // Duplicate caught by database constraint
        itemDetail.status = 'duplicate';
        itemDetail.reason = 'Already exists in database';
      } else {
        // Log the actual error for debugging
        console.error(`❌ Insert failed for "${item.title.substring(0, 50)}...":`, {
          code: error?.code,
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          full_error: JSON.stringify(error)
        });
        itemDetail.status = 'error';
        itemDetail.reason = error?.message || 'Unknown error';
      }

      allItems.push(itemDetail);
    }
  }

  console.log(`✅ Stored ${stored} events in database`);
  return { stored, events: storedEvents, allItems };
}

/**
 * Load risks from database for AI analysis
 */
async function loadRisks(organizationId) {
  const { data, error } = await supabase
    .from('risks')
    .select('risk_code, risk_title, risk_description, category, likelihood_inherent, impact_inherent')
    .eq('organization_id', organizationId)
    .order('risk_code');

  if (error) {
    console.error('Error loading risks:', error);
    return [];
  }

  return data || [];
}

/**
 * Analyze event relevance to risks using Claude AI
 */
async function analyzeEventRelevance(event, risks, claudeApiKey) {
  try {
    // Analyze ALL risks - completeness is critical for risk management
    const risksToAnalyze = risks;

    console.log(`   🎯 Analyzing against ${risksToAnalyze.length} risks`);

    if (risksToAnalyze.length === 0) {
      console.log(`   ⚠️  No risks available for analysis!`);
      return { relevant: false };
    }

    // Extract risk categories to show Claude what we have
    const riskCategories = [...new Set(risksToAnalyze.map(r => r.risk_code.split('-')[1]).filter(Boolean))];

    const prompt = `TASK: Match this external event to relevant organizational risks for early warning monitoring.

EVENT TITLE: "${event.title}"
EVENT CATEGORY: ${event.event_category || 'Unknown'}
EVENT DESCRIPTION: ${event.description || 'N/A'}

AVAILABLE RISK CATEGORIES: ${riskCategories.join(', ')}

ORGANIZATIONAL RISKS TO CONSIDER:
${risksToAnalyze.map(r => `${r.risk_code}: ${r.risk_title}`).join('\n')}

MATCHING RULES - Apply these automatically:
1. IF event title/category contains "cyber", "hack", "breach", "ransomware", "malware", "phishing" → MATCH ALL "CYB" risks with confidence 0.5
2. IF event title/category contains "regulatory", "compliance", "SEC", "rule", "regulation" → MATCH ALL "REG" risks with confidence 0.5
3. IF event title/category contains "market", "volatility", "economic", "financial" → MATCH ALL "MKT" or "FIN" risks with confidence 0.5
4. IF event is about an incident at ANY organization → Consider as industry precedent, match similar risk types with confidence 0.4

IMPORTANT:
- This is for EARLY WARNING - err on the side of creating alerts
- Industry incidents = precedents for our organization
- External events show environmental changes that affect our risk landscape

Return ONLY this JSON format (no markdown, no explanations):
{"relevant": true, "risk_codes": ["STR-CYB-001"], "confidence": 0.5, "likelihood_change": 1, "reasoning": "Brief reason", "impact_assessment": "Brief impact", "suggested_controls": ["Control 1"]}

OR if truly no connection:
{"relevant": false}`;

    //  CRITICAL DEBUG: Log first 1000 chars of prompt to see what Claude is receiving
    console.log(`   📝 Prompt preview (first 1000 chars):`, prompt.substring(0, 1000));
    console.log(`   📊 Total risks in prompt: ${risksToAnalyze.length}`);

    const response = await fetch(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          temperature: 0.3,
          messages: [{
            role: 'user',
            content: prompt
          }]
        }),
      }
    );

    if (!response.ok) {
      console.error(`   ❌ Claude API error: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error(`   ❌ Error body:`, errorBody.substring(0, 500));
      return { relevant: false };
    }

    const result = await response.json();

    // Log raw response for debugging
    console.log(`   📄 Raw Claude response:`, JSON.stringify(result, null, 2).substring(0, 500));

    const text = result.content?.[0]?.text || '{}';

    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

    const analysis = JSON.parse(jsonStr);

    // DETAILED LOGGING - Log full Claude response for debugging
    console.log(`   🔍 Claude AI Analysis:`, JSON.stringify(analysis, null, 2));

    return analysis;

  } catch (error) {
    console.error('   ❌ Error in AI analysis:', error.message);
    console.error('   ❌ Error details:', error);
    return { relevant: false };
  }
}

/**
 * Create risk alerts from AI analysis
 */
async function createRiskAlerts(storedEvents, risks, claudeApiKey) {
  let alertsCreated = 0;

  for (const event of storedEvents) {
    try {
      console.log(`\n🔍 Analyzing event: ${event.title.substring(0, 60)}...`);
      const analysis = await analyzeEventRelevance(event, risks, claudeApiKey);

      // Detailed logging of Claude's response
      console.log(`   📊 Analysis result:`, JSON.stringify({
        relevant: analysis.relevant,
        confidence: analysis.confidence,
        risk_codes: analysis.risk_codes,
        reasoning: analysis.reasoning?.substring(0, 100)
      }));

      if (analysis.relevant && analysis.confidence >= 0.3 && analysis.risk_codes?.length > 0) {  // Lowered threshold to catch more potential matches
        console.log(`   ✅ Alert criteria met! Creating alerts for: ${analysis.risk_codes.join(', ')}`);
        for (const riskCode of analysis.risk_codes) {
          const alert = {
            organization_id: event.organization_id,  // CRITICAL: Required for FK constraint
            event_id: event.id,
            risk_code: riskCode,
            suggested_likelihood_change: analysis.likelihood_change || 0,
            reasoning: analysis.reasoning || 'No reasoning provided',  // FIXED: Was 'ai_reasoning', should be 'reasoning'
            confidence_score: analysis.confidence,
            suggested_controls: analysis.suggested_controls || [],
            impact_assessment: analysis.impact_assessment || '',
            status: 'pending',
          };

          const { error } = await supabase
            .from('risk_intelligence_alerts')
            .insert(alert);

          if (!error) {
            alertsCreated++;
            console.log(`   ✅ Created alert for ${riskCode}`);
          } else {
            console.log(`   ❌ Failed to insert alert: ${error.message}`);
          }
        }
      } else {
        console.log(`   ⏭️  Skipped: relevant=${analysis.relevant}, confidence=${analysis.confidence}, risk_codes=${analysis.risk_codes?.length || 0}`);
      }

      // Mark event as analyzed
      await supabase
        .from('external_events')
        .update({ analyzed_at: new Date().toISOString() })
        .eq('id', event.id);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Error creating alert for event ${event.id}:`, error);
      // Still mark as analyzed even if there was an error, to avoid re-processing
      await supabase
        .from('external_events')
        .update({ analyzed_at: new Date().toISOString() })
        .eq('id', event.id);
    }
  }

  return alertsCreated;
}

/**
 * Manually save a filtered event
 */
async function manuallyRetainEvent(eventData) {
  try {
    const event = {
      title: eventData.title.substring(0, 500),
      description: eventData.description.substring(0, 2000),
      source_name: eventData.source_name,
      source_url: eventData.link,
      published_date: new Date(eventData.pubDate),
      category: eventData.category,
      keywords: eventData.keywords || [],
      country: eventData.country,
    };

    const { data, error } = await supabase
      .from('external_events')
      .insert(event)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, event: data };
  } catch (error) {
    console.error('Error manually retaining event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Main handler function
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract and verify user auth token
  let organizationId = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error) throw error;
      if (user) {
        // CRITICAL FIX: Look up the user's organization_id from user_profiles
        // user.id is auth.users.id, but we need organizations.id
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          console.error('Failed to load user profile:', profileError);
          return res.status(401).json({
            success: false,
            error: 'User profile not found. Please contact support.'
          });
        }

        organizationId = profile.organization_id;
        console.log(`✅ Authenticated as user: ${user.id}, organization: ${organizationId}`);
      }
    } catch (error) {
      console.error('Auth verification failed:', error);
      return res.status(401).json({
        success: false,
        error: 'Authentication failed. Please log in again.'
      });
    }
  } else {
    console.warn('⚠️  No auth token provided');
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in.'
    });
  }

  // Handle manual event retention
  if (req.method === 'POST' && req.body?.action === 'retain') {
    try {
      const result = await manuallyRetainEvent(req.body.eventData);
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // TEST MODE: Create a dummy alert to verify alert creation works
  if (req.method === 'POST' && req.body?.action === 'testAlert') {
    try {
      console.log('🧪 TEST MODE: Creating dummy alert to verify system...');

      // Get first unanalyzed event
      const { data: events, error: eventsError } = await supabase
        .from('external_events')
        .select('*')
        .eq('organization_id', organizationId)
        .is('analyzed_at', null)
        .limit(1);

      if (eventsError || !events || events.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No unanalyzed events found'
        });
      }

      const event = events[0];

      // Get first strategic risk
      const { data: risks, error: risksError } = await supabase
        .from('risks')
        .select('*')
        .eq('organization_id', organizationId)
        .ilike('risk_code', 'STR-%')
        .limit(1);

      if (risksError || !risks || risks.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No strategic risks found'
        });
      }

      const risk = risks[0];

      // Manually create alert
      console.log(`   Creating test alert for event "${event.title}" → risk ${risk.risk_code}`);

      const alert = {
        organization_id: organizationId,
        event_id: event.id,
        risk_code: risk.risk_code,
        confidence: 0.9,
        likelihood_change: 2,
        reasoning: 'TEST ALERT: Manually created to verify alert system works',
        impact_assessment: 'This is a test alert created to diagnose the system',
        suggested_controls: ['Verify alert appears in dashboard'],
        status: 'pending'
      };

      const { data: alertData, error: alertError } = await supabase
        .from('risk_intelligence_alerts')
        .insert(alert)
        .select()
        .single();

      if (alertError) {
        console.error('❌ Failed to create test alert:', alertError);
        return res.status(500).json({
          success: false,
          error: alertError.message
        });
      }

      console.log('✅ Test alert created successfully!');

      return res.status(200).json({
        success: true,
        message: 'Test alert created successfully',
        alert: alertData,
        event: { title: event.title, id: event.id },
        risk: { code: risk.risk_code, title: risk.risk_title }
      });

    } catch (error) {
      console.error('Error creating test alert:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Handle analyzing existing unanalyzed events
  if (req.method === 'POST' && req.body?.action === 'analyzeExisting') {
    try {
      console.log('🔍 Starting analysis of existing unanalyzed events...');

      const claudeApiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
      if (!claudeApiKey) {
        return res.status(500).json({
          success: false,
          error: 'Claude API key not configured'
        });
      }

      // Load unanalyzed events for this organization
      const { data: events, error: eventsError } = await supabase
        .from('external_events')
        .select('*')
        .eq('organization_id', organizationId)
        .is('analyzed_at', null)
        .order('published_date', { ascending: false })
        .limit(50); // Analyze up to 50 events at a time

      if (eventsError) throw eventsError;

      console.log(`📊 Found ${events?.length || 0} unanalyzed events for organization ${organizationId}`);

      if (!events || events.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No unanalyzed events found',
          events_analyzed: 0,
          alerts_created: 0
        });
      }

      // Load risks for this organization
      const risks = await loadRisks(organizationId);
      console.log(`📊 Loaded ${risks.length} risks for organization ${organizationId}`);

      if (risks.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No risks found in database',
          events_analyzed: 0,
          alerts_created: 0
        });
      }

      // Analyze events and create alerts
      const alertsCreated = await createRiskAlerts(events, risks, claudeApiKey);

      console.log(`✅ Analysis complete: ${events.length} events analyzed, ${alertsCreated} alerts created`);

      return res.status(200).json({
        success: true,
        message: 'Analysis complete',
        events_analyzed: events.length,
        alerts_created: alertsCreated
      });

    } catch (error) {
      console.error('Error analyzing existing events:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Handle clearing unanalyzed events
  if (req.method === 'POST' && req.body?.action === 'clearUnanalyzed') {
    try {
      console.log('🗑️ Clearing unanalyzed events...');

      // Count unanalyzed events before deletion
      const { count: beforeCount, error: countError } = await supabase
        .from('external_events')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .is('analyzed_at', null);

      if (countError) throw countError;

      // Delete only events that haven't been analyzed
      const { error: deleteError } = await supabase
        .from('external_events')
        .delete()
        .eq('organization_id', organizationId)
        .is('analyzed_at', null);

      if (deleteError) throw deleteError;

      console.log(`✅ Cleared ${beforeCount || 0} unanalyzed events`);

      return res.status(200).json({
        success: true,
        message: `Cleared ${beforeCount || 0} unanalyzed events`,
        events_cleared: beforeCount || 0
      });

    } catch (error) {
      console.error('Error clearing unanalyzed events:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Handle clearing ALL events (complete reset)
  if (req.method === 'POST' && req.body?.action === 'clearAll') {
    try {
      console.log('🗑️ Clearing ALL events...');

      // Count all events before deletion
      const { count: beforeCount, error: countError } = await supabase
        .from('external_events')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (countError) throw countError;

      // Delete ALL events (including analyzed ones)
      const { error: deleteError } = await supabase
        .from('external_events')
        .delete()
        .eq('organization_id', organizationId)
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all by using a condition that matches everything

      if (deleteError) throw deleteError;

      console.log(`✅ Cleared ${beforeCount || 0} events`);

      return res.status(200).json({
        success: true,
        message: `Cleared ${beforeCount || 0} events`,
        events_cleared: beforeCount || 0
      });

    } catch (error) {
      console.error('Error clearing all events:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Handle resetting analysis timestamps
  if (req.method === 'POST' && req.body?.action === 'resetAnalysis') {
    try {
      console.log('🔄 Resetting analysis timestamps...');

      // Count analyzed events before reset
      const { count: beforeCount, error: countError } = await supabase
        .from('external_events')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .not('analyzed_at', 'is', null);

      if (countError) throw countError;

      // Reset analyzed_at to NULL so events can be re-analyzed
      const { error: updateError } = await supabase
        .from('external_events')
        .update({ analyzed_at: null })
        .eq('organization_id', organizationId)
        .not('analyzed_at', 'is', null);

      if (updateError) throw updateError;

      console.log(`✅ Reset ${beforeCount || 0} analyzed events`);

      return res.status(200).json({
        success: true,
        message: `Reset ${beforeCount || 0} events for re-analysis`,
        events_reset: beforeCount || 0
      });

    } catch (error) {
      console.error('Error resetting analysis:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  try {
    console.log('🚀 Starting news scanner...');

    // Get Claude API key from environment
    // Serverless functions need non-VITE_ prefixed env vars
    const claudeApiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
    if (!claudeApiKey) {
      throw new Error('Claude API key not configured. Please set ANTHROPIC_API_KEY in Vercel environment variables.');
    }

    // Get parameters from request body (if provided)
    const maxAgeDays = req.body?.maxAgeDays || 7; // Default to 7 days for daily scanning

    // Load custom sources and keywords from database
    console.log('📊 Loading configuration from database...');
    const sourcesToScan = await loadNewsSources(organizationId);
    const riskKeywords = await loadRiskKeywords(organizationId);

    console.log(`📅 Filtering news from last ${maxAgeDays} days`);
    console.log(`📡 Scanning ${sourcesToScan.length} sources`);
    console.log(`🔍 Using ${riskKeywords.length} risk keywords`);

    // Parse all RSS feeds
    const parsedFeeds = { events: [], totalItems: 0 };

    for (const source of sourcesToScan) {
      const result = await parseSingleFeed(source);
      if (result.items.length > 0) {
        parsedFeeds.events.push({
          source,
          items: result.items,
        });
        parsedFeeds.totalItems += result.items.length;
      }
    }

    console.log(`📊 Total feeds processed: ${parsedFeeds.events.length}`);
    console.log(`📊 Total items found: ${parsedFeeds.totalItems}`);

    // Store events in database with date filtering
    const storeResults = await storeEvents(parsedFeeds, maxAgeDays, riskKeywords, organizationId);

    // Load risks for AI analysis
    console.log('📊 Loading risks from database...');
    const risks = await loadRisks(organizationId);
    console.log(`📊 Loaded ${risks.length} risks`);

    // Run AI analysis and create alerts
    let alertsCreated = 0;
    if (storeResults.events.length > 0 && risks.length > 0) {
      console.log('🤖 Starting Claude AI analysis...');
      alertsCreated = await createRiskAlerts(storeResults.events, risks, claudeApiKey);
      console.log(`📊 Created ${alertsCreated} alerts`);
    }

    const stats = {
      feeds_processed: parsedFeeds.events.length,
      events_found: parsedFeeds.totalItems,
      events_stored: storeResults.stored,
      alerts_created: alertsCreated,
      events_filtered: storeResults.allItems?.filter(i => i.status === 'filtered').length || 0,
      events_duplicate: storeResults.allItems?.filter(i => i.status === 'duplicate').length || 0,
      events_too_old: storeResults.allItems?.filter(i => i.reason?.includes('Too old')).length || 0,
      max_age_days: maxAgeDays,
    };

    console.log('✅ News scanner completed successfully');

    return res.status(200).json({
      success: true,
      stats,
      scanResults: storeResults.allItems || [],
      message: 'News scan completed successfully',
    });

  } catch (error) {
    console.error('❌ Error in news scanner:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stats: {
        feeds_processed: 0,
        events_found: 0,
        events_stored: 0,
        alerts_created: 0,
      },
    });
  }
}
