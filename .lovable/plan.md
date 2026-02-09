

# Tooltip sul badge Decay nella StatusStrip

## Cosa cambia

Aggiunta di un tooltip informativo sul badge del decay (cuore + percentuale + timer) nella barra di stato in basso. Il tooltip spiega all'utente cosa significa quel badge: il valore dei suoi pixel sta decadendo perche' il valore in dollari del suo wallet (in $BIT) e' inferiore al totale di PE richiesto dai pixel posseduti.

## Dettagli tecnici

**File da modificare:** `src/components/map/StatusStrip.tsx`

Il componente usa gia' `TooltipProvider` e i componenti `Tooltip`/`TooltipTrigger`/`TooltipContent` (vedi il bottone Refresh). Basta wrappare il `<div>` del rebalance badge (righe ~166-173) con gli stessi componenti Tooltip.

Il contenuto del tooltip sara':
- Titolo: "Pixel Decay Active"
- Spiegazione: il valore in $ del wallet e' sotto il minimo richiesto per sostenere i pixel posseduti, quindi lo stake sui pixel sta decadendo gradualmente. Ricaricare il wallet ferma il decay.

Su mobile il tooltip funzionera' al tap grazie al comportamento nativo di Radix Tooltip.

