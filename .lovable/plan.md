

# Fix: Icona Template renderizzata male

## Causa del problema

L'SVG originale HackerNoon per `hn-image` (regular) **non usa** ne `fillRule="evenodd"` ne il `<rect>` trasparente. Il nostro codice ha entrambi, e questo causa il rendering distorto:

- `fillRule="evenodd"` cambia il modo in cui le aree sovrapposte del path vengono riempite/svuotate, creando bordi irregolari
- Il `<rect width="24" height="24" fill="none" />` e inutile e potenzialmente interferisce

**SVG originale HackerNoon** (dal file `node_modules/@hackernoon/pixel-icon-library/icons/SVG/regular/image.svg`):
```xml
<polygon points="9 6 9 9 8 9 8 10 5 10 5 9 4 9 4 6 5 6 5 5 8 5 8 6 9 6"/>
<path d="m22,2v-1H2v1h-1v20h1v1h20v-1h1V2h-1Zm-5,12v1h1v1h1v1h1v1h1v3h-13v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v1h1Zm3,1v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h-1v-1h-1V3h18v12h-1Zm-15,3v1h1v1h1v1H3v-4h1v1h1Z"/>
```

**Il nostro codice attuale** (rotto):
```xml
<polygon points="9 6 9 9 8 9 8 10 5 10 5 9 4 9 4 6 5 6 5 5 8 5 8 6 9 6" />
<path fillRule="evenodd" d="..." />     <!-- fillRule non presente nell'originale -->
<rect width="24" height="24" fill="none" />  <!-- non presente nell'originale -->
```

## Soluzione

Modificare `src/components/icons/custom/PixelImage.tsx`:
- Rimuovere `fillRule="evenodd"` dal `<path>`
- Rimuovere il `<rect width="24" height="24" fill="none" />`

Risultato: SVG identico all'originale HackerNoon, rendering pulito e corretto.

## File da modificare

| File | Modifica |
|------|----------|
| `src/components/icons/custom/PixelImage.tsx` | Rimuovere `fillRule="evenodd"` e `<rect>` |

