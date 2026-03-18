

# Rimuovere la scadenza dei pixel + ripristinare disegni admin

## Situazione attuale
- I pixel Bitplacer (Google auth) hanno un timer di 72h (`expires_at`) e un cron job che li cancella ogni 5 minuti
- L'account admin `team@bitplace.com` aveva ~77.815 pixel dipinti, tutti cancellati dal cron. **I dati individuali (coordinate + colore per pixel) non sono recuperabili dal database** — paint_events salva solo bbox aggregati, non le coordinate singole
- L'admin dovrà ridipingere i suoi disegni usando Auto-Paint

## Piano

### 1. Database: disabilitare il cron job di cleanup
- Rimuovere il cron job `pixels-cleanup-expired` (job ID 2) con `cron.unschedule`
- Aggiornare l'email admin nel DB da `team@bitplace.com` a `team@bitplace.live`
- Reset `virtual_pe_used` a 0 per l'admin (i pixel sono stati cancellati, il contatore va azzerato)

### 2. Database: pulizia colonna `expires_at` sui pixel esistenti
- `UPDATE pixels SET expires_at = NULL WHERE expires_at IS NOT NULL` (azzera eventuali timer residui)

### 3. Edge function `game-commit`: rimuovere logica expiry
- Rimuovere il calcolo di `expiresAt` (riga ~556) — sempre `null`
- Mantenere `is_virtual_stake` e `virtual_pe_cost` (servono per la meccanica "free pixel")
- Rimuovere il blocco DEFEND che pulisce `expires_at` (righe 444-458, non più necessario)

### 4. Eliminare file non più necessari
- `supabase/functions/vpe-renew/index.ts` — non serve più
- `supabase/functions/pixels-cleanup-expired/index.ts` — non serve più
- `src/hooks/useVpeRenew.ts` — non serve più

### 5. Rimuovere dal config.toml
- Rimuovere le entry `[functions.vpe-renew]` e `[functions.pixels-cleanup-expired]`

### 6. Frontend: aggiornare copy e rimuovere UI di scadenza/rinnovo

| File | Modifica |
|------|----------|
| `PixelControlPanel.tsx` | Rimuovere import/uso di `useVpeRenew`, timer, bottone renew. Aggiornare tooltip: rimuovere "expire 72h" |
| `UserMenuPanel.tsx` | Rimuovere import `useVpeRenew`, badge renewableCount, alert "Pixels expire after 72h" |
| `PixelInfoPanel.tsx` | Rimuovere blocco "Starter Pixel Expiry" (righe 448-458). Aggiornare tooltip "will expire after 72h" |
| `WalletSelectModal.tsx` | Copy: "300,000 free Pixels to draw anywhere" (rimuovere "They expire after 72h...") |
| `WalletContext.tsx` | Toast: "Free pixels to draw anywhere" (rimuovere "They expire after 72h...") |
| `RulesModal.tsx` | Aggiornare descrizioni Bitplacer e Pixel Balance: rimuovere riferimenti a 72h/expiry/renew |
| `WhitePaperModal.tsx` | Rimuovere "they expire after 72h", aggiornare flow "Paint (72h)" → "Paint" |
| `GuidedTour.tsx` | Rimuovere "They expire after 72h, but you can renew..." |
| `StatusStrip.tsx` | Tooltip: rimuovere "expire after 72h" |
| `usePixelDetails.ts` | Mantenere `expiresAt`/`isVirtualStake` nei tipi ma non mostrare expiry UI |

### 7. Pixel admin non ripristinabili
I pixel dell'account admin non possono essere ripristinati automaticamente perché il database non conserva le coordinate individuali degli eventi di paint (solo bounding box). L'admin dovrà ridipingere i disegni usando la funzionalità Auto-Paint con i template.

