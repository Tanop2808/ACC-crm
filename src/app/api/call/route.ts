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

    // 1. Fetch Agent Extension and Password from agent_brand_assignments
    let { data: assignment, error: assignmentError } = await supabase
      .from('agent_brand_assignments')
      .select('extension, telephony_password, telephony_service_id')
      .eq('agent_id', agentId)
      .eq('brand_id', brandId)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ success: false, error: "Agent assignment not found for this brand" }, { status: 404 });
    }

    const extension = assignment.extension;
    if (!extension) {
      return NextResponse.json({ success: false, error: "No SparkTG extension configured for this agent on this brand" }, { status: 400 });
    }

    // 2. Fetch Customer Phone from abandon_cart_master
    const { data: cart, error: cartError } = await supabase
      .from('abandon_cart_master')
      .select('customer_phone')
      .eq('id', cartId)
      .single();

    if (cartError || !cart || !cart.customer_phone) {
      return NextResponse.json({ success: false, error: `Customer phone number not found (ID: ${cartId})` }, { status: 404 });
    }

    const customerPhone = cart.customer_phone;

    // 3. Make the API Call to SparkTG
    const apiUrl = process.env.TELEPHONY_API_URL;
    const apiPass = assignment.telephony_password || process.env.TELEPHONY_API_PASS;

    if (!apiUrl || !apiPass) {
      console.error("[TELEPHONY_DEBUG] Missing Telephony Env Vars. API_URL:", !!apiUrl, "API_PASS:", !!apiPass);
      return NextResponse.json({ success: false, error: "Server configuration error: Missing API URL or Password" }, { status: 500 });
    }

    const authString = Buffer.from(`${extension}:${apiPass}`).toString('base64');

    // Make the request to SparkTG API
    const payload = new URLSearchParams();
    payload.append("number", customerPhone);
    if (assignment.telephony_service_id) {
      payload.append("service-id", assignment.telephony_service_id);
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: payload
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TELEPHONY_DEBUG] API Call Failed! Status: ${response.status} ${response.statusText}`);
      console.error(`[TELEPHONY_DEBUG] API Error Body:`, errorText);
      return NextResponse.json({ 
        success: false, 
        error: `Telephony provider error: ${response.status} ${response.statusText}`, 
        details: errorText 
      }, { status: 502 });
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
    console.error("[TELEPHONY_DEBUG] Unhandled Error:", err);
    return NextResponse.json({ success: false, error: err.message, details: err.stack }, { status: 500 });
  }
}
