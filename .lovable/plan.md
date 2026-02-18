

# Fix: Creazione Alliance fallisce con errore 400

## Problema identificato

La chiamata di creazione dell'alleanza restituisce HTTP 400. Analizzando i log e il codice, il problema piu' probabile e' la **validazione del nome**: la regex `^[a-zA-Z0-9 ]+$` accetta solo lettere ASCII, numeri e spazi. Qualsiasi carattere accentato, speciale o unicode viene rifiutato silenziosamente con "Name can only contain letters, numbers, and spaces".

C'e' anche un **bug nella verifica dell'expiry del token** (riga 59): `Date.now()` restituisce millisecondi, ma `payload.exp` e' in secondi. Questo puo' causare che token validi vengano considerati scaduti. Attualmente non blocca perche' il valore exp potrebbe essere gia' in millisecondi nel JWT custom, ma va corretto per sicurezza.

## Soluzione

### 1. Ampliare la regex del nome alliance
Permettere caratteri Unicode (lettere accentate, ecc.) oltre a numeri e spazi nel nome. Cambiare la regex da:
```
/^[a-zA-Z0-9 ]+$/
```
a:
```
/^[\p{L}\p{N} ]+$/u
```
Questo accetta qualsiasi lettera Unicode, numeri e spazi.

### 2. Correggere il check dell'expiry del token
Riga 59, cambiare:
```ts
if (payload.exp && Date.now() > payload.exp) {
```
in:
```ts
if (payload.exp && Date.now() > payload.exp * 1000) {
```
Cosi' il confronto tra millisecondi e' corretto.

### 3. Aggiungere log dell'errore specifico
Per rendere piu' facile il debug futuro, loggare il motivo esatto del rifiuto prima di restituire il 400 (ad esempio il messaggio di validazione fallita).

## File modificato

| File | Modifica |
|------|----------|
| `supabase/functions/alliance-manage/index.ts` | Regex nome Unicode, fix expiry check, log errori di validazione |

