import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// We create a Supabase client to query the extension
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const { cartId, agentId, brandId } = await req.json();

    if (!cartId || !agentId || !brandId) {
      return NextResponse.json({ success: false, error: "Missing required fields: cartId, agentId, brandId" }, { status: 400 });
    }

    // 1. Fetch Agent Extension from agent_brand_assignments
    let { data: assignment, error: assignmentError } = await supabase
      .from('agent_brand_assignments')
      .select('extension')
      .eq('agent_id', agentId)
      .eq('brand_id', brandId)
      .single();

    // FALLBACK for local testing: If you are logged in as a dummy agent but assigned a different agent in the admin panel
    if (assignmentError || !assignment) {
      console.warn("Specific agent assignment not found. Falling back to any available extension for this brand...");
      const { data: fallback } = await supabase
        .from('agent_brand_assignments')
        .select('extension')
        .eq('brand_id', brandId)
        .not('extension', 'is', null)
        .limit(1)
        .single();
        
      if (fallback) {
        assignment = fallback;
        assignmentError = null;
      }
    }

    if (assignmentError || !assignment) {
      return NextResponse.json({ success: false, error: "Agent assignment not found for this brand" }, { status: 404 });
    }

    const extension = assignment.extension;
    if (!extension) {
      return NextResponse.json({ success: false, error: "No SparkTG extension configured for this agent on this brand" }, { status: 400 });
    }

    // 2. Fetch Customer Phone from customer_recovery_view
    const { data: cart, error: cartError } = await supabase
      .from('customer_recovery_view')
      .select('phone')
      .eq('cart_id', cartId)
      .single();

    if (cartError || !cart || !cart.phone) {
      return NextResponse.json({ success: false, error: "Customer phone number not found" }, { status: 404 });
    }

    const customerPhone = cart.phone;

    // 3. Make the API Call to SparkTG
    const apiUrl = process.env.TELEPHONY_API_URL;
    const apiPass = process.env.TELEPHONY_API_PASS;

    if (!apiUrl || !apiPass) {
      console.error("Missing Telephony Env Vars");
      return NextResponse.json({ success: false, error: "Server configuration error" }, { status: 500 });
    }

    const authString = Buffer.from(`${extension}:${apiPass}`).toString('base64');

    // Make the request to SparkTG API
    // (We will use a generic payload, assuming SparkTG accepts number in JSON. Legacy script may have passed it via URL, but we use a robust JSON approach here)
    const payload = {
      number: customerPhone
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Telephony API Error:", response.status, errorText);
      return NextResponse.json({ success: false, error: `Telephony provider error: ${response.statusText}` }, { status: 502 });
    }

    const result = await response.json().catch(() => ({}));

    // 4. Log the activity
    await supabase
      .from('support_activity_logs')
      .insert({
        agent_id: agentId,
        brand_id: brandId,
        cart_id: cartId,
        action: 'CALL_INITIATED',
        notes: `Call initiated via SparkTG to ${customerPhone} (Ext: ${extension})`
      });

    return NextResponse.json({ success: true, data: result });

  } catch (err: any) {
    console.error("Call Initiation Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
