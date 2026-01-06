-- Fix SECURITY DEFINER views by setting SECURITY INVOKER
ALTER VIEW public_pixel_owner_info SET (security_invoker = on);
ALTER VIEW public_user_profiles SET (security_invoker = on);