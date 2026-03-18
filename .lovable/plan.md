


# ✅ Rimuovere la scadenza dei pixel (COMPLETATO)

## Modifiche effettuate

### Database
- Disabilitato cron job `pixels-cleanup-expired` (ID 2)
- Azzerato `expires_at` su tutti i pixel esistenti
- Reset `virtual_pe_used` a 0 per l'account admin team@bitplace.live
- Rimossa funzione DB `cleanup_expired_pixels()`

### Edge Functions
- `game-commit`: rimossa logica di calcolo `expiresAt` (sempre `null` ora)
- `game-commit`: rimosso blocco DEFEND che puliva `expires_at`
- Eliminata `vpe-renew/index.ts`
- Eliminata `pixels-cleanup-expired/index.ts`

### Frontend
- Eliminato `useVpeRenew.ts`
- Rimossi tutti i riferimenti a 72h, expiry, renew da: PixelControlPanel, UserMenuPanel, StatusStrip, PixelInfoPanel, WalletSelectModal, WalletContext, RulesModal, WhitePaperModal, GuidedTour, ActionBox
- Copy aggiornato: i pixel gratuiti non scadono più, tornano al budget solo quando qualcuno ci dipinge sopra

### Nota
I pixel dell'admin non sono ripristinabili (le coordinate individuali non sono salvate nei paint_events). L'admin dovrà ridipingerli con Auto-Paint.
