

## Cambio icone: Pixel Command Center e Pixel Balance

### Modifiche

**1. Pixel Command Center** — icona da `chartNetwork` a `grid3x3` (hn-grid-solid)

File coinvolti:
- `src/components/modals/PixelControlPanel.tsx` — riga 33: `name="chartNetwork"` → `name="grid3x3"`
- `src/components/modals/UserMenuPanel.tsx` — riga 354: `name="chartNetwork"` → `name="grid3x3"`

**2. Pixel Balance (ex-VPE)** — icona da `grid2x2` a `brush` (hn-pen-solid)

File coinvolti:
- `src/components/ui/vpe-icon.tsx` — riga 11: `name="grid2x2"` → `name="brush"`, aggiornare commento JSDoc

Tutti i componenti che usano `PixelBalanceIcon` (WalletButton, StatusStrip, UserMenuPanel, PixelControlPanel) riceveranno automaticamente la nuova icona senza bisogno di modifiche.

### Dettaglio tecnico

| File | Riga | Da | A |
|------|------|----|---|
| `vpe-icon.tsx` | 11 | `name="grid2x2"` | `name="brush"` |
| `PixelControlPanel.tsx` | 33 | `name="chartNetwork"` | `name="grid3x3"` |
| `UserMenuPanel.tsx` | 354 | `name="chartNetwork"` | `name="grid3x3"` |

3 file, 3 righe da cambiare. Nessun nuovo componente necessario — le icone `grid3x3` e `brush` esistono gia nel registry.
