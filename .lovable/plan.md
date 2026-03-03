

# Pannelli centrati -- Conferma scope

Confermo: il pannello di conferma disegno (`ActionConfirmDialog`) usa già un `Dialog` centrato standard e **non viene toccato**. Le modifiche riguardano solo:

- **GlassSheet** (desktop mode) -- tutti i pannelli che attualmente fanno slide da destra: Rules, Shop, Alliance, Settings, Notifications, Leaderboard, PlayerProfile, Search, Places
- **MapMenuDrawer** -- attualmente slide da sinistra

Entrambi diventano modali centrati con fade+scale. Il piano resta identico a quello già approvato.

## File coinvolti

1. **`src/components/ui/glass-sheet.tsx`** -- desktop: da side-panel destro a modale centrato con overlay
2. **`src/components/map/MapMenuDrawer.tsx`** -- da Sheet left-slide a Dialog centrato

Nessun altro file cambia. Templates e ActionConfirmDialog restano invariati.

