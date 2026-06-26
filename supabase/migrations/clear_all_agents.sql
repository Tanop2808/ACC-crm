-- This script safely wipes out all agents and their related assignments/activity logs,
-- allowing you to start completely fresh without foreign-key conflicts.

-- 1. First, delete all child records that reference the agents table to avoid constraint errors
DELETE FROM public.support_activity_logs;
DELETE FROM public.cart_recovery_status;
DELETE FROM public.cart_assignments;
DELETE FROM public.agent_brand_assignments;

-- 2. Next, delete all agents from the agents table
DELETE FROM public.agents;

-- 3. Finally, clear out the agent roles from the user_roles table 
--    (so you don't get "User is already assigned a role" errors when you re-add them)
DELETE FROM public.user_roles WHERE role = 'agent';
