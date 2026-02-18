

# Integrazione Logo Bitplace come Avatar Fallback

## Cosa cambia

Sostituire la **lettera iniziale** attualmente mostrata negli avatar fallback con il **logo Bitplace**, mantenendo lo sfondo con gradiente in scala di grigio e i pattern geometrici casuali gia esistenti. Il colore del logo si adattera automaticamente al tema (bianco in dark mode, nero in light mode).

## Dove appare il logo

- Avatar utenti senza foto profilo (profilo, settings, user menu, inspector card, pixel info panel)
- Righe della leaderboard (avatar fallback per giocatori senza immagine)
- Hover card della leaderboard
- Place card (avatar creatore)

## Dettagli tecnici

### 1. Nuovo componente: `src/components/icons/BitplaceLogo.tsx`

Componente React che renderizza il logo SVG inline. Accetta `className` per controllare dimensione e colore via Tailwind. Il colore di default usa `currentColor` cosi si adatta automaticamente al contesto (bianco su sfondo scuro, nero su sfondo chiaro).

### 2. Modifica: `src/components/ui/avatar-fallback-pattern.tsx`

- Rimuovere la prop `name`, `wallet` e `textClassName` (non servono piu per l'iniziale)
- Sostituire lo `<span>` con la lettera iniziale con il componente `<BitplaceLogo />` centrato
- Il logo sara bianco (`text-white`) poiche lo sfondo e sempre scuro (gradiente grigio 10-45%)
- Mantenere pattern geometrici e gradiente invariati

### 3. Modifica: `src/components/modals/LeaderboardModal.tsx`

- Nelle `PlayerRow` e nella `HoverCard`, sostituire il `<div>` fallback con la lettera con il componente `<AvatarFallback>` (quello da avatar-fallback-pattern) oppure con il logo Bitplace direttamente
- Mantiene il gradiente di sfondo gia presente

### 4. Modifica: `src/components/places/PlaceCard.tsx`

- Nel fallback avatar del creatore, mostrare il logo Bitplace al posto dell'iniziale

### File coinvolti
- `src/components/icons/BitplaceLogo.tsx` (nuovo)
- `src/components/ui/avatar-fallback-pattern.tsx` (modifica)
- `src/components/modals/LeaderboardModal.tsx` (modifica)
- `src/components/places/PlaceCard.tsx` (modifica)

