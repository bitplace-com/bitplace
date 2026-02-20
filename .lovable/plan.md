

## Aggiornamento Favicon per Phantom

### Cosa fare
Copiare l'immagine caricata (`Logo_white_back_Bitplace.png`) come nuovo `favicon.png` nella cartella `public/`. Questo file e' gia' referenziato in `index.html` come `<link rel="icon" href="/favicon.png">`, quindi Phantom lo prendera' automaticamente.

### File coinvolti

| Azione | File |
|---|---|
| Copia | `user-uploads://Logo_white_back_Bitplace.png` -> `public/favicon.png` |

Nessuna modifica a `index.html` necessaria (il riferimento e' gia' corretto). L'`apple-touch-icon.png` resta invariato come richiesto.

