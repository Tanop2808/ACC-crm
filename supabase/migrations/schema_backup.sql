


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."assign_abandoned_cart_to_agent"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$declare
    selected_agent_id uuid;
    selected_brand_id uuid;
    new_assignment_id uuid;

begin

    -- Find brand from integration
    select brand_id
    into selected_brand_id
    from public.integrations
    where id = new.integration_id;


    -- Find active agent for that brand
    select id
    into selected_agent_id
    from public.agents
    where brand_id = selected_brand_id
    and status = 'active'
    limit 1;


    -- Create assignment
    insert into public.cart_assignments
    (
        cart_id,
        agent_id,
        status,
        assigned_at
    )
    values
    (
        new.id,
        selected_agent_id,
        'assigned',
        now()
    )
    returning id into new_assignment_id;


    -- Create recovery status
    insert into public.cart_recovery_status
    (
        cart_id,
        agent_id,
        attempts,
        current_status,
        follow_up
    )
    values
    (
        new.id,
        selected_agent_id,
        0,
        'assigned',
        false
    );


    -- Create support activity log
    insert into public.support_activity_logs
    (
        cart_id,
        assignment_id,
        agent_id,
        activity_type,
        description,
        metadata
    )
    values
    (
        new.id,
        new_assignment_id,
        selected_agent_id,
        'CART_ASSIGNED',
        'Cart assigned to agent',
        jsonb_build_object(
            'source',
            'automatic_assignment'
        )
    );


    return new;

end;$$;


ALTER FUNCTION "public"."assign_abandoned_cart_to_agent"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_shopify_abandoned_cart"("webhook_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$DECLARE

    webhook_payload jsonb;

    new_customer_id uuid;
    new_address_id uuid;
    new_cart_id uuid;

    customer_name text;
    customer_email text;
    customer_phone text;

    integration uuid;

    product_item jsonb;

BEGIN



SELECT 
    payload,
    integration_id

INTO 
    webhook_payload,
    integration

FROM webhook_logs

WHERE id = webhook_id;




IF webhook_payload IS NULL THEN

    RAISE NOTICE 'Webhook payload missing';

    RETURN;

END IF;




customer_name :=
NULLIF(
    webhook_payload->'customer'->>'name',
    ''
);


customer_email :=
NULLIF(
    webhook_payload->'customer'->>'email',
    ''
);


customer_phone :=
NULLIF(
    webhook_payload->'customer'->>'phone',
    ''
);





IF customer_email IS NOT NULL THEN


    SELECT id

    INTO new_customer_id

    FROM customers

    WHERE email = customer_email

    LIMIT 1;


END IF;




IF new_customer_id IS NULL
AND customer_phone IS NOT NULL THEN


    SELECT id

    INTO new_customer_id

    FROM customers

    WHERE phone = customer_phone

    LIMIT 1;


END IF;




IF new_customer_id IS NULL
AND
(
    customer_email IS NOT NULL
    OR
    customer_phone IS NOT NULL
)

THEN


    INSERT INTO customers
    (
        first_name,
        email,
        phone
    )

    VALUES
    (
        customer_name,
        customer_email,
        customer_phone
    )

    RETURNING id INTO new_customer_id;


END IF;




IF new_customer_id IS NOT NULL THEN



    SELECT id

    INTO new_address_id

    FROM addresses

    WHERE

        customer_id = new_customer_id

        AND address1 =
        webhook_payload->'customerAddress'->>'address1'

        AND city =
        webhook_payload->'customerAddress'->>'city'

        AND state =
        webhook_payload->'customerAddress'->>'province'

        AND country =
        webhook_payload->'customerAddress'->>'country'

        AND zip =
        webhook_payload->'customerAddress'->>'zip'

    LIMIT 1;



    -- Create only if address does not exist


    IF new_address_id IS NULL THEN


        INSERT INTO addresses
        (
            customer_id,
            address1,
            address2,
            city,
            state,
            country,
            zip,
            phone
        )


        VALUES

        (

            new_customer_id,

            webhook_payload->'customerAddress'->>'address1',

            webhook_payload->'customerAddress'->>'address2',

            webhook_payload->'customerAddress'->>'city',

            webhook_payload->'customerAddress'->>'province',

            webhook_payload->'customerAddress'->>'country',

            webhook_payload->'customerAddress'->>'zip',

            customer_phone

        )


        RETURNING id INTO new_address_id;


    END IF;


END IF;





SELECT id

INTO new_cart_id

FROM abandoned_carts

WHERE external_cart_id =
webhook_payload->>'checkoutName'

AND integration_id = integration

LIMIT 1;




IF new_cart_id IS NULL THEN


    INSERT INTO abandoned_carts
    (
        customer_id,
        external_cart_id,
        cart_value,
        checkout_url,
        status,
        abandoned_at,
        integration_id
    )


    VALUES

    (

        new_customer_id,

        webhook_payload->>'checkoutName',

        COALESCE(
            NULLIF(webhook_payload->>'cartValue','')::numeric,
            0
        ),

        webhook_payload->>'checkoutUrl',

        'ABANDONED',

        (webhook_payload->>'createdAt')::timestamp,

        integration

    )


    RETURNING id INTO new_cart_id;



ELSE


    -- Same Shopify checkout retry
    -- update existing cart


    UPDATE abandoned_carts

    SET

        customer_id =
        COALESCE(
            abandoned_carts.customer_id,
            new_customer_id
        ),

        cart_value =
        COALESCE(
            NULLIF(webhook_payload->>'cartValue','')::numeric,
            cart_value
        ),

        checkout_url =
        webhook_payload->>'checkoutUrl',

        status =
        'ABANDONED',

        abandoned_at =
        (webhook_payload->>'createdAt')::timestamp


    WHERE id = new_cart_id;



END IF;




DELETE FROM abandoned_cart_items

WHERE abandoned_cart_id = new_cart_id;



IF webhook_payload ? 'products' THEN



    FOR product_item IN

    SELECT *

    FROM jsonb_array_elements(
        webhook_payload->'products'
    )


    LOOP


        INSERT INTO abandoned_cart_items
        (
            abandoned_cart_id,
            product_name,
            quantity
        )


        VALUES

        (

            new_cart_id,

            product_item->>'product',

            COALESCE(
                (product_item->>'quantity')::int,
                1
            )

        );


    END LOOP;


END IF;



END;$$;


ALTER FUNCTION "public"."process_shopify_abandoned_cart"("webhook_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_process_shopify_cart"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$

begin

perform process_shopify_abandoned_cart(
    NEW.id
);

return NEW;

end;

$$;


ALTER FUNCTION "public"."trigger_process_shopify_cart"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."shiprocket_acc_table" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "integration_id" "uuid" NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "webhook_id" "uuid",
    "source" "text" DEFAULT 'shiprocket'::"text",
    "event_type" "text" DEFAULT 'abandoned_cart'::"text",
    "raw_payload" "jsonb",
    "customer_id" "uuid",
    "customer_name" "text",
    "customer_email" "text",
    "customer_phone" "text",
    "address1" "text",
    "address2" "text",
    "city" "text",
    "state" "text",
    "country" "text",
    "zip" "text",
    "cart_id" "text",
    "cart_token" "text",
    "checkout_url" "text",
    "cart_value" numeric DEFAULT 0,
    "currency" "text" DEFAULT 'INR'::"text",
    "cart_status" "text" DEFAULT 'ABANDONED'::"text",
    "abandoned_at" timestamp without time zone,
    "products" "jsonb" DEFAULT '[]'::"jsonb",
    "payment_status" "text",
    "payment_method" "text",
    "shipping_price" numeric DEFAULT 0,
    "discount_codes" "jsonb" DEFAULT '[]'::"jsonb",
    "total_discount" numeric DEFAULT 0,
    "tax" numeric DEFAULT 0,
    "latest_stage" "text",
    "agent_id" "uuid",
    "agent_name" "text",
    "assignment_status" "text",
    "attempts" integer DEFAULT 0,
    "call_status" "text",
    "current_status" "text",
    "follow_up" boolean DEFAULT false,
    "follow_up_at" timestamp without time zone,
    "notes" "text",
    "last_call_date" timestamp without time zone,
    "call_logs" "jsonb" DEFAULT '[]'::"jsonb",
    "activity_logs" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "brand_name" "text"
);


ALTER TABLE "public"."shiprocket_acc_table" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shopify_acc_table" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "integration_id" "uuid" NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "webhook_id" "uuid",
    "source" "text" DEFAULT 'shopify'::"text",
    "event_type" "text" DEFAULT 'abandoned_cart'::"text",
    "raw_payload" "jsonb",
    "customer_id" "uuid",
    "customer_name" "text",
    "customer_email" "text",
    "customer_phone" "text",
    "address1" "text",
    "address2" "text",
    "city" "text",
    "state" "text",
    "country" "text",
    "zip" "text",
    "cart_id" "text",
    "checkout_name" "text",
    "checkout_url" "text",
    "cart_value" numeric DEFAULT 0,
    "currency" "text" DEFAULT 'INR'::"text",
    "cart_status" "text" DEFAULT 'ABANDONED'::"text",
    "abandoned_at" timestamp without time zone,
    "products" "jsonb" DEFAULT '[]'::"jsonb",
    "agent_id" "uuid",
    "agent_name" "text",
    "assignment_status" "text",
    "attempts" integer DEFAULT 0,
    "call_status" "text",
    "current_status" "text",
    "follow_up" boolean DEFAULT false,
    "follow_up_at" timestamp without time zone,
    "notes" "text",
    "last_call_date" timestamp without time zone,
    "call_logs" "jsonb" DEFAULT '[]'::"jsonb",
    "activity_logs" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "brand_name" "text",
    "discount_codes" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."shopify_acc_table" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."abandon_cart_master" AS
 SELECT "shopify_acc_table"."id",
    "shopify_acc_table"."brand_id",
    "shopify_acc_table"."brand_name",
    "shopify_acc_table"."provider_id",
    "shopify_acc_table"."integration_id",
    "shopify_acc_table"."source",
    "shopify_acc_table"."event_type",
    "shopify_acc_table"."customer_name",
    "shopify_acc_table"."customer_email",
    "shopify_acc_table"."customer_phone",
    "shopify_acc_table"."address1",
    "shopify_acc_table"."address2",
    "shopify_acc_table"."city",
    "shopify_acc_table"."state",
    "shopify_acc_table"."country",
    "shopify_acc_table"."zip",
    "shopify_acc_table"."cart_id",
    "shopify_acc_table"."checkout_url",
    "shopify_acc_table"."cart_value",
    "shopify_acc_table"."currency",
    "shopify_acc_table"."cart_status",
    "shopify_acc_table"."abandoned_at",
    "shopify_acc_table"."products",
    "shopify_acc_table"."agent_id",
    "shopify_acc_table"."agent_name",
    "shopify_acc_table"."assignment_status",
    "shopify_acc_table"."attempts",
    "shopify_acc_table"."call_status",
    "shopify_acc_table"."current_status",
    "shopify_acc_table"."follow_up",
    "shopify_acc_table"."follow_up_at",
    "shopify_acc_table"."notes",
    "shopify_acc_table"."call_logs",
    "shopify_acc_table"."activity_logs",
    "shopify_acc_table"."created_at",
    "shopify_acc_table"."updated_at"
   FROM "public"."shopify_acc_table"
UNION ALL
 SELECT "shiprocket_acc_table"."id",
    "shiprocket_acc_table"."brand_id",
    "shiprocket_acc_table"."brand_name",
    "shiprocket_acc_table"."provider_id",
    "shiprocket_acc_table"."integration_id",
    "shiprocket_acc_table"."source",
    "shiprocket_acc_table"."event_type",
    "shiprocket_acc_table"."customer_name",
    "shiprocket_acc_table"."customer_email",
    "shiprocket_acc_table"."customer_phone",
    "shiprocket_acc_table"."address1",
    "shiprocket_acc_table"."address2",
    "shiprocket_acc_table"."city",
    "shiprocket_acc_table"."state",
    "shiprocket_acc_table"."country",
    "shiprocket_acc_table"."zip",
    "shiprocket_acc_table"."cart_id",
    "shiprocket_acc_table"."checkout_url",
    "shiprocket_acc_table"."cart_value",
    "shiprocket_acc_table"."currency",
    "shiprocket_acc_table"."cart_status",
    "shiprocket_acc_table"."abandoned_at",
    "shiprocket_acc_table"."products",
    "shiprocket_acc_table"."agent_id",
    "shiprocket_acc_table"."agent_name",
    "shiprocket_acc_table"."assignment_status",
    "shiprocket_acc_table"."attempts",
    "shiprocket_acc_table"."call_status",
    "shiprocket_acc_table"."current_status",
    "shiprocket_acc_table"."follow_up",
    "shiprocket_acc_table"."follow_up_at",
    "shiprocket_acc_table"."notes",
    "shiprocket_acc_table"."call_logs",
    "shiprocket_acc_table"."activity_logs",
    "shiprocket_acc_table"."created_at",
    "shiprocket_acc_table"."updated_at"
   FROM "public"."shiprocket_acc_table";


ALTER VIEW "public"."abandon_cart_master" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."abandoned_cart_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "abandoned_cart_id" "uuid",
    "product_id" "text",
    "variant_id" "text",
    "sku" "text",
    "product_name" "text",
    "quantity" integer,
    "price" numeric,
    "image_url" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "product_uuid" "uuid"
);


ALTER TABLE "public"."abandoned_cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."abandoned_carts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "external_cart_id" "text",
    "cart_token" "text",
    "cart_value" numeric,
    "currency" "text" DEFAULT 'INR'::"text",
    "checkout_url" "text",
    "status" "text" DEFAULT 'NEW'::"text",
    "abandoned_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "integration_id" "uuid",
    "discount_codes" "jsonb",
    "total_discount" numeric DEFAULT 0,
    "tax" numeric DEFAULT 0
);


ALTER TABLE "public"."abandoned_carts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "type" "text" DEFAULT 'shipping'::"text",
    "address1" "text",
    "address2" "text",
    "city" "text",
    "state" "text",
    "country" "text",
    "zip" "text",
    "phone" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cart_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cart_id" "uuid" NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "assigned_at" timestamp without time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'assigned'::"text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."cart_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cart_recovery_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cart_id" "uuid",
    "agent_id" "uuid",
    "attempts" integer DEFAULT 0,
    "last_call_date" timestamp without time zone,
    "call_status" "text",
    "current_status" "text",
    "previous_status" "text",
    "sale_item_status" "text",
    "delivery_status" "text",
    "follow_up" boolean DEFAULT false,
    "notes" "text",
    "recordings_url" "text",
    "call_summary" "text",
    "intent" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "abandonment_reason" "text",
    "follow_up_at" timestamp without time zone
);


ALTER TABLE "public"."cart_recovery_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "email" "text",
    "phone" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cart_id" "uuid",
    "assignment_id" "uuid",
    "agent_id" "uuid",
    "activity_type" "text",
    "description" "text",
    "metadata" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "call_log_id" "uuid"
);


ALTER TABLE "public"."support_activity_logs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."agent_follow_up_dashboard_view" AS
 SELECT "ca"."id" AS "assignment_id",
    "ca"."cart_id",
    "ca"."agent_id",
    "ca"."assigned_at",
    "c"."id" AS "customer_id",
    "c"."first_name",
    "c"."last_name",
    "c"."email",
    "c"."phone",
    "addr"."address1",
    "addr"."address2",
    "addr"."city",
    "addr"."state",
    "addr"."country",
    "addr"."zip",
    "ac"."external_cart_id",
    "ac"."cart_value",
    "ac"."currency",
    "ac"."checkout_url",
    "ac"."abandoned_at",
    ( SELECT "json_agg"("json_build_object"('product_name', "aci"."product_name", 'quantity', "aci"."quantity", 'price', "aci"."price", 'image_url', "aci"."image_url")) AS "json_agg"
           FROM "public"."abandoned_cart_items" "aci"
          WHERE ("aci"."abandoned_cart_id" = "ac"."id")) AS "products",
    "crs"."id" AS "recovery_status_id",
    "crs"."current_status",
    "crs"."previous_status",
    "crs"."attempts",
    "crs"."call_status",
    "crs"."follow_up",
    "crs"."follow_up_at",
    "crs"."notes",
    ( SELECT "json_agg"("json_build_object"('activity_type', "sal"."activity_type", 'description', "sal"."description", 'metadata', "sal"."metadata", 'created_at', "sal"."created_at") ORDER BY "sal"."created_at" DESC) AS "json_agg"
           FROM "public"."support_activity_logs" "sal"
          WHERE ("sal"."cart_id" = "ac"."id")) AS "recovery_timeline"
   FROM (((("public"."cart_assignments" "ca"
     JOIN "public"."abandoned_carts" "ac" ON (("ac"."id" = "ca"."cart_id")))
     JOIN "public"."customers" "c" ON (("c"."id" = "ac"."customer_id")))
     LEFT JOIN "public"."addresses" "addr" ON (("addr"."customer_id" = "c"."id")))
     JOIN "public"."cart_recovery_status" "crs" ON (("crs"."cart_id" = "ac"."id")))
  WHERE ("crs"."follow_up" = true);


ALTER VIEW "public"."agent_follow_up_dashboard_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "brand_id" "uuid",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."agents" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."agent_recovery_dashboard_view" AS
 SELECT "ca"."id" AS "assignment_id",
    "ca"."cart_id",
    "ca"."agent_id",
    "ca"."status" AS "assignment_status",
    "ca"."assigned_at",
    "c"."id" AS "customer_id",
    "c"."first_name",
    "c"."last_name",
    "c"."email",
    "c"."phone",
    "ac"."external_cart_id",
    "ac"."cart_value",
    "ac"."currency",
    "ac"."checkout_url",
    "ac"."status" AS "cart_status",
    "ac"."abandoned_at",
    "ac"."created_at" AS "cart_created_at",
    "crs"."id" AS "recovery_status_id",
    "crs"."attempts",
    "crs"."call_status",
    "crs"."current_status",
    "crs"."previous_status",
    "crs"."sale_item_status",
    "crs"."delivery_status",
    "crs"."follow_up",
    "crs"."follow_up_at",
    "crs"."notes",
    "crs"."abandonment_reason",
    "crs"."updated_at" AS "recovery_updated_at",
    "a"."id" AS "assigned_agent_id",
    "a"."name" AS "agent_name",
    ( SELECT "json_agg"("json_build_object"('product_name', "aci"."product_name", 'quantity', "aci"."quantity", 'price', "aci"."price", 'image_url', "aci"."image_url")) AS "json_agg"
           FROM "public"."abandoned_cart_items" "aci"
          WHERE ("aci"."abandoned_cart_id" = "ac"."id")) AS "products"
   FROM (((("public"."cart_assignments" "ca"
     JOIN "public"."abandoned_carts" "ac" ON (("ac"."id" = "ca"."cart_id")))
     JOIN "public"."customers" "c" ON (("c"."id" = "ac"."customer_id")))
     JOIN "public"."cart_recovery_status" "crs" ON (("crs"."cart_id" = "ac"."id")))
     JOIN "public"."agents" "a" ON (("a"."id" = "ca"."agent_id")));


ALTER VIEW "public"."agent_recovery_dashboard_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_activity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cart_id" "uuid" NOT NULL,
    "assigned_agent" "text",
    "attempts" integer DEFAULT 0,
    "last_call_date" timestamp without time zone,
    "call_status" "text",
    "current_status" "text",
    "previous_status" "text",
    "sale_item_status" "text",
    "delivery_status" "text",
    "follow_up" boolean DEFAULT false,
    "notes" "text",
    "recordings_url" "text",
    "call_summary" "text",
    "intent" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "assigned_agent_id" "uuid"
);


ALTER TABLE "public"."support_activity" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."assigned_carts_view" AS
 SELECT "ca"."id" AS "assignment_id",
    "a"."id" AS "agent_id",
    "a"."name" AS "agent_name",
    "c"."id" AS "customer_id",
    "c"."first_name",
    "c"."last_name",
    "c"."email",
    "c"."phone",
    "addr"."id" AS "address_id",
    "addr"."address1",
    "addr"."address2",
    "addr"."city",
    "addr"."state",
    "addr"."country",
    "addr"."zip",
    "ac"."id" AS "cart_id",
    "ac"."cart_value",
    "ac"."currency",
    "ac"."checkout_url",
    "ac"."status" AS "cart_status",
    "ac"."abandoned_at",
    "json_agg"("json_build_object"('product_name', "aci"."product_name", 'quantity', "aci"."quantity", 'price', "aci"."price", 'image_url', "aci"."image_url")) AS "products",
    "sa"."attempts",
    "sa"."call_status",
    "sa"."current_status",
    "sa"."follow_up",
    "sa"."notes",
    "sa"."last_call_date"
   FROM (((((("public"."cart_assignments" "ca"
     JOIN "public"."agents" "a" ON (("a"."id" = "ca"."agent_id")))
     JOIN "public"."abandoned_carts" "ac" ON (("ac"."id" = "ca"."cart_id")))
     JOIN "public"."customers" "c" ON (("c"."id" = "ac"."customer_id")))
     LEFT JOIN "public"."addresses" "addr" ON (("addr"."customer_id" = "c"."id")))
     LEFT JOIN "public"."abandoned_cart_items" "aci" ON (("aci"."abandoned_cart_id" = "ac"."id")))
     LEFT JOIN "public"."support_activity" "sa" ON (("sa"."cart_id" = "ac"."id")))
  GROUP BY "ca"."id", "a"."id", "a"."name", "c"."id", "c"."first_name", "c"."last_name", "c"."email", "c"."phone", "addr"."id", "addr"."address1", "addr"."address2", "addr"."city", "addr"."state", "addr"."country", "addr"."zip", "ac"."id", "ac"."cart_value", "ac"."currency", "ac"."checkout_url", "ac"."status", "ac"."abandoned_at", "sa"."attempts", "sa"."call_status", "sa"."current_status", "sa"."follow_up", "sa"."notes", "sa"."last_call_date";


ALTER VIEW "public"."assigned_carts_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brands" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."brands" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."call_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cart_id" "uuid" NOT NULL,
    "assignment_id" "uuid",
    "agent_id" "uuid",
    "call_started_at" timestamp without time zone,
    "call_ended_at" timestamp without time zone,
    "duration" integer DEFAULT 0,
    "outcome" "text",
    "notes" "text",
    "recording_url" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'completed'::"text"
);


ALTER TABLE "public"."call_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_recoveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "text",
    "first_name" "text",
    "last_name" "text",
    "email" "text",
    "phone" "text",
    "cart_id" "text",
    "cart_value" numeric(10,2),
    "products" "jsonb",
    "recovery_status" "text",
    "call_status" "text",
    "follow_up" "text",
    "notes" "text",
    "abandoned_at" timestamp with time zone,
    "source" "text",
    "provider" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customer_recoveries" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."customer_recovery_view" AS
SELECT
    NULL::"uuid" AS "customer_id",
    NULL::"text" AS "first_name",
    NULL::"text" AS "last_name",
    NULL::"text" AS "email",
    NULL::"text" AS "phone",
    NULL::"uuid" AS "cart_id",
    NULL::"text" AS "external_cart_id",
    NULL::numeric AS "cart_value",
    NULL::"text" AS "currency",
    NULL::timestamp without time zone AS "abandoned_at",
    NULL::"text" AS "cart_status",
    NULL::json AS "products",
    NULL::"text" AS "recovery_status",
    NULL::"text" AS "call_status",
    NULL::boolean AS "follow_up",
    NULL::"text" AS "notes",
    NULL::timestamp without time zone AS "created_at",
    NULL::"text" AS "source",
    NULL::"text" AS "provider";


ALTER VIEW "public"."customer_recovery_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "integration_token" "text",
    "webhook_path" "text",
    "status" "text" DEFAULT 'ACTIVE'::"text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."integrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "external_product_id" "text",
    "name" "text",
    "sku" "text",
    "image_url" "text",
    "product_type" "text",
    "vendor" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."providers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."providers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source" "text",
    "event_type" "text",
    "payload" "jsonb",
    "status" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "integration_id" "uuid"
);


ALTER TABLE "public"."webhook_logs" OWNER TO "postgres";


ALTER TABLE ONLY "public"."abandoned_cart_items"
    ADD CONSTRAINT "abandoned_cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."abandoned_carts"
    ADD CONSTRAINT "abandoned_carts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."call_logs"
    ADD CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_assignments"
    ADD CONSTRAINT "cart_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_recovery_status"
    ADD CONSTRAINT "cart_recovery_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_recoveries"
    ADD CONSTRAINT "customer_recoveries_cart_id_key" UNIQUE ("cart_id");



ALTER TABLE ONLY "public"."customer_recoveries"
    ADD CONSTRAINT "customer_recoveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_integration_token_key" UNIQUE ("integration_token");



ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_webhook_path_key" UNIQUE ("webhook_path");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."providers"
    ADD CONSTRAINT "providers_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."providers"
    ADD CONSTRAINT "providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shiprocket_acc_table"
    ADD CONSTRAINT "shiprocket_acc_table_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shopify_acc_table"
    ADD CONSTRAINT "shopify_acc_table_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_activity_logs"
    ADD CONSTRAINT "support_activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_activity"
    ADD CONSTRAINT "support_activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "unique_brand_name" UNIQUE ("name");



ALTER TABLE ONLY "public"."webhook_logs"
    ADD CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_shiprocket_acc_agent" ON "public"."shiprocket_acc_table" USING "btree" ("agent_id");



CREATE INDEX "idx_shiprocket_acc_brand" ON "public"."shiprocket_acc_table" USING "btree" ("brand_id");



CREATE INDEX "idx_shiprocket_acc_created" ON "public"."shiprocket_acc_table" USING "btree" ("created_at");



CREATE INDEX "idx_shiprocket_acc_integration" ON "public"."shiprocket_acc_table" USING "btree" ("integration_id");



CREATE INDEX "idx_shiprocket_acc_provider" ON "public"."shiprocket_acc_table" USING "btree" ("provider_id");



CREATE INDEX "idx_shiprocket_acc_status" ON "public"."shiprocket_acc_table" USING "btree" ("current_status");



CREATE INDEX "idx_shopify_acc_agent" ON "public"."shopify_acc_table" USING "btree" ("agent_id");



CREATE INDEX "idx_shopify_acc_brand" ON "public"."shopify_acc_table" USING "btree" ("brand_id");



CREATE UNIQUE INDEX "idx_shopify_acc_checkout_unique" ON "public"."shopify_acc_table" USING "btree" ("integration_id", "checkout_name");



CREATE INDEX "idx_shopify_acc_created" ON "public"."shopify_acc_table" USING "btree" ("created_at");



CREATE INDEX "idx_shopify_acc_integration" ON "public"."shopify_acc_table" USING "btree" ("integration_id");



CREATE INDEX "idx_shopify_acc_provider" ON "public"."shopify_acc_table" USING "btree" ("provider_id");



CREATE INDEX "idx_shopify_acc_status" ON "public"."shopify_acc_table" USING "btree" ("current_status");



CREATE OR REPLACE VIEW "public"."customer_recovery_view" WITH ("security_invoker"='false') AS
 SELECT "c"."id" AS "customer_id",
    "c"."first_name",
    "c"."last_name",
    "c"."email",
    "c"."phone",
    "ac"."id" AS "cart_id",
    "ac"."external_cart_id",
    "ac"."cart_value",
    "ac"."currency",
    "ac"."abandoned_at",
    "ac"."status" AS "cart_status",
    "json_agg"("json_build_object"('product_name', "aci"."product_name", 'quantity', "aci"."quantity", 'price', "aci"."price", 'image_url', "aci"."image_url")) AS "products",
    "sa"."current_status" AS "recovery_status",
    "sa"."call_status",
    "sa"."follow_up",
    "sa"."notes",
    "ac"."created_at",
    "b"."name" AS "source",
    "p"."name" AS "provider"
   FROM (((((("public"."customers" "c"
     JOIN "public"."abandoned_carts" "ac" ON (("c"."id" = "ac"."customer_id")))
     LEFT JOIN "public"."abandoned_cart_items" "aci" ON (("ac"."id" = "aci"."abandoned_cart_id")))
     LEFT JOIN "public"."support_activity" "sa" ON (("ac"."id" = "sa"."cart_id")))
     LEFT JOIN "public"."integrations" "i" ON (("ac"."integration_id" = "i"."id")))
     LEFT JOIN "public"."brands" "b" ON (("i"."brand_id" = "b"."id")))
     LEFT JOIN "public"."providers" "p" ON (("i"."provider_id" = "p"."id")))
  GROUP BY "c"."id", "ac"."id", "sa"."id", "b"."name", "p"."name";



CREATE OR REPLACE TRIGGER "shopify_abandoned_cart_trigger" AFTER INSERT ON "public"."webhook_logs" FOR EACH ROW WHEN (("new"."source" = 'shopify'::"text")) EXECUTE FUNCTION "public"."trigger_process_shopify_cart"();



CREATE OR REPLACE TRIGGER "trigger_assign_abandoned_cart" AFTER INSERT ON "public"."abandoned_carts" FOR EACH ROW EXECUTE FUNCTION "public"."assign_abandoned_cart_to_agent"();



ALTER TABLE ONLY "public"."abandoned_cart_items"
    ADD CONSTRAINT "abandoned_cart_items_abandoned_cart_id_fkey" FOREIGN KEY ("abandoned_cart_id") REFERENCES "public"."abandoned_carts"("id");



ALTER TABLE ONLY "public"."abandoned_carts"
    ADD CONSTRAINT "abandoned_carts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."abandoned_carts"
    ADD CONSTRAINT "abandoned_carts_integration_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id");



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_customer_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."cart_assignments"
    ADD CONSTRAINT "cart_assignments_agent_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_assignments"
    ADD CONSTRAINT "cart_assignments_cart_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."abandoned_carts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."abandoned_cart_items"
    ADD CONSTRAINT "cart_items_product_fk" FOREIGN KEY ("product_uuid") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."cart_recovery_status"
    ADD CONSTRAINT "cart_recovery_status_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id");



ALTER TABLE ONLY "public"."cart_recovery_status"
    ADD CONSTRAINT "cart_recovery_status_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "public"."abandoned_carts"("id");



ALTER TABLE ONLY "public"."shiprocket_acc_table"
    ADD CONSTRAINT "fk_shiprocket_acc_brand" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id");



ALTER TABLE ONLY "public"."shiprocket_acc_table"
    ADD CONSTRAINT "fk_shiprocket_acc_integration" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id");



ALTER TABLE ONLY "public"."shiprocket_acc_table"
    ADD CONSTRAINT "fk_shiprocket_acc_provider" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id");



ALTER TABLE ONLY "public"."shopify_acc_table"
    ADD CONSTRAINT "fk_shopify_acc_brand" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id");



ALTER TABLE ONLY "public"."shopify_acc_table"
    ADD CONSTRAINT "fk_shopify_acc_integration" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id");



ALTER TABLE ONLY "public"."shopify_acc_table"
    ADD CONSTRAINT "fk_shopify_acc_provider" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id");



ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_brand_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id");



ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_provider_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id");



ALTER TABLE ONLY "public"."support_activity"
    ADD CONSTRAINT "support_activity_agent_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."agents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_activity_logs"
    ADD CONSTRAINT "support_activity_logs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id");



ALTER TABLE ONLY "public"."support_activity_logs"
    ADD CONSTRAINT "support_activity_logs_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."cart_assignments"("id");



ALTER TABLE ONLY "public"."support_activity_logs"
    ADD CONSTRAINT "support_activity_logs_call_log_id_fkey" FOREIGN KEY ("call_log_id") REFERENCES "public"."call_logs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_activity_logs"
    ADD CONSTRAINT "support_activity_logs_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "public"."abandoned_carts"("id");



ALTER TABLE ONLY "public"."support_activity"
    ADD CONSTRAINT "support_cart_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."abandoned_carts"("id");



ALTER TABLE ONLY "public"."webhook_logs"
    ADD CONSTRAINT "webhook_logs_integration_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id");



ALTER TABLE "public"."abandoned_cart_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."abandoned_carts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brands" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."integrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_activity" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webhook_logs" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."customer_recoveries";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."assign_abandoned_cart_to_agent"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_abandoned_cart_to_agent"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_abandoned_cart_to_agent"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_shopify_abandoned_cart"("webhook_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."process_shopify_abandoned_cart"("webhook_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_shopify_abandoned_cart"("webhook_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_process_shopify_cart"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_process_shopify_cart"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_process_shopify_cart"() TO "service_role";


















GRANT ALL ON TABLE "public"."shiprocket_acc_table" TO "anon";
GRANT ALL ON TABLE "public"."shiprocket_acc_table" TO "authenticated";
GRANT ALL ON TABLE "public"."shiprocket_acc_table" TO "service_role";



GRANT ALL ON TABLE "public"."shopify_acc_table" TO "anon";
GRANT ALL ON TABLE "public"."shopify_acc_table" TO "authenticated";
GRANT ALL ON TABLE "public"."shopify_acc_table" TO "service_role";



GRANT ALL ON TABLE "public"."abandon_cart_master" TO "anon";
GRANT ALL ON TABLE "public"."abandon_cart_master" TO "authenticated";
GRANT ALL ON TABLE "public"."abandon_cart_master" TO "service_role";



GRANT ALL ON TABLE "public"."abandoned_cart_items" TO "anon";
GRANT ALL ON TABLE "public"."abandoned_cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."abandoned_cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."abandoned_carts" TO "anon";
GRANT ALL ON TABLE "public"."abandoned_carts" TO "authenticated";
GRANT ALL ON TABLE "public"."abandoned_carts" TO "service_role";



GRANT ALL ON TABLE "public"."addresses" TO "anon";
GRANT ALL ON TABLE "public"."addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."addresses" TO "service_role";



GRANT ALL ON TABLE "public"."cart_assignments" TO "anon";
GRANT ALL ON TABLE "public"."cart_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."cart_recovery_status" TO "anon";
GRANT ALL ON TABLE "public"."cart_recovery_status" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_recovery_status" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."support_activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."support_activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."support_activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."agent_follow_up_dashboard_view" TO "anon";
GRANT ALL ON TABLE "public"."agent_follow_up_dashboard_view" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_follow_up_dashboard_view" TO "service_role";



GRANT ALL ON TABLE "public"."agents" TO "anon";
GRANT ALL ON TABLE "public"."agents" TO "authenticated";
GRANT ALL ON TABLE "public"."agents" TO "service_role";



GRANT ALL ON TABLE "public"."agent_recovery_dashboard_view" TO "anon";
GRANT ALL ON TABLE "public"."agent_recovery_dashboard_view" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_recovery_dashboard_view" TO "service_role";



GRANT ALL ON TABLE "public"."support_activity" TO "anon";
GRANT ALL ON TABLE "public"."support_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."support_activity" TO "service_role";



GRANT ALL ON TABLE "public"."assigned_carts_view" TO "anon";
GRANT ALL ON TABLE "public"."assigned_carts_view" TO "authenticated";
GRANT ALL ON TABLE "public"."assigned_carts_view" TO "service_role";



GRANT ALL ON TABLE "public"."brands" TO "anon";
GRANT ALL ON TABLE "public"."brands" TO "authenticated";
GRANT ALL ON TABLE "public"."brands" TO "service_role";



GRANT ALL ON TABLE "public"."call_logs" TO "anon";
GRANT ALL ON TABLE "public"."call_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."call_logs" TO "service_role";



GRANT ALL ON TABLE "public"."customer_recoveries" TO "anon";
GRANT ALL ON TABLE "public"."customer_recoveries" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_recoveries" TO "service_role";



GRANT ALL ON TABLE "public"."customer_recovery_view" TO "anon";
GRANT ALL ON TABLE "public"."customer_recovery_view" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_recovery_view" TO "service_role";



GRANT ALL ON TABLE "public"."integrations" TO "anon";
GRANT ALL ON TABLE "public"."integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."integrations" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."providers" TO "anon";
GRANT ALL ON TABLE "public"."providers" TO "authenticated";
GRANT ALL ON TABLE "public"."providers" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_logs" TO "anon";
GRANT ALL ON TABLE "public"."webhook_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_logs" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


































SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."assign_abandoned_cart_to_agent"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$declare
    selected_agent_id uuid;
    selected_brand_id uuid;
    new_assignment_id uuid;

begin

    -- Find brand from integration
    select brand_id
    into selected_brand_id
    from public.integrations
    where id = new.integration_id;


    -- Find active agent for that brand
    select id
    into selected_agent_id
    from public.agents
    where brand_id = selected_brand_id
    and status = 'active'
    limit 1;


    -- Create assignment
    insert into public.cart_assignments
    (
        cart_id,
        agent_id,
        status,
        assigned_at
    )
    values
    (
        new.id,
        selected_agent_id,
        'assigned',
        now()
    )
    returning id into new_assignment_id;


    -- Create recovery status
    insert into public.cart_recovery_status
    (
        cart_id,
        agent_id,
        attempts,
        current_status,
        follow_up
    )
    values
    (
        new.id,
        selected_agent_id,
        0,
        'assigned',
        false
    );


    -- Create support activity log
    insert into public.support_activity_logs
    (
        cart_id,
        assignment_id,
        agent_id,
        activity_type,
        description,
        metadata
    )
    values
    (
        new.id,
        new_assignment_id,
        selected_agent_id,
        'CART_ASSIGNED',
        'Cart assigned to agent',
        jsonb_build_object(
            'source',
            'automatic_assignment'
        )
    );


    return new;

end;$$;


ALTER FUNCTION "public"."assign_abandoned_cart_to_agent"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_shopify_abandoned_cart"("webhook_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$DECLARE

    webhook_payload jsonb;

    new_customer_id uuid;
    new_address_id uuid;
    new_cart_id uuid;

    customer_name text;
    customer_email text;
    customer_phone text;

    integration uuid;

    product_item jsonb;

BEGIN



SELECT 
    payload,
    integration_id

INTO 
    webhook_payload,
    integration

FROM webhook_logs

WHERE id = webhook_id;




IF webhook_payload IS NULL THEN

    RAISE NOTICE 'Webhook payload missing';

    RETURN;

END IF;




customer_name :=
NULLIF(
    webhook_payload->'customer'->>'name',
    ''
);


customer_email :=
NULLIF(
    webhook_payload->'customer'->>'email',
    ''
);


customer_phone :=
NULLIF(
    webhook_payload->'customer'->>'phone',
    ''
);





IF customer_email IS NOT NULL THEN


    SELECT id

    INTO new_customer_id

    FROM customers

    WHERE email = customer_email

    LIMIT 1;


END IF;




IF new_customer_id IS NULL
AND customer_phone IS NOT NULL THEN


    SELECT id

    INTO new_customer_id

    FROM customers

    WHERE phone = customer_phone

    LIMIT 1;


END IF;




IF new_customer_id IS NULL
AND
(
    customer_email IS NOT NULL
    OR
    customer_phone IS NOT NULL
)

THEN


    INSERT INTO customers
    (
        first_name,
        email,
        phone
    )

    VALUES
    (
        customer_name,
        customer_email,
        customer_phone
    )

    RETURNING id INTO new_customer_id;


END IF;




IF new_customer_id IS NOT NULL THEN



    SELECT id

    INTO new_address_id

    FROM addresses

    WHERE

        customer_id = new_customer_id

        AND address1 =
        webhook_payload->'customerAddress'->>'address1'

        AND city =
        webhook_payload->'customerAddress'->>'city'

        AND state =
        webhook_payload->'customerAddress'->>'province'

        AND country =
        webhook_payload->'customerAddress'->>'country'

        AND zip =
        webhook_payload->'customerAddress'->>'zip'

    LIMIT 1;



    -- Create only if address does not exist


    IF new_address_id IS NULL THEN


        INSERT INTO addresses
        (
            customer_id,
            address1,
            address2,
            city,
            state,
            country,
            zip,
            phone
        )


        VALUES

        (

            new_customer_id,

            webhook_payload->'customerAddress'->>'address1',

            webhook_payload->'customerAddress'->>'address2',

            webhook_payload->'customerAddress'->>'city',

            webhook_payload->'customerAddress'->>'province',

            webhook_payload->'customerAddress'->>'country',

            webhook_payload->'customerAddress'->>'zip',

            customer_phone

        )


        RETURNING id INTO new_address_id;


    END IF;


END IF;





SELECT id

INTO new_cart_id

FROM abandoned_carts

WHERE external_cart_id =
webhook_payload->>'checkoutName'

AND integration_id = integration

LIMIT 1;




IF new_cart_id IS NULL THEN


    INSERT INTO abandoned_carts
    (
        customer_id,
        external_cart_id,
        cart_value,
        checkout_url,
        status,
        abandoned_at,
        integration_id
    )


    VALUES

    (

        new_customer_id,

        webhook_payload->>'checkoutName',

        COALESCE(
            NULLIF(webhook_payload->>'cartValue','')::numeric,
            0
        ),

        webhook_payload->>'checkoutUrl',

        'ABANDONED',

        (webhook_payload->>'createdAt')::timestamp,

        integration

    )


    RETURNING id INTO new_cart_id;



ELSE


    -- Same Shopify checkout retry
    -- update existing cart


    UPDATE abandoned_carts

    SET

        customer_id =
        COALESCE(
            abandoned_carts.customer_id,
            new_customer_id
        ),

        cart_value =
        COALESCE(
            NULLIF(webhook_payload->>'cartValue','')::numeric,
            cart_value
        ),

        checkout_url =
        webhook_payload->>'checkoutUrl',

        status =
        'ABANDONED',

        abandoned_at =
        (webhook_payload->>'createdAt')::timestamp


    WHERE id = new_cart_id;



END IF;




DELETE FROM abandoned_cart_items

WHERE abandoned_cart_id = new_cart_id;



IF webhook_payload ? 'products' THEN



    FOR product_item IN

    SELECT *

    FROM jsonb_array_elements(
        webhook_payload->'products'
    )


    LOOP


        INSERT INTO abandoned_cart_items
        (
            abandoned_cart_id,
            product_name,
            quantity
        )


        VALUES

        (

            new_cart_id,

            product_item->>'product',

            COALESCE(
                (product_item->>'quantity')::int,
                1
            )

        );


    END LOOP;


END IF;



END;$$;


ALTER FUNCTION "public"."process_shopify_abandoned_cart"("webhook_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_process_shopify_cart"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$

begin

perform process_shopify_abandoned_cart(
    NEW.id
);

return NEW;

end;

$$;


ALTER FUNCTION "public"."trigger_process_shopify_cart"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."shiprocket_acc_table" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "integration_id" "uuid" NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "webhook_id" "uuid",
    "source" "text" DEFAULT 'shiprocket'::"text",
    "event_type" "text" DEFAULT 'abandoned_cart'::"text",
    "raw_payload" "jsonb",
    "customer_id" "uuid",
    "customer_name" "text",
    "customer_email" "text",
    "customer_phone" "text",
    "address1" "text",
    "address2" "text",
    "city" "text",
    "state" "text",
    "country" "text",
    "zip" "text",
    "cart_id" "text",
    "cart_token" "text",
    "checkout_url" "text",
    "cart_value" numeric DEFAULT 0,
    "currency" "text" DEFAULT 'INR'::"text",
    "cart_status" "text" DEFAULT 'ABANDONED'::"text",
    "abandoned_at" timestamp without time zone,
    "products" "jsonb" DEFAULT '[]'::"jsonb",
    "payment_status" "text",
    "payment_method" "text",
    "shipping_price" numeric DEFAULT 0,
    "discount_codes" "jsonb" DEFAULT '[]'::"jsonb",
    "total_discount" numeric DEFAULT 0,
    "tax" numeric DEFAULT 0,
    "latest_stage" "text",
    "agent_id" "uuid",
    "agent_name" "text",
    "assignment_status" "text",
    "attempts" integer DEFAULT 0,
    "call_status" "text",
    "current_status" "text",
    "follow_up" boolean DEFAULT false,
    "follow_up_at" timestamp without time zone,
    "notes" "text",
    "last_call_date" timestamp without time zone,
    "call_logs" "jsonb" DEFAULT '[]'::"jsonb",
    "activity_logs" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "brand_name" "text"
);


ALTER TABLE "public"."shiprocket_acc_table" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shopify_acc_table" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "integration_id" "uuid" NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "webhook_id" "uuid",
    "source" "text" DEFAULT 'shopify'::"text",
    "event_type" "text" DEFAULT 'abandoned_cart'::"text",
    "raw_payload" "jsonb",
    "customer_id" "uuid",
    "customer_name" "text",
    "customer_email" "text",
    "customer_phone" "text",
    "address1" "text",
    "address2" "text",
    "city" "text",
    "state" "text",
    "country" "text",
    "zip" "text",
    "cart_id" "text",
    "checkout_name" "text",
    "checkout_url" "text",
    "cart_value" numeric DEFAULT 0,
    "currency" "text" DEFAULT 'INR'::"text",
    "cart_status" "text" DEFAULT 'ABANDONED'::"text",
    "abandoned_at" timestamp without time zone,
    "products" "jsonb" DEFAULT '[]'::"jsonb",
    "agent_id" "uuid",
    "agent_name" "text",
    "assignment_status" "text",
    "attempts" integer DEFAULT 0,
    "call_status" "text",
    "current_status" "text",
    "follow_up" boolean DEFAULT false,
    "follow_up_at" timestamp without time zone,
    "notes" "text",
    "last_call_date" timestamp without time zone,
    "call_logs" "jsonb" DEFAULT '[]'::"jsonb",
    "activity_logs" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "brand_name" "text",
    "discount_codes" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."shopify_acc_table" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."abandon_cart_master" AS
 SELECT "shopify_acc_table"."id",
    "shopify_acc_table"."brand_id",
    "shopify_acc_table"."brand_name",
    "shopify_acc_table"."provider_id",
    "shopify_acc_table"."integration_id",
    "shopify_acc_table"."source",
    "shopify_acc_table"."event_type",
    "shopify_acc_table"."customer_name",
    "shopify_acc_table"."customer_email",
    "shopify_acc_table"."customer_phone",
    "shopify_acc_table"."address1",
    "shopify_acc_table"."address2",
    "shopify_acc_table"."city",
    "shopify_acc_table"."state",
    "shopify_acc_table"."country",
    "shopify_acc_table"."zip",
    "shopify_acc_table"."cart_id",
    "shopify_acc_table"."checkout_url",
    "shopify_acc_table"."cart_value",
    "shopify_acc_table"."currency",
    "shopify_acc_table"."cart_status",
    "shopify_acc_table"."abandoned_at",
    "shopify_acc_table"."products",
    "shopify_acc_table"."agent_id",
    "shopify_acc_table"."agent_name",
    "shopify_acc_table"."assignment_status",
    "shopify_acc_table"."attempts",
    "shopify_acc_table"."call_status",
    "shopify_acc_table"."current_status",
    "shopify_acc_table"."follow_up",
    "shopify_acc_table"."follow_up_at",
    "shopify_acc_table"."notes",
    "shopify_acc_table"."call_logs",
    "shopify_acc_table"."activity_logs",
    "shopify_acc_table"."created_at",
    "shopify_acc_table"."updated_at"
   FROM "public"."shopify_acc_table"
UNION ALL
 SELECT "shiprocket_acc_table"."id",
    "shiprocket_acc_table"."brand_id",
    "shiprocket_acc_table"."brand_name",
    "shiprocket_acc_table"."provider_id",
    "shiprocket_acc_table"."integration_id",
    "shiprocket_acc_table"."source",
    "shiprocket_acc_table"."event_type",
    "shiprocket_acc_table"."customer_name",
    "shiprocket_acc_table"."customer_email",
    "shiprocket_acc_table"."customer_phone",
    "shiprocket_acc_table"."address1",
    "shiprocket_acc_table"."address2",
    "shiprocket_acc_table"."city",
    "shiprocket_acc_table"."state",
    "shiprocket_acc_table"."country",
    "shiprocket_acc_table"."zip",
    "shiprocket_acc_table"."cart_id",
    "shiprocket_acc_table"."checkout_url",
    "shiprocket_acc_table"."cart_value",
    "shiprocket_acc_table"."currency",
    "shiprocket_acc_table"."cart_status",
    "shiprocket_acc_table"."abandoned_at",
    "shiprocket_acc_table"."products",
    "shiprocket_acc_table"."agent_id",
    "shiprocket_acc_table"."agent_name",
    "shiprocket_acc_table"."assignment_status",
    "shiprocket_acc_table"."attempts",
    "shiprocket_acc_table"."call_status",
    "shiprocket_acc_table"."current_status",
    "shiprocket_acc_table"."follow_up",
    "shiprocket_acc_table"."follow_up_at",
    "shiprocket_acc_table"."notes",
    "shiprocket_acc_table"."call_logs",
    "shiprocket_acc_table"."activity_logs",
    "shiprocket_acc_table"."created_at",
    "shiprocket_acc_table"."updated_at"
   FROM "public"."shiprocket_acc_table";


ALTER VIEW "public"."abandon_cart_master" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."abandoned_cart_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "abandoned_cart_id" "uuid",
    "product_id" "text",
    "variant_id" "text",
    "sku" "text",
    "product_name" "text",
    "quantity" integer,
    "price" numeric,
    "image_url" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "product_uuid" "uuid"
);


ALTER TABLE "public"."abandoned_cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."abandoned_carts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid",
    "external_cart_id" "text",
    "cart_token" "text",
    "cart_value" numeric,
    "currency" "text" DEFAULT 'INR'::"text",
    "checkout_url" "text",
    "status" "text" DEFAULT 'NEW'::"text",
    "abandoned_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "integration_id" "uuid",
    "discount_codes" "jsonb",
    "total_discount" numeric DEFAULT 0,
    "tax" numeric DEFAULT 0
);


ALTER TABLE "public"."abandoned_carts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "type" "text" DEFAULT 'shipping'::"text",
    "address1" "text",
    "address2" "text",
    "city" "text",
    "state" "text",
    "country" "text",
    "zip" "text",
    "phone" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cart_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cart_id" "uuid" NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "assigned_at" timestamp without time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'assigned'::"text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."cart_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cart_recovery_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cart_id" "uuid",
    "agent_id" "uuid",
    "attempts" integer DEFAULT 0,
    "last_call_date" timestamp without time zone,
    "call_status" "text",
    "current_status" "text",
    "previous_status" "text",
    "sale_item_status" "text",
    "delivery_status" "text",
    "follow_up" boolean DEFAULT false,
    "notes" "text",
    "recordings_url" "text",
    "call_summary" "text",
    "intent" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "abandonment_reason" "text",
    "follow_up_at" timestamp without time zone
);


ALTER TABLE "public"."cart_recovery_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "email" "text",
    "phone" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cart_id" "uuid",
    "assignment_id" "uuid",
    "agent_id" "uuid",
    "activity_type" "text",
    "description" "text",
    "metadata" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "call_log_id" "uuid"
);


ALTER TABLE "public"."support_activity_logs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."agent_follow_up_dashboard_view" AS
 SELECT "ca"."id" AS "assignment_id",
    "ca"."cart_id",
    "ca"."agent_id",
    "ca"."assigned_at",
    "c"."id" AS "customer_id",
    "c"."first_name",
    "c"."last_name",
    "c"."email",
    "c"."phone",
    "addr"."address1",
    "addr"."address2",
    "addr"."city",
    "addr"."state",
    "addr"."country",
    "addr"."zip",
    "ac"."external_cart_id",
    "ac"."cart_value",
    "ac"."currency",
    "ac"."checkout_url",
    "ac"."abandoned_at",
    ( SELECT "json_agg"("json_build_object"('product_name', "aci"."product_name", 'quantity', "aci"."quantity", 'price', "aci"."price", 'image_url', "aci"."image_url")) AS "json_agg"
           FROM "public"."abandoned_cart_items" "aci"
          WHERE ("aci"."abandoned_cart_id" = "ac"."id")) AS "products",
    "crs"."id" AS "recovery_status_id",
    "crs"."current_status",
    "crs"."previous_status",
    "crs"."attempts",
    "crs"."call_status",
    "crs"."follow_up",
    "crs"."follow_up_at",
    "crs"."notes",
    ( SELECT "json_agg"("json_build_object"('activity_type', "sal"."activity_type", 'description', "sal"."description", 'metadata', "sal"."metadata", 'created_at', "sal"."created_at") ORDER BY "sal"."created_at" DESC) AS "json_agg"
           FROM "public"."support_activity_logs" "sal"
          WHERE ("sal"."cart_id" = "ac"."id")) AS "recovery_timeline"
   FROM (((("public"."cart_assignments" "ca"
     JOIN "public"."abandoned_carts" "ac" ON (("ac"."id" = "ca"."cart_id")))
     JOIN "public"."customers" "c" ON (("c"."id" = "ac"."customer_id")))
     LEFT JOIN "public"."addresses" "addr" ON (("addr"."customer_id" = "c"."id")))
     JOIN "public"."cart_recovery_status" "crs" ON (("crs"."cart_id" = "ac"."id")))
  WHERE ("crs"."follow_up" = true);


ALTER VIEW "public"."agent_follow_up_dashboard_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "brand_id" "uuid",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."agents" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."agent_recovery_dashboard_view" AS
 SELECT "ca"."id" AS "assignment_id",
    "ca"."cart_id",
    "ca"."agent_id",
    "ca"."status" AS "assignment_status",
    "ca"."assigned_at",
    "c"."id" AS "customer_id",
    "c"."first_name",
    "c"."last_name",
    "c"."email",
    "c"."phone",
    "ac"."external_cart_id",
    "ac"."cart_value",
    "ac"."currency",
    "ac"."checkout_url",
    "ac"."status" AS "cart_status",
    "ac"."abandoned_at",
    "ac"."created_at" AS "cart_created_at",
    "crs"."id" AS "recovery_status_id",
    "crs"."attempts",
    "crs"."call_status",
    "crs"."current_status",
    "crs"."previous_status",
    "crs"."sale_item_status",
    "crs"."delivery_status",
    "crs"."follow_up",
    "crs"."follow_up_at",
    "crs"."notes",
    "crs"."abandonment_reason",
    "crs"."updated_at" AS "recovery_updated_at",
    "a"."id" AS "assigned_agent_id",
    "a"."name" AS "agent_name",
    ( SELECT "json_agg"("json_build_object"('product_name', "aci"."product_name", 'quantity', "aci"."quantity", 'price', "aci"."price", 'image_url', "aci"."image_url")) AS "json_agg"
           FROM "public"."abandoned_cart_items" "aci"
          WHERE ("aci"."abandoned_cart_id" = "ac"."id")) AS "products"
   FROM (((("public"."cart_assignments" "ca"
     JOIN "public"."abandoned_carts" "ac" ON (("ac"."id" = "ca"."cart_id")))
     JOIN "public"."customers" "c" ON (("c"."id" = "ac"."customer_id")))
     JOIN "public"."cart_recovery_status" "crs" ON (("crs"."cart_id" = "ac"."id")))
     JOIN "public"."agents" "a" ON (("a"."id" = "ca"."agent_id")));


ALTER VIEW "public"."agent_recovery_dashboard_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_activity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cart_id" "uuid" NOT NULL,
    "assigned_agent" "text",
    "attempts" integer DEFAULT 0,
    "last_call_date" timestamp without time zone,
    "call_status" "text",
    "current_status" "text",
    "previous_status" "text",
    "sale_item_status" "text",
    "delivery_status" "text",
    "follow_up" boolean DEFAULT false,
    "notes" "text",
    "recordings_url" "text",
    "call_summary" "text",
    "intent" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "assigned_agent_id" "uuid"
);


ALTER TABLE "public"."support_activity" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."assigned_carts_view" AS
 SELECT "ca"."id" AS "assignment_id",
    "a"."id" AS "agent_id",
    "a"."name" AS "agent_name",
    "c"."id" AS "customer_id",
    "c"."first_name",
    "c"."last_name",
    "c"."email",
    "c"."phone",
    "addr"."id" AS "address_id",
    "addr"."address1",
    "addr"."address2",
    "addr"."city",
    "addr"."state",
    "addr"."country",
    "addr"."zip",
    "ac"."id" AS "cart_id",
    "ac"."cart_value",
    "ac"."currency",
    "ac"."checkout_url",
    "ac"."status" AS "cart_status",
    "ac"."abandoned_at",
    "json_agg"("json_build_object"('product_name', "aci"."product_name", 'quantity', "aci"."quantity", 'price', "aci"."price", 'image_url', "aci"."image_url")) AS "products",
    "sa"."attempts",
    "sa"."call_status",
    "sa"."current_status",
    "sa"."follow_up",
    "sa"."notes",
    "sa"."last_call_date"
   FROM (((((("public"."cart_assignments" "ca"
     JOIN "public"."agents" "a" ON (("a"."id" = "ca"."agent_id")))
     JOIN "public"."abandoned_carts" "ac" ON (("ac"."id" = "ca"."cart_id")))
     JOIN "public"."customers" "c" ON (("c"."id" = "ac"."customer_id")))
     LEFT JOIN "public"."addresses" "addr" ON (("addr"."customer_id" = "c"."id")))
     LEFT JOIN "public"."abandoned_cart_items" "aci" ON (("aci"."abandoned_cart_id" = "ac"."id")))
     LEFT JOIN "public"."support_activity" "sa" ON (("sa"."cart_id" = "ac"."id")))
  GROUP BY "ca"."id", "a"."id", "a"."name", "c"."id", "c"."first_name", "c"."last_name", "c"."email", "c"."phone", "addr"."id", "addr"."address1", "addr"."address2", "addr"."city", "addr"."state", "addr"."country", "addr"."zip", "ac"."id", "ac"."cart_value", "ac"."currency", "ac"."checkout_url", "ac"."status", "ac"."abandoned_at", "sa"."attempts", "sa"."call_status", "sa"."current_status", "sa"."follow_up", "sa"."notes", "sa"."last_call_date";


ALTER VIEW "public"."assigned_carts_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brands" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."brands" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."call_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cart_id" "uuid" NOT NULL,
    "assignment_id" "uuid",
    "agent_id" "uuid",
    "call_started_at" timestamp without time zone,
    "call_ended_at" timestamp without time zone,
    "duration" integer DEFAULT 0,
    "outcome" "text",
    "notes" "text",
    "recording_url" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'completed'::"text"
);


ALTER TABLE "public"."call_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_recoveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "text",
    "first_name" "text",
    "last_name" "text",
    "email" "text",
    "phone" "text",
    "cart_id" "text",
    "cart_value" numeric(10,2),
    "products" "jsonb",
    "recovery_status" "text",
    "call_status" "text",
    "follow_up" "text",
    "notes" "text",
    "abandoned_at" timestamp with time zone,
    "source" "text",
    "provider" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customer_recoveries" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."customer_recovery_view" AS
SELECT
    NULL::"uuid" AS "customer_id",
    NULL::"text" AS "first_name",
    NULL::"text" AS "last_name",
    NULL::"text" AS "email",
    NULL::"text" AS "phone",
    NULL::"uuid" AS "cart_id",
    NULL::"text" AS "external_cart_id",
    NULL::numeric AS "cart_value",
    NULL::"text" AS "currency",
    NULL::timestamp without time zone AS "abandoned_at",
    NULL::"text" AS "cart_status",
    NULL::json AS "products",
    NULL::"text" AS "recovery_status",
    NULL::"text" AS "call_status",
    NULL::boolean AS "follow_up",
    NULL::"text" AS "notes",
    NULL::timestamp without time zone AS "created_at",
    NULL::"text" AS "source",
    NULL::"text" AS "provider";


ALTER VIEW "public"."customer_recovery_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "integration_token" "text",
    "webhook_path" "text",
    "status" "text" DEFAULT 'ACTIVE'::"text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."integrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "external_product_id" "text",
    "name" "text",
    "sku" "text",
    "image_url" "text",
    "product_type" "text",
    "vendor" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."providers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."providers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source" "text",
    "event_type" "text",
    "payload" "jsonb",
    "status" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "integration_id" "uuid"
);


ALTER TABLE "public"."webhook_logs" OWNER TO "postgres";


ALTER TABLE ONLY "public"."abandoned_cart_items"
    ADD CONSTRAINT "abandoned_cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."abandoned_carts"
    ADD CONSTRAINT "abandoned_carts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."call_logs"
    ADD CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_assignments"
    ADD CONSTRAINT "cart_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_recovery_status"
    ADD CONSTRAINT "cart_recovery_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_recoveries"
    ADD CONSTRAINT "customer_recoveries_cart_id_key" UNIQUE ("cart_id");



ALTER TABLE ONLY "public"."customer_recoveries"
    ADD CONSTRAINT "customer_recoveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_integration_token_key" UNIQUE ("integration_token");



ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_webhook_path_key" UNIQUE ("webhook_path");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."providers"
    ADD CONSTRAINT "providers_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."providers"
    ADD CONSTRAINT "providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shiprocket_acc_table"
    ADD CONSTRAINT "shiprocket_acc_table_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shopify_acc_table"
    ADD CONSTRAINT "shopify_acc_table_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_activity_logs"
    ADD CONSTRAINT "support_activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_activity"
    ADD CONSTRAINT "support_activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "unique_brand_name" UNIQUE ("name");



ALTER TABLE ONLY "public"."webhook_logs"
    ADD CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_shiprocket_acc_agent" ON "public"."shiprocket_acc_table" USING "btree" ("agent_id");



CREATE INDEX "idx_shiprocket_acc_brand" ON "public"."shiprocket_acc_table" USING "btree" ("brand_id");



CREATE INDEX "idx_shiprocket_acc_created" ON "public"."shiprocket_acc_table" USING "btree" ("created_at");



CREATE INDEX "idx_shiprocket_acc_integration" ON "public"."shiprocket_acc_table" USING "btree" ("integration_id");



CREATE INDEX "idx_shiprocket_acc_provider" ON "public"."shiprocket_acc_table" USING "btree" ("provider_id");



CREATE INDEX "idx_shiprocket_acc_status" ON "public"."shiprocket_acc_table" USING "btree" ("current_status");



CREATE INDEX "idx_shopify_acc_agent" ON "public"."shopify_acc_table" USING "btree" ("agent_id");



CREATE INDEX "idx_shopify_acc_brand" ON "public"."shopify_acc_table" USING "btree" ("brand_id");



CREATE UNIQUE INDEX "idx_shopify_acc_checkout_unique" ON "public"."shopify_acc_table" USING "btree" ("integration_id", "checkout_name");



CREATE INDEX "idx_shopify_acc_created" ON "public"."shopify_acc_table" USING "btree" ("created_at");



CREATE INDEX "idx_shopify_acc_integration" ON "public"."shopify_acc_table" USING "btree" ("integration_id");



CREATE INDEX "idx_shopify_acc_provider" ON "public"."shopify_acc_table" USING "btree" ("provider_id");



CREATE INDEX "idx_shopify_acc_status" ON "public"."shopify_acc_table" USING "btree" ("current_status");



CREATE OR REPLACE VIEW "public"."customer_recovery_view" WITH ("security_invoker"='false') AS
 SELECT "c"."id" AS "customer_id",
    "c"."first_name",
    "c"."last_name",
    "c"."email",
    "c"."phone",
    "ac"."id" AS "cart_id",
    "ac"."external_cart_id",
    "ac"."cart_value",
    "ac"."currency",
    "ac"."abandoned_at",
    "ac"."status" AS "cart_status",
    "json_agg"("json_build_object"('product_name', "aci"."product_name", 'quantity', "aci"."quantity", 'price', "aci"."price", 'image_url', "aci"."image_url")) AS "products",
    "sa"."current_status" AS "recovery_status",
    "sa"."call_status",
    "sa"."follow_up",
    "sa"."notes",
    "ac"."created_at",
    "b"."name" AS "source",
    "p"."name" AS "provider"
   FROM (((((("public"."customers" "c"
     JOIN "public"."abandoned_carts" "ac" ON (("c"."id" = "ac"."customer_id")))
     LEFT JOIN "public"."abandoned_cart_items" "aci" ON (("ac"."id" = "aci"."abandoned_cart_id")))
     LEFT JOIN "public"."support_activity" "sa" ON (("ac"."id" = "sa"."cart_id")))
     LEFT JOIN "public"."integrations" "i" ON (("ac"."integration_id" = "i"."id")))
     LEFT JOIN "public"."brands" "b" ON (("i"."brand_id" = "b"."id")))
     LEFT JOIN "public"."providers" "p" ON (("i"."provider_id" = "p"."id")))
  GROUP BY "c"."id", "ac"."id", "sa"."id", "b"."name", "p"."name";



CREATE OR REPLACE TRIGGER "shopify_abandoned_cart_trigger" AFTER INSERT ON "public"."webhook_logs" FOR EACH ROW WHEN (("new"."source" = 'shopify'::"text")) EXECUTE FUNCTION "public"."trigger_process_shopify_cart"();



CREATE OR REPLACE TRIGGER "trigger_assign_abandoned_cart" AFTER INSERT ON "public"."abandoned_carts" FOR EACH ROW EXECUTE FUNCTION "public"."assign_abandoned_cart_to_agent"();



ALTER TABLE ONLY "public"."abandoned_cart_items"
    ADD CONSTRAINT "abandoned_cart_items_abandoned_cart_id_fkey" FOREIGN KEY ("abandoned_cart_id") REFERENCES "public"."abandoned_carts"("id");



ALTER TABLE ONLY "public"."abandoned_carts"
    ADD CONSTRAINT "abandoned_carts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."abandoned_carts"
    ADD CONSTRAINT "abandoned_carts_integration_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id");



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_customer_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."cart_assignments"
    ADD CONSTRAINT "cart_assignments_agent_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_assignments"
    ADD CONSTRAINT "cart_assignments_cart_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."abandoned_carts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."abandoned_cart_items"
    ADD CONSTRAINT "cart_items_product_fk" FOREIGN KEY ("product_uuid") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."cart_recovery_status"
    ADD CONSTRAINT "cart_recovery_status_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id");



ALTER TABLE ONLY "public"."cart_recovery_status"
    ADD CONSTRAINT "cart_recovery_status_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "public"."abandoned_carts"("id");



ALTER TABLE ONLY "public"."shiprocket_acc_table"
    ADD CONSTRAINT "fk_shiprocket_acc_brand" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id");



ALTER TABLE ONLY "public"."shiprocket_acc_table"
    ADD CONSTRAINT "fk_shiprocket_acc_integration" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id");



ALTER TABLE ONLY "public"."shiprocket_acc_table"
    ADD CONSTRAINT "fk_shiprocket_acc_provider" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id");



ALTER TABLE ONLY "public"."shopify_acc_table"
    ADD CONSTRAINT "fk_shopify_acc_brand" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id");



ALTER TABLE ONLY "public"."shopify_acc_table"
    ADD CONSTRAINT "fk_shopify_acc_integration" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id");



ALTER TABLE ONLY "public"."shopify_acc_table"
    ADD CONSTRAINT "fk_shopify_acc_provider" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id");



ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_brand_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id");



ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_provider_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id");



ALTER TABLE ONLY "public"."support_activity"
    ADD CONSTRAINT "support_activity_agent_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."agents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_activity_logs"
    ADD CONSTRAINT "support_activity_logs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id");



ALTER TABLE ONLY "public"."support_activity_logs"
    ADD CONSTRAINT "support_activity_logs_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."cart_assignments"("id");



ALTER TABLE ONLY "public"."support_activity_logs"
    ADD CONSTRAINT "support_activity_logs_call_log_id_fkey" FOREIGN KEY ("call_log_id") REFERENCES "public"."call_logs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_activity_logs"
    ADD CONSTRAINT "support_activity_logs_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "public"."abandoned_carts"("id");



ALTER TABLE ONLY "public"."support_activity"
    ADD CONSTRAINT "support_cart_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."abandoned_carts"("id");



ALTER TABLE ONLY "public"."webhook_logs"
    ADD CONSTRAINT "webhook_logs_integration_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id");



ALTER TABLE "public"."abandoned_cart_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."abandoned_carts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brands" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."integrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_activity" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webhook_logs" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."customer_recoveries";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."assign_abandoned_cart_to_agent"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_abandoned_cart_to_agent"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_abandoned_cart_to_agent"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_shopify_abandoned_cart"("webhook_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."process_shopify_abandoned_cart"("webhook_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_shopify_abandoned_cart"("webhook_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_process_shopify_cart"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_process_shopify_cart"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_process_shopify_cart"() TO "service_role";


















GRANT ALL ON TABLE "public"."shiprocket_acc_table" TO "anon";
GRANT ALL ON TABLE "public"."shiprocket_acc_table" TO "authenticated";
GRANT ALL ON TABLE "public"."shiprocket_acc_table" TO "service_role";



GRANT ALL ON TABLE "public"."shopify_acc_table" TO "anon";
GRANT ALL ON TABLE "public"."shopify_acc_table" TO "authenticated";
GRANT ALL ON TABLE "public"."shopify_acc_table" TO "service_role";



GRANT ALL ON TABLE "public"."abandon_cart_master" TO "anon";
GRANT ALL ON TABLE "public"."abandon_cart_master" TO "authenticated";
GRANT ALL ON TABLE "public"."abandon_cart_master" TO "service_role";



GRANT ALL ON TABLE "public"."abandoned_cart_items" TO "anon";
GRANT ALL ON TABLE "public"."abandoned_cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."abandoned_cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."abandoned_carts" TO "anon";
GRANT ALL ON TABLE "public"."abandoned_carts" TO "authenticated";
GRANT ALL ON TABLE "public"."abandoned_carts" TO "service_role";



GRANT ALL ON TABLE "public"."addresses" TO "anon";
GRANT ALL ON TABLE "public"."addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."addresses" TO "service_role";



GRANT ALL ON TABLE "public"."cart_assignments" TO "anon";
GRANT ALL ON TABLE "public"."cart_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."cart_recovery_status" TO "anon";
GRANT ALL ON TABLE "public"."cart_recovery_status" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_recovery_status" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."support_activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."support_activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."support_activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."agent_follow_up_dashboard_view" TO "anon";
GRANT ALL ON TABLE "public"."agent_follow_up_dashboard_view" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_follow_up_dashboard_view" TO "service_role";



GRANT ALL ON TABLE "public"."agents" TO "anon";
GRANT ALL ON TABLE "public"."agents" TO "authenticated";
GRANT ALL ON TABLE "public"."agents" TO "service_role";



GRANT ALL ON TABLE "public"."agent_recovery_dashboard_view" TO "anon";
GRANT ALL ON TABLE "public"."agent_recovery_dashboard_view" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_recovery_dashboard_view" TO "service_role";



GRANT ALL ON TABLE "public"."support_activity" TO "anon";
GRANT ALL ON TABLE "public"."support_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."support_activity" TO "service_role";



GRANT ALL ON TABLE "public"."assigned_carts_view" TO "anon";
GRANT ALL ON TABLE "public"."assigned_carts_view" TO "authenticated";
GRANT ALL ON TABLE "public"."assigned_carts_view" TO "service_role";



GRANT ALL ON TABLE "public"."brands" TO "anon";
GRANT ALL ON TABLE "public"."brands" TO "authenticated";
GRANT ALL ON TABLE "public"."brands" TO "service_role";



GRANT ALL ON TABLE "public"."call_logs" TO "anon";
GRANT ALL ON TABLE "public"."call_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."call_logs" TO "service_role";



GRANT ALL ON TABLE "public"."customer_recoveries" TO "anon";
GRANT ALL ON TABLE "public"."customer_recoveries" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_recoveries" TO "service_role";



GRANT ALL ON TABLE "public"."customer_recovery_view" TO "anon";
GRANT ALL ON TABLE "public"."customer_recovery_view" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_recovery_view" TO "service_role";



GRANT ALL ON TABLE "public"."integrations" TO "anon";
GRANT ALL ON TABLE "public"."integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."integrations" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."providers" TO "anon";
GRANT ALL ON TABLE "public"."providers" TO "authenticated";
GRANT ALL ON TABLE "public"."providers" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_logs" TO "anon";
GRANT ALL ON TABLE "public"."webhook_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_logs" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































