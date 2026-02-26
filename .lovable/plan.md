

## Fix: Pixel VPE non mostra 0 PE e countdown

### Problema
Quando un utente Google dipinge con VPE, i pixel risultano con `is_virtual_stake = false` e `owner_stake_pe = 1` nel database, invece di `is_virtual_stake = true`, `owner_stake_pe = 0` e `expires_at` impostato a 72h. Di conseguenza l'ispettore mostra "1 PE" invece di "0 PE" e manca il timer di scadenza.

### Causa
In `game-commit/index.ts`, la funzione `executeCommit` accetta il parametro `isVirtualPe`, ma il chiamante principale (linea 1239) non lo passa mai. Il flag viene determinato correttamente in `game-validate`, ma `game-commit` non lo calcola autonomamente.

### Soluzione
Aggiungere la determinazione automatica di `isVirtualPe` nel handler principale di `game-commit`, basandosi su `user.auth_provider` e `user.wallet_address` (stessa logica usata in `game-validate`).

### File da modificare

| File | Modifica |
|------|----------|
| `supabase/functions/game-commit/index.ts` | Calcolare `isVirtualPe` dai dati utente e passarlo a `executeCommit` (sia streaming che non-streaming) |

### Dettaglio tecnico

**Dopo la riga 1107** (dopo il fetch dell'utente), aggiungere:
```typescript
const isVirtualPe = user.auth_provider === 'google' || 
  (user.auth_provider === 'both' && !user.wallet_address);
```

**Riga 1239-1249** (chiamata `executeCommit` non-streaming): aggiungere `requestedColorMap, undefined, isVirtualPe` come ultimi parametri.

**Riga 935** (chiamata `executeCommit` streaming): aggiungere il parametro `isVirtualPe` anche qui, calcolandolo dai dati utente passati alla funzione.

Questo farà si che i pixel dipinti da utenti Google-only vengano salvati con `owner_stake_pe: 0`, `is_virtual_stake: true` e `expires_at` a +72h, permettendo all'ispettore di mostrare correttamente "0 PE" e il countdown di scadenza.

