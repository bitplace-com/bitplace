

## VPE One-Click Renewal + Pixel Control Panel

### Panoramica

Aggiungiamo un sistema di rinnovo VPE con un click e un pannello di controllo completo per Pixel, PE e VPE accessibile dal menu utente. Il pannello mostra breakdown delle scadenze VPE in batch temporali e permette il rinnovo batch. Aggiorniamo anche la documentazione "How It Works".

---

### 1. Edge Function: `vpe-renew`

**File**: `supabase/functions/vpe-renew/index.ts` (nuovo)

- Autenticazione via `getClaims()` (stesso pattern delle altre funzioni)
- Soglia di rinnovo: pixel con `expires_at < now() + interval '24 hours'` (almeno 48h trascorse delle 72h originali)
- Query batch:
  ```sql
  UPDATE pixels 
  SET expires_at = now() + interval '72 hours', updated_at = now() 
  WHERE owner_user_id = $uid 
    AND is_virtual_stake = true 
    AND expires_at IS NOT NULL 
    AND expires_at < now() + interval '24 hours'
  ```
- Ritorna `{ ok: true, renewed: N }`
- Aggiunge entry in `supabase/config.toml`: `[functions.vpe-renew] verify_jwt = false`

### 2. Hook: `useVpeRenew`

**File**: `src/hooks/useVpeRenew.ts` (nuovo)

- Accetta `userId`
- Espone:
  - `expiringBatches`: oggetto con conteggi per finestra temporale:
    - `urgent` (< 6h rimanenti)
    - `soon` (6-24h rimanenti) 
    - `upcoming` (24-48h rimanenti -- non ancora rinnovabili)
    - `safe` (48h+ rimanenti)
  - `renewableCount`: somma di `urgent + soon` (quelli con < 24h rimanenti)
  - `totalVpePixels`: totale pixel VPE attivi
  - `isRenewing`, `renewAll()`, `isLoading`
- Query via `supabase.from('pixels').select('expires_at')` filtrata per `owner_user_id = userId` e `is_virtual_stake = true`
- Calcola i batch lato client raggruppando per differenza tra `expires_at` e `now()`
- Polling ogni 60s
- `renewAll()` invoca `vpe-renew` e mostra toast di conferma

### 3. Pixel Control Panel

**File**: `src/components/modals/PixelControlPanel.tsx` (nuovo)

Modal `GamePanel` con le seguenti sezioni:

**A. Pixel Overview** (sempre visibile)
- Grid 2x2 StatCard: Pixels Owned, PE Staked, Total Value, Pixels Painted

**B. PE (Paint Energy)** (visibile per wallet users, valori 0 per chi non ha wallet)
- PE Total, PE Available, PE Used
- Info contestuale: "Your PE comes from the $ value of $BIT in your wallet. 1 PE = $0.001."
- Se PE = 0: hint "Connect a wallet and add $BIT to get PE"
- Se rebalance attivo: warning con health %, tempo rimasto, deficit

**C. VPE (Virtual Paint Energy)** (visibile per google/both users, oppure con valori 0 e spiegazione)
- VPE Available, VPE Used, Total VPE Pixels
- **Expiration Breakdown** con batch colorati:
  - Rosso pulsante: "X pixels expiring in < 6h" (urgente)
  - Arancione: "X pixels expiring in 6-24h" (presto, rinnovabili)
  - Giallo: "X pixels expiring in 24-48h" (non ancora rinnovabili)
  - Verde: "X pixels safe (48h+ remaining)"
- **Renew Button**: "Renew X VPE Pixels" con icona refresh
  - Sotto: "Resets the 72h timer. Available for pixels with 48h+ elapsed."
  - Disabilitato quando `renewableCount === 0`: "All VPE pixels up to date"
- Info: "VPE pixels expire after 72h. After 48h you can renew all at once -- no need to repaint."

**D. Collateralization** (visibile per wallet users con pixel)
- Grace period status: "X days remaining" oppure "Expired -- decay active"
- Health multiplier se in decay
- Info: "Your pixel stakes stay valid for 7 days after your last wallet check. After that, stakes decay over 72h to a floor of 1 PE per pixel. Log in to reset."

**E. Active Stakes** (visibile per wallet users)
- DEF Total, ATK Total

Per sezioni non applicabili all'utente: valori 0 con spiegazione contestuale (es. "Sign in with Google to get free VPE" oppure "Connect a wallet to earn PE").

### 4. Integrazione nel UserMenuPanel

**File**: `src/components/modals/UserMenuPanel.tsx` (modifica)

- Aggiungere stato `pixelControlOpen` e import di `PixelControlPanel`
- Nuovo bottone "Pixel Control" con icona `grid3x3` tra "Leaderboard" e "Settings"
- Se `renewableCount > 0`: badge dot arancione sul bottone
- Aggiungere `useVpeRenew` hook per il conteggio badge
- Montare `<PixelControlPanel>` come modal

### 5. Alert VPE nella StatusStrip

**File**: `src/components/map/StatusStrip.tsx` (modifica)

- Quando ci sono pixel VPE urgenti (< 6h): chip ambra con icona clock
- Testo: "X VPE expiring" 
- Click dispatcha evento custom per aprire il Pixel Control Panel

### 6. Aggiornamento RulesModal

**File**: `src/components/modals/RulesModal.tsx` (modifica)

Aggiornamenti:

- **Sezione VPE**: aggiungere bullet "After 48h you can renew all your VPE pixels at once from Pixel Control -- no need to repaint"
- **Sezione Decay**: aggiornare con nuovi parametri:
  - "Your pixel stakes stay valid for 7 days after your last wallet verification. If you don't reconnect within 7 days, stakes gradually decay over 72h to a minimum of 1 PE per pixel. DEF and ATK contributions are not affected. Log in to reset the timer."
- **Nuova sezione Collateralization** dopo Decay:
  - Spiega grace period 7 giorni, decay lineare 72h, floor 1 PE, check solo al login
- **Quick Reference**: aggiungere entry "VPE Renew" e "Grace Period"

---

### File coinvolti

| File | Azione |
|------|--------|
| `supabase/functions/vpe-renew/index.ts` | Nuovo -- edge function rinnovo batch |
| `supabase/config.toml` | Aggiungere entry vpe-renew (automatico) |
| `src/hooks/useVpeRenew.ts` | Nuovo -- hook conteggio batch + rinnovo |
| `src/components/modals/PixelControlPanel.tsx` | Nuovo -- pannello di controllo completo |
| `src/components/modals/UserMenuPanel.tsx` | Aggiungere bottone Pixel Control + badge |
| `src/components/map/StatusStrip.tsx` | Aggiungere chip alert VPE expiring soon |
| `src/components/modals/RulesModal.tsx` | Aggiornare VPE, Decay, aggiungere Collateralization |

