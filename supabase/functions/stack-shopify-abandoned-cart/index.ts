import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


Deno.serve(async (req) => {

  try {


    // 1. Receive Shopify payload

    const body = await req.json();


    console.log(
      "Stack Shopify Payload:",
      JSON.stringify(body, null, 2)
    );



    // 2. Get integration token

    const integrationToken =
      req.headers
      .get("x-integration-token")
      ?.trim();



    console.log(
      "Integration Token:",
      integrationToken
    );



    if (!integrationToken) {

      return new Response(

        JSON.stringify({

          success:false,

          error:"Missing integration token"

        }),

        {
          status:401,

          headers:{
            "Content-Type":"application/json"
          }
        }

      );

    }




    // 3. Supabase connection


    const supabaseUrl =
      Deno.env.get("PROJECT_URL")!;


    const serviceRoleKey =
      Deno.env.get("SERVICE_ROLE_KEY")!;



    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey
      );





    // 4. Find integration


    const {

      data:integration,

      error:integrationError

    } = await supabase

      .from("integrations")

      .select(`
        id,
        brand_id,
        provider_id
      `)

      .eq(
        "integration_token",
        integrationToken
      )

      .single();





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

          success:false,

          error:"Invalid integration token"

        }),

        {

          status:401,

          headers:{
            "Content-Type":"application/json"
          }

        }

      );


    }




    console.log(
      "Stack Integration:",
      integration
    );






    // 5. Store webhook payload


    const {

      data:webhookData,

      error:webhookError

    } = await supabase


      .from("webhook_logs")


      .insert({

        source:"shopify",

        event_type:"abandoned_cart",

        payload:body,

        status:"received",

        integration_id:
          integration.id

      })


      .select()

      .single();







    if(webhookError){


      console.log(
        "Webhook Error:",
        webhookError
      );


      return new Response(

        JSON.stringify({

          success:false,

          error:webhookError.message

        }),

        {

          status:500,

          headers:{
            "Content-Type":"application/json"
          }

        }

      );


    }







    console.log(

      "Stack Webhook Stored:",

      webhookData.id

    );







    // 6. Success


    return new Response(

      JSON.stringify({

        success:true,

        message:
          "Stack Shopify webhook received",

        integration_id:
          integration.id,

        brand_id:
          integration.brand_id,

        webhook_id:
          webhookData.id

      }),

      {

        status:200,

        headers:{
          "Content-Type":"application/json"
        }

      }

    );






  } catch(error){


    console.log(
      "Function Error:",
      error
    );



    return new Response(

      JSON.stringify({

        success:false,

        error:
          error.message

      }),

      {

        status:400,

        headers:{
          "Content-Type":"application/json"
        }

      }

    );


  }


});