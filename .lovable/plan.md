

## Fix: Performance Pixel Guide + Trial Mode azioni (Erase/Defend/Attack/Reinforce)

### Problema 1: Pixel Guide si blocca/crasha quando si cambia scala

**Perche succede:**
Ogni volta che muovi lo slider "Scale", il valore cambia (step=1, range 1-400), e per OGNI singolo valore viene ricalcolata la quantizzazione completa dell'immagine. Anche con il batching asincrono attuale, la quantizzazione di 250.000 pixel x 63 colori palette = ~15M confronti per OGNI tick dello slider. Se muovi lo slider velocemente, si accumulano decine di quantizzazioni in parallelo che competono per il main thread.

**Soluzione - 3 interventi:**

**A) Debounce dello slider Scale in Pixel Guide mode**
In `TemplateDetailView.tsx`, quando il template e in modalita `pixelGuide`, il cambio di scala viene ritardato (debounced) di 300ms. Lo slider mostra il valore in tempo reale ma la quantizzazione parte solo quando smetti di muoverlo.

**B) Debounce della quantizzazione in TemplateOverlay**
In `TemplateOverlay.tsx`, aggiungere un debounce di 300ms sull'effect che lancia `quantizeImageAsync`. Se la scala cambia di nuovo entro 300ms, la quantizzazione precedente viene cancellata e riparte. Questo impedisce accumulo di quantizzazioni.

**C) Ridurre MAX_GUIDE_PIXELS**
In `paletteQuantizer.ts`, ridurre `MAX_GUIDE_PIXELS` da 250.000 a 100.000. Per una guida pixel non serve altissima risoluzione - 316x316 e piu che sufficiente per colorare. Questo riduce il lavoro di ~60%.

---

### Problema 2: Trial Mode - Erase/Defend/Attack/Reinforce non funzionano

**Perche succede:**
`trialValidate` controlla la proprieta dei pixel interrogando il DATABASE reale (RPC `fetch_pixels_by_coords`). Ma i pixel disegnati in trial mode vengono salvati solo nella cache locale (`addPixels` aggiorna `useSupabasePixels` in memoria), non nel database. Quindi quando fai Erase su un pixel che hai appena disegnato in trial, il DB dice "non esiste" e `trialValidate` lo segna come "Not your pixel".

**Soluzione:**
Modificare `trialValidate` per controllare PRIMA la cache locale dei pixel trial. Se un pixel esiste nella cache locale con il colore dell'utente trial, viene considerato "di proprieta dell'utente trial" indipendentemente da cosa dice il database.

In `BitplaceMap.tsx`:
- `trialValidate` ricevera accesso a `localPixels` (dallo `usePixelStore`) e ai `dbPixels` in cache
- Per ogni pixel, prima controlla se esiste nei `localPixels` (= disegnato in trial) -> lo considera "owned by trial user"
- Se non e nei localPixels, controlla il DB come prima

Logica aggiornata per ERASE:
```text
Per ogni pixel:
  Se pixel in localPixels -> valido (owned by trial)
  Se pixel in DB e owner == TRIAL_USER_ID -> valido
  Altrimenti -> invalid "Not your pixel"
```

Stessa logica per REINFORCE (richiede ownership) e DEFEND/ATTACK (richiede NON-ownership).

---

### Problema 3: Persistenza dei pixel trial al reload (NON implementato)

I pixel disegnati in trial sono in memoria (`usePixelStore` e `useSupabasePixels` cache). Al reload della pagina spariscono.

**Soluzione:**
Salvare i pixel trial in `localStorage` sotto una chiave dedicata (`bitplace_trial_pixels`). Al caricamento, se `isTrialMode` e attivo, ripristinare i pixel dalla cache locale.

In `BitplaceMap.tsx`:
- Dopo ogni commit trial (PAINT), salvare i pixel in `localStorage`
- Dopo ERASE trial, rimuovere i pixel dal `localStorage`
- Al mount, se `isTrialMode`, caricare i pixel dal `localStorage` e applicarli con `addPixels`
- Quando l'utente collega un wallet vero (`exitTrialMode`), cancellare `localStorage` trial

Struttura dati in localStorage:
```text
bitplace_trial_pixels = [
  { x: 100, y: 200, color: "#FF0000" },
  { x: 101, y: 200, color: "#00FF00" },
  ...
]
```

Limite: max 10.000 pixel salvati per evitare problemi di storage.

---

### Riepilogo modifiche

| File | Modifica |
|------|----------|
| `TemplateDetailView.tsx` | Debounce 300ms sullo slider Scale in pixel guide mode |
| `TemplateOverlay.tsx` | Debounce 300ms sull'effect di quantizzazione + cancellazione |
| `paletteQuantizer.ts` | Ridurre MAX_GUIDE_PIXELS da 250k a 100k |
| `BitplaceMap.tsx` | `trialValidate` controlla cache locale per ownership + persistenza trial pixels in localStorage |
| `WalletContext.tsx` | `exitTrialMode` cancella `bitplace_trial_pixels` da localStorage |

### Cosa NON cambia
- La logica di rendering canvas resta invariata
- Le edge functions e il database non vengono toccati
- Il flusso per utenti autenticati (non trial) resta identico
- `handleConfirm` trial gia implementato resta invariato (funziona gia, il problema era solo nella validazione)

