

## Decrementare pixels_painted_total quando l'utente cancella i propri pixel

### Problema
Attualmente `pixels_painted_total` viene incrementato solo durante il PAINT ma non viene mai decrementato durante l'ERASE. Un utente potrebbe disegnare e cancellare all'infinito per gonfiare la propria posizione in classifica.

### Soluzione
Nel file `supabase/functions/game-commit/index.ts`, aggiungere la logica per decrementare `pixels_painted_total` quando un utente cancella i propri pixel con la gomma.

### Dettagli tecnici

**File: `supabase/functions/game-commit/index.ts`** (righe 569-584)

Dopo il blocco che gestisce il PAINT, aggiungere un blocco per l'ERASE che sottrae i pixel cancellati dal contatore:

```typescript
// Codice attuale (solo PAINT):
if (mode === "PAINT" && affectedPixels > 0) {
  newPixelsPaintedTotal = (user.pixels_painted_total || 0) + affectedPixels;
  paintCooldownUntil = new Date(Date.now() + PAINT_COOLDOWN_SECONDS * 1000);
  await supabase
    .from("users")
    .update({ 
      pixels_painted_total: newPixelsPaintedTotal, 
      paint_cooldown_until: paintCooldownUntil.toISOString(),
    })
    .eq("id", userId);
}

// Aggiunta per ERASE:
if (mode === "ERASE" && affectedPixels > 0) {
  newPixelsPaintedTotal = Math.max(0, (user.pixels_painted_total || 0) - affectedPixels);
  await supabase
    .from("users")
    .update({ pixels_painted_total: newPixelsPaintedTotal })
    .eq("id", userId);
}
```

- `Math.max(0, ...)` garantisce che il contatore non vada mai sotto zero
- La leaderboard usa `pixels_painted_total` dalla tabella `users`, quindi si aggiorna automaticamente
- Nessuna modifica al database necessaria, solo logica backend

**File coinvolti:** 1 (edge function `game-commit`)
