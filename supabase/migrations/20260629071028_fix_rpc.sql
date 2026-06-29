ALTER TABLE public.cart_assignments ADD CONSTRAINT cart_assignments_cart_id_agent_id_key UNIQUE (cart_id, agent_id);
