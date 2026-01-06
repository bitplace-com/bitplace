-- 1. Add denormalized columns to pixels table
ALTER TABLE pixels 
  ADD COLUMN IF NOT EXISTS def_total BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS atk_total BIGINT NOT NULL DEFAULT 0;

-- 2. Create function to recompute totals for a pixel
CREATE OR REPLACE FUNCTION update_pixel_contribution_totals()
RETURNS TRIGGER AS $$
DECLARE
  target_pixel_id BIGINT;
  new_def_total BIGINT;
  new_atk_total BIGINT;
BEGIN
  -- Determine which pixel_id to update
  IF TG_OP = 'DELETE' THEN
    target_pixel_id := OLD.pixel_id;
  ELSE
    target_pixel_id := NEW.pixel_id;
  END IF;
  
  -- Recompute sums from contributions
  SELECT 
    COALESCE(SUM(CASE WHEN side = 'DEF' THEN amount_pe ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN side = 'ATK' THEN amount_pe ELSE 0 END), 0)
  INTO new_def_total, new_atk_total
  FROM pixel_contributions
  WHERE pixel_id = target_pixel_id;
  
  -- Update pixels table
  UPDATE pixels 
  SET 
    def_total = new_def_total,
    atk_total = new_atk_total,
    updated_at = now()
  WHERE id = target_pixel_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Create trigger on pixel_contributions
DROP TRIGGER IF EXISTS trg_update_pixel_totals ON pixel_contributions;
CREATE TRIGGER trg_update_pixel_totals
  AFTER INSERT OR UPDATE OR DELETE ON pixel_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_pixel_contribution_totals();

-- 4. Backfill existing data (initialize totals from current contributions)
UPDATE pixels p
SET 
  def_total = COALESCE((
    SELECT SUM(amount_pe) FROM pixel_contributions 
    WHERE pixel_id = p.id AND side = 'DEF'
  ), 0),
  atk_total = COALESCE((
    SELECT SUM(amount_pe) FROM pixel_contributions 
    WHERE pixel_id = p.id AND side = 'ATK'
  ), 0);