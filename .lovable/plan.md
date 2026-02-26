

## Miglioramenti Pixel Control Panel + Live Counters

### Cosa cambia

1. **Rimuovere Leaderboard dal menu utente** -- il bottone "Leaderboard" e il relativo stato/modal vengono rimossi da `UserMenuPanel.tsx`

2. **Ristrutturare il Pixel Control Panel** in due sole sezioni: VPE (prima) e PE (dopo), rimuovendo la sezione Overview e riorganizzando Collateralization e Active Stakes dentro la sezione PE

3. **Aggiungere tooltip** a tutti i termini tecnici nel pannello (PE, VPE, PE Staked, DEF, ATK, Grace Period, Health, Decay, ecc.)

4. **Migliorare copy e spiegazioni** della sezione VPE rinnovo: rendere chiaro che "i pixel che hai gia disegnato con VPE possono essere rinnovati con un click senza ridisegnarli" e spiegare la meccanica scadenza/rinnovo in modo diretto

5. **Live counter con minuti e secondi** ovunque ci sia un timer nel sito -- aggiorna ogni secondo, non ogni minuto

### Dettaglio tecnico

#### File: `src/lib/formatLiveTime.ts` (nuovo)
Utility condivisa per formattare timer live con giorni/ore/minuti/secondi:
```
formatLiveCountdown(targetDate: Date): string
  -> "2d 5h 32m 18s" | "5h 12m 45s" | "32m 18s" | "18s" | "expired"
```
Usata da tutti i componenti che mostrano countdown.

#### File: `src/hooks/useLiveTick.ts` (nuovo)
Hook che restituisce un `now` timestamp aggiornato ogni secondo tramite `setInterval(1000)`. I componenti che lo usano si re-rendereranno ogni secondo per mostrare il countdown live:
```typescript
export function useLiveTick(): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
```

#### File: `src/components/modals/PixelControlPanel.tsx` (riscrittura)
- Rimuovere sezione "Overview" (StatBox Pixels Owned, PE Staked, Total Value, Pixels Painted)
- Riordinare: **VPE prima**, **PE dopo**
- Sezione VPE:
  - Titolo con tooltip che spiega cos'e VPE
  - Stats: VPE Available, VPE Used, Active VPE Pixels (tutti con tooltip)
  - Expiration Breakdown: ogni riga mostra il conteggio + tooltip che spiega la fascia
  - **Sezione rinnovo migliorata**: box dedicato con titolo "Renew your painted pixels", copy chiara: "Your VPE pixels expire 72h after painting. Once 48h have passed, you can reset the timer for all of them at once -- no need to repaint each one."
  - Bottone Renew con conteggio
  - Sotto il bottone: nota "Timer resets to 72h from now for each renewed pixel"
  - Tutti i timer nell'expiration breakdown mostrano live countdown con secondi
- Sezione PE:
  - Titolo con tooltip
  - Stats PE Total/Available/Used con tooltip su ognuno
  - Collateralization (spostata qui dentro, con tooltip su "Grace Period", "Health", "Decay")
  - Active Stakes DEF/ATK (spostati qui dentro, con tooltip)
  - Timer decay con live counter in secondi

#### File: `src/components/modals/UserMenuPanel.tsx` (modifica)
- Rimuovere: `leaderboardOpen` state, `LeaderboardModal` import e render, bottone "Leaderboard"
- Mantenere tutto il resto invariato

#### File: `src/components/map/inspector/PixelTab.tsx` (modifica)
- Usare `useLiveTick()` al posto di `setInterval(60000)` per aggiornare il countdown ogni secondo
- Usare `formatLiveCountdown()` per mostrare ore/minuti/secondi

#### File: `src/components/map/StatusStrip.tsx` (modifica)
- Usare `useLiveTick()` + `formatLiveCountdown()` per il timer rebalance e VPE expiring
- Mostrare minuti e secondi nel chip rebalance

#### File: `src/components/modals/PixelControlPanel.tsx` (modifica)
- Usare `useLiveTick()` + `formatLiveCountdown()` per tutti i timer (decay, grace period)

### File coinvolti

| File | Azione |
|------|--------|
| `src/lib/formatLiveTime.ts` | Nuovo -- utility formattazione countdown con secondi |
| `src/hooks/useLiveTick.ts` | Nuovo -- hook tick ogni secondo |
| `src/components/modals/PixelControlPanel.tsx` | Riscrittura -- due sezioni VPE+PE, tooltip, copy migliorata, live counters |
| `src/components/modals/UserMenuPanel.tsx` | Rimuovere Leaderboard |
| `src/components/map/inspector/PixelTab.tsx` | Live counter con secondi |
| `src/components/map/StatusStrip.tsx` | Live counter con secondi |

