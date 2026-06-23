import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('agent_follow_up_view')
    .select('*')
    .order('follow_up_at', { ascending: true })
    .limit(1);
    
  if (error) {
    console.log("Error details:", JSON.stringify(error, null, 2));
  } else {
    console.log("Success! Columns:", Object.keys(data[0] || {}));
  }
}

run();
