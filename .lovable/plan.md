

# Aggiunta spiegazione permanenza pixel con PE

## Modifica

**File: `src/components/modals/ShopModal.tsx`**

Dopo il paragrafo "How it connects to the game" (riga 141), prima del callout "$BIT is never spent", aggiungere un secondo paragrafo che spiega:

> Pixels painted with PE are permanent and protected. No one can paint over them unless they place more PE than you have on that pixel. The more energy you put on a pixel, the harder it is for others to take it.

Inserito come nuovo `<p>` tra riga 141 e 143, stesso stile `text-sm text-muted-foreground`.

