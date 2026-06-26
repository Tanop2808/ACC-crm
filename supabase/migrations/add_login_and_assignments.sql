-- Database Migration: Authentication Roles & Agent Brand Assignments

-- 1. Create user roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text UNIQUE NOT NULL,
    role text NOT NULL CHECK (role IN ('admin', 'agent')),
    created_at timestamp without time zone DEFAULT now()
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles
DROP POLICY IF EXISTS "Allow public read access to user_roles" ON public.user_roles;
CREATE POLICY "Allow public read access to user_roles" ON public.user_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all access to user_roles for authenticated users" ON public.user_roles;
CREATE POLICY "Allow all access to user_roles for authenticated users" ON public.user_roles FOR ALL USING (true);


-- 2. Create agent brand assignments table
CREATE TABLE IF NOT EXISTS public.agent_brand_assignments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
    agent_email text NOT NULL,
    brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
    brand_name text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    UNIQUE(agent_email, brand_id)
);

-- Enable RLS on assignments
ALTER TABLE public.agent_brand_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for assignments
DROP POLICY IF EXISTS "Allow read access to assignments" ON public.agent_brand_assignments;
CREATE POLICY "Allow read access to assignments" ON public.agent_brand_assignments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all access to assignments for authenticated users" ON public.agent_brand_assignments;
CREATE POLICY "Allow all access to assignments for authenticated users" ON public.agent_brand_assignments FOR ALL USING (true);


-- 3. Enforce only @datastraw.in email signups via trigger on auth.users
CREATE OR REPLACE FUNCTION public.check_email_domain()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email NOT LIKE '%@datastraw.in' THEN
        RAISE EXCEPTION 'Only @datastraw.in emails are allowed to sign up.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS ensure_datastraw_email ON auth.users;
CREATE TRIGGER ensure_datastraw_email
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.check_email_domain();


-- 4. Seed user roles with default Admin (User's email)
INSERT INTO public.user_roles (email, role)
VALUES ('parthavi.gaikwad@datastraw.in', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';


-- 5. Seed existing brands from cart tables to public.brands
INSERT INTO public.brands (name)
SELECT DISTINCT s.brand_name
FROM (
  SELECT brand_name FROM public.shopify_acc_table WHERE brand_name IS NOT NULL
  UNION
  SELECT brand_name FROM public.shiprocket_acc_table WHERE brand_name IS NOT NULL
) s
WHERE NOT EXISTS (
  SELECT 1 FROM public.brands b WHERE b.name = s.brand_name
);


-- 6. Seed active providers to public.providers
INSERT INTO public.providers (name)
SELECT 'Shopify'
WHERE NOT EXISTS (SELECT 1 FROM public.providers WHERE name = 'Shopify');

INSERT INTO public.providers (name)
SELECT 'Shiprocket'
WHERE NOT EXISTS (SELECT 1 FROM public.providers WHERE name = 'Shiprocket');

INSERT INTO public.providers (name)
SELECT 'Gokwik'
WHERE NOT EXISTS (SELECT 1 FROM public.providers WHERE name = 'Gokwik');


-- 7. RLS Policies to allow reading/writing brands, providers, integrations, and agents
DROP POLICY IF EXISTS "Allow public read access to brands" ON public.brands;
CREATE POLICY "Allow public read access to brands" ON public.brands FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all access to brands for authenticated users" ON public.brands;
CREATE POLICY "Allow all access to brands for authenticated users" ON public.brands FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read access to providers" ON public.providers;
CREATE POLICY "Allow public read access to providers" ON public.providers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all access to providers for authenticated users" ON public.providers;
CREATE POLICY "Allow all access to providers for authenticated users" ON public.providers FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read access to integrations" ON public.integrations;
CREATE POLICY "Allow public read access to integrations" ON public.integrations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all access to integrations for authenticated users" ON public.integrations;
CREATE POLICY "Allow all access to integrations for authenticated users" ON public.integrations FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read access to agents" ON public.agents;
CREATE POLICY "Allow public read access to agents" ON public.agents FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all access to agents for authenticated users" ON public.agents;
CREATE POLICY "Allow all access to agents for authenticated users" ON public.agents FOR ALL USING (true);
