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
  const tables = ['shopify_acc_table', 'shiprocket_acc_table'];
  
  for (const table of tables) {
    console.log(`Updating ${table} for NULL phones...`);
    const { error: err1 } = await supabase
      .from(table)
      .update({ call_status: 'No Number', notes: '[System] Customer did not provide a phone number. (Backfilled)' })
      .is('customer_phone', null)
      .is('call_status', null);
      
    if (err1) console.error(err1);
    else console.log(`Success for ${table} (NULL)`);

    console.log(`Updating ${table} for EMPTY phones...`);
    const { error: err2 } = await supabase
      .from(table)
      .update({ call_status: 'No Number', notes: '[System] Customer did not provide a phone number. (Backfilled)' })
      .eq('customer_phone', '')
      .is('call_status', null);
      
    if (err2) console.error(err2);
    else console.log(`Success for ${table} (EMPTY)`);
  }
}
run();
