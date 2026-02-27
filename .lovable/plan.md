

# Semplificazione User Menu Panel

## Cosa cambia

Rimuovere le sezioni **PIXELS OVERVIEW** e **PE OVERVIEW** dal pannello utente. Queste card con i numeri (Pixels Owned, Pixel Balance, PE Balance, PE Used, PE Available, PE Value) sono una ripetizione dei dati gia' presenti nel Pixel Control Center.

Il pannello terra' solo:
1. **Header utente** (avatar, nome, email, country, alliance)
2. **PIXELS** (bilancio disponibile/usato + alert 72h) -- per Google-only e utenti 'both'
3. **WALLET** (saldo BIT, valore USD, indirizzo) -- per wallet e utenti 'both'
4. **Azioni** (Pixel Control Center, Settings, Get $BIT)
5. **Sound toggle**
6. **Disconnect/Sign Out**

## Dettaglio tecnico

### File: `src/components/modals/UserMenuPanel.tsx`

1. **Rimuovere righe 255-371**: il blocco contenente `PIXELS OVERVIEW` e `PE OVERVIEW` (due sezioni con le card statistiche a griglia)
2. **Rimuovere import inutilizzati**: `PEIcon` (riga 3), `PixelBalanceIcon` (riga 4), e `Tooltip/TooltipTrigger/TooltipContent/TooltipProvider` (riga 2) se non usati altrove -- ma i Tooltip sono usati nelle sezioni PIXELS sopra, quindi li teniamo
3. **Rimuovere `PEIcon` e `PixelBalanceIcon`** dagli import dato che non saranno piu' usati nel file

Risultato: pannello piu' snello e senza dati duplicati.
