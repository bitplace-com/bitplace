

# Migliorare l'alert "Insufficient PE" nel pannello azioni

## Problema
Quando un utente con solo wallet Phantom prova a disegnare senza avere token $BIT (quindi 0 PE), l'errore mostrato e' un semplice testo rosso "Need 268 PE but only 0 available" -- poco utile e senza contesto su come procedere.

## Soluzione
Sostituire l'alert inline minimalista con un box informativo piu' ricco (stile coerente con gli altri alert del progetto, come il box blu per Google-only restriction gia' presente nello stesso componente) che spiega le due opzioni:

1. **Pixel temporanei gratis**: Connetti il tuo account Google per ottenere 300.000 pixel gratuiti. Scadono dopo 72h ma puoi rinnovarli con un click.
2. **Pixel permanenti con PE**: Hai bisogno di token $BIT nel tuo wallet -- i tuoi $BIT ti conferiscono Paint Energy (PE) che rende i pixel permanenti.

## Dettaglio tecnico

**File: `src/components/map/inspector/ActionBox.tsx`**

Nel blocco dell'errore inline (righe 274-285), quando il `validationResult.error === 'INSUFFICIENT_PE'`, renderizzare un box informativo espanso al posto del semplice messaggio di errore:

```tsx
{/* Insufficient PE - expanded info box */}
{validationResult && !validationResult.ok && validationResult.error === 'INSUFFICIENT_PE' && (
  <div className="space-y-3 px-3 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
    <div className="flex items-center gap-2">
      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
      <span className="text-xs font-medium text-foreground">Not enough Paint Energy</span>
    </div>

    {/* Option 1: Free pixels via Google */}
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-foreground">Free Pixels</p>
      <p className="text-[11px] text-muted-foreground">
        Sign in with Google to get 300,000 free pixels. They expire after 72h but you can renew them all with one click.
      </p>
    </div>

    {/* Option 2: Permanent pixels via $BIT */}
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-foreground">Permanent Pixels</p>
      <p className="text-[11px] text-muted-foreground">
        Your $BIT tokens give you Paint Energy (PE) — use it to make pixels permanent unless someone uses more PE. Add $BIT to your wallet to get started.
      </p>
    </div>
  </div>
)}
```

L'alert generico per altri errori non-INSUFFICIENT_PE resta invariato (fallback con il messaggio originale).

La condizione esistente alle righe 275-285 viene divisa in due rami: uno specifico per `INSUFFICIENT_PE` (il nuovo box informativo) e uno generico per tutti gli altri errori di validazione.

## File coinvolto
- `src/components/map/inspector/ActionBox.tsx` -- espandere l'alert insufficient PE

