-- This will completely delete Parthavi from the agents table.
-- Because of foreign key cascades, it will ALSO automatically remove her from:
-- 1. agent_brand_assignments
-- 2. cart_assignments

DELETE FROM public.agents
WHERE id = 'b92a4795-62de-4fd4-9040-f510c463472d';
