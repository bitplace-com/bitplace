

# Aggiornare copy tour step "Menu"

## Problema
Il copy attuale dello step "Menu" nel tour dice: *"Access Rules, Leaderboard, Alliance, Settings and more from this menu."*

Il menu pero' non contiene piu' "Leaderboard". Le voci attuali sono: Map, Alliance, Get $BIT, How It Works, Rules, Settings, Theme toggle.

## Modifica

**File: `src/hooks/useGuidedTour.ts`** (riga 90)

- Da: `'Access Rules, Leaderboard, Alliance, Settings and more from this menu.'`
- A: `'Access Alliance, Rules, How It Works, Get $BIT and Settings from this menu.'`

Un solo file, una riga.

