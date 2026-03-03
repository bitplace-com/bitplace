

# Menu drawer più spazioso

Il pannello è attualmente fissato a `w-[280px]`. Guardando lo screenshot, effettivamente gli elementi sono compressi. Serve aumentare la larghezza e lo spacing interno.

## Modifiche in `src/components/map/MapMenuDrawer.tsx`

1. **Larghezza**: da `w-[280px] sm:max-w-[280px]` a `w-[320px] sm:max-w-[320px]`
2. **Header**: padding più generoso, da `px-5 pt-5 pb-3` a `px-6 pt-6 pb-4`
3. **Nav**: da `px-3 pb-3 space-y-4` a `px-4 pb-4 space-y-5`
4. **Section labels**: da `px-3 mb-2` a `px-3 mb-2.5`
5. **Bottoni nav**: da `h-11` a `h-12` per più respiro verticale
6. **Footer**: da `px-3 pb-4 pt-3` a `px-4 pb-5 pt-4`

Un solo file, modifiche puramente di spacing/sizing.

