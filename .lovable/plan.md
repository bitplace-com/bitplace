

# Redesign del Pixel Info Panel

## Obiettivo

Ridisegnare il pannello info pixel per renderlo pulito, minimale, leggibile e senza elementi inutili. L'ordine dei contenuti cambia: prima l'utente, poi i dati economici del pixel, infine il box artwork.

## Cosa viene rimosso

- Titolo "Custom pixel" / "Unclaimed pixel" nell'header
- Riga coordinate (X: ... Y: ...)
- Bottoni Share, Report, Copy coords dall'header (manteniamo solo il Close)
- Etichette tecniche come "V_now", "V_floor (6h)"
- Chip "less than a minute ago" con calendario

## Nuovo layout (dall'alto verso il basso)

### 1. Header minimale
Solo il colore del pixel (dot) e il bottone Close (X). Nessun titolo, nessuna scritta.

### 2. Sezione Owner (in alto, subito visibile)
- Avatar (immagine o gradiente generato)
- Nome utente (con "(You)" se proprio) + Level pill + Alliance tag
- Wallet troncato (font mono, piccolo)
- Country flag inline
- Bio (se presente, max 2 righe)
- Social links (X, Instagram, Website) come icone cliccabili
- Spaziatura generosa tra gli elementi (`space-y-4` invece di `space-y-3`)

### 3. Sezione Pixel Economy
Box con sfondo `bg-muted/50` e buon padding, griglia a 2 colonne:

| Owner Stake | Total Stake |
|---|---|
| X PE | Y PE |
| ~$0.XX | ~$0.YY |

Sotto, riga DEF / ATK con icone colorate (verde/rosso) e valori.

Valori in $ calcolati con PE * 0.01.

### 4. Sezione Takeover / Claim
Box con sfondo `bg-muted/70`:
- "Claim Cost" (se pixel vuoto) oppure "Takeover Cost" (se pixel altrui)
- Valore in PE + equivalente in $
- Se floor-based, indicatore ambra

### 5. Sezione Rebalancing (se attiva)
Rimane come gia' migliorata nella modifica precedente (titolo "Stake Decaying", barra, testo descrittivo, next tick + value after tick).

### 6. Sezione My Involvement (se presente)
Rimane come gia' implementata (contribuzione DEF/ATK + "You own this pixel").

### 7. Sezione Artwork (in fondo)
- Label "Artwork" + contatore pixel posseduti + bottone "Expand"
- UserMinimap con `height="5rem"`
- Click su Expand apre OwnerArtworkModal (invariato)

## Pixel non reclamato

Vista centrata senza titolo: icona dashed + "Available to claim" + costo 1 PE (~$0.01).

## Dettagli tecnici

**File: `src/components/map/PixelInfoPanel.tsx`**

Riscrittura della sezione contenuto (righe 80-442):

1. **Header** (righe 88-143): semplificare rimuovendo coordinate, chips row, e bottoni extra. Mantenere solo dot colore + X close.

2. **Owner section** (righe 214-293): spostare in cima, aggiungere `space-y-4` per respiro, mantenere avatar/nome/level/alliance/wallet/bio/socials.

3. **Economy section** (righe 296-348): rinominare "V_now" in "Total Stake", usare PEIcon, aggiungere riga $ sotto ogni valore PE. Rimuovere "V_floor (6h)" dal grid principale (resta solo nella sezione rebalancing).

4. **Takeover section**: nuovo box dedicato sotto economy, con label chiara e valore PE + $.

5. **Artwork section** (righe 371-393): aggiungere contatore pixel (`{pixels_count} pixels`) accanto al label. Il componente UserMinimap e OwnerArtworkModal restano invariati.

6. **Spaziatura**: usare `space-y-4` per il container principale e `gap-3` nei sub-box per dare respiro.

Nessun nuovo file, nessuna nuova dipendenza. Solo refactor del layout dentro `PixelInfoPanel.tsx`.
