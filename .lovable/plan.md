

# Ripristinare il menù con slide da sinistra

Riportare `MapMenuDrawer` al comportamento precedente: Sheet che scorre da sinistra con la stessa UI interna.

## Modifica

**File: `src/components/map/MapMenuDrawer.tsx`**

Sostituire `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` con `Sheet`/`SheetContent` (side="left") dal componente `src/components/ui/sheet.tsx`, mantenendo la stessa struttura interna (header "Bitplace", sezioni Home/Basics, footer Settings/Theme). Lo stile glass (`bg-background/95 backdrop-blur-xl`) e la struttura nav restano identici, solo il contenitore cambia da Dialog centrato a Sheet laterale sinistro.

Un solo file da modificare.

