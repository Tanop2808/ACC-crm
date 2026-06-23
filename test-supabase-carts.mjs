import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { data, error } = await supabase.from('abandoned_carts').select('*').limit(1);
  if (data && data.length > 0) {
    console.log("Cart Columns:", Object.keys(data[0]));
    console.log("Cart Sample Data:", JSON.stringify(data[0], null, 2));
  } else {
    console.log("No data found or error:", error);
  }
}

run();
