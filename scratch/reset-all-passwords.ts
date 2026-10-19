import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- RESET ALL PASSWORDS AUDIT & EXECUTION ---');
  const { data: members, error: memErr } = await supabase
    .from('members')
    .select('id, full_name, nickname, attendance_number, email, role, member_type')
    .order('attendance_number', { ascending: true });

  if (memErr || !members) {
    console.error('Error fetching members:', memErr);
    process.exit(1);
  }

  console.log(`Found ${members.length} members.`);

  for (const m of members) {
    let plainPassword = '';
    if (m.member_type === 'siswa' || m.attendance_number) {
      const parsed = parseInt(String(m.attendance_number ?? ''), 10);
      const attNum = !isNaN(parsed) ? String(parsed).padStart(2, '0') : '00';
      plainPassword = `icptkj35_${attNum}`;
    } else {
      plainPassword = 'icptkj35_guru';
    }

    const hash = await bcrypt.hash(plainPassword, 10);

    // Check existing account in member_accounts
    const { data: existingAcc } = await supabase
      .from('member_accounts')
      .select('*')
      .eq('member_id', m.id)
      .maybeSingle();

    if (existingAcc) {
      const { error: updErr } = await supabase
        .from('member_accounts')
        .update({
          password_hash: hash,
          has_changed_password: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('member_id', m.id);

      if (updErr) {
        console.error(`Failed updating account for ${m.full_name}:`, updErr.message);
      } else {
        console.log(`[UPDATED] Absen ${m.attendance_number}: ${m.full_name} -> ${plainPassword}`);
      }
    } else if (m.email && m.email.trim()) {
      const now = new Date().toISOString();
      const { error: insErr } = await supabase
        .from('member_accounts')
        .insert({
          member_id: m.id,
          email: m.email.trim().toLowerCase(),
          password_hash: hash,
          has_changed_password: 0,
          created_at: now,
          updated_at: now,
        });

      if (insErr) {
        console.error(`Failed creating account for ${m.full_name}:`, insErr.message);
      } else {
        console.log(`[CREATED] Absen ${m.attendance_number}: ${m.full_name} (${m.email}) -> ${plainPassword}`);
      }
    } else {
      console.log(`[SKIPPED - No email yet] Absen ${m.attendance_number}: ${m.full_name} (Will auto-set ${plainPassword} on first email registration/login)`);
    }
  }

  console.log('--- ALL PASSWORDS SUCCESSFULLY RESET TO DEFAULT FORMAT ---');
}

run().catch(console.error);
