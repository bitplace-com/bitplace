

# Fix: Icona Template, Discord e Calcolo PE

## Problemi Identificati

### 1. Icona Template (`PixelImage.tsx`)
Il componente `PixelImage` usa un SVG personalizzato (montagne/paesaggio) disegnato a mano, **non** l'SVG ufficiale HackerNoon `image-solid`. Va sostituito il path con quello della libreria HackerNoon.

### 2. Icona Discord mancante nel pannello pixel
La query in `usePixelDetails.ts` (riga 166) **non include `social_discord`** nel campo `select`:
```
.select('... bio, social_x, social_instagram, social_website')
```
Manca `social_discord`, quindi il valore e sempre `undefined` e l'icona Discord non appare nel pannello info pixel. La colonna esiste nella view `public_pixel_owner_info` (verificato nel DB).

### 3. Calcolo PE Staked errato
Il codice (righe 207-219) recupera **tutte le righe** dei pixel dell'utente e le somma lato client. L'utente attuale ha **2412 pixel**, ma Supabase ha un **limite di 1000 righe per query**. Risultato: il calcolo tronca a 1000 righe, mostrando un valore PE errato.

Soluzione: usare `COUNT(*)` e `SUM(owner_stake_pe)` tramite una funzione RPC SQL, come indicato dalle best practice del progetto.

---

## Piano di Implementazione

### File 1: `src/components/icons/custom/PixelImage.tsx`
Sostituire l'intero SVG con il path ufficiale HackerNoon `image-solid`:
- Polygon per la parte inferiore (montagne/terra)
- Path per la parte superiore (cielo/sole)
- Rect trasparente di background

### File 2: `src/hooks/usePixelDetails.ts`
**Riga 166**: Aggiungere `social_discord` alla stringa di select:
```
.select('... social_x, social_instagram, social_discord, social_website')
```

**Righe 207-219**: Sostituire le due query separate (pixels + contributions) con una singola chiamata RPC che usa `SUM()` e `COUNT()` lato database, evitando il limite di 1000 righe.

### File 3: Migrazione SQL
Creare una funzione RPC `get_user_total_staked_pe(uid)` che restituisce:
- `pixel_stake_total`: `SUM(owner_stake_pe)` dalla tabella `pixels`
- `contribution_total`: `SUM(amount_pe)` dalla tabella `pixel_contributions`

In una singola query aggregata, senza limiti di righe.

---

## Riepilogo File

| File | Azione |
|------|--------|
| `src/components/icons/custom/PixelImage.tsx` | Sostituire SVG con HackerNoon `image-solid` |
| `src/hooks/usePixelDetails.ts` | Aggiungere `social_discord` al select + usare RPC per PE |
| Migrazione SQL | Creare funzione `get_user_total_staked_pe` |

