

# Fix Settings: Form Reset Bug + Stabilizzazione

## Bug identificato

Il problema principale e' nel `useEffect` di `SettingsModal.tsx` (riga 57-69):

```
useEffect(() => {
  if (open) {
    setDisplayName(settings.display_name);
    setCountryCode(settings.country_code);
    // ... reset all fields
  }
}, [open, settings]);  // <-- BUG: settings come dipendenza
```

L'oggetto `settings` in `useSettings.ts` (righe 164-173) viene **ricreato ad ogni render** perche' e' un object literal nel return. Ogni volta che l'utente digita una lettera nel campo username, il componente ri-renderizza, `useSettings()` ritorna un nuovo oggetto `settings` (stesso contenuto, nuova reference), il `useEffect` scatta, e **resetta tutti i campi al valore originale**. Per questo sembra che non si possa scrivere: ogni tasto premuto resetta il campo.

Stesso problema per il paese: l'utente lo seleziona, il componente ri-renderizza, l'effect resetta `countryCode` al valore precedente.

## Fix

### File 1: `src/hooks/useSettings.ts`

Memoizzare l'oggetto `settings` con `useMemo` cosi' che la reference rimanga stabile finche' i dati dell'utente non cambiano davvero.

```ts
import { useState, useCallback, useMemo } from 'react';
```

Sostituire l'oggetto literal nel return con:

```ts
const settings = useMemo(() => ({
  display_name: user?.display_name || '',
  country_code: user?.country_code || null,
  avatar_url: user?.avatar_url || null,
  bio: user?.bio || null,
  social_x: user?.social_x || null,
  social_instagram: user?.social_instagram || null,
  social_website: user?.social_website || null,
}), [
  user?.display_name,
  user?.country_code,
  user?.avatar_url,
  user?.bio,
  user?.social_x,
  user?.social_instagram,
  user?.social_website,
]);
```

E nel return rimuovere le cast `(user as any)` dato che il tipo `User` include gia' `bio`, `social_x`, ecc.

### File 2: nessuna modifica necessaria

`SettingsModal.tsx` e `WalletContext.tsx` vanno bene cosi'. Una volta che `settings` ha una reference stabile, il `useEffect` non scattera' piu' ad ogni keystroke.

## Risultato atteso

- L'utente puo' digitare liberamente nel campo username
- La selezione del paese resta visibile e viene salvata
- Il form si resetta solo quando il modal si apre o quando i dati utente cambiano davvero (es. dopo un salvataggio)

