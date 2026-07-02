import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

// CORS Headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();

    const integrationToken = body.integration_token || req.headers.get("x-integration-token");
    if (!integrationToken) {
      return new Response(JSON.stringify({ error: "Missing integration_token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .select(`id, brand_id, provider_id`)
      .eq("integration_token", integrationToken)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (integrationError || !integration) {
      return new Response(JSON.stringify({ error: "Invalid integration token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let phone = body.phoneNumber;
    if (phone === "N/A" || phone?.trim() === "") phone = null;

    let email = body.email;
    if (email === "N/A" || email?.trim() === "") email = null;

    const orderId = body.orderId;
    const amount = Number(body.cartValue || 0);
    const paymentMode = body.payment_mode;

    if (!phone && !email) {
       return new Response(JSON.stringify({ message: "No phone or email to match" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build the query to find abandoned carts for this customer
    const matchConditions = [];
    if (phone) matchConditions.push(`customer_phone.eq."${phone}"`);
    if (email) matchConditions.push(`customer_email.eq."${email}"`);
    const orQuery = matchConditions.join(',');

    const pendingStatuses = ['calls', 'attempted', 'interested'];
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Update Shopify table
    const { error: shopifyError } = await supabase
      .from('shopify_acc_table')
      .update({
        current_status: 'recovered',
        recovered_order_id: orderId,
        recovered_amount: amount,
        recovered_payment_type: paymentMode,
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', integration.brand_id)
      .in('current_status', pendingStatuses)
      .gte('abandoned_at', twentyFourHoursAgo)
      .or(orQuery);

    // Update Shiprocket table
    const { error: shiprocketError } = await supabase
      .from('shiprocket_acc_table')
      .update({
        current_status: 'recovered',
        recovered_order_id: orderId,
        recovered_amount: amount,
        recovered_payment_type: paymentMode,
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', integration.brand_id)
      .in('current_status', pendingStatuses)
      .gte('abandoned_at', twentyFourHoursAgo)
      .or(orQuery);

    if (shopifyError) console.error("Shopify Update Error:", shopifyError);
    if (shiprocketError) console.error("Shiprocket Update Error:", shiprocketError);

    // Also attempt to save this directly into the shopify_orders master table
    const { error: insertError } = await supabase
      .from('shopify_orders')
      .insert({
        integration_id: integration.id,
        brand_id: integration.brand_id,
        order_id: orderId,
        customer_name: body.customerName || null,
        customer_email: email,
        customer_phone: phone,
        order_value: amount,
        payment_mode: paymentMode,
        discount_code: body.discountCode && body.discountCode !== 'N/A' ? body.discountCode : null,
        products: body.productsInCart || null,
        order_date: body.date || null,
        order_time: body.time || null
      });
      
    if (insertError) {
      console.log("Failed to insert into shopify_orders (table might not exist yet):", insertError);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Matched carts updated successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Error Processing Webhook:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
