import { supabase } from '../lib/supabase';
import { CustomerRecovery } from '../types/database';

export async function getCustomers(): Promise<{ data: CustomerRecovery[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('customer_recoveries')
      .select('*')
      .order('abandoned_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Unexpected error fetching customers:', error);
    return { data: null, error: new Error(error.message || 'An unexpected error occurred') };
  }
}
