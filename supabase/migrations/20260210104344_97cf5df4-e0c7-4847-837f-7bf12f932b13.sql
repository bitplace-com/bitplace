
-- 1. Svuota pixel e paint events
TRUNCATE TABLE pixels RESTART IDENTITY CASCADE;
TRUNCATE TABLE paint_events RESTART IDENTITY CASCADE;
TRUNCATE TABLE pixel_contributions RESTART IDENTITY CASCADE;

-- 2. Reset contatori utente
UPDATE users SET
  pe_used_pe = 0,
  pixels_painted_total = 0,
  xp = 0,
  level = 1;
