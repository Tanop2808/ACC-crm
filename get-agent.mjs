import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { data, error } = await supabase.from('agents').select('*').limit(1);
  console.log("Agents:", JSON.stringify(data, null, 2));
  
  const { data: assignments } = await supabase.from('cart_assignments').select('*').limit(1);
  console.log("Assignments:", JSON.stringify(assignments, null, 2));
}

run();
