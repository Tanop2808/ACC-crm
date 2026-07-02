-- Run this in your Supabase SQL Editor
-- This strictly converts the status of old records to the new official 'non_addressable' tag

UPDATE public.shopify_acc_table
SET current_status = 'non_addressable'
WHERE (current_status = 'calls' OR current_status IS NULL)
  AND (customer_phone IS NULL OR TRIM(customer_phone) = '' OR TRIM(customer_phone) = 'N/A');

UPDATE public.shiprocket_acc_table
SET current_status = 'non_addressable'
WHERE (current_status = 'calls' OR current_status IS NULL)
  AND (customer_phone IS NULL OR TRIM(customer_phone) = '' OR TRIM(customer_phone) = 'N/A');
