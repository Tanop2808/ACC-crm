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
  const { data, error } = await supabase.rpc('get_schema_columns', { table_name: 'shopify_acc_table' });
  if (error) {
    console.log("RPC failed, trying a direct select of 1 row to see keys:");
    const { data: rows, error: err2 } = await supabase.from('shopify_acc_table').select('*').limit(1);
    if (err2) console.error(err2);
    else console.log(Object.keys(rows[0] || {}));
  } else {
    console.log(data);
  }
}
check();
