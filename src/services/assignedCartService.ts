import { supabase } from '../lib/supabase';

export interface AssignedCartMaster {
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
  cart_id: string | null;
  checkout_url: string | null;
  cart_value: number;
  currency: string;
  cart_status: string | null;
  abandoned_at: string;
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

export async function getAssignedCarts(
  page: number,
  pageSize: number,
  filters?: { brand_name?: string; source?: string }
) {
  let query = supabase
    .from('abandon_cart_master')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters?.brand_name && filters.brand_name !== 'all') {
    query = query.eq('brand_name', filters.brand_name);
  }
  
  if (filters?.source && filters.source !== 'all') {
    query = query.eq('source', filters.source);
  }

  const { data, error, count } = await query;
  
  if (error) {
    console.error('Error fetching assigned carts:', error);
  }
  
  return { data: data as AssignedCartMaster[] | null, error, count };
}

export async function getUniqueBrands() {
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

export async function getUniqueSources() {
  const { data, error } = await supabase
    .from('abandon_cart_master')
    .select('source')
    .not('source', 'is', null);
    
  if (error) {
    console.error('Error fetching sources:', error);
    return { data: [] };
  }
  
  const uniqueSources = Array.from(new Set(((data as any[]) || []).map((item: any) => item.source))).sort();
  return { data: uniqueSources };
}

export async function updateCartField(
  id: string, 
  source: string | null, 
  updates: any
) {
  if (!source) {
    console.error("Cannot update without source to determine table.");
    return { error: new Error("Missing source") };
  }
  
  const targetTable = source.toLowerCase() === 'shopify' 
    ? 'shopify_acc_table' 
    : 'shiprocket_acc_table';
    
  const { data, error } = await supabase
    .from(targetTable)
    // @ts-ignore: Dynamic table name causes Supabase to infer 'never' type
    .update(updates)
    .eq('id', id)
    .select();
    
  if (error) {
    console.error(`Error updating ${targetTable}:`, error);
  }
  
  return { data, error };
}

export async function assignAgentToCart(
  id: string,
  source: string | null,
  agentId: string,
  agentName: string
) {
  return await updateCartField(id, source, {
    agent_id: agentId,
    agent_name: agentName,
    assignment_status: 'ASSIGNED'
  });
}
