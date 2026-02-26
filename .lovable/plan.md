

## Rinominare "Virtual PE" / "Starter PE" in "VPE" ovunque

Tutte le label visibili all'utente che dicono "Virtual PE", "Starter PE", "PE available", ecc. verranno sostituite con "VPE". I nomi interni delle variabili (come `virtualPeTotal`, `isVirtualPe`) restano invariati -- cambiano solo le stringhe mostrate nell'interfaccia.

### File da modificare

| File | Cosa cambia |
|------|-------------|
| `src/components/modals/UserMenuPanel.tsx` | "Starter PE" → "VPE" (2 occorrenze, righe 158 e 212). "PE available" → "VPE available" (riga 162). "Starter pixels expire after 72h" → "VPE pixels expire after 72h" (righe 170 e 218) |
| `src/components/map/PixelInfoPanel.tsx` | "Starter Pixel" → "VPE Pixel" (riga 407). "No real PE staked. Anyone can paint over this pixel." → "No PE staked (VPE only). Anyone can paint over." (riga 414) |
| `src/components/map/StatusStrip.tsx` | Commento "virtual PE" → "VPE" (righe 176, 203). Nessun testo utente da cambiare qui. |
| `src/components/ui/vpe-icon.tsx` | JSDoc comment: "Virtual PE icon" → "VPE icon" (riga 9) |
| `src/contexts/WalletContext.tsx` | Toast: "Starter PE active" → "VPE active" (riga 860). Toast: "Starter PE ready to use" → "VPE ready to use" (riga 861). Toast: "PE available" → "VPE available" (riga 539). Commenti interni aggiornati. |

### Dettaglio modifiche

**UserMenuPanel.tsx** (sezioni Google-only e 'both'):
- `<span>Starter PE</span>` → `<span>VPE</span>` (2x)
- `{energy.virtualPeAvailable.toLocaleString()} PE available` → `{energy.virtualPeAvailable.toLocaleString()} VPE available`
- `Starter pixels expire after 72h` → `VPE pixels expire after 72h` (2x)

**PixelInfoPanel.tsx** (blocco expiry):
- `Starter Pixel` → `VPE Pixel`
- `No real PE staked. Anyone can paint over this pixel.` → `No PE staked (VPE only). Anyone can paint over.`

**WalletContext.tsx** (toast messages):
- `'Google linked! Wallet + Starter PE active'` → `'Google linked! Wallet + VPE active'`
- `` `${virtualPeAvailable.toLocaleString()} Starter PE ready to use` `` → `` `${virtualPeAvailable.toLocaleString()} VPE ready to use` ``
- `${data.peAvailable.toLocaleString()} PE available` → `${data.peAvailable.toLocaleString()} VPE available`

**vpe-icon.tsx** (commento):
- `Virtual PE icon` → `VPE icon`

Nessuna modifica a variabili, tipi, o logica backend -- solo label e messaggi visibili all'utente.

