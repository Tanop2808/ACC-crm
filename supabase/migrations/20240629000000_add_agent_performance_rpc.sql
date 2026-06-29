-- Create function to aggregate agent performance metrics
CREATE OR REPLACE FUNCTION public.get_agent_performance()
RETURNS TABLE (
    agent_id UUID,
    agent_name TEXT,
    agent_email TEXT,
    total_carts BIGINT,
    recovered_carts BIGINT,
    recovered_revenue NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH cart_stats AS (
        SELECT 
            c.agent_id,
            COUNT(*) as total_carts,
            COUNT(*) FILTER (WHERE c.current_status = 'completed' OR c.cart_status = 'RECOVERED') as recovered_carts,
            COALESCE(SUM(c.cart_value) FILTER (WHERE c.current_status = 'completed' OR c.cart_status = 'RECOVERED'), 0) as recovered_revenue
        FROM public.abandon_cart_master c
        WHERE c.agent_id IS NOT NULL
        GROUP BY c.agent_id
    )
    SELECT 
        a.id as agent_id,
        a.name as agent_name,
        a.email as agent_email,
        COALESCE(cs.total_carts, 0) as total_carts,
        COALESCE(cs.recovered_carts, 0) as recovered_carts,
        COALESCE(cs.recovered_revenue, 0) as recovered_revenue
    FROM public.agents a
    LEFT JOIN cart_stats cs ON a.id = cs.agent_id
    WHERE a.status = 'active'
    ORDER BY (COALESCE(cs.recovered_carts, 0)::FLOAT / NULLIF(COALESCE(cs.total_carts, 0), 0)) DESC NULLS LAST, COALESCE(cs.recovered_revenue, 0) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
