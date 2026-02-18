

# Fix: Tre Bug da Correggere

## Bug 1: Spacebar riattiva il bottone nella MapToolbar

**Causa**: Quando clicchi su un bottone della toolbar (Paint, Defend, Attack, Reinforce), il browser sposta il focus su quel bottone. Premendo la spacebar, il browser "clicca" automaticamente l'elemento con focus -- comportamento standard HTML.

**Soluzione**: Aggiungere `onMouseDown={(e) => e.preventDefault()}` sui `ToggleGroupItem` nella `MapToolbar`, come gia fatto nell'`ActionTray`. Questo impedisce al click di spostare il focus sul bottone.

**File**: `src/components/map/MapToolbar.tsx`
- Aggiungere `onMouseDown={(e) => e.preventDefault()}` a tutti i `ToggleGroupItem` (sia mobile che desktop)
- Aggiungere lo stesso anche al bottone di expand/collapse

---

## Bug 2: Data di iscrizione sempre uguale a "oggi"

**Causa**: Il hook `usePlayerProfile` cerca `created_at` dalla tabella `users`, ma questa tabella ha la sicurezza attiva (RLS) senza alcuna policy di lettura. Risultato: la query dal browser ritorna `null`. Il codice ha un fallback:

```text
joinedAt: (userExtra as any)?.created_at || new Date().toISOString()
```

Siccome `userExtra` e sempre `null`, la data diventa sempre quella di oggi.

**Soluzione**: Eliminare la query diretta alla tabella `users` e ottenere `created_at` dalla view `public_user_profiles`, aggiungendo la colonna `created_at` a questa view tramite migrazione DB. In alternativa, possiamo aggiungere `created_at` alla view `public_pixel_owner_info`.

**File e modifiche**:
1. **Migrazione DB**: Ricreare la view `public_user_profiles` includendo `created_at`
2. **`src/hooks/usePlayerProfile.ts`**: Rimuovere la query separata a `users`, prendere `created_at` dalla prima query su `public_user_profiles`, e prendere `wallet_address` e `pe_used_pe` dalla view `public_pixel_owner_info` (che gia espone bio/socials). In questo modo si eliminano query inutili e si evita il problema RLS.

---

## Bug 3: Card utente su mobile si chiude da sola

**Causa**: Il `MobileWalletButton` ha due meccanismi di chiusura che interferiscono:

1. **Timer di 5 secondi**: appena si espande, parte un countdown che lo richiude
2. **Click outside**: un listener su `pointerdown` chiude il pannello se il click avviene fuori dal `containerRef`

Il problema principale: quando clicchi sul `WalletButton` espanso, si apre il `UserMenuPanel` (un Popover di Radix). Il contenuto del Popover viene renderizzato in un **portale** fuori dal DOM del `containerRef`. Quindi qualsiasi click dentro il popover viene rilevato come "click esterno" e chiude tutto.

Inoltre il timer di 5 secondi non viene resettato quando l'utente interagisce con il contenuto.

**Soluzione**:
- Nel listener `pointerdown` del `MobileWalletButton`, verificare che il click non sia dentro un elemento con `[data-radix-popper-content-wrapper]` (il portale del Popover), cosi il popover non chiude il pannello
- Rimuovere o allungare significativamente il timer auto-collapse (o disattivarlo quando il popover e aperto)

**File**: `src/components/wallet/MobileWalletButton.tsx`

---

## Riepilogo file coinvolti

| File | Modifica |
|------|----------|
| `src/components/map/MapToolbar.tsx` | `onMouseDown preventDefault` sui bottoni |
| `src/hooks/usePlayerProfile.ts` | Rimuovere query a `users`, usare le view pubbliche |
| Migrazione DB | Aggiungere `created_at` alla view `public_user_profiles` |
| `src/components/wallet/MobileWalletButton.tsx` | Fix click-outside e auto-collapse timer |

