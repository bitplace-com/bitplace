

# UI Polish: User Menu Panel — Icone e allineamento

## Modifiche al file `src/components/modals/UserMenuPanel.tsx`

### 1. Rimuovere import inutilizzato di PixelBalanceIcon
L'import `PixelBalanceIcon` (riga 4) non viene usato nel JSX ma e' ancora presente. Rimuoverlo per pulizia.

### 2. Aggiungere icona matita al titolo "Pixels Overview"
Alla riga 259-261, aggiungere `<PixelBalanceIcon size="xs" />` (icona brush/matita) accanto al testo "Pixels Overview", coerente con come PE Overview ha l'icona PE.

```
Pixels Overview  -->  [matita] Pixels Overview
```

Per farlo, mantenere l'import di `PixelBalanceIcon` ma usarlo nella sezione Pixels Overview.

### 3. Centrare il testo di PE Available
Nella card "PE Available" (righe 339-345), aggiungere `text-center` al div contenitore per centrare sia il label che il valore, rendendolo visivamente distinto come elemento a larghezza piena.

## Risultato visivo

```text
PIXELS OVERVIEW  (con icona matita)
  [Pixels Owned: X]  [Pixel Balance: X]

PE OVERVIEW  (con icona PE)
  [PE Balance: X]     [PE Used: X]
        [PE Available: X]           (centrato)
```

## File modificato

1 solo file: `src/components/modals/UserMenuPanel.tsx`

