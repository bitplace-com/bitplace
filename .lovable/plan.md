

# Fix: Settings e Theme Toggle in fondo al menù

Il problema è che il footer (Settings + Day/Night) non è ancorato in fondo al pannello. Il contenitore Sheet ha altezza piena (`h-[100dvh]`) ma manca il layout flex per spingere il footer in basso.

## Modifica

**File: `src/components/map/MapMenuDrawer.tsx`**

Due cambi minimi:
1. Aggiungere `flex flex-col` al className di `SheetContent` -- così i figli si distribuiscono verticalmente
2. Aggiungere `mt-auto` al div footer (riga 136) -- così Settings e ThemeToggle vengono spinti in fondo al pannello

Risultato: il menù sarà identico a prima con Settings e Day/Night Mode sempre ancorati in basso.

