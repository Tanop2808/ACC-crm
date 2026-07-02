import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

Deno.serve(async (req: Request) => {

  // Helper to get current time in IST (UTC+5:30) as a string without timezone
  function getISTTimestamp() {
    const date = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + istOffset);
    return istDate.toISOString().replace('Z', '');
  }

  try {


    // ==========================================
    // 1. RECEIVE SHOPIFY PAYLOAD
    // ==========================================


    const body = await req.json();


    console.log(
      "Shopify Payload Received:",
      JSON.stringify(body, null, 2)
    );



    // ==========================================
    // 2. GET INTEGRATION TOKEN
    // ==========================================


    let integrationToken = req.headers.get("x-integration-token")?.trim();
    if (!integrationToken) {
      const url = new URL(req.url);
      integrationToken = url.searchParams.get("token")?.trim();
    }



    if (!integrationToken) {


      return new Response(

        JSON.stringify({

          success: false,

          error: "Missing integration token"

        }),

        {

          status: 401,

          headers: {
            "Content-Type": "application/json"
          }

        }

      );

    }




    // ==========================================
    // 3. SUPABASE CONNECTION
    // ==========================================


    const supabaseUrl =
      Deno.env.get("PROJECT_URL")!;


    const serviceRoleKey =
      Deno.env.get("SERVICE_ROLE_KEY")!;



    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey
      );





    // ==========================================
    // 4. FIND INTEGRATION
    // ==========================================


    const {

      data: integration,

      error: integrationError

    } = await supabase

      .from("integrations")

      .select(
        `
    id,
    brand_id,
    provider_id,
    brands(
      name
    )
    `
      )

      .eq(
        "integration_token",
        integrationToken
      )

      .eq(
        "status",
        "ACTIVE"
      )

      .maybeSingle();







    if (
      integrationError ||
      !integration
    ) {


      console.log(
        "Integration Error:",
        integrationError
      );



      return new Response(

        JSON.stringify({

          success: false,

          error: "Invalid integration token"

        }),

        {

          status: 401,

          headers: {
            "Content-Type": "application/json"
          }

        }

      );


    }





    console.log(
      "Integration Found:",
      integration
    );
    const brandName =
      integration.brands?.name ?? null;


    console.log(
      "Brand Name:",
      brandName
    );




    // ==========================================
    // 5. HANDLE ORDER CREATED (RECOVERY)
    // ==========================================
    const shopifyTopic = req.headers.get("x-shopify-topic")?.trim();

    if (body.event_type === "order_created" || shopifyTopic === "orders/create") {
      console.log("Processing Order Created Event...");
      const orderCheckoutToken = body.checkout_token ?? body.cart_token ?? body.checkoutToken ?? body.checkoutId ?? null;
      const orderEmail = body.email ?? body.customer?.email ?? null;
      const orderPhone = body.phone ?? body.customer?.phone ?? null;

      if (!orderCheckoutToken && !orderEmail && !orderPhone) {
        return new Response(JSON.stringify({ success: false, error: "Missing identifying fields" }), { status: 400 });
      }

      const lookbackDate = new Date();
      lookbackDate.setDate(lookbackDate.getDate() - 7);

      let orQueryParts = [];
      if (orderCheckoutToken) orQueryParts.push(`checkoutName.eq.${orderCheckoutToken}`);
      if (orderEmail) orQueryParts.push(`customer_email.eq.${orderEmail}`);
      if (orderPhone) orQueryParts.push(`customer_phone.eq.${orderPhone}`);
      const orQuery = orQueryParts.join(',');

      const { data: abandonedCarts, error: fetchError } = await supabase
        .from("shopify_acc_table")
        .select("id")
        .eq("brand_id", integration.brand_id)
        .gte("abandoned_at", lookbackDate.toISOString())
        .in("cart_status", ["ABANDONED"])
        .or(orQuery);

      if (fetchError) {
        console.error("Error fetching abandoned carts for recovery:", fetchError);
        return new Response(JSON.stringify({ success: false, error: fetchError.message }), { status: 500 });
      }

      if (abandonedCarts && abandonedCarts.length > 0) {
        const cartIds = abandonedCarts.map(cart => cart.id);
        const { error: updateError } = await supabase
          .from("shopify_acc_table")
          .update({
            cart_status: "RECOVERED",
            current_status: "recovered",
            follow_up: false,
            notes: "[System] Order was placed, cart recovered.",
            updated_at: getISTTimestamp()
          })
          .in("id", cartIds);

        if (updateError) {
          console.error("Error updating carts to RECOVERED:", updateError);
          return new Response(JSON.stringify({ success: false, error: updateError.message }), { status: 500 });
        }
        
        console.log(`Successfully recovered ${cartIds.length} carts.`);
      } else {
        console.log("No matching abandoned carts found to recover.");
      }

      // ==========================================
      // 5.1 LOG ORDER CREATION PAYLOAD
      // ==========================================
      const { error: logError } = await supabase
        .from("shopify_order_creation_table")
        .insert({
          integration_id: integration?.id || null,
          brand_id: integration?.brand_id || null,
          cart_token: orderCheckoutToken,
          customer_email: orderEmail,
          customer_phone: orderPhone,
          event_type: "order_created",
          raw_payload: body
        });
      
      if (logError) {
        console.log("Failed to log order creation payload:", logError);
      }

      return new Response(JSON.stringify({ success: true, action: "recovered" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // ==========================================
    // 5. EXTRACT SHOPIFY DATA
    // ==========================================


    const customer =
      body.customer ?? {};



    const customerName =
      body.customerName ?? customer.name ?? null;

    const customerEmail =
      body.email ?? customer.email ?? null;

    let customerPhone =
      body.phoneNumber ?? body.shippingPhone ?? body.billingPhone ?? customer.phone ?? null;

    if (customerPhone === "N/A" || customerPhone?.trim() === "") {
        customerPhone = null;
    }




    const customerAddress =
      body.customerAddress ?? {};

    let checkoutName =
      body.cartId ?? body.checkout_token ?? body.checkoutToken ?? body.checkoutName ?? null;

    // If it's a global ID like gid://shopify/AbandonedCheckout/38790, extract the ID part
    if (checkoutName && checkoutName.includes("gid://")) {
        checkoutName = checkoutName.split("/").pop() ?? checkoutName;
    }

    const checkoutUrl =
      body.checkoutUrl ?? null;



    const cartValue =
      Number(body.cartValue ?? 0);

    // If products is sent as the new string format (productsInCart), wrap it in an array
    const products =
      body.products ?? (body.productsInCart && body.productsInCart !== "N/A" ? [{ product: body.productsInCart.trim(), quantity: 1 }] : []);

    let abandonedAt =
      body.createdAt
        ? body.createdAt
        : getISTTimestamp();

    if (body.date && body.time) {
        abandonedAt = `${body.date}T${body.time}Z`;
    }

    let discountCodes =
      body.discountCodes
        ? [body.discountCodes]
        : [];

    if (body.discountCode && body.discountCode !== "N/A") {
        discountCodes = [body.discountCode];
    }




    console.log(
      "Customer Extracted:",
      {
        customerEmail,
        customerPhone
      }
    );





    // ==========================================
    // 6. FIND EXISTING CUSTOMER CART (By Cart ID)
    // ==========================================

    let existingRecord: any = null;

    if (checkoutName) {

      const {
        data: cartMatch,
        error: cartError
      } = await supabase
        .from("shopify_acc_table")
        .select("*")
        .eq("brand_id", integration.brand_id)
        .eq("cart_id", checkoutName)
        .limit(1)
        .maybeSingle();

      if (cartError) {
        console.log(
          "Cart lookup error:",
          cartError
        );
      }

      existingRecord = cartMatch;

    }
    // ==========================================
    // 7. UPDATE EXISTING CART RECORD
    // ==========================================


    if (existingRecord) {


      console.log(
        "Existing Customer Found. Updating Cart:",
        existingRecord.id
      );



      const {

        data: updatedData,

        error: updateError

      } = await supabase

        .from("shopify_acc_table")

        .update({

          integration_id:
            integration.id,


          provider_id:
            integration.provider_id,

          brand_id:
            integration.brand_id,


          brand_name:
            brandName,


          webhook_id:
            null,


          source:
            "shopify",


          event_type:
            "abandoned_cart",


          raw_payload:
            body,


          customer_name:
            customerName ??
            existingRecord.customer_name,


          customer_email:
            customerEmail ??
            existingRecord.customer_email,


          customer_phone:
            customerPhone ??
            existingRecord.customer_phone,



          address1:
            customerAddress.address1 ??
            existingRecord.address1,


          address2:
            customerAddress.address2 ??
            existingRecord.address2,


          city:
            customerAddress.city ??
            existingRecord.city,


          state:
            customerAddress.province ??
            existingRecord.state,


          country:
            customerAddress.country ??
            existingRecord.country,


          zip:
            customerAddress.zip ??
            existingRecord.zip,



          cart_id:
            checkoutName ??
            existingRecord.cart_id,


          checkout_name:
            checkoutName ??
            existingRecord.checkout_name,


          checkout_url:
            checkoutUrl ??
            existingRecord.checkout_url,


          cart_value:
            cartValue ??
            existingRecord.cart_value,


          products:
            products,


          discount_codes:
            discountCodes.length > 0
              ? discountCodes
              : existingRecord.discount_codes,


          abandoned_at:
            abandonedAt,


          cart_status:
            "ABANDONED",


          updated_at:
            getISTTimestamp()


        })

        .eq(
          "id",
          existingRecord.id
        )

        .select()

        .single();





      if (updateError) {

        console.log(
          "Update Error:",
          updateError
        );

        throw updateError;

      }

      // ==========================================
      // 7.5 LAZY ASSIGNMENT FOR UNASSIGNED CARTS
      // ==========================================
      if (!existingRecord.agent_id) {
        console.log("Lazy Assigning Unassigned Existing Cart...");
        try {
          const { data: agentId, error: assignError } = await supabase.rpc('assign_cart_round_robin', {
            p_brand_id: integration.brand_id,
            p_cart_id: updatedData.id,
            p_provider_table: 'shopify_acc_table'
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

          brand_id:
            integration.brand_id,

          provider_id:
            integration.provider_id


        }),

        {

          status: 200,

          headers: {
            "Content-Type": "application/json"
          }

        }

      );


    }






    // ==========================================
    // 8. CREATE NEW CUSTOMER CART RECORD
    // ==========================================

    console.log(
      "Creating New Shopify ACC Record"
    );

    // Check for previous attempts today
    let autoCurrentStatus = null;
    let autoCallStatus = null;
    let autoFollowUp = false;
    let autoNotes = null;

    if (customerEmail || customerPhone) {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      const emailQuery = customerEmail ? `customer_email.eq.${customerEmail}` : '';
      const phoneQuery = customerPhone ? `customer_phone.eq.${customerPhone}` : '';
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

    if (!customerPhone) {
      autoCurrentStatus = "non_addressable";
      autoCallStatus = "No Number";
      autoNotes = "[System] Customer did not provide a phone number.";
    }


    const {

      data: newRecord,

      error: insertError

    } = await supabase

      .from("shopify_acc_table")

      .insert({


        integration_id:
          integration.id,


        brand_id:
          integration.brand_id,


        provider_id:
          integration.provider_id,

        brand_name:
          brandName,



        source:
          "shopify",



        event_type:
          "abandoned_cart",



        raw_payload:
          body,



        customer_name:
          customerName,



        customer_email:
          customerEmail,



        customer_phone:
          customerPhone,



        address1:
          customerAddress.address1 ??
          null,


        address2:
          customerAddress.address2 ??
          null,


        city:
          customerAddress.city ??
          null,


        state:
          customerAddress.province ??
          null,


        country:
          customerAddress.country ??
          null,


        zip:
          customerAddress.zip ??
          null,



        cart_id:
          checkoutName,



        checkout_name:
          checkoutName,



        checkout_url:
          checkoutUrl,



        cart_value:
          cartValue,



        currency:
          "INR",



        cart_status:
          "ABANDONED",



        abandoned_at:
          abandonedAt,



        products:
          products,

        discount_codes:
          discountCodes,


        attempts:
          0,


        follow_up:
          autoFollowUp,

        current_status:
          autoCurrentStatus,

        call_status:
          autoCallStatus,

        notes:
          autoNotes,

        call_logs:
          [],


        activity_logs:
          [],


        updated_at:
          getISTTimestamp()


      })


      .select()

      .single();





    if (insertError) {


      console.log(
        "Insert Error:",
        insertError
      );


      throw insertError;


    }




    // ==========================================
    // 8.5 ROUND ROBIN ASSIGNMENT
    // ==========================================
    console.log("Executing Round Robin Assignment...");
    try {
      const { data: agentId, error: assignError } = await supabase.rpc('assign_cart_round_robin', {
        p_brand_id: integration.brand_id,
        p_cart_id: newRecord.id,
        p_provider_table: 'shopify_acc_table'
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
    // 9. SUCCESS RESPONSE
    // ==========================================


    return new Response(

      JSON.stringify({

        success: true,


        action: "created",


        id: newRecord.id,


        brand_id:
          integration.brand_id,


        provider_id:
          integration.provider_id


      }),


      {

        status: 200,


        headers: {
          "Content-Type": "application/json"
        }


      }

    );





  }

  catch (error) {


    console.log(
      "FUNCTION FAILED:",
      error
    );



    return new Response(

      JSON.stringify({

        success: false,


        error:
          (error as any).message ??
          "Unknown error"


      }),


      {

        status: 500,


        headers: {
          "Content-Type": "application/json"
        }

      }

    );


  }


});