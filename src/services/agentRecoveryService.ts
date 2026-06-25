import { supabase } from '../lib/supabase';

export const TEMP_LOGGED_IN_AGENT_ID = 'd54e4800-b005-4da2-bdf0-9af540c5f58c';

export interface AssignedCart {
  id: string;
  brand_id: string | null;
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
  const { data, error } = await supabase.from('agents').select('*');
  if (error) console.error('Error fetching agents:', error);
  return { data, error };
}

export async function getBrands() {
  const { data, error } = await supabase
    .from('abandon_cart_master')
    .select('brand_name')
    .not('brand_name', 'is', null);
    
  if (error) {
    console.error('Error fetching brands:', error);
    return { data: [] };
  }
  
  const uniqueBrands = Array.from(new Set(data.map((item: any) => item.brand_name))).sort();
  return { data: uniqueBrands };
}

export async function getProviders() {
  const { data, error } = await supabase.from('providers').select('*');
  if (error) console.error('Error fetching providers:', error);
  return { data, error };
}

export async function getAssignedCarts(
  agentId: string,
  page: number = 1,
  limit: number = 50,
  filters: { brand_name?: string; source?: string; current_status?: string; call_status?: string, listTab?: string } = {}
): Promise<{ data: AssignedCart[] | null, count: number | null, error: any }> {
  let query = supabase.from('abandon_cart_master').select('*', { count: 'exact' });
  
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
      query = query.eq('assignment_status', 'ASSIGNED').is('call_status', null);
    } else if (filters.listTab === 'in_progress' || filters.listTab === 'in') {
      query = query.not('call_status', 'is', null)
                   .neq('current_status', 'COMPLETED')
                   .neq('current_status', 'NOT_INTERESTED');
    } else if (filters.listTab === 'completed') {
      query = query.eq('current_status', 'COMPLETED');
    } else if (filters.listTab === 'not_interested' || filters.listTab === 'not') {
      query = query.eq('current_status', 'NOT_INTERESTED');
    }
  }

  query = query.order('abandoned_at', { ascending: false });

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
    .order('abandoned_at', { ascending: false });

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

export async function updateRecoveryStatus(cartId: string, assignmentId: string, agentId: string, newStatus: string, oldStatus: string | null) {
  let updates: Record<string, any> = { current_status: newStatus };
  if (newStatus === 'follow_up') {
    updates.follow_up = true;
  } else if (newStatus === 'converted' || newStatus === 'lost') {
    updates.follow_up = false;
  }

  // Update state table first
  const { error: updateError } = await supabase
    .from('abandoned_cart_master')
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
    console.error('Error logging status change:', logError);
    return { error: logError };
  }
  
  return { error: null };
}

export async function addNote(cartId: string, assignmentId: string, agentId: string, noteText: string) {
  // Update state table first
  const { error: updateError } = await supabase
    .from('abandoned_cart_master')
    .update({ notes: noteText } as never)
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
    console.error('Error logging note:', logError);
    return { error: logError };
  }
  
  return { error: null };
}

export async function updateStatusAndNote(cartId: string, assignmentId: string, agentId: string, newStatus: string, oldStatus: string | null, noteText: string, callStatus?: string) {
  let updates: Record<string, any> = { current_status: newStatus, notes: noteText };
  if (callStatus) updates.call_status = callStatus;

  if (newStatus === 'follow_up') {
    updates.follow_up = true;
  } else if (newStatus === 'converted' || newStatus === 'lost') {
    updates.follow_up = false;
  }

  // Update state table first
  const { error: updateError } = await supabase
    .from('abandoned_cart_master')
    .update(updates as never)
    .eq('cart_id', cartId);
    
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
    console.error('Error logging combined status and note:', logError);
    return { error: logError };
  }
  
  return { error: null };
}

export async function scheduleFollowUp(cartId: string, assignmentId: string, agentId: string, followUpTime: string) {
  // Update state table first
  const { error: updateError } = await supabase
    .from('abandoned_cart_master')
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
    console.error('Error logging follow-up:', logError);
    return { error: logError };
  }
  
  return { error: null };
}
