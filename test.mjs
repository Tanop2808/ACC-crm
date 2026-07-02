import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://uyfihyvmveguiujqlvfk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5ZmloeXZtdmVndWl1anFsdmZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2ODY0OTcsImV4cCI6MjA5NzI2MjQ5N30.QoR-XMNGZouCbZ_o-64no326kGAA9VFUiKWIQTB7ZkM'
);

async function check() {
  const { data, error } = await supabase.from('shopify_acc_table').select('id, agent_id, agent_name, created_at, customer_name').order('created_at', { ascending: false }).limit(3);
  console.log('Latest Carts:', data, error);
}
check();
