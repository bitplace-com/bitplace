

## Cambio icona VPE: da orologio blu a bolt outline nero/bianco

### Cosa cambia
L'icona dei Virtual PE (VPE) passa dall'orologio blu al **bolt outline** (la versione "regular" della stessa icona bolt usata per i PE reali). Il colore diventa **nero in light mode** e **bianco in dark mode** (seguendo il foreground del tema), invece del blu attuale.

- **PE reali** = bolt solid (pieno) -- resta invariato
- **VPE** = bolt regular (outline) -- nuova icona, colore `text-foreground`

### File da modificare

| File | Modifica |
|------|----------|
| `src/components/icons/custom/PixelBoltOutline.tsx` | **Nuovo**: icona bolt outline dalla libreria HackerNoon (versione "regular") |
| `src/components/icons/iconRegistry.ts` | Registrare `boltOutline` nella mappa icone |
| `src/components/ui/vpe-icon.tsx` | Cambiare da `clock` + blu a `boltOutline` + `text-foreground` |

### Dettagli

**1. Nuova icona `PixelBoltOutline`**
Usa il path SVG dalla versione regular di HackerNoon:
```
<path d="m14,10v-4h1v-3h1V1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h7v4h-1v3h-1v2h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h-7Zm4,2h-1v1h-1v1h-1v1h-1v1h-1v1h-1v-5h-5v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v5h5v1Z"/>
```

**2. VPEIcon aggiornata**
```tsx
export function VPEIcon({ className, size = 'sm' }: VPEIconProps) {
  return <PixelIcon name="boltOutline" size={size} className={cn('text-foreground', className)} />;
}
```

Il colore `text-foreground` e' automaticamente nero in light mode e bianco in dark mode tramite Tailwind.
