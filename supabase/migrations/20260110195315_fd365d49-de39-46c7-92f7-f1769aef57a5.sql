-- Reset completo della mappa e dei bilanci PE

-- 1. Cancella tutti i pixel
TRUNCATE TABLE pixels CASCADE;

-- 2. Cancella tutte le contribuzioni
TRUNCATE TABLE pixel_contributions;

-- 3. Cancella tutti gli eventi di paint
TRUNCATE TABLE paint_events;

-- 4. Resetta PE di tutti gli utenti al valore calcolato da wallet_usd
UPDATE users 
SET pe_total_pe = COALESCE(FLOOR(wallet_usd * 1000), 0)::bigint
WHERE true;