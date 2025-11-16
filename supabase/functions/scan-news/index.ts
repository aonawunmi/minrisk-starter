// Supabase Edge Function for scanning news
// Ported from Vercel serverless function at /api/scan-news.js

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
]

/**
 * Parse RSS/Atom feed from URL
 */
async function parseRSSFeed(url: string): Promise<any[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MinRisk/1.0 (Risk Intelligence Monitor)',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const xmlText = await response.text()
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml')

    if (!doc) {
      throw new Error('Failed to parse XML')
    }

    const items: any[] = []

    // Try RSS 2.0 format
    const rssItems = doc.querySelectorAll('item')
    if (rssItems.length > 0) {
      rssItems.forEach((item: any, index: number) => {
        if (index < 10) { // Limit to 10 items per feed
          items.push({
            title: item.querySelector('title')?.textContent || 'Untitled',
            description: item.querySelector('description')?.textContent ||
                        item.querySelector('content:encoded')?.textContent || '',
            link: item.querySelector('link')?.textContent ||
                 item.querySelector('guid')?.textContent || '',
            pubDate: item.querySelector('pubDate')?.textContent || new Date().toISOString(),
          })
        }
      })
    }

    // Try Atom format
    const atomEntries = doc.querySelectorAll('entry')
    if (atomEntries.length > 0) {
      atomEntries.forEach((entry: any, index: number) => {
        if (index < 10) {
          const linkEl = entry.querySelector('link')
          items.push({
            title: entry.querySelector('title')?.textContent || 'Untitled',
            description: entry.querySelector('summary')?.textContent ||
                        entry.querySelector('content')?.textContent || '',
            link: linkEl?.getAttribute('href') || linkEl?.textContent || '',
            pubDate: entry.querySelector('published')?.textContent ||
                    entry.querySelector('updated')?.textContent ||
                    new Date().toISOString(),
          })
        }
      })
    }

    return items
  } catch (error) {
    console.error(`Error parsing feed ${url}:`, error.message)
    return []
  }
}

/**
 * Load active news sources from database
 */
async function loadNewsSources(supabase: any, organizationId: string) {
  try {
    const { data, error } = await supabase
      .from('news_sources')
      .select('name, url, category, country')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    console.log(`📊 Loaded ${data.length} active sources from database`)
    return data || []
  } catch (error) {
    console.error('Error loading news sources:', error)
    return []
  }
}

/**
 * Load active risk keywords from database
 */
async function loadRiskKeywords(supabase: any, organizationId: string, selectedKeywords: string[] | null = null) {
  if (selectedKeywords && Array.isArray(selectedKeywords) && selectedKeywords.length > 0) {
    console.log(`📊 Using ${selectedKeywords.length} user-selected keywords`)
    return selectedKeywords
  }

  try {
    const { data, error } = await supabase
      .from('risk_keywords')
      .select('keyword')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    if (error) throw error

    const keywords = data.map((k: any) => k.keyword)
    console.log(`📊 Loaded ${keywords.length} active keywords from database`)
    return keywords.length > 0 ? keywords : DEFAULT_RISK_KEYWORDS
  } catch (error) {
    console.error('Error loading risk keywords:', error)
    return DEFAULT_RISK_KEYWORDS
  }
}

/**
 * Extract risk-related keywords from text
 */
function extractKeywords(text: string, keywords: string[]): string[] {
  const lowerText = text.toLowerCase()
  return keywords.filter(keyword => lowerText.includes(keyword.toLowerCase()))
}

/**
 * Categorize event based on content
 */
function categorizeEvent(title: string, description: string): string {
  const text = (title + ' ' + description).toLowerCase()

  if (text.match(/cyber|hack|breach|malware|ransomware|phishing/i)) return 'cybersecurity'
  if (text.match(/regulat|compliance|SEC|CBN|penalty|fine/i)) return 'regulatory'
  if (text.match(/market|trading|stock|bond|forex|financial/i)) return 'market'
  if (text.match(/environment|climate|ESG|sustainab|carbon/i)) return 'environmental'
  if (text.match(/operation|system|outage|failure|disruption/i)) return 'operational'

  return 'other'
}

/**
 * Store events in database
 */
async function storeEvents(
  supabase: any,
  parsedFeeds: any,
  maxAgeDays: number,
  riskKeywords: string[],
  organizationId: string
) {
  let stored = 0
  const storedEvents: any[] = []
  const allItems: any[] = []

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays)

  for (const feedData of parsedFeeds.events) {
    for (const item of feedData.items) {
      const keywords = extractKeywords(item.title + ' ' + item.description, riskKeywords)
      const category = categorizeEvent(item.title, item.description)
      const publishedDate = new Date(item.pubDate)

      const itemDetail: any = {
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
      }

      if (publishedDate < cutoffDate) {
        itemDetail.status = 'filtered'
        itemDetail.reason = `Too old (published ${Math.floor((Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24))} days ago)`
        allItems.push(itemDetail)
        continue
      }

      if (keywords.length === 0) {
        itemDetail.status = 'filtered'
        itemDetail.reason = 'No risk-related keywords found'
        allItems.push(itemDetail)
        continue
      }

      // Check for duplicates by URL
      const { data: existingByUrl } = await supabase
        .from('external_events')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('source_url', item.link)
        .limit(1)

      if (existingByUrl && existingByUrl.length > 0) {
        itemDetail.status = 'duplicate'
        itemDetail.reason = 'Event URL already exists in database'
        allItems.push(itemDetail)
        continue
      }

      const event = {
        title: item.title.substring(0, 500),
        description: item.description.substring(0, 2000),
        source_name: feedData.source.name,
        source_url: item.link,
        published_date: publishedDate.toISOString(),
        event_category: category,
        keywords,
        country: feedData.source.country,
        organization_id: organizationId,
        relevance_score: 0.5,
        affected_risk_categories: [],
      }

      const { data, error } = await supabase
        .from('external_events')
        .insert(event)
        .select()

      if (!error && data && data.length > 0) {
        stored++
        storedEvents.push(data[0])
        itemDetail.status = 'stored'
        itemDetail.eventId = data[0].id
      } else if (error?.code === '23505') {
        itemDetail.status = 'duplicate'
        itemDetail.reason = 'Already exists in database'
      } else {
        itemDetail.status = 'error'
        itemDetail.reason = error?.message || 'Unknown error'
      }

      allItems.push(itemDetail)
    }
  }

  console.log(`✅ Stored ${stored} events in database`)
  return { stored, events: storedEvents, allItems }
}

/**
 * Load scanner configuration from database
 */
async function loadScannerConfig(supabase: any, organizationId: string) {
  try {
    const { data, error } = await supabase
      .from('app_configs')
      .select('scanner_mode, scanner_confidence_threshold')
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      console.warn('⚠️ Error loading scanner config, using defaults:', error.message)
      return { scanner_mode: 'ai', scanner_confidence_threshold: 0.6 }
    }

    return {
      scanner_mode: data?.scanner_mode || 'ai',
      scanner_confidence_threshold: data?.scanner_confidence_threshold ?? 0.6
    }
  } catch (error) {
    console.error('Error loading scanner config:', error)
    return { scanner_mode: 'ai', scanner_confidence_threshold: 0.6 }
  }
}

/**
 * Load risks from database for AI analysis
 */
async function loadRisks(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, organization_id')
    .eq('id', userId)
    .single()

  if (!profile) {
    console.error('❌ No user profile found for user:', userId)
    return []
  }

  const isAdmin = profile.role === 'primary_admin' || profile.role === 'secondary_admin'

  let query = supabase
    .from('risks')
    .select('risk_code, risk_title, risk_description, category, likelihood_inherent, impact_inherent')
    .order('risk_code')

  if (isAdmin) {
    query = query.eq('organization_id', profile.organization_id)
    console.log(`📊 Loading risks for ADMIN user ${userId} (org-wide)`)
  } else {
    query = query.eq('user_id', userId)
    console.log(`📊 Loading risks for user ${userId} (personal only)`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error loading risks:', error)
    return []
  }

  console.log(`📊 Loaded ${data?.length || 0} risks for user ${userId}`)
  return data || []
}

/**
 * Analyze event relevance to risks using Claude AI
 */
async function analyzeEventRelevance(event: any, risks: any[], claudeApiKey: string) {
  try {
    if (risks.length === 0) {
      console.log('   ⚠️ No risks available for analysis!')
      return { relevant: false }
    }

    const riskCategories = [...new Set(risks.map(r => r.risk_code.split('-')[1]).filter(Boolean))]

    const prompt = `TASK: Match this external event to relevant organizational risks for early warning monitoring.

EVENT TITLE: "${event.title}"
EVENT CATEGORY: ${event.event_category || 'Unknown'}
EVENT DESCRIPTION: ${event.description || 'N/A'}

AVAILABLE RISK CATEGORIES: ${riskCategories.join(', ')}

ORGANIZATIONAL RISKS TO CONSIDER:
${risks.map(r => `${r.risk_code}: ${r.risk_title}`).join('\n')}

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
{"relevant": false}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
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
    })

    if (!response.ok) {
      console.error(`   ❌ Claude API error: ${response.status}`)
      return { relevant: false }
    }

    const result = await response.json()
    const text = result.content?.[0]?.text || '{}'

    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text

    const analysis = JSON.parse(jsonStr)
    return analysis

  } catch (error) {
    console.error('   ❌ Error in AI analysis:', error.message)
    return { relevant: false }
  }
}

/**
 * Create risk alerts from AI analysis with comprehensive keyword fallback
 */
async function createRiskAlerts(
  supabase: any,
  storedEvents: any[],
  risks: any[],
  claudeApiKey: string,
  minConfidence: number = 0.6,
  scannerMode: string = 'ai'
) {
  let alertsCreated = 0

  console.log(`🔍 Analysis mode: ${scannerMode}, confidence threshold: ${minConfidence}`)

  for (const event of storedEvents) {
    try {
      console.log(`\n🔍 Analyzing event: ${event.title.substring(0, 60)}...`)
      const analysis = await analyzeEventRelevance(event, risks, claudeApiKey)

      // FALLBACK MECHANISM: Force match for obvious keywords if Claude missed them
      if (!analysis.relevant || !analysis.risk_codes || analysis.risk_codes.length === 0) {
        const titleLower = event.title.toLowerCase()
        const descriptionLower = (event.description || '').toLowerCase()
        const categoryLower = (event.event_category || '').toLowerCase()
        const combinedText = `${titleLower} ${descriptionLower} ${categoryLower}`

        const fallbackRiskCodes: string[] = []
        const matchedKeywords: string[] = []

        // Cybersecurity keywords
        const cyberKeywords = ['cyber', 'hack', 'breach', 'ransomware', 'malware', 'phishing', 'vulnerability', 'exploit']
        for (const keyword of cyberKeywords) {
          if (combinedText.includes(keyword)) {
            fallbackRiskCodes.push(...risks.filter(r => r.risk_code.includes('CYB')).map(r => r.risk_code))
            matchedKeywords.push(keyword)
            break
          }
        }

        // Regulatory keywords
        const regulatoryKeywords = ['regulatory', 'regulation', 'compliance', 'sec', 'cbn', 'fine', 'penalty', 'sanction']
        for (const keyword of regulatoryKeywords) {
          if (combinedText.includes(keyword)) {
            fallbackRiskCodes.push(...risks.filter(r => r.risk_code.includes('REG')).map(r => r.risk_code))
            matchedKeywords.push(keyword)
            break
          }
        }

        // Market/Financial keywords
        const marketKeywords = ['market', 'volatility', 'economic', 'financial', 'trading', 'stock', 'bond']
        for (const keyword of marketKeywords) {
          if (combinedText.includes(keyword)) {
            fallbackRiskCodes.push(...risks.filter(r => r.risk_code.includes('MKT') || r.risk_code.includes('FIN')).map(r => r.risk_code))
            matchedKeywords.push(keyword)
            break
          }
        }

        // Operational keywords
        const operationalKeywords = ['outage', 'downtime', 'failure', 'disruption', 'error', 'fraud']
        for (const keyword of operationalKeywords) {
          if (combinedText.includes(keyword)) {
            fallbackRiskCodes.push(...risks.filter(r => r.risk_code.includes('OPE')).map(r => r.risk_code))
            matchedKeywords.push(keyword)
            break
          }
        }

        if (fallbackRiskCodes.length > 0) {
          const uniqueRiskCodes = [...new Set(fallbackRiskCodes)]
          console.log(`   🎯 FALLBACK MATCH: Keywords detected [${matchedKeywords.join(', ')}], forcing match to: ${uniqueRiskCodes.join(', ')}`)
          analysis.relevant = true
          analysis.confidence = 0.5
          analysis.risk_codes = uniqueRiskCodes
          analysis.reasoning = `Keyword-based match: Event contains ${matchedKeywords.length} relevant keyword(s)`
          analysis.impact_assessment = 'External event demonstrates industry/environmental trend'
          analysis.suggested_controls = ['Monitor for similar incidents', 'Review affected risk controls']
          analysis.likelihood_change = 1
        }
      }

      if (analysis.relevant && analysis.confidence >= minConfidence && analysis.risk_codes?.length > 0) {
        console.log(`   ✅ Alert criteria met! Creating alerts for: ${analysis.risk_codes.join(', ')}`)
        for (const riskCode of analysis.risk_codes) {
          const riskDetails = risks.find(r => r.risk_code === riskCode)

          const alert = {
            organization_id: event.organization_id,
            event_id: event.id,
            risk_code: riskCode,
            risk_title: riskDetails?.risk_title || '',
            risk_description: riskDetails?.risk_description || '',
            suggested_likelihood_change: analysis.likelihood_change || 0,
            reasoning: analysis.reasoning || 'No reasoning provided',
            confidence_score: analysis.confidence,
            suggested_controls: analysis.suggested_controls || [],
            impact_assessment: analysis.impact_assessment || '',
            status: 'pending',
          }

          const { error } = await supabase
            .from('risk_intelligence_alerts')
            .insert(alert)

          if (!error) {
            alertsCreated++
            console.log(`   ✅ Created alert for ${riskCode}`)
          } else {
            console.log(`   ❌ Failed to insert alert: ${error.message}`)
          }
        }
      }

      // Mark event as analyzed
      await supabase
        .from('external_events')
        .update({ analyzed_at: new Date().toISOString() })
        .eq('id', event.id)

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))

    } catch (error) {
      console.error(`❌ Error creating alert for event ${event.id}:`, error)
      await supabase
        .from('external_events')
        .update({ analyzed_at: new Date().toISOString() })
        .eq('id', event.id)
    }
  }

  return alertsCreated
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const organizationId = profile.organization_id

    // Parse request body for action
    const body = await req.json()
    const action = body.action

    // Handle resetAnalysis action
    if (action === 'resetAnalysis') {
      const { count, error: resetError } = await supabaseClient
        .from('external_events')
        .update({ analyzed_at: null })
        .eq('organization_id', organizationId)
        .not('analyzed_at', 'is', null)

      if (resetError) throw resetError

      return new Response(
        JSON.stringify({
          success: true,
          message: `Reset ${count || 0} events for re-analysis`,
          events_reset: count || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle analyzeExisting action
    if (action === 'analyzeExisting') {
      const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY') || Deno.env.get('VITE_ANTHROPIC_API_KEY')
      if (!claudeApiKey) {
        return new Response(
          JSON.stringify({ error: 'Claude API key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: events, error: eventsError } = await supabaseClient
        .from('external_events')
        .select('*')
        .eq('organization_id', organizationId)
        .is('analyzed_at', null)
        .order('published_date', { ascending: false })
        .limit(50)

      if (eventsError) throw eventsError

      if (!events || events.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'No unanalyzed events found',
            events_analyzed: 0,
            alerts_created: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const scannerConfig = await loadScannerConfig(supabaseClient, organizationId)
      const risks = await loadRisks(supabaseClient, user.id)

      if (risks.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'No risks found in database',
            events_analyzed: 0,
            alerts_created: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const alertsCreated = await createRiskAlerts(
        supabaseClient,
        events,
        risks,
        claudeApiKey,
        scannerConfig.scanner_confidence_threshold,
        scannerConfig.scanner_mode
      )

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Analysis complete',
          events_analyzed: events.length,
          alerts_created: alertsCreated
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Default: Scan news
    console.log('🚀 Starting news scanner...')

    const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY') || Deno.env.get('VITE_ANTHROPIC_API_KEY')
    if (!claudeApiKey) {
      throw new Error('Claude API key not configured')
    }

    const maxAgeDays = body?.maxAgeDays || 7
    const selectedKeywords = body?.selectedKeywords

    // Load configuration
    const sourcesToScan = await loadNewsSources(supabaseClient, organizationId)
    const riskKeywords = await loadRiskKeywords(supabaseClient, organizationId, selectedKeywords)
    const scannerConfig = await loadScannerConfig(supabaseClient, organizationId)

    console.log(`📡 Scanning ${sourcesToScan.length} sources`)
    console.log(`🔍 Using ${riskKeywords.length} risk keywords`)

    // Parse all RSS feeds
    const parsedFeeds = { events: [], totalItems: 0 }

    for (const source of sourcesToScan) {
      const items = await parseRSSFeed(source.url)
      if (items.length > 0) {
        parsedFeeds.events.push({
          source,
          items,
        })
        parsedFeeds.totalItems += items.length
      }
    }

    console.log(`📊 Total feeds processed: ${parsedFeeds.events.length}`)
    console.log(`📊 Total items found: ${parsedFeeds.totalItems}`)

    // Store events
    const storeResults = await storeEvents(
      supabaseClient,
      parsedFeeds,
      maxAgeDays,
      riskKeywords,
      organizationId
    )

    // Load risks and create alerts
    const risks = await loadRisks(supabaseClient, user.id)
    let alertsCreated = 0

    if (storeResults.events.length > 0 && risks.length > 0) {
      console.log('🤖 Starting AI analysis...')
      alertsCreated = await createRiskAlerts(
        supabaseClient,
        storeResults.events,
        risks,
        claudeApiKey,
        scannerConfig.scanner_confidence_threshold,
        scannerConfig.scanner_mode
      )
    }

    const stats = {
      feeds_processed: parsedFeeds.events.length,
      events_found: parsedFeeds.totalItems,
      events_stored: storeResults.stored,
      alerts_created: alertsCreated,
      max_age_days: maxAgeDays,
    }

    console.log('✅ News scanner completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        message: 'News scan completed successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in news scanner:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
