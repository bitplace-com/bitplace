

## Condivisione Pixel e Disegni

### Panoramica

Migliorare il sistema di condivisione pixel esistente (`shareLink.ts`) e aggiungere bottoni "Share" in tutte le aree rilevanti. Ottimizzare anche i meta tag Open Graph per una preview di qualita quando il link viene condiviso su social/chat.

---

### 1. Migliorare `index.html` con meta tag Bitplace

**File: `index.html`**

Aggiornare title, description e og:image con branding Bitplace:
- `<title>Bitplace</title>`
- `<meta name="description" content="Paint pixels on the world map. Claim, defend, and build pixel art with others.">`
- og:title, og:description, og:image (usare un'immagine di preview di Bitplace, per ora un placeholder appropriato)
- twitter:card, twitter:site aggiornati

---

### 2. Migliorare `shareLink.ts` con Web Share API

**File: `src/lib/shareLink.ts`**

Aggiungere una funzione `sharePixel(x, y)` che:
1. Genera il link con `generatePixelShareLink`
2. Prova `navigator.share()` (Web Share API nativa, ottima su mobile) con titolo e testo descrittivo
3. Se non disponibile (desktop), fallback a copia in clipboard

Aggiungere anche `shareArtwork(userId, displayName)` per condividere il profilo/disegni di un utente con link al profilo.

```typescript
export async function sharePixel(x: number, y: number): Promise<boolean> {
  const link = generatePixelShareLink(x, y);
  const shareData = {
    title: `Pixel ${x}:${y} on Bitplace`,
    text: `Check out this pixel on Bitplace!`,
    url: link,
  };
  
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return true;
    } catch { /* user cancelled */ }
  }
  // Fallback: copy to clipboard
  return copyPixelLink(x, y);
}
```

---

### 3. Aggiungere bottone "Share" al PixelInfoPanel

**File: `src/components/map/PixelInfoPanel.tsx`**

Aggiungere un bottone "Share" nel footer/bottom del pannello, visibile per tutti i pixel (claimed e unclaimed). Posizionarlo come riga separata sotto l'artwork section:

```tsx
{/* Share */}
<Button
  variant="outline"
  size="sm"
  className="w-full"
  onClick={() => sharePixel(x, y).then(ok => ok && toast.success('Link copied!'))}
>
  <PixelIcon name="share" className="w-3.5 h-3.5 mr-1.5" />
  Share Pixel
</Button>
```

---

### 4. Aggiungere bottone "Share" all'OwnerArtworkModal

**File: `src/components/map/OwnerArtworkModal.tsx`**

Per ogni cluster nella griglia, aggiungere un piccolo bottone share accanto al "click to jump". Inoltre aggiungere un bottone "Share All Paints" nel footer che condivide il link al profilo dell'utente.

Per i singoli cluster: bottone share che condivide il link al pixel centrale del cluster.

---

### 5. Aggiungere bottone "Share" nella sezione Paints del PlayerProfileModal

**File: `src/components/modals/PlayerProfileModal.tsx`**

Nella sezione "Paints" (riga ~342), aggiungere un bottone share accanto a "Expand" che condivide il link al profilo dell'utente con i suoi disegni.

---

### 6. Aggiornare PixelInspectorCard (floating card)

**File: `src/components/map/PixelInspectorCard.tsx`**

Il bottone Share gia esiste qui ma usa solo `copyPixelLink`. Aggiornarlo per usare la nuova `sharePixel()` con Web Share API su mobile.

---

### Riepilogo modifiche

| File | Modifica |
|------|----------|
| `index.html` | Meta tag OG aggiornati per Bitplace |
| `src/lib/shareLink.ts` | Nuova funzione `sharePixel()` con Web Share API |
| `src/components/map/PixelInfoPanel.tsx` | Bottone "Share Pixel" in fondo al pannello |
| `src/components/map/OwnerArtworkModal.tsx` | Bottone share per cluster + share all paints |
| `src/components/modals/PlayerProfileModal.tsx` | Bottone share nella sezione Paints |
| `src/components/map/PixelInspectorCard.tsx` | Aggiornare a `sharePixel()` con Web Share API |

### Rischio: Basso
Tutte le modifiche sono additive. Il Web Share API ha fallback su clipboard quindi funziona ovunque.

