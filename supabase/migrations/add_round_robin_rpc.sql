-- Creates the table to track whose turn it is to receive a cart for each brand
CREATE TABLE IF NOT EXISTS public.brand_round_robin_state (
    brand_id UUID PRIMARY KEY REFERENCES public.brands(id) ON DELETE CASCADE,
    last_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Atomic RPC function to assign a cart using a thread-safe row-level lock
CREATE OR REPLACE FUNCTION public.assign_cart_round_robin(
    p_brand_id UUID,
    p_cart_id UUID,
    p_provider_table TEXT
) RETURNS UUID AS $$
DECLARE
    v_agents UUID[];
    v_last_agent UUID;
    v_next_agent UUID;
    v_index INT;
    v_agent_name TEXT;
BEGIN
    -- 1. Ensure a state row exists, then lock it exclusively for this transaction
    INSERT INTO public.brand_round_robin_state (brand_id) 
    VALUES (p_brand_id) 
    ON CONFLICT (brand_id) DO NOTHING;

    SELECT last_agent_id INTO v_last_agent 
    FROM public.brand_round_robin_state 
    WHERE brand_id = p_brand_id 
    FOR UPDATE;

    -- 2. Get all agents assigned to this brand in a deterministic order
    SELECT array_agg(agent_id ORDER BY created_at ASC) INTO v_agents
    FROM public.agent_brand_assignments
    WHERE brand_id = p_brand_id;

    -- If no agents are assigned to the brand, gracefully exit
    IF v_agents IS NULL OR array_length(v_agents, 1) = 0 THEN
        RETURN NULL;
    END IF;

    -- 3. Determine the next agent using Round Robin arithmetic
    IF v_last_agent IS NULL THEN
        v_next_agent := v_agents[1];
    ELSE
        -- Find index of v_last_agent in the array
        v_index := array_position(v_agents, v_last_agent);
        IF v_index IS NULL THEN
            v_next_agent := v_agents[1]; -- If last agent was unassigned from brand, start over
        ELSIF v_index = array_length(v_agents, 1) THEN
            v_next_agent := v_agents[1]; -- Reached the end, wrap around to first agent
        ELSE
            v_next_agent := v_agents[v_index + 1]; -- Next agent in line
        END IF;
    END IF;

    -- 4. Update the state tracker
    UPDATE public.brand_round_robin_state
    SET last_agent_id = v_next_agent, updated_at = NOW()
    WHERE brand_id = p_brand_id;

    -- 5. Fetch the agent's name for denormalization
    SELECT name INTO v_agent_name FROM public.agents WHERE id = v_next_agent;

    -- 6. Dynamically update the specific provider table (e.g. shopify_acc_table)
    EXECUTE format('
        UPDATE public.%I 
        SET agent_id = $1, agent_name = $2, assignment_status = ''ASSIGNED'' 
        WHERE id = $3
    ', p_provider_table)
    USING v_next_agent, v_agent_name, p_cart_id;

    -- 7. Log the assignment in the central cart_assignments tracker
    INSERT INTO public.cart_assignments (cart_id, agent_id, status)
    VALUES (p_cart_id, v_next_agent, 'active')
    ON CONFLICT (cart_id, agent_id) DO NOTHING;

    RETURN v_next_agent;
END;
$$ LANGUAGE plpgsql;
