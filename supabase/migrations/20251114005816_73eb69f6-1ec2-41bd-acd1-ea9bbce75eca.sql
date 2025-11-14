-- Add admin role to existing users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email IN ('cristhianlima@gmail.com', 'cristhian.lima@ifgoiano.edu.br')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create function to auto-assign admin role to first user
CREATE OR REPLACE FUNCTION public.handle_first_user_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is the first user (user_roles table is empty)
  IF NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically assign admin to first user
DROP TRIGGER IF EXISTS on_first_user_make_admin ON public.profiles;
CREATE TRIGGER on_first_user_make_admin
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_first_user_admin();