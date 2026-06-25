import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('abandoned_cart_master').select(`*`).limit(5);
  console.log(JSON.stringify({data, error}, null, 2));

  const { data: bData } = await supabase.from('brands').select('*');
  console.log('Brands:', bData);
  
  const { data: pData } = await supabase.from('providers').select('*');
  console.log('Providers:', pData);
}

check();
