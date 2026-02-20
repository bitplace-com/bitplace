

## Fix: Rimuovi badge Devnet in trial + Ripristino automatico modalità Crea dopo zoom-in

### 1. Rimuovere badge "Devnet" in modalità trial

Il badge cluster nella StatusStrip mostra "devnet" quando il trial mode e attivo, perche `WalletContext` imposta `cluster: 'devnet'` per la sessione trial. La soluzione e nascondere il badge cluster quando `isTrialMode` e attivo (il badge TRIAL gia presente e sufficiente).

**File**: `src/components/map/StatusStrip.tsx`
- Aggiungere `isTrialMode` da `useWallet()`
- Condizione del badge cluster: `{energy.cluster && !isTrialMode && (...)}`

---

### 2. Ripristino automatico della modalita Crea dopo zoom-in

Attualmente, quando si zooma oltre la soglia, il sistema switcha su "drag" (mano). Ma quando si torna dentro la soglia, resta sulla mano. L'utente vuole che torni automaticamente su "draw" (matita) se era in draw prima dello switch automatico.

**Soluzione**: Usare un `useRef` (`wasDrawBeforeAutoSwitch`) per ricordare se lo switch e stato automatico (causato dallo zoom) oppure manuale (scelto dall'utente).

- Quando lo zoom esce dalla soglia e il modo e `'draw'`: salvare `wasDrawBeforeAutoSwitch.current = true`, poi switchare a `'drag'`
- Quando lo zoom rientra nella soglia e `wasDrawBeforeAutoSwitch.current === true`: switchare a `'draw'` e resettare il ref
- Se l'utente cambia manualmente il modo (cliccando sulla mano/matita), resettare `wasDrawBeforeAutoSwitch.current = false`

**File**: `src/components/map/BitplaceMap.tsx`
- Aggiungere `const wasDrawBeforeAutoSwitch = useRef(false)`
- Modificare il `useEffect` esistente (riga 245-250) per gestire entrambe le direzioni (uscita e rientro nella soglia)

---

### Dettagli tecnici

```text
useEffect:
  if (interactionMode === 'draw' && !canInteract):
    wasDrawBeforeAutoSwitch.current = true
    setInteractionMode('drag')
  
  if (interactionMode === 'drag' && canInteract && wasDrawBeforeAutoSwitch.current):
    wasDrawBeforeAutoSwitch.current = false
    setInteractionMode('draw')
```

Per resettare il ref quando l'utente cambia manualmente, bisogna intercettare i cambi manuali. Dato che `setInteractionMode` in `useMapState` viene chiamato sia manualmente (click) sia automaticamente (dal useEffect), la cosa piu semplice e resettare il ref direttamente nel useEffect: se l'utente clicca manualmente su drag mentre e in zona paintabile, il ref viene resettato nel ciclo successivo perche `interactionMode === 'drag'` e `canInteract === true` ma `wasDrawBeforeAutoSwitch === false` (nessuna azione).

Se invece l'utente clicca manualmente su draw e poi zooma out, il ciclo funziona normalmente. L'unico caso da gestire e: utente in draw, zoom out (auto-switch a drag), utente clicca manualmente su drag (conferma che vuole stare su drag), zoom in di nuovo. Per questo caso, aggiungiamo un secondo useEffect che resetta il ref quando `interactionMode` cambia e `canInteractAtZoom(zoom)` e true (significa che il cambio e manuale, non automatico).

**Approccio semplificato**: un singolo `useEffect` con un ref booleano. Il ref viene settato a `true` solo dallo zoom-out automatico e resettato quando viene ripristinato il draw o quando l'utente cambia modo manualmente in zona paintabile.

