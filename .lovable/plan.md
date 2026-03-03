

# Uniformare animazione STARTER a quella PRO (SVG linearGradient animate)

## Problema

PRO usa un'animazione SVG nativa: un `<linearGradient>` con `<animate>` che muove le coordinate del gradiente (sweep diagonale dorato). STARTER usa un'animazione CSS completamente diversa (`background-clip: text` + `background-position` keyframe). Sono due tecniche diverse e producono effetti visivamente diversi.

## Soluzione

Convertire il badge STARTER da testo HTML con CSS shine a un componente SVG che usa **esattamente la stessa struttura** di `PixelPro`: un `<linearGradient>` con `<animate>` sugli attributi `x1/y1/x2/y2`, ma con colori slate invece di gold.

### 1. Creare `PixelStarterText` -- icona SVG con testo "STARTER"

**Nuovo file: `src/components/icons/custom/PixelStarterText.tsx`**

Un SVG che contiene il testo "STARTER" come `<text>` element, con lo stesso pattern di gradiente animato di PixelPro ma in colori slate:

```tsx
import { PixelSVG, PixelSVGProps } from './base';

interface Props extends PixelSVGProps {
  shine?: boolean;
}

export function PixelStarterText({ shine, ...props }: Props) {
  const gradientId = 'starter-shine-grad';
  return (
    <svg viewBox="0 0 52 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...svgProps}>
      {shine && (
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse"
            x1="-20" y1="-8" x2="0" y2="0">
            <!-- same stops as PixelPro but slate colors -->
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="25%" stopColor="#94a3b8" />
            <stop offset="40%" stopColor="#cbd5e1" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#cbd5e1" />
            <stop offset="75%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
            <animate attributeName="x1" from="-20" to="52" dur="2s" repeatCount="indefinite" />
            <animate attributeName="y1" from="-8" to="16" dur="2s" repeatCount="indefinite" />
            <animate attributeName="x2" from="0" to="72" dur="2s" repeatCount="indefinite" />
            <animate attributeName="y2" from="0" to="24" dur="2s" repeatCount="indefinite" />
          </linearGradient>
        </defs>
      )}
      <text x="26" y="12" textAnchor="middle"
        fontFamily="monospace" fontSize="11" fontWeight="bold" letterSpacing="1"
        fill={shine ? `url(#${gradientId})` : 'currentColor'}
      >STARTER</text>
    </svg>
  );
}
```

### 2. Aggiornare WalletButton

**File: `src/components/wallet/WalletButton.tsx`** (riga 84)

Sostituire lo `<span>` con testo + CSS con il nuovo componente SVG dentro un contenitore con sfondo:

```tsx
// Da:
<span className="text-[10px] font-bold tracking-wider bg-slate-400/10 px-1.5 py-0.5 rounded starter-badge-shine">STARTER</span>

// A:
<span className="inline-flex items-center bg-slate-400/10 px-1.5 py-0.5 rounded text-slate-400">
  <PixelStarterText shine className="h-3 w-auto" />
</span>
```

### 3. Pulizia CSS (opzionale)

La classe `.starter-badge-shine` e il `@keyframes starter-text-shine` in `src/index.css` non saranno piu' usati e possono essere rimossi.

## Risultato

Entrambi i badge (PRO e STARTER) useranno **esattamente la stessa tecnica di animazione**: SVG `<linearGradient>` con `<animate>` che muove il gradiente diagonalmente attraverso l'icona. L'unica differenza sara' la palette colori (gold per PRO, slate/silver per STARTER).

## File coinvolti

1. **`src/components/icons/custom/PixelStarterText.tsx`** -- nuovo componente SVG
2. **`src/components/wallet/WalletButton.tsx`** -- usare il nuovo componente
3. **`src/index.css`** -- rimuovere `.starter-badge-shine` e `@keyframes starter-text-shine`

