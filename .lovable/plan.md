

# UI Polish: User Menu Panel

## Modifiche

### 1. Rimuovere icona matita dal header "PIXELS" (UserMenuPanel.tsx)

Nella sezione "PIXELS" per utenti `both` (riga 224-226) e per utenti `isGoogleOnly` (riga 154-155), rimuovere l'icona `PixelBalanceIcon` dal titolo della sezione.

### 2. Rimuovere wallet address dall'header utente (UserMenuPanel.tsx)

Rimuovere il blocco righe 114-128 che mostra l'indirizzo wallet abbreviato sotto l'email nell'header. L'indirizzo wallet resta visibile nella sezione WALLET piu' sotto.

### 3. Riordinare PE Overview: 2+1 layout (UserMenuPanel.tsx)

Cambiare la griglia PE da `grid-cols-3` (righe 323) a:
- Riga 1: `grid-cols-2` con **PE Balance** e **PE Used**
- Riga 2: **PE Available** da solo a larghezza piena

### 4. Aggiungere spazio sopra l'alert 72h (UserMenuPanel.tsx)

Nelle due sezioni con l'alert amber (righe 172 e 237), cambiare `mt-1` in `mt-3` per dare piu' respiro tra i dati e l'alert.

### 5. Riconciliazione account duplicati in classifica

Ho verificato il database: **non ci sono duplicati**. La logica di merge in `auth-verify` gia' gestisce correttamente la riconciliazione quando un utente Google collega un wallet (o viceversa): trasferisce tutti i dati (pixel, contribuzioni, stats XP/takeover) nell'account unificato e cancella il record duplicato. La classifica quindi non puo' mostrare duplicati perche' l'utente vecchio viene eliminato.

## File modificato

1 solo file: `src/components/modals/UserMenuPanel.tsx`

