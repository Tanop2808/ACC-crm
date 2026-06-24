import { supabase } from '../lib/supabase';

export const TEMP_LOGGED_IN_AGENT_ID = 'd54e4800-b005-4da2-bdf0-9af540c5f58c';

export interface AssignedCart {
  assignment_id: string;
  agent_id: string;
  agent_name: string;

  customer_id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;

  address_id: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip: string | null;

  cart_id: string;
  cart_value: number;
  currency: string;
  checkout_url: string;
  cart_status: string;
  abandoned_at: string;

  products: Array<{
    product_name: string;
    quantity: number;
    price: number | null;
    image_url: string | null;
  }>;

  attempts: number | null;
  call_status: string | null;
  current_status: string | null;
  follow_up: boolean | null;
  notes: string | null;
  last_call_date: string | null;
}

export async function getAgents() {
  const { data, error } = await supabase.from('agents').select('*');
  if (error) console.error('Error fetching agents:', error);
  return { data, error };
}

export async function getAssignedCarts(agentId: string) {
  let query = supabase.from('assigned_carts_view').select('*');
  
  if (agentId !== 'all') {
    query = query.eq('agent_id', agentId);
  }
  
  const { data, error } = await query;
    
  if (error) {
    console.error('Error fetching assigned carts:', error);
    return { data: null, error };
  }
  
  return { data, error: null };
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

export async function updateRecoveryStatus(cartId: string, assignmentId: string, agentId: string, newStatus: string, oldStatus: string) {
  let updates: any = { current_status: newStatus };
  if (newStatus === 'follow_up') {
    updates.follow_up = true;
  } else if (newStatus === 'converted' || newStatus === 'lost') {
    updates.follow_up = false;
  }

  // Update state table first
  const { error: updateError } = await supabase
    .from('cart_recovery_status')
    .update(updates)
    .eq('cart_id', cartId);
    
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
    });
    
  if (logError) {
    console.error('Error logging status change:', logError);
    return { error: logError };
  }
  
  return { error: null };
}

export async function addNote(cartId: string, assignmentId: string, agentId: string, noteText: string) {
  // Update state table first
  const { error: updateError } = await supabase
    .from('cart_recovery_status')
    .update({ notes: noteText })
    .eq('cart_id', cartId);
    
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
    });
    
  if (logError) {
    console.error('Error logging note:', logError);
    return { error: logError };
  }
  
  return { error: null };
}

export async function updateStatusAndNote(cartId: string, assignmentId: string, agentId: string, newStatus: string, oldStatus: string, noteText: string) {
  let updates: any = { current_status: newStatus, notes: noteText };
  if (newStatus === 'follow_up') {
    updates.follow_up = true;
  } else if (newStatus === 'converted' || newStatus === 'lost') {
    updates.follow_up = false;
  }

  // Update state table first
  const { error: updateError } = await supabase
    .from('cart_recovery_status')
    .update(updates)
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
    });
    
  if (logError) {
    console.error('Error logging combined status and note:', logError);
    return { error: logError };
  }
  
  return { error: null };
}

export async function scheduleFollowUp(cartId: string, assignmentId: string, agentId: string, followUpTime: string) {
  // Update state table first
  const { error: updateError } = await supabase
    .from('cart_recovery_status')
    .update({ 
      follow_up: true,
      follow_up_at: followUpTime 
    })
    .eq('cart_id', cartId);
    
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
    });
    
  if (logError) {
    console.error('Error logging follow-up:', logError);
    return { error: logError };
  }
  
  return { error: null };
}
