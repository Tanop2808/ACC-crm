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

async function check() {
  const { data, error } = await supabase
    .from('abandon_cart_master')
    .select('id, cart_status, current_status, customer_phone')
    .eq('id', '1835d9e8-52cd-4e52-b967-70ede666150f')
    .is('call_status', null)
    .or('current_status.is.null,current_status.neq.recovered');
    
  console.log("PAYLOADS:", JSON.stringify(data, null, 2));
  console.log("ERROR:", error);
}

check();
