

# Piano di implementazione

Ci sono 3 modifiche richieste:

## 1. Codice colore visibile solo quando il pannello e' aperto

**Stato attuale:** Quando il pannello colori e' chiuso (collapsed), mostra il quadratino del colore + il codice hex al centro della barra.

**Cosa cambia:**
- Rimuovere il codice hex dalla vista collapsed (riga 261-269 di ActionTray.tsx) -- mantenere solo il quadratino colore
- Aggiungere il codice hex nella vista expanded, posizionato tra la riga dei tool (brush/2x2/eraser) e i tab Colors/Gradients, allineato a sinistra
- Il codice hex si aggiorna in tempo reale: mostra il colore su cui l'utente passa il mouse (hover), e resta fisso sul colore selezionato quando non si fa hover

## 2. Zoom ridotto per visualizzazione e disegno dei pixel

**Valori attuali:**
- `Z_SHOW_PAINTS = 14` (zoom minimo per vedere i pixel sulla mappa)
- `MIN_CELL_SIZE_INTERACT = 4` (dimensione minima cella in CSS pixel per interagire)
- Di conseguenza, il disegno e' possibile da zoom 14 in su (cellSize = 2^(14-12) = 4px)

**Nuovi valori:**
- `Z_SHOW_PAINTS = 13` (i pixel diventano visibili un livello di zoom prima)
- `MIN_CELL_SIZE_INTERACT = 2` (permette interazione con celle di 2px, cioe' da zoom 13)
- Il disegno sara' possibile da zoom 13 in su (cellSize = 2^(13-12) = 2px)

Questo tocca solo il file `src/lib/pixelGrid.ts` e di conseguenza tutto il sistema (rendering, interazione, zoom helper button) si adatta automaticamente.

## 3. Separatore delle migliaia nei valori monetari

Aggiungere una funzione helper `formatUsd(value)` che formatta i dollari con separatore delle migliaia (virgola) e applicarla in tutti i punti dove vengono mostrati valori in dollari:

- **StatusStrip.tsx**: `$2009.07` diventa `$2,009.07`
- **UserMenuPanel.tsx**: wallet USD e tutti i valori nelle stat card
- **WalletButton.tsx**: bilancio SOL nel bottone
- **ProfilePage.tsx**: Wallet USD stat card
- **StatusStrip.tsx rebalance tooltip**: valori PE in dollari

La funzione usera' `toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })` per i dollari, e per i SOL si manterra' `toFixed(4)` ma con migliaia separate.

---

### Dettagli tecnici

**File modificati:**

| File | Modifica |
|------|----------|
| `src/lib/pixelGrid.ts` | `Z_SHOW_PAINTS`: 14 -> 13, `MIN_CELL_SIZE_INTERACT`: 4 -> 2 |
| `src/components/map/ActionTray.tsx` | Rimuovere hex da collapsed, aggiungere hex con hover in expanded, stato `hoveredColor` |
| `src/components/map/StatusStrip.tsx` | Formattare walletUsd con migliaia |
| `src/components/modals/UserMenuPanel.tsx` | Formattare walletUsd e valori stat con migliaia |
| `src/components/wallet/WalletButton.tsx` | Formattare nativeBalance con migliaia |
| `src/pages/ProfilePage.tsx` | Formattare walletUsd con migliaia |
| `src/lib/utils.ts` | Aggiungere helper `formatUsd()` e `formatNumber()` |

