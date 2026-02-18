

# Aggiornamento Favicon e Apple Touch Icon

## Cosa faremo

1. Copiare le due immagini caricate nella cartella `public/`:
   - `user-uploads://Favicon_black.png` -> `public/favicon.png`
   - `user-uploads://Apple_touch_black.png` -> `public/apple-touch-icon.png`

2. Aggiornare `index.html` nel `<head>` per aggiungere i riferimenti corretti:
   - `<link rel="icon" href="/favicon.png" type="image/png">` (sostituisce il vecchio `favicon.ico`)
   - `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`

3. Rimuovere il vecchio file `public/favicon.ico` (non piu necessario).

## File coinvolti
- `public/favicon.png` (nuovo)
- `public/apple-touch-icon.png` (nuovo)
- `public/favicon.ico` (da rimuovere)
- `index.html` (aggiornamento tag `<link>` nel `<head>`)

