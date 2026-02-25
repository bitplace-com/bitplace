
-- Fix SECURITY DEFINER views by setting security_invoker = true
ALTER VIEW public.public_pixel_owner_info SET (security_invoker = true);
ALTER VIEW public.public_user_profiles SET (security_invoker = true);
