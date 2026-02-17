

## Fix: Animazione shine del badge Admin

### Problema
Il gradiente attuale ha una banda luminosa troppo stretta (solo 10% della larghezza, tra 45%-55%) e si muove orizzontalmente in modo piatto e lento. L'effetto risulta come una linea sottile che passa al centro.

### Soluzione
Modificare il gradiente SVG in `src/components/icons/custom/PixelBadgeCheck.tsx`:

1. **Usare `gradientUnits="userSpaceOnUse"`** con coordinate reali del viewBox (0-24px) per controllare meglio la distribuzione
2. **Angolo diagonale** (da top-left a bottom-right) per un effetto piu naturale e dinamico
3. **Banda luminosa piu ampia** (~30% della larghezza) con transizioni morbide
4. **Velocita piu fluida**: 2s invece di 3s, con movimento che copre tutto il viewBox
5. **Gradiente piu ricco**: aggiungere un secondo tono chiaro per dare profondita al riflesso

### Dettaglio tecnico

Il gradiente passera da coordinate fisse nel viewBox (es. da -12 a 36 px) con una banda centrale bianca/dorata chiara larga circa 8px su 24px totali. L'animazione `<animate>` spostera x1/y1 e x2/y2 in diagonale attraverso l'intera icona.

```
Gradiente stops:
  0%   -> #b8960a (oro scuro)
  25%  -> #eab308 (oro base)  
  40%  -> #fde68a (oro chiaro)
  50%  -> #ffffff (bianco, opacita 0.8)
  60%  -> #fde68a (oro chiaro)
  75%  -> #eab308 (oro base)
  100% -> #b8960a (oro scuro)
```

### File coinvolto: 1
- `src/components/icons/custom/PixelBadgeCheck.tsx`

### Rischio rottura: Zero
Modifica solo l'aspetto visivo dell'animazione shine del badge admin.

