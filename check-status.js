// check-status.js - Check current database status
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://cnywkjfkhnwptceluvzs.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
  console.log('🔍 Checking MinRisk database status...\n');

  try {
    // Get user
    const userEmail = 'ayodele.onawunmi@213.capital';
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, organization_id')
      .eq('id', (await supabase.from('auth.users').select('id').eq('email', userEmail).single()).data?.id)
      .single();

    if (!users) {
      console.log('❌ User not found');
      return;
    }

    const organizationId = users.organization_id;
    console.log(`✅ Organization ID: ${organizationId}\n`);

    // Check events
    const { data: eventsData, error: eventsError } = await supabase
      .from('external_events')
      .select('analyzed_at')
      .eq('organization_id', organizationId);

    if (eventsError) {
      console.error('❌ Error querying events:', eventsError.message);
    } else {
      const total = eventsData.length;
      const unanalyzed = eventsData.filter(e => e.analyzed_at === null).length;
      const analyzed = eventsData.filter(e => e.analyzed_at !== null).length;

      console.log('📊 EXTERNAL EVENTS:');
      console.log(`   Total: ${total}`);
      console.log(`   Analyzed: ${analyzed}`);
      console.log(`   Unanalyzed: ${unanalyzed}\n`);
    }

    // Check alerts
    const { data: alertsData, error: alertsError } = await supabase
      .from('risk_intelligence_alerts')
      .select('status, confidence_score, risk_code')
      .eq('organization_id', organizationId);

    if (alertsError) {
      console.error('❌ Error querying alerts:', alertsError.message);
    } else {
      console.log('🚨 RISK INTELLIGENCE ALERTS:');
      console.log(`   Total: ${alertsData.length}`);
      const pending = alertsData.filter(a => a.status === 'pending').length;
      const reviewed = alertsData.filter(a => a.status !== 'pending').length;
      console.log(`   Pending: ${pending}`);
      console.log(`   Reviewed: ${reviewed}\n`);

      if (alertsData.length > 0) {
        console.log('   Recent alerts:');
        alertsData.slice(0, 5).forEach(alert => {
          console.log(`   - ${alert.risk_code} (confidence: ${alert.confidence_score})`);
        });
      }
    }

    // Check risks
    const { data: risksData, error: risksError } = await supabase
      .from('risks')
      .select('risk_code')
      .eq('organization_id', organizationId);

    if (risksError) {
      console.error('❌ Error querying risks:', risksError.message);
    } else {
      console.log(`\n📋 ORGANIZATIONAL RISKS: ${risksData.length} total`);
      const cyb = risksData.filter(r => r.risk_code.includes('CYB')).length;
      const reg = risksData.filter(r => r.risk_code.includes('REG')).length;
      const mkt = risksData.filter(r => r.risk_code.includes('MKT')).length;
      console.log(`   Cybersecurity (CYB): ${cyb}`);
      console.log(`   Regulatory (REG): ${reg}`);
      console.log(`   Market (MKT): ${mkt}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkStatus();
