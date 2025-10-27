// api/scan-news.js
// Vercel serverless function to run news scanner on the backend

import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
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
 * Store events in database
 */
async function storeEvents(parsedFeeds) {
  let stored = 0;
  const events = [];

  for (const feedData of parsedFeeds.events) {
    for (const item of feedData.items) {
      const keywords = extractKeywords(item.title + ' ' + item.description);

      if (keywords.length === 0) continue; // Skip non-risk-related events

      const category = categorizeEvent(item.title, item.description);

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

      events.push(event);
    }
  }

  // Bulk insert events
  if (events.length > 0) {
    const { data, error } = await supabase
      .from('external_events')
      .insert(events)
      .select();

    if (error) {
      console.error('Error storing events:', error);
    } else {
      stored = data?.length || 0;
      console.log(`✅ Stored ${stored} events in database`);
    }
  }

  return { stored, events };
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

  try {
    console.log('🚀 Starting news scanner...');

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

    // Note: AI analysis of events would happen here in production
    // For now, we'll just store the events and return success

    const stats = {
      feeds_processed: parsedFeeds.events.length,
      events_found: parsedFeeds.totalItems,
      events_stored: storeResults.stored,
      alerts_created: 0, // Would be calculated after AI analysis
    };

    console.log('✅ News scanner completed successfully');

    return res.status(200).json({
      success: true,
      stats,
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
