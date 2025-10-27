// api/scan-news.js
// Vercel serverless function to run news scanner on the backend

import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// Serverless functions need non-VITE_ prefixed env vars
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

// Risk-related keywords
const RISK_KEYWORDS = [
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
function extractKeywords(text) {
  const lowerText = text.toLowerCase();
  return RISK_KEYWORDS.filter(keyword => lowerText.includes(keyword));
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
async function storeEvents(parsedFeeds) {
  let stored = 0;
  const storedEvents = [];
  const allItems = []; // Track all items with their status

  for (const feedData of parsedFeeds.events) {
    for (const item of feedData.items) {
      const keywords = extractKeywords(item.title + ' ' + item.description);
      const category = categorizeEvent(item.title, item.description);

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

      if (keywords.length === 0) {
        itemDetail.status = 'filtered';
        itemDetail.reason = 'No risk-related keywords found';
        allItems.push(itemDetail);
        continue; // Skip non-risk-related events
      }

      const event = {
        title: item.title.substring(0, 500),
        description: item.description.substring(0, 2000),
        source_name: feedData.source.name,
        source_url: item.link,
        published_date: new Date(item.pubDate),
        category,
        keywords,
        country: feedData.source.country,
      };

      // Insert one at a time to avoid duplicates
      const { data, error } = await supabase
        .from('external_events')
        .insert(event)
        .select()
        .single();

      if (!error && data) {
        stored++;
        storedEvents.push(data);
        itemDetail.status = 'stored';
        itemDetail.eventId = data.id;
      } else if (error?.code === '23505') {
        // Duplicate
        itemDetail.status = 'duplicate';
        itemDetail.reason = 'Already exists in database';
      } else {
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
async function loadRisks() {
  const { data, error } = await supabase
    .from('risks')
    .select('risk_code, risk_title, risk_description, category, likelihood_inherent, impact_inherent')
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
    // Filter risks by similar category for efficiency
    const categoryMap = {
      'cybersecurity': ['Technology', 'Operational', 'Cyber'],
      'regulatory': ['Legal/Compliance', 'Regulatory', 'Compliance'],
      'market': ['Market', 'Financial', 'Strategic'],
      'environmental': ['ESG', 'Environmental', 'Climate'],
      'operational': ['Operational', 'Technology', 'Process'],
    };

    const relevantCategories = categoryMap[event.category] || [];
    const filteredRisks = risks.filter(r =>
      relevantCategories.some(cat => r.category?.includes(cat))
    ).slice(0, 10); // Limit to 10 most relevant risks

    if (filteredRisks.length === 0) {
      return { relevant: false };
    }

    const prompt = `You are a risk management expert. Analyze if this news event is relevant to any of the listed risks.

EVENT:
Title: ${event.title}
Description: ${event.description}
Category: ${event.category}
Source: ${event.source_name}

RISKS:
${filteredRisks.map(r => `[${r.risk_code}] ${r.risk_title} - ${r.risk_description}`).join('\n')}

Analyze if this event:
1. Could increase the likelihood of any risk occurring
2. Could increase the impact of any risk
3. Suggests new controls are needed
4. Indicates emerging risk trends

If relevant, provide:
- Risk codes (array of relevant risk codes)
- Confidence score (0.0 to 1.0)
- Suggested likelihood change (-2 to +2, where 0 = no change)
- Reasoning (brief explanation)
- Suggested controls (if applicable)

Return ONLY valid JSON in this exact format:
{
  "relevant": true/false,
  "risk_codes": ["RISK-001"],
  "confidence": 0.85,
  "likelihood_change": 1,
  "reasoning": "Brief explanation",
  "impact_assessment": "How this affects the risk",
  "suggested_controls": ["Control suggestion 1"]
}`;

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

    const result = await response.json();
    const text = result.content?.[0]?.text || '{}';

    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

    const analysis = JSON.parse(jsonStr);
    return analysis;

  } catch (error) {
    console.error('Error in AI analysis:', error);
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
      const analysis = await analyzeEventRelevance(event, risks, claudeApiKey);

      if (analysis.relevant && analysis.confidence >= 0.6 && analysis.risk_codes?.length > 0) {
        for (const riskCode of analysis.risk_codes) {
          const alert = {
            event_id: event.id,
            risk_code: riskCode,
            suggested_likelihood_change: analysis.likelihood_change || 0,
            ai_reasoning: analysis.reasoning || 'No reasoning provided',
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
            console.log(`✅ Created alert for ${riskCode}`);
          }
        }
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`Error creating alert for event ${event.id}:`, error);
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
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

  try {
    console.log('🚀 Starting news scanner...');

    // Get Claude API key from environment
    // Serverless functions need non-VITE_ prefixed env vars
    const claudeApiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
    if (!claudeApiKey) {
      throw new Error('Claude API key not configured. Please set ANTHROPIC_API_KEY in Vercel environment variables.');
    }

    // Parse all RSS feeds
    const parsedFeeds = { events: [], totalItems: 0 };

    for (const source of NEWS_SOURCES) {
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

    // Store events in database
    const storeResults = await storeEvents(parsedFeeds);

    // Load risks for AI analysis
    console.log('📊 Loading risks from database...');
    const risks = await loadRisks();
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
