
-- RPC for incrementing takeover PE counters atomically
CREATE OR REPLACE FUNCTION public.increment_takeover_pe(
  target_user_id uuid,
  def_amount bigint DEFAULT 0,
  atk_amount bigint DEFAULT 0
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  UPDATE users 
  SET 
    takeover_def_pe_total = takeover_def_pe_total + def_amount,
    takeover_atk_pe_total = takeover_atk_pe_total + atk_amount
  WHERE id = target_user_id;
$$;
