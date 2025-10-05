import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cnywkjfkhnwptceluvzs.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNueXdramZraG53cHRjZWx1dnpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0OTU1OSwiZXhwIjoyMDczNTI1NTU5fQ.XkEcFS8TmQZJlaydkt8cmCYdIrKRVdf-dAzjeUX0rxc';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkDatabase() {
  console.log('🔍 Checking database contents...\n');

  // Check organizations
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('*');

  console.log('📊 Organizations:', orgs?.length || 0);
  if (orgsError) console.error('Error:', orgsError.message);
  else console.log(orgs);

  // Check user profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('*');

  console.log('\n👤 User Profiles:', profiles?.length || 0);
  if (profilesError) console.error('Error:', profilesError.message);
  else console.log(profiles);

  // Check risks
  const { data: risks, error: risksError } = await supabase
    .from('risks')
    .select('*');

  console.log('\n⚠️  Risks:', risks?.length || 0);
  if (risksError) console.error('Error:', risksError.message);
  else console.log(risks);

  // Check controls
  const { data: controls, error: controlsError } = await supabase
    .from('controls')
    .select('*');

  console.log('\n🎛️  Controls:', controls?.length || 0);
  if (controlsError) console.error('Error:', controlsError.message);
  else console.log(controls);
}

checkDatabase().catch(console.error);
