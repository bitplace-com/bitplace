

# Aggiornamenti Tour, Naming, Menu e How It Works

## Riguardo il nome PE

**Raccomandazione: mantenere PE (Pixel Energy).** La sigla "PE" e' perfettamente inglese - sta per "Pixel Energy", non "Punti Energia". Nell'ambito gaming:

- **HP** = Hit/Health Points (vita, non energia)
- **XP** = Experience Points (progressione, non valuta di gioco)
- **EP** = troppo generico, si confonde con "Episode"
- **MP** = Mana Points (magia)

PE e' unica e distintiva per Bitplace. Nessun altro gioco la usa, ed e' immediatamente chiara: "Pixel Energy". La coincidenza italiana e' irrilevante perche' il gioco e' interamente in inglese. **Nessuna modifica al naming.**

---

## Modifiche da implementare

### 1. Tour step "Wallet" — riformulare testo
**File:** `src/hooks/useGuidedTour.ts` (step `wallet`)

Testo attuale:
> "Connect your Phantom wallet to save your paintings and earn PE. Or try the Test Wallet to paint for free!"

Nuovo testo:
> "Connect your Phantom wallet to fund your PE (Pixel Energy) — the energy you spend to paint, defend and attack on the map. Or try the Test Wallet to paint for free!"

### 2. Aggiungere step "Templates" al tour
**File:** `src/hooks/useGuidedTour.ts`

Nuovo step da inserire tra "menu" (step 5) e "quick-actions" (step 6):

```
{
  id: 'templates',
  target: 'templates',
  title: 'Templates',
  description: 'Upload an image as a guide overlay on the map. Use it to trace pixel art or plan large designs before painting.',
  position: 'right',
}
```

**File:** `src/components/map/TemplatesButton.tsx` — aggiungere `data-tour="templates"`

### 3. Rinominare "Glossary" in "Rules"
**File:** `src/components/map/MapMenuDrawer.tsx` — riga 139: `Glossary` diventa `Rules`
**File:** `src/components/modals/RulesModal.tsx` — riga 14: `title="Glossary"` diventa `title="Rules"`

### 4. Aggiungere spiegazione "$BIT non viene speso" nella sezione How It Works
**File:** `src/components/modals/WhitePaperModal.tsx`

Nella sezione "How value works" (riga 58-74), aggiungere un blocco chiarificatore dopo il flow diagram:

> **Your $BIT is never spent.** Your token balance determines how much Pixel Energy you receive — equal in dollar value to your $BIT holdings. Only PE is consumed when you paint, defend or attack. Your $BIT stays safe in your wallet at all times — Bitplace has no access to it and cannot move or spend your tokens.

Questo viene inserito come paragrafo aggiuntivo con stile `text-sm` e un'icona `shield` per enfatizzare la sicurezza.

---

## Riepilogo file modificati

| File | Modifica |
|------|----------|
| `src/hooks/useGuidedTour.ts` | Testo wallet step + nuovo step Templates |
| `src/components/map/TemplatesButton.tsx` | `data-tour="templates"` |
| `src/components/map/MapMenuDrawer.tsx` | "Glossary" -> "Rules" |
| `src/components/modals/RulesModal.tsx` | `title="Glossary"` -> `title="Rules"` |
| `src/components/modals/WhitePaperModal.tsx` | Sezione "$BIT is never spent" |

Nessun rischio: tutte modifiche di testo/contenuto, nessun impatto su logica o stato.

