import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function run() {
  const { data } = await supabase.from('members').select('*').order('attendance_number', { ascending: true });
  console.log('Total members in Supabase:', data?.length);
  data?.forEach((m) => {
    console.log(`[ID ${m.id}] Absen ${m.attendance_number ?? '-'}: ${m.full_name} | Role: ${m.role} | Email: ${m.email || '(empty)'}`);
  });
}
run();
