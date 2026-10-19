import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function audit() {
  console.log('=== AUDITING LIVE SUPABASE DATABASE ===');
  console.log('Target URL:', SUPABASE_URL);

  const tablesToCheck = [
    'members',
    'gallery',
    'social_media',
    'website_settings',
    'activity_logs',
    'class_tasks',
    'class_schedules',
    'piket_schedules',
    'class_kas_records',
    'class_kas_weeks',
    'class_kas_expenses',
    'member_stories',
    'member_accounts',
    'verification_codes'
  ];

  for (const table of tablesToCheck) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(3);

      if (error) {
        console.log(`❌ Table [${table}]: ERROR ->`, error.message, `(Code: ${error.code})`);
      } else {
        console.log(`✅ Table [${table}]: EXISTS -> ${count ?? data?.length ?? 0} rows found`);
        if (table === 'members' && data && data.length > 0) {
          console.log('   Sample member:', {
            id: data[0].id,
            name: data[0].full_name,
            role: data[0].role,
            absen: data[0].attendance_number,
            email: data[0].email
          });
        }
      }
    } catch (err: any) {
      console.log(`❌ Table [${table}]: EXCEPTION ->`, err.message);
    }
  }

  // Check storage buckets
  try {
    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    if (bErr) {
      console.log('❌ Storage Buckets ERROR:', bErr.message);
    } else {
      console.log('✅ Storage Buckets:', buckets?.map((b) => b.name));
    }
  } catch (err: any) {
    console.log('❌ Storage check exception:', err.message);
  }

  console.log('\n=== AUDIT COMPLETE ===');
}

audit().catch(console.error);
