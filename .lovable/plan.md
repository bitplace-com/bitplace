

## Rinomina "Pixel Energy" in "Paint Energy" ovunque

Concordo pienamente: "Paint Energy" comunica meglio il concetto -- e' l'energia che usi per dipingere, non una proprieta' del pixel. PE resta "PE" come acronimo (Paint Energy), VPE diventa "Virtual Paint Energy".

### Modifiche per file

| File | Cosa cambia |
|------|-------------|
| `src/components/map/StatusStrip.tsx` | Tooltips: "Pixel Energy (PE)" → "Paint Energy (PE)", "Virtual Pixel Energy (VPE)" → "Virtual Paint Energy (VPE)" |
| `src/components/modals/RulesModal.tsx` | Titoli sezione e Quick Reference: "Pixel Energy (PE)" → "Paint Energy (PE)", "Virtual Pixel Energy (VPE)" → "Virtual Paint Energy (VPE)" |
| `src/components/modals/WhitePaperModal.tsx` | Testo intro VPE e sezione $BIT: tutti i riferimenti a "Pixel Energy" → "Paint Energy" |
| `src/components/modals/WalletSelectModal.tsx` | Descrizione scelta account: "Pixel Energy" → "Paint Energy" |
| `src/components/modals/UserMenuPanel.tsx` | Tooltip PE Total: "Pixel Energy" → "Paint Energy" |
| `src/pages/TermsPage.tsx` | Sezioni legali: "Pixel Energy" → "Paint Energy", "Virtual Pixel Energy" → "Virtual Paint Energy", titolo sezione 5 |
| `src/pages/RulesPage.tsx` | InfoChip descrizione: "Pixel Energy" → "Paint Energy" |
| `docs/bitplace_rules.md` | Definizione energy unit |

### Cosa NON cambia
- L'acronimo **PE** resta invariato (ora sta per Paint Energy)
- L'acronimo **VPE** resta invariato (ora sta per Virtual Paint Energy)
- Nessuna modifica al codice logico, solo stringhe di testo/copy

### Riepilogo sostituzioni
```
"Pixel Energy"          → "Paint Energy"
"Virtual Pixel Energy"  → "Virtual Paint Energy"
```

Circa 20 occorrenze distribuite in 8 file.

