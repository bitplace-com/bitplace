

## Fix icona Grid3x3 + Redesign sezione Pixel Balance

### 1. Fix icona Grid3x3

Il problema: le celle 5x5 con offset asimmetrico (2px a sinistra, 3px a destra) e `shapeRendering: crispEdges` causano distorsione a 20px. 

Soluzione: riscrivere con celle 6x6, gap 2px, margine 1px simmetrico su ogni lato.

File: `src/components/icons/custom/PixelGrid3x3.tsx`

```text
Griglia perfettamente centrata in viewBox 24x24:
Celle 6x6, gap 2px, margine 1px

  x=1    x=9    x=17
y=1  [6x6]  [6x6]  [6x6]
y=9  [6x6]  [6x6]  [6x6]
y=17 [6x6]  [6x6]  [6x6]

Totale: 1 + 6 + 2 + 6 + 2 + 6 + 1 = 24 (perfetto)
```

### 2. Redesign sezione Pixel Balance nel PixelControlPanel

Cambiamenti principali:

**a) Rimuovere l'Expiration Breakdown con le righe colorate (urgent/soon/upcoming/safe)**
Non serve mostrare "Safe (48h+ left) 128" quando tutto va bene. Troppo rumore visivo.

**b) Aggiungere un timer countdown live sotto le stat box**
Un alert compatto con icona clock che mostra:
- "Next expiry in 2d 14h 32m 15s" (countdown live con `useLiveTick`)
- Sotto: contesto breve tipo "128 pixels active -- renew available after 48h"
- Se ci sono pixel urgenti (< 6h): variante rossa con "X pixels expiring soon!"

Richiede aggiungere `earliestExpiry: Date | null` al hook `useVpeRenew` (calcolato dal min di `expires_at` gia fetchato).

**c) Compattare la sezione Renew**
Rimuovere il box dedicato con titolo + paragrafo + bottone + nota. Al suo posto:
- Solo il bottone renew (full width, compatto, h-9 invece di h-11)
- Sotto il bottone: una riga di testo piccolo con il contesto ("Resets 72h timer -- available after 48h from last paint")
- Nessun titolo "Renew your painted pixels" e nessun paragrafo esplicativo

### 3. Hook useVpeRenew -- aggiungere earliestExpiry

File: `src/hooks/useVpeRenew.ts`

Nella funzione `fetchBatches`, durante il loop su `data`, tracciare il `min(expires_at)` e esporlo come `earliestExpiry: Date | null` nell'interfaccia `VpeRenewState`.

### Dettaglio tecnico per file

| File | Modifica |
|------|----------|
| `src/components/icons/custom/PixelGrid3x3.tsx` | Riscrivere 9 rect con coordinate 6x6, gap 2, margine 1 |
| `src/hooks/useVpeRenew.ts` | Aggiungere `earliestExpiry: Date \| null` alla state e al return. Calcolare durante fetchBatches |
| `src/components/modals/PixelControlPanel.tsx` | Rimuovere Expiration Breakdown. Aggiungere timer countdown compatto. Compattare sezione renew |

### Layout risultante della sezione Pixel Balance

```text
PIXEL BALANCE (brush icon)
+------------------------------------------+
| Available  |   Used    |  Active Pixels   |
| 299,872    |   128     |     128          |
+------------------------------------------+

[clock icon] Next expiry in 2d 14h 32m 15s
             128 active pixels -- renew available after 48h

[====== All pixels up to date (disabled) ======]
Resets 72h timer -- available after 48h from last paint
```

Quando ci sono pixel urgenti (< 6h):
```text
[clock icon, red] 3 pixels expiring soon!
                  Earliest in 4h 12m 3s

[====== Renew 3 Pixels (active, primary) ======]
Timer resets to 72h from now for each renewed pixel
```

