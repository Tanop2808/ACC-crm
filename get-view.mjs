import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: "SELECT pg_get_viewdef('abandon_cart_master', true);" });
  
  if (error) {
    console.error("RPC failed, maybe we need postgres access?", error);
    // Alternatively, just do a REST query if we can't do RPC
  } else {
    console.log(data);
  }
}
run();
