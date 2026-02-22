

## Share diretto: copia link in clipboard senza modale

### Cosa cambia

Entrambe le funzioni di share (`sharePixel` e `shareArtwork`) diventeranno un semplice copia-incolla del link in clipboard, senza mai aprire il modale nativo del sistema operativo (Web Share API). Il testo copiato sara esclusivamente il link, senza titoli o descrizioni aggiuntive.

Due percorsi distinti:
- **Share pixel**: copia un link che porta alla mappa centrata su quel pixel con le info del pixel aperte
- **Share player paints**: copia un link che porta al profilo dell'utente

### Modifiche

**File: `src/lib/shareLink.ts`**

1. Funzione `sharePixel`: rimuovere completamente la logica `navigator.share` e il `shareData` con titolo/testo. Ridurla a una semplice copia del link in clipboard (identica a `copyPixelLink`).

2. Funzione `shareArtwork`: stesso trattamento - rimuovere `navigator.share` e il `shareData`. Copiare solo il link generato da `generateProfileShareLink` in clipboard.

Nessun altro file da modificare: tutti i componenti che chiamano queste funzioni (`PixelInspectorCard`, `PixelInfoPanel`, `OwnerArtworkModal`, `PlayerProfileModal`) gia gestiscono il risultato booleano e mostrano il toast "Link copied!", quindi continueranno a funzionare correttamente.

### Dettagli tecnici

```typescript
// sharePixel diventa:
export async function sharePixel(x: number, y: number): Promise<boolean> {
  return copyPixelLink(x, y);
}

// shareArtwork diventa:
export async function shareArtwork(userId: string, _displayName?: string | null): Promise<boolean> {
  const link = generateProfileShareLink(userId);
  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch {
    return false;
  }
}
```
