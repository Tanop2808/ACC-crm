import { supabase } from '../lib/supabase';

export interface Brand {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Provider {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Integration {
  id: string;
  brand_id: string;
  provider_id: string;
  integration_token: string | null;
  webhook_path: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  provider_name?: string;
}

export interface AgentAssignment {
  id: string;
  agent_id: string;
  agent_email: string;
  brand_id: string;
  brand_name: string;
  created_at: string;
  agent_name?: string;
}

// Fetch all brands
export async function getBrands() {
  const { data, error } = await (supabase as any)
    .from('brands')
    .select('*')
    .order('name', { ascending: true });
  return { data: data as Brand[] | null, error };
}

// Fetch a single brand by ID
export async function getBrandById(id: string) {
  const { data, error } = await (supabase as any)
    .from('brands')
    .select('*')
    .eq('id', id)
    .single();
  return { data: data as Brand | null, error };
}

// Add a new brand
export async function createBrand(name: string) {
  const { data, error } = await (supabase as any)
    .from('brands')
    .insert({ name })
    .select()
    .single();
  return { data: data as Brand | null, error };
}

// Fetch all providers
export async function getProviders() {
  const { data, error } = await (supabase as any)
    .from('providers')
    .select('*')
    .order('name', { ascending: true });
  return { data: data as Provider[] | null, error };
}

// Fetch existing integrations for a brand
export async function getBrandIntegrations(brandId: string) {
  const { data, error } = await (supabase as any)
    .from('integrations')
    .select('*, providers(name)')
    .eq('brand_id', brandId);
  
  if (data) {
    const formatted = data.map((item: any) => ({
      ...item,
      provider_name: item.providers?.name || 'Unknown'
    }));
    return { data: formatted as Integration[], error: null };
  }

  return { data: null, error };
}

// Generate integration token sequentially: brand_provider_nnn
export async function generateIntegrationToken(brandId: string, providerId: string): Promise<string> {
  const { data: brand } = await (supabase as any).from('brands').select('name').eq('id', brandId).single();
  const { data: provider } = await (supabase as any).from('providers').select('name').eq('id', providerId).single();
  
  if (!brand || !provider) {
    throw new Error('Brand or Provider not found');
  }

  const cleanBrand = brand.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanProvider = provider.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const prefix = `${cleanBrand}_${cleanProvider}_`;

  // Fetch all existing integration tokens for this provider across ALL brands
  const { data: integrations } = await (supabase as any)
    .from('integrations')
    .select('integration_token')
    .eq('provider_id', providerId);

  let maxNum = 0;
  if (integrations) {
    for (const integration of integrations) {
      const token = integration.integration_token;
      if (token) {
        const parts = token.split('_');
        const numStr = parts[parts.length - 1];
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  const nextNum = maxNum + 1;
  const suffix = String(nextNum).padStart(3, '0');
  return `${prefix}${suffix}`;
}

// Save a new integration
export async function createIntegration(brandId: string, providerId: string) {
  try {
    const token = await generateIntegrationToken(brandId, providerId);
    const webhookPath = `/api/webhooks/${token}`;

    const { data, error } = await (supabase as any)
      .from('integrations')
      .insert({
        brand_id: brandId,
        provider_id: providerId,
        integration_token: token,
        webhook_path: webhookPath,
        status: 'ACTIVE'
      })
      .select()
      .single();

    return { data: data as Integration | null, error };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

// Fetch agent brand assignments for a brand
export async function getAgentBrandAssignments(brandId: string) {
  const { data, error } = await (supabase as any)
    .from('agent_brand_assignments')
    .select('*, agents(name)')
    .eq('brand_id', brandId);

  if (data) {
    const formatted = data.map((item: any) => ({
      ...item,
      agent_name: item.agents?.name || 'Unknown'
    }));
    return { data: formatted as AgentAssignment[], error: null };
  }

  return { data: null, error };
}

// Assign agent to brand
export async function assignAgentToBrand(brandId: string, name: string, email: string) {
  // Clean email
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail.endsWith('@datastraw.in')) {
    throw new Error('Only @datastraw.in emails are allowed.');
  }

  // 1. Check if agent exists in agents table. If not, create them.
  let agentId: string;
  const { data: existingAgent } = await (supabase as any)
    .from('agents')
    .select('id')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (existingAgent) {
    agentId = existingAgent.id;
  } else {
    const { data: newAgent, error: createError } = await (supabase as any)
      .from('agents')
      .insert({ name, email: cleanEmail, status: 'active' })
      .select('id')
      .single();
    if (createError) throw createError;
    agentId = newAgent.id;
  }

  // 2. Fetch brand details
  const { data: brand } = await (supabase as any).from('brands').select('name').eq('id', brandId).single();
  if (!brand) throw new Error('Brand not found');

  // 3. Create user role mapping as agent
  await (supabase as any)
    .from('user_roles')
    .upsert({ email: cleanEmail, role: 'agent' }, { onConflict: 'email' });

  // 4. Create assignment
  const { data, error } = await (supabase as any)
    .from('agent_brand_assignments')
    .insert({
      agent_id: agentId,
      agent_email: cleanEmail,
      brand_id: brandId,
      brand_name: brand.name
    })
    .select()
    .single();

  return { data: data as AgentAssignment | null, error };
}

// Remove agent assignment
export async function removeAgentFromBrand(assignmentId: string) {
  const { error } = await (supabase as any)
    .from('agent_brand_assignments')
    .delete()
    .eq('id', assignmentId);
  return { error };
}

// Check role of email
export async function checkUserRole(email: string): Promise<'admin' | 'agent' | null> {
  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await (supabase as any)
    .from('user_roles')
    .select('role')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (error || !data) {
    const { data: assignments } = await (supabase as any)
      .from('agent_brand_assignments')
      .select('id')
      .eq('agent_email', cleanEmail)
      .limit(1);
    
    return (assignments && assignments.length > 0) ? 'agent' : null;
  }

  return data.role as 'admin' | 'agent';
}

export interface UserRole {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

// Fetch all active admins
export async function getAdmins() {
  const { data, error } = await (supabase as any)
    .from('user_roles')
    .select('*')
    .eq('role', 'admin')
    .order('created_at', { ascending: false });
  return { data: data as UserRole[] | null, error };
}

// Add a new admin by email
export async function addAdmin(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  
  if (!cleanEmail.endsWith('@datastraw.in')) {
    return { data: null, error: new Error('Only @datastraw.in emails are allowed.') };
  }

  const { data: existing } = await (supabase as any)
    .from('user_roles')
    .select('id')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (existing) {
    return { data: null, error: new Error('User is already assigned a role.') };
  }

  const { data, error } = await (supabase as any)
    .from('user_roles')
    .insert([{ email: cleanEmail, role: 'admin' }])
    .select()
    .single();
    
  return { data, error };
}

// Revoke an admin's access
export async function removeAdmin(id: string) {
  const { error } = await (supabase as any)
    .from('user_roles')
    .delete()
    .eq('id', id);
  return { error };
}
