

# Fix: Modal chiusa al click su mobile

## Problema

In `MobileWalletButton.tsx`, il gestore `pointerdown` per il "click outside to collapse" controlla solo `data-radix-popper-content-wrapper` e `data-radix-dialog-overlay`, ma non controlla il **contenuto** del dialog/sheet. Quindi cliccando dentro un modale aperto dal menu utente, il wallet si collassa, smontando tutto.

## Soluzione

Aggiornare il check nel `pointerdown` handler di `MobileWalletButton.tsx` (righe 31-32) per escludere anche i click dentro qualsiasi dialog/sheet di Radix. Basta aggiungere il check per `[role="dialog"]` che copre sia Dialog che Sheet content.

## File modificato

| File | Modifica |
|------|----------|
| `src/components/wallet/MobileWalletButton.tsx` | Aggiungere `target.closest('[role="dialog"]')` al check di esclusione nel pointerdown handler (riga 31) |

## Dettaglio tecnico

Nella riga 31, il check attuale:
```ts
if (target.closest?.('[data-radix-popper-content-wrapper]') || target.closest?.('[data-radix-dialog-overlay]')) {
```

Diventa:
```ts
if (
  target.closest?.('[data-radix-popper-content-wrapper]') ||
  target.closest?.('[data-radix-dialog-overlay]') ||
  target.closest?.('[role="dialog"]')
) {
```

Questo copre i click su qualsiasi contenuto modale Radix (Dialog, Sheet, AlertDialog), impedendo il collapse del wallet quando l'utente interagisce con modali aperti dal menu.

