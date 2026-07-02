-- SCENARIO A: If you want to reassign carts from Tanishq (91d61326...) to Divya ONLY for Stack:

UPDATE public.shopify_acc_table
SET agent_id = '8087f070-bd91-4109-ad6a-ed98cc492aed',
    agent_name = 'Divya Arya',
    assignment_status = 'ASSIGNED'
WHERE brand_id = 'a0c2d87e-d392-4f0a-b07f-3e6102e6dd71'
  AND agent_id = '91d61326-ba4f-4fbc-8ecb-f35fdc880102';

UPDATE public.shiprocket_acc_table
SET agent_id = '8087f070-bd91-4109-ad6a-ed98cc492aed',
    agent_name = 'Divya Arya',
    assignment_status = 'ASSIGNED'
WHERE brand_id = 'a0c2d87e-d392-4f0a-b07f-3e6102e6dd71'
  AND agent_id = '91d61326-ba4f-4fbc-8ecb-f35fdc880102';

-- Fix the cart_assignments tracker (skip duplicates)
UPDATE public.cart_assignments AS ca
SET agent_id = '8087f070-bd91-4109-ad6a-ed98cc492aed'
WHERE agent_id = '91d61326-ba4f-4fbc-8ecb-f35fdc880102'
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


-------------------------------------------------------------------------
-- SCENARIO B: If you want to assign all UNASSIGNED carts for Stack to Divya:

UPDATE public.shopify_acc_table
SET agent_id = '8087f070-bd91-4109-ad6a-ed98cc492aed',
    agent_name = 'Divya Arya',
    assignment_status = 'ASSIGNED'
WHERE brand_id = 'a0c2d87e-d392-4f0a-b07f-3e6102e6dd71'
  AND (agent_id IS NULL OR assignment_status = 'UNASSIGNED');

UPDATE public.shiprocket_acc_table
SET agent_id = '8087f070-bd91-4109-ad6a-ed98cc492aed',
    agent_name = 'Divya Arya',
    assignment_status = 'ASSIGNED'
WHERE brand_id = 'a0c2d87e-d392-4f0a-b07f-3e6102e6dd71'
  AND (agent_id IS NULL OR assignment_status = 'UNASSIGNED');

-- Insert missing tracker records for Divya
INSERT INTO public.cart_assignments (cart_id, agent_id, status)
SELECT id, '8087f070-bd91-4109-ad6a-ed98cc492aed', 'active'
FROM public.shopify_acc_table 
WHERE brand_id = 'a0c2d87e-d392-4f0a-b07f-3e6102e6dd71' AND agent_id = '8087f070-bd91-4109-ad6a-ed98cc492aed'
ON CONFLICT DO NOTHING;

INSERT INTO public.cart_assignments (cart_id, agent_id, status)
SELECT id, '8087f070-bd91-4109-ad6a-ed98cc492aed', 'active'
FROM public.shiprocket_acc_table 
WHERE brand_id = 'a0c2d87e-d392-4f0a-b07f-3e6102e6dd71' AND agent_id = '8087f070-bd91-4109-ad6a-ed98cc492aed'
ON CONFLICT DO NOTHING;
