import { supabase } from '../lib/supabase';

export const TEMP_LOGGED_IN_AGENT_ID = 'd54e4800-b005-4da2-bdf0-9af540c5f58c';

export interface AssignedCart {
  id: string;
  brand_id: string | null;
  brand_name: string | null;
  provider_id: string | null;
  integration_id: string | null;
  source: string | null;
  event_type: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip: string | null;
  checkout_url?: string | null;
  cart_value: number;
  currency: string;
  cart_status: string | null;
  abandoned_at: string | null;
  products: any;
  agent_id: string | null;
  agent_name: string | null;
  assignment_status: string | null;
  attempts: number | null;
  call_status: string | null;
  current_status: string | null;
  follow_up: boolean | null;
  follow_up_at: string | null;
  notes: string | null;
  call_logs: any;
  activity_logs: any;
  created_at: string;
  updated_at: string;
}

export async function getAgents() {
  const { data, error } = await (supabase as any).from('agents').select('*');
  if (error) console.error('Error fetching agents:', error);
  return { data, error };
}

export async function getBrands() {
  const sessionRole = typeof window !== 'undefined' ? localStorage.getItem('session_role') : null;
  const sessionEmail = typeof window !== 'undefined' ? localStorage.getItem('session_email') : null;

  if (sessionRole === 'agent' && sessionEmail) {
    const { data: assignments, error: assignmentError } = await supabase
      .from('agent_brand_assignments')
      .select('brand_name')
      .eq('agent_email', sessionEmail);

    if (assignmentError) {
      console.error('Error fetching brand assignments:', assignmentError);
      return { data: [] };
    }

    const assignedBrands = Array.from(new Set((assignments || []).map((item: any) => item.brand_name).filter(Boolean))).sort();
    return { data: assignedBrands };
  }

  const { data, error } = await supabase
    .from('abandon_cart_master')
    .select('brand_name')
    .not('brand_name', 'is', null);
    
  if (error) {
    console.error('Error fetching brands:', error);
    return { data: [] };
  }
  
  const uniqueBrands = Array.from(new Set(((data as any[]) || []).map((item: any) => item.brand_name))).sort();
  return { data: uniqueBrands };
}

export async function getProviders() {
  const { data, error } = await (supabase as any).from('providers').select('*');
  if (error) console.error('Error fetching providers:', error);
  return { data, error };
}

export async function getAssignedCarts(
  agentId: string,
  page: number = 1,
  limit: number = 50,
  filters: { brand_name?: string; source?: string; current_status?: string; call_status?: string, listTab?: string, searchQuery?: string, cartMin?: number, cartMax?: number, abandonedFrom?: string, abandonedTo?: string, selectedPriorities?: string[] } = {}
): Promise<{ data: AssignedCart[] | null, count: number | null, error: any }> {
  let query = supabase.from('abandon_cart_master').select('*', { count: 'exact' });
  
  // Apply brand filters based on agent assignments
  const sessionRole = typeof window !== 'undefined' ? localStorage.getItem('session_role') : null;
  const sessionEmail = typeof window !== 'undefined' ? localStorage.getItem('session_email') : null;

  if (sessionRole === 'agent' && sessionEmail) {
    const { data: assignments, error: assignmentError } = await supabase
      .from('agent_brand_assignments')
      .select('brand_name, agent_id')
      .eq('agent_email', sessionEmail);

    if (assignmentError) {
      console.error('Error fetching brand assignments:', assignmentError);
      return { data: [], count: 0, error: assignmentError };
    }

    const assignedBrands = (assignments || []).map((a: any) => a.brand_name).filter(Boolean);
    const assignedAgentId = assignments && assignments.length > 0 ? assignments[0].agent_id : null;
    
    console.log("=== DEBUG AGENT VIEW ===");
    console.log("Session Role:", sessionRole);
    console.log("Session Email:", sessionEmail);
    console.log("Extracted Agent ID for filter:", assignedAgentId);
    console.log("========================");

    if (assignedBrands.length === 0 || !assignedAgentId) {
      // Agent is not assigned to any brands yet
      return { data: [], count: 0, error: null };
    }

    query = query.in('brand_name', assignedBrands);
    query = query.eq('agent_id', assignedAgentId);
  }

  if (agentId !== 'all') {
    query = query.eq('agent_id', agentId);
  }

  if (filters.brand_name && filters.brand_name !== 'all') {
    query = query.eq('brand_name', filters.brand_name);
  }
  if (filters.source && filters.source !== 'all') {
    query = query.eq('source', filters.source);
  }
  if (filters.current_status && filters.current_status !== 'all') {
    query = query.eq('current_status', filters.current_status);
  }
  if (filters.call_status && filters.call_status !== 'all') {
    query = query.eq('call_status', filters.call_status);
  }

  if (filters.listTab) {
    if (filters.listTab === 'calls') {
      query = query.is('call_status', null);
    } else if (filters.listTab === 'in_progress' || filters.listTab === 'in') {
      query = query.not('call_status', 'is', null)
                   .neq('current_status', 'converted')
                   .neq('current_status', 'lost');
    } else if (filters.listTab === 'completed') {
      query = query.eq('current_status', 'converted');
    } else if (filters.listTab === 'not_interested' || filters.listTab === 'not') {
      query = query.eq('current_status', 'lost');
    }
  }

  if (filters.searchQuery) {
    query = query.or(`customer_name.ilike.%${filters.searchQuery}%,customer_email.ilike.%${filters.searchQuery}%,customer_phone.ilike.%${filters.searchQuery}%`);
  }

  if (filters.cartMin !== undefined) {
    query = query.gte('cart_value', filters.cartMin);
  }
  
  if (filters.cartMax !== undefined) {
    query = query.lte('cart_value', filters.cartMax);
  }

  if (filters.abandonedFrom) {
    query = query.gte('abandoned_at', filters.abandonedFrom);
  }

  if (filters.abandonedTo) {
    // Append time to include the entire day for the 'To' date
    query = query.lte('abandoned_at', `${filters.abandonedTo}T23:59:59.999Z`);
  }

  if (filters.selectedPriorities && filters.selectedPriorities.length > 0) {
    // Priority is derived from cart_value: High >= 3000, Medium >= 1500 && < 3000, Low < 1500
    const priorityConditions: string[] = [];
    if (filters.selectedPriorities.includes('High')) {
      priorityConditions.push(`cart_value.gte.3000`);
    }
    if (filters.selectedPriorities.includes('Medium')) {
      priorityConditions.push(`and(cart_value.gte.1500,cart_value.lt.3000)`);
    }
    if (filters.selectedPriorities.includes('Low')) {
      priorityConditions.push(`cart_value.lt.1500`);
    }
    if (priorityConditions.length > 0) {
      query = query.or(priorityConditions.join(','));
    }
  }

  query = query.order('updated_at', { ascending: false });

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);
  
  const { data, count, error } = await query;
    
  if (error) {
    console.error('Error fetching assigned carts:', error);
    return { data: null, count: null, error };
  }
  
  return { data: data as AssignedCart[] | null, count, error: null };
}

export async function getCustomerHistory(email: string | null, phone: string | null, currentCartId: string) {
  if (!email && !phone) return { data: [] };

  let query = supabase
    .from('abandon_cart_master')
    .select('*')
    .neq('id', currentCartId)
    .order('updated_at', { ascending: false });

  // Use an OR condition to match either email or phone if both are present
  if (email && phone) {
    query = query.or(`customer_email.eq.${email},customer_phone.eq.${phone}`);
  } else if (email) {
    query = query.eq('customer_email', email);
  } else if (phone) {
    query = query.eq('customer_phone', phone);
  }

  const { data, error } = await query;
  if (error) console.error('Error fetching customer history:', error);
  
  return { data: data || [], error };
}

export async function getFollowUps(agentId: string = TEMP_LOGGED_IN_AGENT_ID) {
  let query = supabase
    .from("agent_follow_up_dashboard_view")
    .select("*")
    .order("follow_up_at", { ascending: true });

  if (agentId !== 'all') {
    query = query.eq("agent_id", agentId);
  }

  const { data, error } = await query;
    
  if (error) {
    console.error('Error fetching follow ups:', error);
    return { data: null, error };
  }
  
  return { data, error: null };
}

export async function getFollowUpDetails(cartId: string) {
  const { data, error } = await supabase
    .from('agent_follow_up_dashboard_view')
    .select('*')
    .eq('cart_id', cartId)
    .single();

  if (error) {
    console.error('Error fetching follow up details:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

export async function getCartTimeline(cartId: string) {
  const { data, error } = await supabase
    .from('support_activity_logs')
    .select('*')
    .eq('cart_id', cartId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching timeline:', error);
    return { data: null, error };
  }
  
  return { data, error: null };
}

// Utility to resolve active table by cart ID
async function resolveCartTable(cartId: string): Promise<string> {
  const { data, error } = await (supabase as any)
    .from('abandon_cart_master')
    .select('source')
    .eq('id', cartId)
    .single();

  if (error || !data || !(data as any).source) {
    throw new Error('Could not resolve cart source');
  }

  return (data as any).source.toLowerCase() === 'shopify' 
    ? 'shopify_acc_table' 
    : 'shiprocket_acc_table';
}

export async function updateRecoveryStatus(cartId: string, assignmentId: string, agentId: string, newStatus: string, oldStatus: string | null) {
  let updates: Record<string, any> = { current_status: newStatus };
  if (newStatus === 'follow_up') {
    updates.follow_up = true;
  } else if (newStatus === 'converted' || newStatus === 'lost') {
    updates.follow_up = false;
  }

  try {
    const targetTable = await resolveCartTable(cartId);

    // Update state table first
    const { error: updateError } = await supabase
      .from(targetTable)
      .update(updates as never)
      .eq('id', cartId);
      
    if (updateError) {
      console.error('Error updating status:', updateError);
      return { error: updateError };
    }
    
    // Insert activity log
    const { error: logError } = await supabase
      .from('support_activity_logs')
      .insert({
        cart_id: cartId,
        assignment_id: assignmentId,
        agent_id: agentId,
        activity_type: 'STATUS_CHANGED',
        description: `Status changed to ${newStatus}`,
        metadata: { old_status: oldStatus, new_status: newStatus }
      } as never);
      
    if (logError) {
      console.warn('Warning: Error logging status change (ignoring due to FK constraint):', logError);
      return { error: null }; // Swallowing error so the main update succeeds
    }
    
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

export async function addNote(cartId: string, assignmentId: string, agentId: string, noteText: string) {
  try {
    const targetTable = await resolveCartTable(cartId);

    const { data: cartData } = await supabase.from(targetTable).select('activity_logs').eq('id', cartId).single();
    const currentLogs = Array.isArray((cartData as any)?.activity_logs) ? (cartData as any).activity_logs : [];
    const newLog = {
      type: 'note',
      content: noteText,
      timestamp: new Date().toISOString()
    };
    
    // Update state table first
    const { error: updateError } = await supabase
      .from(targetTable)
      .update({ notes: noteText, activity_logs: [...currentLogs, newLog] } as never)
      .eq('id', cartId);
      
    if (updateError) {
      console.error('Error adding note to status:', updateError);
      return { error: updateError };
    }
    
    // Insert activity log
    const { error: logError } = await supabase
      .from('support_activity_logs')
      .insert({
        cart_id: cartId,
        assignment_id: assignmentId,
        agent_id: agentId,
        activity_type: 'NOTE_ADDED',
        description: noteText
      } as never);
      
    if (logError) {
      console.warn('Warning: Error logging note (ignoring due to FK constraint):', logError);
      return { error: null }; // Swallowing error so the main Note update succeeds
    }
    
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

export async function updateStatusAndNote(cartId: string, assignmentId: string, agentId: string, newStatus: string, oldStatus: string | null, noteText: string, callStatus?: string) {
  let updates: Record<string, any> = { current_status: newStatus, notes: noteText };
  if (callStatus) updates.call_status = callStatus;

  if (newStatus === 'follow_up') {
    updates.follow_up = true;
  } else if (newStatus === 'converted' || newStatus === 'lost') {
    updates.follow_up = false;
  }

  try {
    const targetTable = await resolveCartTable(cartId);

    const { data: cartData } = await supabase.from(targetTable).select('activity_logs').eq('id', cartId).single();
    const currentLogs = Array.isArray((cartData as any)?.activity_logs) ? (cartData as any).activity_logs : [];
    
    let activityText = `Status changed to ${newStatus.replace(/_/g, ' ')}`;
    if (noteText) {
      activityText += ` - Note: ${noteText}`;
    }

    const newLog = {
      type: 'status_update',
      content: activityText,
      timestamp: new Date().toISOString()
    };
    
    updates.activity_logs = [...currentLogs, newLog];

    // Update state table first
    const { error: updateError } = await supabase
      .from(targetTable)
      .update(updates as never)
      .eq('id', cartId);
      
    if (updateError) {
      console.error('Error updating status and note:', updateError);
      return { error: updateError };
    }
    
    // Insert a single combined activity log
    const { error: logError } = await supabase
      .from('support_activity_logs')
      .insert({
        cart_id: cartId,
        assignment_id: assignmentId,
        agent_id: agentId,
        activity_type: 'STATUS_AND_NOTE',
        description: `Status changed to ${newStatus}. Note: ${noteText}`,
        metadata: { old_status: oldStatus, new_status: newStatus, note: noteText }
      } as never);
      
    if (logError) {
      console.warn('Warning: Error logging combined status and note (ignoring due to FK constraint):', logError);
      return { error: null }; // Swallowing error so the main update succeeds
    }
    
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

export async function scheduleFollowUp(cartId: string, assignmentId: string, agentId: string, followUpTime: string) {
  try {
    const targetTable = await resolveCartTable(cartId);

    // Update state table first
    const { error: updateError } = await supabase
      .from(targetTable)
      .update({ 
        follow_up: true,
        follow_up_at: followUpTime 
      } as never)
      .eq('id', cartId);
      
    if (updateError) {
      console.error('Error scheduling follow-up:', updateError);
      return { error: updateError };
    }
    
    // Insert activity log
    const { error: logError } = await supabase
      .from('support_activity_logs')
      .insert({
        cart_id: cartId,
        assignment_id: assignmentId,
        agent_id: agentId,
        activity_type: 'FOLLOW_UP_CREATED',
        description: 'Follow up scheduled'
      } as never);
      
    if (logError) {
      console.warn('Warning: Error logging follow-up (ignoring due to FK constraint):', logError);
      return { error: null }; // Swallowing error so the main update succeeds
    }
    
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}
