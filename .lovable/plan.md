

# Fix STARTER badge animation + rimuovere icona penna

## Problemi

1. Il badge STARTER nella barra wallet usa `animate-shine` (flash bianco tipo leaderboard). Deve usare lo stesso tipo di animazione del badge PRO (sweep gradiente dorato tipo SVG), ma con i colori slate del STARTER.
2. L'icona della penna brillante (`StarterBadge` con `PixelStarter`) appare accanto al nome utente nel pannello -- va rimossa.

## Modifiche

### 1. Nuova animazione CSS per STARTER (stile PRO)

**File: `src/index.css`**

Aggiungere una nuova classe `.starter-badge-shine` che usa `background-clip: text` con un gradiente slate animato (sweep da sinistra a destra, come il gradiente SVG di PixelPro ma in argento/slate):

```css
@keyframes starter-text-shine {
  0% { background-position: -100% center; }
  100% { background-position: 200% center; }
}

.starter-badge-shine {
  background: linear-gradient(
    90deg,
    #64748b 0%,
    #94a3b8 25%,
    #cbd5e1 40%,
    #ffffff 50%,
    #cbd5e1 60%,
    #94a3b8 75%,
    #64748b 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: starter-text-shine 2s linear infinite;
}
```

### 2. WalletButton: usare nuova animazione

**File: `src/components/wallet/WalletButton.tsx`** (riga 84)

Da:
```tsx
<span className="text-[10px] font-bold tracking-wider text-slate-400 bg-slate-400/10 px-1.5 py-0.5 rounded animate-shine">STARTER</span>
```

A:
```tsx
<span className="text-[10px] font-bold tracking-wider bg-slate-400/10 px-1.5 py-0.5 rounded starter-badge-shine">STARTER</span>
```

### 3. UserMenuPanel: rimuovere icona penna

**File: `src/components/modals/UserMenuPanel.tsx`** (righe 99-103)

Rimuovere completamente il blocco `StarterBadge`:

```tsx
{isGoogleOnly && (
  user?.auth_provider !== 'both' ? (
    <StarterBadge shine size="sm" />
  ) : null
)}
```

Questo elimina l'icona penna brillante dal nome utente nel pannello popover.

## File coinvolti

1. `src/index.css` -- nuova classe `starter-badge-shine`
2. `src/components/wallet/WalletButton.tsx` -- usare `starter-badge-shine` invece di `animate-shine`
3. `src/components/modals/UserMenuPanel.tsx` -- rimuovere `StarterBadge` dal nome utente
