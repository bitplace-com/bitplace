
## Fix: Tooltip della Guida fuori schermo

### Problema
I tooltip del tour per "Menu" (position: right) e "Wallet" (position: left) vengono posizionati centrati verticalmente rispetto al target. Quando il target e vicino al bordo superiore dello schermo, il tooltip esce dalla viewport.

### Soluzione
Aggiungere un clamping nella funzione `getTooltipPosition` in `GuidedTour.tsx` per garantire che il tooltip rimanga sempre visibile dentro la viewport.

### Dettagli tecnici

**File: `src/components/map/GuidedTour.tsx`**

Modificare la funzione `getTooltipPosition` per aggiungere un vincolo `minTop` dopo il calcolo della posizione. Per i casi `left` e `right`, invece di usare `transform: translateY(-50%)` che puo portare il tooltip fuori schermo, calcolare la posizione top assicurandosi che non sia mai inferiore a un margine di sicurezza (es. 16px dal bordo superiore) e non superi il bordo inferiore.

Logica:
1. Calcolare `top` come attualmente (centro del target)
2. Sottrarre meta dell'altezza stimata del tooltip (~140px) per centrarlo
3. Applicare `Math.max(16, ...)` per il bordo superiore
4. Applicare `Math.min(window.innerHeight - 160, ...)` per il bordo inferiore
5. Rimuovere `transform: translateY(-50%)` per i casi left/right, dato che il centramento viene gestito manualmente con il clamping
