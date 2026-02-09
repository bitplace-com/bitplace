
# Aggiunta sezione "Your money, your choice" al White Paper

## Cosa cambia

Aggiunta di una nuova sezione tra "Value creation" e il CTA finale, in entrambi i file (modale e pagina). Il posizionamento dopo "Value creation" e' naturale: prima si spiega come il valore viene creato, poi si chiarisce che quel valore resta sempre dell'utente.

## Titolo sezione

**"Your money, your choice"**

## Contenuto

Il concetto chiave da comunicare:
- Per giocare devi comprare $BIT, quindi metti valore reale nel gioco
- Ma quei soldi non sono "spesi" come in un gioco tradizionale dove il denaro va ai creatori
- In qualsiasi momento puoi vendere i tuoi $BIT e riavere indietro i tuoi soldi
- Tutto il valore circola nella community: chi detiene $BIT detiene il valore
- Non esiste un modello pay-to-win che arricchisce solo i creatori del gioco
- Il giocatore e' libero di uscire quando vuole senza aver "perso" i propri soldi

## File da modificare

1. **`src/components/modals/WhitePaperModal.tsx`** - Nuova sezione tra "Value creation" (riga 128) e il footer CTA (riga 131)
2. **`src/pages/WhitePaperPage.tsx`** - Stessa sezione tra "Value creation" (riga 111) e il footer CTA (riga 114)

## Dettagli tecnici

Entrambi i file riceveranno lo stesso blocco di testo, con le differenze di stile gia presenti (il modale usa `text-sm`, la pagina usa dimensioni standard). La struttura sara un `<section>` con titolo h2 e paragrafi descrittivi, coerente con le sezioni esistenti.
