-- =====================================================
-- MIGRATION: Add pe_used_pe column with triggers
-- Eliminates global scans for PE calculations
-- =====================================================

-- 1. Add pe_used_pe column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS pe_used_pe BIGINT NOT NULL DEFAULT 0;

-- 2. Function to recalculate pe_used for a user (for initial population)
CREATE OR REPLACE FUNCTION public.recalc_user_pe_used(target_user_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stake_sum BIGINT;
  contrib_sum BIGINT;
BEGIN
  SELECT COALESCE(SUM(owner_stake_pe), 0) INTO stake_sum 
  FROM pixels WHERE owner_user_id = target_user_id;
  
  SELECT COALESCE(SUM(amount_pe), 0) INTO contrib_sum 
  FROM pixel_contributions WHERE user_id = target_user_id;
  
  RETURN stake_sum + contrib_sum;
END;
$$;

-- 3. Trigger function to update pe_used_pe on pixel changes
CREATE OR REPLACE FUNCTION public.update_pe_used_on_pixel_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_owner_id UUID;
  new_owner_id UUID;
  old_stake BIGINT;
  new_stake BIGINT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_owner_id := NEW.owner_user_id;
    new_stake := COALESCE(NEW.owner_stake_pe, 0);
    
    IF new_owner_id IS NOT NULL AND new_stake > 0 THEN
      UPDATE users SET pe_used_pe = pe_used_pe + new_stake WHERE id = new_owner_id;
    END IF;
    
  ELSIF TG_OP = 'UPDATE' THEN
    old_owner_id := OLD.owner_user_id;
    new_owner_id := NEW.owner_user_id;
    old_stake := COALESCE(OLD.owner_stake_pe, 0);
    new_stake := COALESCE(NEW.owner_stake_pe, 0);
    
    -- Same owner: just update delta
    IF old_owner_id = new_owner_id AND old_owner_id IS NOT NULL THEN
      IF new_stake != old_stake THEN
        UPDATE users SET pe_used_pe = pe_used_pe + (new_stake - old_stake) WHERE id = old_owner_id;
      END IF;
    ELSE
      -- Owner changed: decrease old, increase new
      IF old_owner_id IS NOT NULL AND old_stake > 0 THEN
        UPDATE users SET pe_used_pe = GREATEST(0, pe_used_pe - old_stake) WHERE id = old_owner_id;
      END IF;
      IF new_owner_id IS NOT NULL AND new_stake > 0 THEN
        UPDATE users SET pe_used_pe = pe_used_pe + new_stake WHERE id = new_owner_id;
      END IF;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    old_owner_id := OLD.owner_user_id;
    old_stake := COALESCE(OLD.owner_stake_pe, 0);
    
    IF old_owner_id IS NOT NULL AND old_stake > 0 THEN
      UPDATE users SET pe_used_pe = GREATEST(0, pe_used_pe - old_stake) WHERE id = old_owner_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Trigger function to update pe_used_pe on contribution changes
CREATE OR REPLACE FUNCTION public.update_pe_used_on_contribution_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_user_id UUID;
  new_user_id UUID;
  old_amount BIGINT;
  new_amount BIGINT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_user_id := NEW.user_id;
    new_amount := COALESCE(NEW.amount_pe, 0);
    
    IF new_user_id IS NOT NULL AND new_amount > 0 THEN
      UPDATE users SET pe_used_pe = pe_used_pe + new_amount WHERE id = new_user_id;
    END IF;
    
  ELSIF TG_OP = 'UPDATE' THEN
    old_user_id := OLD.user_id;
    new_user_id := NEW.user_id;
    old_amount := COALESCE(OLD.amount_pe, 0);
    new_amount := COALESCE(NEW.amount_pe, 0);
    
    -- Same user: just update delta
    IF old_user_id = new_user_id AND old_user_id IS NOT NULL THEN
      IF new_amount != old_amount THEN
        UPDATE users SET pe_used_pe = pe_used_pe + (new_amount - old_amount) WHERE id = old_user_id;
      END IF;
    ELSE
      -- User changed: decrease old, increase new
      IF old_user_id IS NOT NULL AND old_amount > 0 THEN
        UPDATE users SET pe_used_pe = GREATEST(0, pe_used_pe - old_amount) WHERE id = old_user_id;
      END IF;
      IF new_user_id IS NOT NULL AND new_amount > 0 THEN
        UPDATE users SET pe_used_pe = pe_used_pe + new_amount WHERE id = new_user_id;
      END IF;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    old_user_id := OLD.user_id;
    old_amount := COALESCE(OLD.amount_pe, 0);
    
    IF old_user_id IS NOT NULL AND old_amount > 0 THEN
      UPDATE users SET pe_used_pe = GREATEST(0, pe_used_pe - old_amount) WHERE id = old_user_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. Drop existing triggers if they exist (idempotent)
DROP TRIGGER IF EXISTS update_pe_used_on_pixel ON public.pixels;
DROP TRIGGER IF EXISTS update_pe_used_on_contribution ON public.pixel_contributions;

-- 6. Create triggers
CREATE TRIGGER update_pe_used_on_pixel
  AFTER INSERT OR UPDATE OR DELETE ON public.pixels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pe_used_on_pixel_change();

CREATE TRIGGER update_pe_used_on_contribution
  AFTER INSERT OR UPDATE OR DELETE ON public.pixel_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pe_used_on_contribution_change();

-- 7. Populate pe_used_pe for all existing users
UPDATE public.users 
SET pe_used_pe = public.recalc_user_pe_used(id)
WHERE pe_used_pe = 0;