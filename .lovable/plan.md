

## Fix MapToolbar Mobile: Reinforce label + scorrimento orizzontale

### Problema
1. Su mobile viene mostrato "Boost" invece di "Reinforce" -- l'utente vuole il nome completo anche da mobile.
2. Le 4 voci non sono scorribili orizzontalmente in modo fluido: manca un contenitore con larghezza massima che abiliti lo scroll, e manca un indicatore visivo (scrollbar o fade) che suggerisca la possibilita di scorrere.
3. Il meccanismo expand/collapse nasconde le voci -- l'utente vuole che siano sempre visibili e scorribili.

### Modifiche

#### `src/components/map/MapToolbar.tsx`

1. **Rimuovere `shortLabel`** da tutti i modi e usare sempre `label` (Reinforce, non Boost).

2. **Rimuovere il meccanismo expand/collapse**: eliminare il bottone toggle chevron e lo stato `isExpanded`. Le 4 voci saranno sempre visibili in uno scroll container orizzontale.

3. **Scroll container con larghezza massima**: il `GlassPanel` avra `max-w-[calc(100vw-2rem)]` su mobile per lasciare margine ai bordi dello schermo. Il contenitore interno avra `overflow-x-auto` e una scrollbar sottile visibile (rimuovere `scrollbar-hide`).

4. **Aggiungere una scrollbar sottile stilizzata** con CSS custom per dare un "binario" visivo:
   - Altezza scrollbar: 3px
   - Colore track trasparente, thumb semi-trasparente
   - Border-radius arrotondato

5. **Aggiungere fade gradient ai bordi** con pseudo-elementi CSS per indicare che c'e contenuto fuori schermo a destra/sinistra.

### Dettaglio tecnico

```tsx
// Rimuovere shortLabel, usare solo label
const modes = [
  { value: 'paint', icon: ..., label: 'Paint' },
  { value: 'defend', icon: ..., label: 'Defend' },
  { value: 'attack', icon: ..., label: 'Attack' },
  { value: 'reinforce', icon: ..., label: 'Reinforce' },
];

// Componente semplificato: niente expand/collapse
return (
  <GlassPanel variant="hud" padding="sm" className="shadow-lg max-w-[calc(100vw-2rem)]">
    <div ref={scrollRef} className="overflow-x-auto toolbar-scroll">
      <ToggleGroup ...>
        {modes.map(...)}
      </ToggleGroup>
    </div>
  </GlassPanel>
);
```

CSS per la scrollbar sottile (in `src/index.css` o inline):
```css
.toolbar-scroll::-webkit-scrollbar {
  height: 3px;
}
.toolbar-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.toolbar-scroll::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.3);
  border-radius: 3px;
}
```

### Riepilogo

| File | Modifica |
|------|----------|
| `src/components/map/MapToolbar.tsx` | Rimuovere shortLabel e expand/collapse, sempre scroll orizzontale con label complete |
| `src/index.css` | Aggiungere stile scrollbar sottile per `.toolbar-scroll` |

### Rischio: Basso
Semplificazione del componente. Nessuna logica di business toccata.
