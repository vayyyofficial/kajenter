import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testStorage() {
  console.log('--- Testing Supabase Storage Upload ---');
  const buffer = Buffer.from('89504e470d0a1a0a', 'hex'); // minimal png signature
  const path = `stories/test_${Date.now()}.png`;
  
  const { data, error } = await supabase.storage.from('uploads').upload(path, buffer, {
    contentType: 'image/png',
    upsert: true
  });

  if (error) {
    console.error('Storage Upload Error:', error.message);
    process.exit(1);
  }

  const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(path);
  console.log('✓ Upload Success! Path:', data.path);
  console.log('✓ Public URL:', publicUrlData.publicUrl);

  // Clean up
  const { error: delErr } = await supabase.storage.from('uploads').remove([path]);
  if (delErr) {
    console.warn('Storage delete warning:', delErr.message);
  } else {
    console.log('✓ Test file cleaned up successfully');
  }

  console.log('--- Storage Test Complete! ---');
}

testStorage().catch(console.error);
