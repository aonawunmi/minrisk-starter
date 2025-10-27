// src/services/newsScanner.ts
// News Scanner Service - Fetches and processes news from multiple sources

import Parser from 'rss-parser';
import {
  NEWS_SOURCES,
  type NewsSource,
  type EventCategory,
  type ExternalEvent,
  storeExternalEvent,
  analyzeEventRelevance,
  createRiskAlert,
} from '../lib/riskIntelligence';
import { loadRisks } from '../lib/database';
import type { RiskRow } from '../lib/database';

// =====================================================
// TYPES
// =====================================================

type RSSItem = {
  title?: string;
  content?: string;
  contentSnippet?: string;
  link?: string;
  pubDate?: string;
  creator?: string;
  guid?: string;
};

// =====================================================
// RSS FEED PARSING
// =====================================================

/**
 * Parse a single RSS feed
 */
async function parseSingleFeed(source: NewsSource): Promise<{
  items: Array<{
    title: string;
    description: string;
    link: string;
    pubDate: string;
  }>;
  error: any;
}> {
  try {
    const parser: Parser<any, RSSItem> = new Parser({
      timeout: 10000, // 10 second timeout
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
    console.error(`❌ Error parsing ${source.name}:`, error);
    return { items: [], error };
  }
}

/**
 * Parse all configured RSS feeds
 */
export async function parseAllFeeds(): Promise<{
  events: Array<{
    source: NewsSource;
    items: Array<{
      title: string;
      description: string;
      link: string;
      pubDate: string;
    }>;
  }>;
  totalItems: number;
}> {
  console.log('🔍 Starting RSS feed parsing...');

  const results: Array<{
    source: NewsSource;
    items: Array<{
      title: string;
      description: string;
      link: string;
      pubDate: string;
    }>;
  }> = [];

  // Parse Nigeria regulatory feeds
  for (const source of NEWS_SOURCES.nigeria.regulatory) {
    const { items } = await parseSingleFeed(source);
    if (items.length > 0) {
      results.push({ source, items });
    }
  }

  // Parse Nigeria news feeds
  for (const source of NEWS_SOURCES.nigeria.news) {
    const { items } = await parseSingleFeed(source);
    if (items.length > 0) {
      results.push({ source, items });
    }
  }

  // Parse global cybersecurity feeds
  for (const source of NEWS_SOURCES.global.cybersecurity) {
    const { items } = await parseSingleFeed(source);
    if (items.length > 0) {
      results.push({ source, items });
    }
  }

  // Parse global environmental feeds
  for (const source of NEWS_SOURCES.global.environmental) {
    const { items } = await parseSingleFeed(source);
    if (items.length > 0) {
      results.push({ source, items });
    }
  }

  const totalItems = results.reduce((sum, r) => sum + r.items.length, 0);
  console.log(`✅ Total items parsed: ${totalItems} from ${results.length} sources`);

  return { events: results, totalItems };
}

// =====================================================
// EVENT PROCESSING
// =====================================================

/**
 * Extract keywords from text (simple implementation)
 */
function extractKeywords(text: string): string[] {
  const keywordPatterns = [
    // Cybersecurity
    'ransomware', 'cyber attack', 'data breach', 'hacking', 'malware',
    'phishing', 'ddos', 'vulnerability', 'zero-day', 'exploit',
    // Financial
    'forex', 'interest rate', 'monetary policy', 'inflation', 'exchange rate',
    'bond', 'securities', 'trading', 'market', 'regulation',
    // Nigerian context
    'cbn', 'naira', 'sec nigeria', 'fmdq', 'lagos', 'abuja',
    // Risk-related
    'risk', 'threat', 'fraud', 'compliance', 'audit', 'control',
    // Environmental
    'flood', 'climate', 'disaster', 'emergency', 'environmental',
  ];

  const lowerText = text.toLowerCase();
  return keywordPatterns.filter(keyword => lowerText.includes(keyword));
}

/**
 * Categorize event based on content
 */
function categorizeEvent(source: NewsSource, title: string, description: string): EventCategory {
  const text = `${title} ${description}`.toLowerCase();

  // Check source categories first
  if (source.categories.length === 1) {
    return source.categories[0];
  }

  // Content-based categorization
  if (
    text.includes('cyber') ||
    text.includes('hack') ||
    text.includes('breach') ||
    text.includes('malware') ||
    text.includes('ransomware')
  ) {
    return 'cybersecurity';
  }

  if (
    text.includes('regulation') ||
    text.includes('compliance') ||
    text.includes('policy') ||
    text.includes('sec') ||
    text.includes('cbn')
  ) {
    return 'regulatory';
  }

  if (
    text.includes('market') ||
    text.includes('forex') ||
    text.includes('trading') ||
    text.includes('bond') ||
    text.includes('stock')
  ) {
    return 'market';
  }

  if (
    text.includes('flood') ||
    text.includes('climate') ||
    text.includes('environmental') ||
    text.includes('disaster')
  ) {
    return 'environmental';
  }

  return 'operational';
}

/**
 * Store events from parsed feeds
 */
export async function storeEvents(
  parsedFeeds: Awaited<ReturnType<typeof parseAllFeeds>>
): Promise<{
  stored: number;
  skipped: number;
  errors: number;
}> {
  console.log('💾 Storing events in database...');

  let stored = 0;
  let skipped = 0;
  let errors = 0;

  for (const { source, items } of parsedFeeds.events) {
    for (const item of items) {
      try {
        const keywords = extractKeywords(`${item.title} ${item.description}`);
        const category = categorizeEvent(source, item.title, item.description);

        const eventData: Omit<ExternalEvent, 'id' | 'organization_id' | 'created_at'> = {
          title: item.title,
          description: item.description,
          source_name: source.name,
          source_url: item.link,
          published_date: new Date(item.pubDate).toISOString(),
          event_category: category,
          keywords,
          country: source.country || 'Global',
          relevance_score: 0.5, // Will be updated by AI analysis
          affected_risk_categories: [],
        };

        const { data, error } = await storeExternalEvent(eventData);

        if (error) {
          console.error(`Error storing event: ${item.title}`, error);
          errors++;
        } else if (data) {
          stored++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Exception storing event: ${item.title}`, error);
        errors++;
      }
    }
  }

  console.log(`✅ Stored: ${stored}, Skipped: ${skipped}, Errors: ${errors}`);
  return { stored, skipped, errors };
}

// =====================================================
// RISK ANALYSIS AND ALERT CREATION
// =====================================================

/**
 * Analyze events against risks and create alerts
 */
export async function analyzeEventsForRisks(
  events: ExternalEvent[],
  minConfidence: number = 0.6
): Promise<{
  analyzed: number;
  alerts_created: number;
  errors: number;
}> {
  console.log('🤖 Analyzing events against risks...');

  let analyzed = 0;
  let alerts_created = 0;
  let errors = 0;

  // Load all active risks
  const risks = await loadRisks();
  if (!risks || risks.length === 0) {
    console.log('No risks found to analyze');
    return { analyzed, alerts_created, errors };
  }

  console.log(`Found ${risks.length} risks to analyze`);

  // Analyze each event against each risk
  for (const event of events) {
    for (const risk of risks) {
      try {
        // Skip if risk category doesn't match event category
        const eventCatMap: Record<EventCategory, string[]> = {
          cybersecurity: ['Technology', 'Operational'],
          market: ['Market', 'Liquidity', 'Strategic'],
          regulatory: ['Legal/Compliance', 'Regulatory'],
          environmental: ['ESG', 'Environmental'],
          operational: ['Operational'],
        };

        const relevantCategories = eventCatMap[event.event_category] || [];
        if (relevantCategories.length > 0 && !relevantCategories.includes(risk.category)) {
          continue; // Skip non-relevant category combinations
        }

        // Analyze with AI
        const analysis = await analyzeEventRelevance(risk, event);

        if (analysis && analysis.is_relevant && analysis.confidence >= minConfidence) {
          // Create alert
          const { data, error } = await createRiskAlert(risk.risk_code, event.id, analysis);

          if (error) {
            console.error(`Error creating alert for ${risk.risk_code}:`, error);
            errors++;
          } else if (data) {
            console.log(
              `✅ Alert created: ${risk.risk_code} - ${event.title.substring(0, 50)}... (confidence: ${analysis.confidence})`
            );
            alerts_created++;
          }
        }

        analyzed++;
      } catch (error) {
        console.error(`Exception analyzing event for risk ${risk.risk_code}:`, error);
        errors++;
      }
    }
  }

  console.log(`✅ Analyzed: ${analyzed}, Alerts created: ${alerts_created}, Errors: ${errors}`);
  return { analyzed, alerts_created, errors };
}

// =====================================================
// MAIN SCANNER FUNCTION
// =====================================================

/**
 * Main news scanning function
 * This should be called by a cron job or scheduled task
 */
export async function runNewsScanner(): Promise<{
  success: boolean;
  stats: {
    feeds_processed: number;
    events_found: number;
    events_stored: number;
    alerts_created: number;
  };
  error: any;
}> {
  console.log('🚀 Starting news scanner...');

  try {
    // Step 1: Parse all RSS feeds
    const parsedFeeds = await parseAllFeeds();

    // Step 2: Store events in database
    const storeResults = await storeEvents(parsedFeeds);

    // Step 3: Load recently stored events
    const { data: recentEvents } = await import('../lib/riskIntelligence').then(module =>
      module.loadExternalEvents(50)
    );

    if (!recentEvents || recentEvents.length === 0) {
      console.log('No events to analyze');
      return {
        success: true,
        stats: {
          feeds_processed: parsedFeeds.events.length,
          events_found: parsedFeeds.totalItems,
          events_stored: storeResults.stored,
          alerts_created: 0,
        },
        error: null,
      };
    }

    // Step 4: Analyze events against risks
    const analysisResults = await analyzeEventsForRisks(recentEvents);

    const stats = {
      feeds_processed: parsedFeeds.events.length,
      events_found: parsedFeeds.totalItems,
      events_stored: storeResults.stored,
      alerts_created: analysisResults.alerts_created,
    };

    console.log('✅ News scanner completed successfully');
    console.log('📊 Stats:', stats);

    return {
      success: true,
      stats,
      error: null,
    };
  } catch (error) {
    console.error('❌ News scanner failed:', error);
    return {
      success: false,
      stats: {
        feeds_processed: 0,
        events_found: 0,
        events_stored: 0,
        alerts_created: 0,
      },
      error,
    };
  }
}
