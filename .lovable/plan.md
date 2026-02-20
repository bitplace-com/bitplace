

## Correzione Favicon e Logo Phantom

### Situazione
Il popup di Phantom prende automaticamente la favicon del sito — non c'e' modo di specificare un'immagine diversa solo per Phantom. Quindi usiamo il file **senza sfondo bianco** (`Favicon-2.png`) come unica favicon.

### Modifiche

| Azione | Dettaglio |
|---|---|
| Copia | `user-uploads://Favicon-2.png` → `public/favicon.png` |

Nessuna modifica a `index.html` o altri file. Il riferimento `<link rel="icon" href="/favicon.png">` resta invariato. Il file con sfondo bianco non verra' utilizzato.

