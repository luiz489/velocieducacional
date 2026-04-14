
-- Function to bootstrap first admin when no admin exists
CREATE OR REPLACE FUNCTION public.bootstrap_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only works if there are no admins yet
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN false;
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Also add staff role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'staff')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN true;
END;
$$;
