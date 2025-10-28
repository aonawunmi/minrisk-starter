// Quick test to see what Claude AI is deciding
// Run with: node test-claude-analysis.js

const fetch = require('node-fetch');

async function testAnalysis() {
  console.log('🔬 Testing Claude AI analysis on ONE event...\n');

  try {
    // This will analyze the most recent event and show us what Claude decides
    const response = await fetch('https://minrisk-starter.vercel.app/api/scan-news', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'analyzeEvents'
      })
    });

    const result = await response.json();

    console.log('📊 Result:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ Analysis completed!');
      console.log(`   Events analyzed: ${result.events_analyzed}`);
      console.log(`   Alerts created: ${result.alerts_created}`);

      if (result.alerts_created === 0) {
        console.log('\n⚠️  ZERO ALERTS - Need to check Vercel logs to see Claude\'s reasoning');
        console.log('   Go to: https://vercel.com/team_Zfl7unYQq6jscSMpTVQpoQnY/minrisk-starter');
        console.log('   Click on the most recent deployment');
        console.log('   Scroll down to see function logs');
      }
    } else {
      console.log('\n❌ Error:', result.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAnalysis();
