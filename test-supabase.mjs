import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uyfihyvmveguiujqlvfk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5ZmloeXZtdmVndWl1anFsdmZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2ODY0OTcsImV4cCI6MjA5NzI2MjQ5N30.QoR-XMNGZouCbZ_o-64no326kGAA9VFUiKWIQTB7ZkM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('Fetching customer_recoveries...');
  const { data, error } = await supabase
    .from('customer_recovery_view')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Error fetching data:', error);
  } else {
    console.log('Data found:', data.length, 'rows');
    if (data.length > 0) {
      console.log('Sample data:', JSON.stringify(data[0], null, 2));
    }
  }
}

checkData();
