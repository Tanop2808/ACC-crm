CREATE OR REPLACE FUNCTION public.handle_agent_brand_unassignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Update Shopify carts: Unassign open/pending carts only
    UPDATE public.shopify_acc_table
    SET agent_id = NULL,
        agent_name = NULL,
        assignment_status = 'UNASSIGNED',
        updated_at = NOW()
    WHERE brand_id = OLD.brand_id
      AND agent_id = OLD.agent_id
      AND (current_status IN ('calls', 'attempted', 'interested') OR current_status IS NULL);

    -- Update Shiprocket carts: Unassign open/pending carts only
    UPDATE public.shiprocket_acc_table
    SET agent_id = NULL,
        agent_name = NULL,
        assignment_status = 'UNASSIGNED',
        updated_at = NOW()
    WHERE brand_id = OLD.brand_id
      AND agent_id = OLD.agent_id
      AND (current_status IN ('calls', 'attempted', 'interested') OR current_status IS NULL);

    -- Also update the central cart assignments tracker (if used)
    UPDATE public.cart_assignments
    SET status = 'unassigned',
        updated_at = NOW()
    WHERE agent_id = OLD.agent_id
      AND status = 'active'
      AND cart_id IN (
          SELECT id FROM public.shopify_acc_table WHERE brand_id = OLD.brand_id
          UNION ALL
          SELECT id FROM public.shiprocket_acc_table WHERE brand_id = OLD.brand_id
      );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;
