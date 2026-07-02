-- This will permanently delete this specific cart from the table
DELETE FROM public.shopify_acc_table 
WHERE id = '00083345-2af1-410f-88e4-b9762ae10184';

-- Also clean it out from the tracker if it's in there
DELETE FROM public.cart_assignments
WHERE cart_id = '00083345-2af1-410f-88e4-b9762ae10184';
