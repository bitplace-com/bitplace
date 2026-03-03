

# Fix copy e dettagli UI

## Modifiche

### 1. `src/components/modals/RulesModal.tsx` — Pixel Balance copy (riga 79)

Riscrivere la description del Pixel Balance:
- Rimuovere "Pixel Balance pixels" (suona ridondante)
- Spiegare chiaramente che i pixel si possono rinnovare tutti con un solo click prima della scadenza
- Linguaggio più semplice e diretto

Nuovo copy: `"A free budget of 300,000 recyclable pixels for Bitplacer accounts. They have no PE value (anyone can paint over them) and expire after 72 hours. Before they expire, you can renew all your pixels at once with a single click from the Pixel Control Center — no need to repaint them one by one."`

### 2. `src/components/modals/ShopModal.tsx` — Sezione Pixel Balance (se presente, cercare)

Verificare se c'è menzione del Pixel Balance anche qui e aggiornare con lo stesso copy migliorato sulla rinnovabilità.

### 3. `src/components/modals/SettingsModal.tsx` — Footer (riga 402-404)

- Rimuovere `v1.0.0 •` dalla riga
- Cambiare `❤️` (cuore rosso) in `🖤` (cuore nero)

Risultato: `Made with 🖤 by Bitplace Team`

### 4. `src/components/modals/WhitePaperModal.tsx` — Pixel Balance copy

Cercare e aggiornare la menzione "Pixel Balance pixels" anche qui con copy migliorato, includendo il rinnovo con un click.

