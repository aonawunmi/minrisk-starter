// Test Claude AI analysis locally to see what it's deciding
// Run with: node test-claude-local.js

const Anthropic = require('@anthropic-ai/sdk');

// Sample event (like what's in your database)
const sampleEvent = {
  title: "Qilin Ransomware Combines Linux Payload With BYOVD Exploit in Hybrid Attack",
  description: "Cybersecurity researchers have detailed a hybrid attack campaign...",
  event_category: "Cybersecurity",
  source_name: "The Hacker News"
};

// Sample risks (like what's in your database)
const sampleRisks = [
  {
    risk_code: "STR-CYB-001",
    risk_title: "Increased Cyber Threat Landscape",
    risk_description: "Rising sophistication and frequency of cyber attacks targeting financial institutions"
  },
  {
    risk_code: "STR-CYB-002",
    risk_title: "Third-Party Vendor Security Incidents",
    risk_description: "Security breaches at vendors that could impact our operations"
  },
  {
    risk_code: "STR-REG-001",
    risk_title: "Regulatory Compliance Changes",
    risk_description: "New or changing regulatory requirements in financial services"
  }
];

async function testClaudeAnalysis() {
  console.log('🔬 Testing Claude AI locally...\n');
  console.log('📋 Sample Event:');
  console.log(`   Title: ${sampleEvent.title}`);
  console.log(`   Category: ${sampleEvent.event_category}`);
  console.log(`   Source: ${sampleEvent.source_name}\n`);

  // Build the same prompt that scan-news.js uses
  const prompt = `You are a risk intelligence analyst. Your job is to find ANY thematic connections between external events and organizational risks for early warning purposes.

EVENT:
Title: ${sampleEvent.title}
Description: ${sampleEvent.description}
Category: ${sampleEvent.event_category}
Source: ${sampleEvent.source_name}

⚠️ IMPORTANT: The TITLE is the most reliable indicator. If the title contains keywords related to a risk category (e.g., "ransomware", "phishing", "cyber", "regulatory", "market"), treat it as relevant even if the description is short.

ORGANIZATIONAL RISKS:
${sampleRisks.map(r => `[${r.risk_code}] ${r.risk_title} - ${r.risk_description}`).join('\n')}

YOUR TASK:
Find ALL risks that have even a REMOTE thematic connection to this event. Be GENEROUS - we want early warnings.

MATCHING CRITERIA (match if ANY apply):
✓ Same topic area (cyber event → cyber risks, regulatory → compliance risks, market → market risks)
✓ Same industry (financial services event → ANY financial risk)
✓ Precedent value (happened elsewhere → could happen here)
✓ Environmental indicator (shows landscape changing → strategic/external risks)

CONCRETE EXAMPLES:
- "Ransomware attack on Bank X" → MATCH: All cybersecurity risks (STR-CYB-001, STR-CYB-002, etc.) with confidence 0.5-0.7
- "SEC announces new rule" → MATCH: All regulatory risks (STR-REG-001, STR-REG-002) with confidence 0.4-0.6
- "Market volatility reported" → MATCH: Market risks (STR-MKT-001, STR-MKT-002) with confidence 0.4-0.6
- "Tech outage at competitor" → MATCH: Technology risks (STR-OPE-001, STR-CYB-002) with confidence 0.4-0.6

CONFIDENCE SCALE:
- 0.7-1.0: Direct relevance to this organization
- 0.4-0.6: Thematic match, industry precedent, environmental indicator
- 0.3-0.4: Weak but notable connection
- below 0.3: No meaningful connection

IMPORTANT: If event matches the general theme/category of a risk, mark relevant with confidence 0.4+

Return ONLY valid JSON:
{
  "relevant": true,
  "risk_codes": ["STR-CYB-001", "STR-CYB-002"],
  "confidence": 0.5,
  "likelihood_change": 1,
  "reasoning": "Ransomware attacks show escalating cyber threat landscape",
  "impact_assessment": "Industry-wide increase in sophisticated attacks",
  "suggested_controls": ["Monitor threat intel", "Review defenses"]
}

If absolutely zero thematic overlap, return: {"relevant": false}`;

  console.log('📝 Prompt (first 500 chars):');
  console.log(prompt.substring(0, 500) + '...\n');

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key-here'
    });

    console.log('🤖 Calling Claude AI...\n');

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: prompt
      }]
    });

    const responseText = message.content[0].text;
    console.log('📊 Claude AI Response:');
    console.log(responseText);
    console.log();

    try {
      const analysis = JSON.parse(responseText);
      console.log('✅ Parsed Analysis:');
      console.log(JSON.stringify(analysis, null, 2));

      if (analysis.relevant) {
        console.log(`\n🎯 Result: RELEVANT - Would create alert with confidence ${analysis.confidence}`);
      } else {
        console.log('\n⚠️  Result: NOT RELEVANT - No alert would be created');
        console.log('   This is the problem! Claude should match this event to STR-CYB-001 and STR-CYB-002');
      }
    } catch (parseError) {
      console.error('❌ Failed to parse Claude response as JSON');
      console.error(parseError.message);
    }

  } catch (error) {
    console.error('❌ Error calling Claude:', error.message);
    console.log('\n💡 Make sure ANTHROPIC_API_KEY is set in your environment');
  }
}

testClaudeAnalysis();
