

## Bug: pixels_painted_total non si decrementa correttamente con la gomma

### Problema identificato

Quando cancelli piu di 1000 pixel in una sola operazione con la gomma, il contatore `pixels_painted_total` non si decrementa correttamente. Questo succede perche il backend usa `.delete().select("id")` per contare quanti pixel sono stati effettivamente cancellati, ma le risposte del database sono limitate a 1000 righe per default. Quindi se cancelli 1500 pixel, il DELETE li rimuove tutti, ma il `.select("id")` ne restituisce solo 1000, e il contatore viene decrementato di 1000 anziche 1500.

Dai log del tuo account:
- Hai dipinto 1500 pixel (5 batch da 300)
- La prima cancellazione ha contato 1424 pixel (anziche tutti)
- La seconda ha contato 8 pixel
- Totale decrementato: 1432, ma i pixel reali cancellati erano 1500
- Risultato: il contatore e rimasto a 68 invece di 0

### Soluzione

Modificare la funzione `game-commit` per usare `ownedPixelIds.length` come conteggio dei pixel cancellati, anziche affidarsi alla risposta limitata del `.select("id")`. Dato che `ownedPixelIds` e gia filtrato per pixel effettivamente posseduti dall'utente, e un conteggio affidabile.

Inoltre, correggere il valore attuale nel database per il tuo account (da 68 a 0).

### Dettagli tecnici

**File: `supabase/functions/game-commit/index.ts`**

Cambiamento alla riga 312:
```
// Prima (bug):
affectedPixels = deletedPixels?.length || 0;

// Dopo (fix):
affectedPixels = ownedPixelIds.length;
```

Rimuovere anche il `.select("id")` dal delete (non serve piu):
```typescript
await supabase
  .from("pixels")
  .delete()
  .in("id", ownedPixelIds)
  .eq("owner_user_id", userId);

affectedPixels = ownedPixelIds.length;
```

**Fix dati: aggiornare `pixels_painted_total` a 0** per l'account con id `76f4ab9b-5f04-44e6-91e0-0ac208995ffc`.

