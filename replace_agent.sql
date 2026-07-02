-- 1. Reassign all Shopify carts from Parthavi to Divya Arya ONLY FOR STACK
UPDATE public.shopify_acc_table
SET agent_id = '8087f070-bd91-4109-ad6a-ed98cc492aed',
    agent_name = 'Divya Arya'
WHERE agent_id = 'b92a4795-62de-4fd4-9040-f510c463472d'
  AND brand_id = 'a0c2d87e-d392-4f0a-b07f-3e6102e6dd71';

-- 2. Reassign all Shiprocket carts from Parthavi to Divya Arya ONLY FOR STACK
UPDATE public.shiprocket_acc_table
SET agent_id = '8087f070-bd91-4109-ad6a-ed98cc492aed',
    agent_name = 'Divya Arya'
WHERE agent_id = 'b92a4795-62de-4fd4-9040-f510c463472d'
  AND brand_id = 'a0c2d87e-d392-4f0a-b07f-3e6102e6dd71';

-- 3. Update the central cart assignments tracker for those carts, skipping duplicates
UPDATE public.cart_assignments AS ca
SET agent_id = '8087f070-bd91-4109-ad6a-ed98cc492aed'
WHERE agent_id = 'b92a4795-62de-4fd4-9040-f510c463472d'
  AND cart_id IN (
      SELECT id FROM public.shopify_acc_table WHERE brand_id = 'a0c2d87e-d392-4f0a-b07f-3e6102e6dd71'
      UNION ALL
      SELECT id FROM public.shiprocket_acc_table WHERE brand_id = 'a0c2d87e-d392-4f0a-b07f-3e6102e6dd71'
  )
  AND NOT EXISTS (
      SELECT 1 FROM public.cart_assignments ca2 
      WHERE ca2.cart_id = ca.cart_id 
        AND ca2.agent_id = '8087f070-bd91-4109-ad6a-ed98cc492aed'
  );

-- 4. Delete any leftover Parthavi assignments for these carts (the ones that would have caused duplicates)
DELETE FROM public.cart_assignments
WHERE agent_id = 'b92a4795-62de-4fd4-9040-f510c463472d'
  AND cart_id IN (
      SELECT id FROM public.shopify_acc_table WHERE brand_id = 'a0c2d87e-d392-4f0a-b07f-3e6102e6dd71'
      UNION ALL
      SELECT id FROM public.shiprocket_acc_table WHERE brand_id = 'a0c2d87e-d392-4f0a-b07f-3e6102e6dd71'
  );
