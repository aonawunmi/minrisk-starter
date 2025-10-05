import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://cnywkjfkhnwptceluvzs.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNueXdramZraG53cHRjZWx1dnpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0OTU1OSwiZXhwIjoyMDczNTI1NTU5fQ.XkEcFS8TmQZJlaydkt8cmCYdIrKRVdf-dAzjeUX0rxc';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupDatabase() {
  console.log('🚀 Setting up MinRisk database...\n');

  // Read the SQL file
  const sql = readFileSync('./supabase-schema.sql', 'utf8');

  // Split into individual statements (rough split by semicolon)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';

    // Skip comments
    if (statement.trim().startsWith('--')) continue;

    try {
      const { data, error } = await supabase.rpc('exec', { sql: statement });

      if (error) {
        console.error(`❌ Error on statement ${i + 1}:`, error.message);
        console.error(`   Statement: ${statement.substring(0, 100)}...`);
        errorCount++;
      } else {
        successCount++;
        // Show progress for key operations
        if (statement.includes('CREATE TABLE')) {
          const tableName = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i)?.[1];
          console.log(`✅ Created table: ${tableName}`);
        } else if (statement.includes('CREATE POLICY')) {
          console.log(`✅ Created security policy`);
        } else if (statement.includes('CREATE TRIGGER')) {
          console.log(`✅ Created trigger`);
        }
      }
    } catch (err) {
      console.error(`❌ Exception on statement ${i + 1}:`, err.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);

  if (errorCount === 0) {
    console.log('\n🎉 Database setup completed successfully!');
  } else {
    console.log('\n⚠️  Some errors occurred. You may need to run SQL manually in Supabase dashboard.');
  }
}

setupDatabase().catch(console.error);
