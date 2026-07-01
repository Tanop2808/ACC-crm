import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Helper to get current time in IST (UTC+5:30) as a string without timezone
function getISTTimestamp() {
  const date = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffset);
  return istDate.toISOString().replace('Z', '');
}

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json();

    console.log(
      "Shiprocket Payload Received:",
      JSON.stringify(body, null, 2)
    );

    // ==========================================
    // 1. GET INTEGRATION TOKEN
    // ==========================================
    const integrationToken = req.headers.get("x-integration-token")?.trim();

    if (!integrationToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing integration token"
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // ==========================================
    // 2. SUPABASE CONNECTION
    // ==========================================
    const supabaseUrl = Deno.env.get("PROJECT_URL")!;
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ==========================================
    // 3. FIND INTEGRATION
    // ==========================================
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .select(`id, brand_id, provider_id`)
      .eq("integration_token", integrationToken)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (integrationError || !integration) {
      console.log("Integration Error:", integrationError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid integration token"
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    console.log("Integration Found:", integration);

    // ==========================================
    // GET BRAND NAME (MOVED OUTSIDE ERROR BLOCK)
    // ==========================================
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("name")
      .eq("id", integration.brand_id)
      .maybeSingle();

    if (brandError) {
      console.log("Brand Fetch Error:", brandError);
    }

    // ==========================================
    // 4. EXTRACT SHIPROCKET DATA
    // ==========================================
    const firstName = body.first_name ?? null;
    const lastName = body.last_name ?? null;

    const customerName = [firstName, lastName].filter(Boolean).join(" ") || null;
    const email = body.email ?? null;
    const address = body.shipping_address ?? body.billing_address ?? {};
    const phone = body.phone_number ?? body.phone ?? address.phone ?? address.phone_number ?? null;
    const cartId = body.cart_id ?? null;
    const cartToken = body.cart_token ?? null;
    const checkoutUrl = body.checkout_url ?? null;
    const cartValue = Number(body.total_price ?? 0);
    const products = body.items ?? [];
    const abandonedAt = body.updated_at ? body.updated_at : getISTTimestamp();

    console.log("Extracted Customer:", { email, phone, cartId });

    // ==========================================
    // 5. FIND EXISTING CUSTOMER CART
    // ==========================================
    // ==========================================
    // 5. FIND EXISTING CUSTOMER CART (By Cart ID)
    // ==========================================
    let existingRecord = null;

    if (cartId) {
      const { data: cartMatch, error: cartError } = await supabase
        .from("shiprocket_acc_table")
        .select("*")
        .eq("brand_id", integration.brand_id)
        .eq("cart_id", cartId)
        .limit(1)
        .maybeSingle();

      if (cartError) {
        console.log("Cart lookup error:", cartError);
      }
      existingRecord = cartMatch;
    }
    // Fallback just in case Shiprocket sends token instead of ID
    else if (cartToken) {
      const { data: tokenMatch, error: tokenError } = await supabase
        .from("shiprocket_acc_table")
        .select("*")
        .eq("brand_id", integration.brand_id)
        .eq("cart_token", cartToken)
        .limit(1)
        .maybeSingle();

      if (tokenError) {
        console.log("Cart token lookup error:", tokenError);
      }
      existingRecord = tokenMatch;
    }

    // ==========================================
    // 6. IF EXISTING RECORD UPDATE
    // ==========================================
    const isRecovered = 
      body.latest_stage === "PAYMENT_RECEIVED" || 
      body.latest_stage === "ORDER_PLACED" || 
      body.latest_stage === "ORDER_COMPLETED" ||
      body.payment_status?.toUpperCase() === "SUCCESS";

    if (existingRecord) {
      console.log("Existing Customer Found. Updating Record:", existingRecord.id);

      const { data: updatedData, error: updateError } = await supabase
        .from("shiprocket_acc_table")
        .update({
          integration_id: integration.id,
          brand_id: integration.brand_id,
          brand_name: brand?.name ?? existingRecord.brand_name,
          provider_id: integration.provider_id,
          source: "shiprocket",
          event_type: "abandoned_cart",
          raw_payload: body,
          customer_name: customerName ?? existingRecord.customer_name,
          customer_email: email ?? existingRecord.customer_email,
          customer_phone: phone ?? existingRecord.customer_phone,
          address1: address.address1 ?? address.line_1 ?? existingRecord.address1,
          address2: address.address2 ?? existingRecord.address2,
          city: address.city ?? existingRecord.city,
          state: address.state ?? existingRecord.state,
          country: address.country ?? existingRecord.country,
          zip: address.zip ?? existingRecord.zip,
          cart_id: cartId ?? existingRecord.cart_id,
          cart_token: cartToken ?? existingRecord.cart_token,
          checkout_url: checkoutUrl ?? existingRecord.checkout_url,
          cart_value: cartValue ?? existingRecord.cart_value,
          currency: body.currency ?? existingRecord.currency,
          cart_status: isRecovered ? "RECOVERED" : "ABANDONED",
          current_status: isRecovered ? "recovered" : undefined,
          follow_up: isRecovered ? false : undefined,
          notes: isRecovered ? "[System] Order was successfully placed via Fastrr." : undefined,
          products: products,
          payment_status: body.payment_status ?? existingRecord.payment_status,
          payment_method: body.payment_method ?? existingRecord.payment_method,
          shipping_price: body.shipping_price ?? existingRecord.shipping_price,
          discount_codes: body.discount_codes ?? existingRecord.discount_codes,
          total_discount: body.total_discount ?? existingRecord.total_discount,
          tax: body.tax ?? existingRecord.tax,
          latest_stage: body.latest_stage ?? existingRecord.latest_stage,
          abandoned_at: abandonedAt,
          updated_at: getISTTimestamp()
        })
        .eq("id", existingRecord.id)
        .select()
        .single();

      if (updateError) {
        console.log("Update Error:", updateError);
        throw updateError;
      }

      // ==========================================
      // 6.5 LAZY ASSIGNMENT FOR UNASSIGNED CARTS
      // ==========================================
      if (!existingRecord.agent_id) {
        console.log("Lazy Assigning Unassigned Existing Cart...");
        try {
          const { data: agentId, error: assignError } = await supabase.rpc('assign_cart_round_robin', {
            p_brand_id: integration.brand_id,
            p_cart_id: updatedData.id,
            p_provider_table: 'shiprocket_acc_table'
          });

          if (assignError) {
            console.error("Round Robin Assignment Error:", assignError);
          } else if (agentId) {
            console.log("Successfully Lazy Assigned Cart to Agent:", agentId);
          }
        } catch (e) {
          console.error("Failed to execute lazy round robin assignment:", e);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: "updated",
          id: updatedData.id,
          brand_id: integration.brand_id,
          provider_id: integration.provider_id
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // ==========================================
    // 7. CREATE NEW SHIPROCKET RECORD
    // ==========================================
    console.log("Creating New Shiprocket ACC Record");

    // Check for previous attempts today
    let autoCurrentStatus = null;
    let autoCallStatus = null;
    let autoFollowUp = false;
    let autoNotes = null;

    if (email || phone) {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      const emailQuery = email ? `customer_email.eq.${email}` : '';
      const phoneQuery = phone ? `customer_phone.eq.${phone}` : '';
      const orQuery = [emailQuery, phoneQuery].filter(Boolean).join(',');

      const { data: previousCarts } = await supabase
        .from('abandon_cart_master')
        .select('current_status')
        .gte('abandoned_at', todayStart.toISOString())
        .eq('brand_id', integration.brand_id)
        .or(orQuery)
        .eq('current_status', 'attempted')
        .limit(1);

      if (previousCarts && previousCarts.length > 0) {
        autoCurrentStatus = "attempted";
        autoCallStatus = "Attempted";
        autoFollowUp = true;
        autoNotes = "[System] Customer was already attempted earlier today.";
      }
    }

    if (isRecovered) {
      autoCurrentStatus = "recovered";
      autoCallStatus = null;
      autoFollowUp = false;
      autoNotes = "[System] Order was successfully placed via Fastrr.";
    }

    const { data: newRecord, error: insertError } = await supabase
      .from("shiprocket_acc_table")
      .insert({
        integration_id: integration.id,
        brand_id: integration.brand_id,
        brand_name: brand?.name ?? null,
        provider_id: integration.provider_id,
        source: "shiprocket",
        event_type: "abandoned_cart",
        raw_payload: body,
        customer_name: customerName,
        customer_email: email,
        customer_phone: phone,
        address1: address.address1 ?? address.line_1 ?? null,
        address2: address.address2 ?? null,
        city: address.city ?? null,
        state: address.state ?? null,
        country: address.country ?? null,
        zip: address.zip ?? null,
        cart_id: cartId,
        cart_token: cartToken,
        checkout_url: checkoutUrl,
        cart_value: cartValue,
        currency: body.currency ?? "INR",
        cart_status: isRecovered ? "RECOVERED" : "ABANDONED",
        abandoned_at: abandonedAt,
        products: products,
        payment_status: body.payment_status ?? null,
        payment_method: body.payment_method ?? null,
        shipping_price: body.shipping_price ?? 0,
        discount_codes: body.discount_codes ?? [],
        total_discount: body.total_discount ?? 0,
        tax: body.tax ?? 0,
        latest_stage: body.latest_stage ?? null,
        attempts: 0,
        follow_up: autoFollowUp,
        current_status: autoCurrentStatus,
        call_status: autoCallStatus,
        notes: autoNotes,
        call_logs: [],
        activity_logs: [],
        updated_at: getISTTimestamp()
      })
      .select()
      .single();

    if (insertError) {
      console.log("Insert Error:", insertError);
      throw insertError;
    }

    // ==========================================
    // 7.5 ROUND ROBIN ASSIGNMENT
    // ==========================================
    console.log("Executing Round Robin Assignment...");
    try {
      const { data: agentId, error: assignError } = await supabase.rpc('assign_cart_round_robin', {
        p_brand_id: integration.brand_id,
        p_cart_id: newRecord.id,
        p_provider_table: 'shiprocket_acc_table'
      });

      if (assignError) {
        console.error("Round Robin Assignment Error:", assignError);
      } else if (agentId) {
        console.log("Successfully Assigned Cart to Agent:", agentId);
      } else {
        console.log("No agents available for brand, cart remains unassigned.");
      }
    } catch (e) {
      console.error("Failed to execute round robin assignment:", e);
    }

    // ==========================================
    // 8. SUCCESS RESPONSE
    // ==========================================
    return new Response(
      JSON.stringify({
        success: true,
        action: "created",
        id: newRecord.id,
        brand_id: integration.brand_id,
        provider_id: integration.provider_id
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error: any) {
    console.log("FUNCTION FAILED:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message ?? "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});
