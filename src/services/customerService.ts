import { supabase } from '../lib/supabase';
import { CustomerRecovery } from '../types/database';

export async function getCustomers(): Promise<{ data: CustomerRecovery[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('customer_recovery_view')
      .select('*')
      .order('abandoned_at', { ascending: false });

    // Apply brand filters based on agent assignments
    const sessionRole = typeof window !== 'undefined' ? localStorage.getItem('session_role') : null;
    const sessionEmail = typeof window !== 'undefined' ? localStorage.getItem('session_email') : null;

    if (sessionRole === 'agent' && sessionEmail) {
      const { data: assignments, error: assignmentError } = await supabase
        .from('agent_brand_assignments')
        .select('brand_name')
        .eq('agent_email', sessionEmail);

      if (assignmentError) {
        console.error('Error fetching brand assignments:', assignmentError);
        return { data: [], error: new Error(assignmentError.message) };
      }

      const assignedBrands = (assignments || []).map((a: any) => a.brand_name).filter(Boolean);
      
      if (assignedBrands.length === 0) {
        // Agent is not assigned to any brands yet
        return { data: [], error: null };
      }

      query = query.in('source', assignedBrands);
    }

    const { data, error } = await query;

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
