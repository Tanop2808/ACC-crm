import { supabase } from '../lib/supabase';

// Use a temporary hardcoded agent UUID from the agents table for development.
// This ensures production logic (agents seeing only their carts) is maintained.
export const TEMP_LOGGED_IN_AGENT_ID = 'd54e4800-b005-4da2-bdf0-9af540c5f58c';

export async function getAgents() {
  const { data, error } = await supabase.from('agents').select('*');
  if (error) console.error('Error fetching agents:', error);
  return { data, error };
}

export async function getAssignedCarts(agentId: string) {
  let query = supabase.from('agent_recovery_dashboard_view').select('*');
  
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
  // Update state table first
  const { error: updateError } = await supabase
    .from('cart_recovery_status')
    .update({ current_status: newStatus })
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
