
# Fix: Tooltip del Decay nascosto sotto la mappa

## Problema

Il tooltip viene renderizzato all'interno del DOM della StatusStrip, che si trova sotto il contenitore della mappa. Anche con `z-index: 9999`, il tooltip non riesce a uscire dal contesto di stacking del suo contenitore padre.

## Soluzione

Aggiungere `TooltipPrimitive.Portal` nel componente `TooltipContent` (`src/components/ui/tooltip.tsx`) in modo che il tooltip venga renderizzato direttamente nel `<body>` del documento, fuori da qualsiasi contenitore che potrebbe tagliarlo o nasconderlo.

## Dettagli tecnici

**File: `src/components/ui/tooltip.tsx`**

Wrappare `TooltipPrimitive.Content` con `TooltipPrimitive.Portal`. Questo e' il pattern standard di Radix UI per evitare problemi di stacking context. La modifica e' globale, quindi tutti i tooltip dell'app ne beneficeranno.

Da:
```tsx
<TooltipPrimitive.Content ... />
```

A:
```tsx
<TooltipPrimitive.Portal>
  <TooltipPrimitive.Content ... />
</TooltipPrimitive.Portal>
```

Nessun altro file da modificare. I `z-[9999]` e le classi `bg-popover` gia' aggiunti al tooltip del Decay in `StatusStrip.tsx` rimangono validi.
