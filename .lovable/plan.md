

## Sistemazione Pannello Info Pixel (VPE)

### Modifiche al file `src/components/map/PixelInfoPanel.tsx`

**1. Rinomina le 3 stat dell'owner + aggiunta titolino "Overview"**
- "Pixels" → "Total Pixels Painted"
- "VPE Staked" / "PE Staked" → "Total PE Staked" (sempre icona PE, mai VPE)
- "Value" → "Total PE Value"
- Sopra queste 3 stat, aggiungere un titolino centrato "Overview" in `text-[10px] uppercase tracking-wider text-muted-foreground text-center`

**2. Aggiunta titolino "In this pixel" prima della sezione economia**
- Prima del box `bg-muted/70` con Owner Stake / Total Stake / DEF / ATK, aggiungere titolino centrato "In this pixel" stesso stile

**3. Rinomina etichette economia pixel**
- "VPE Owner Stake" → "PE Owner Stake" (sempre icona PE)
- "VPE Total Stake" → "PE Total Stake" (sempre icona PE)
- I valori restano 0 per pixel VPE, ma l'icona e il prefisso sono sempre PE

**4. Timer countdown con secondi**
- Sostituire la funzione locale `formatTimeUntil` con import di `useLiveTick` e `formatLiveCountdown` da `src/hooks/useLiveTick.ts` e `src/lib/formatLiveTime.ts`
- Usare `useLiveTick()` nel componente per aggiornare ogni secondo
- Applicare a: timer scadenza VPE, timer next tick rebalance

**5. Rework alert scadenza VPE**
- Rimuovere la label "VPE Pixel" a sinistra
- Al suo posto mostrare: icona clock + "Expires in 71h 58m 32s" (live con secondi)
- Testo sotto: "This pixel has no PE staked, so it will expire when the timer runs out. Until then, anyone can paint over it for free."

### Dettaglio tecnico

Tutte le modifiche sono nel singolo file `src/components/map/PixelInfoPanel.tsx`:

- Import `useLiveTick` e `formatLiveCountdown`
- Aggiungere `const now = useLiveTick()` nel componente
- Rimuovere la funzione locale `formatTimeUntil` (sostituita da `formatLiveCountdown`)
- Le 6 modifiche puntuali sopra elencate nelle sezioni Owner Stats, Pixel Economy, e Starter Pixel Expiry

