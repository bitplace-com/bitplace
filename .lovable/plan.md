

# Fix del Tour Guidato: 7 problemi da risolvere

## Problemi identificati

1. **Pannello spiegazione login nascosto dietro la modale** -- Lo step "Two Ways to Play" si posiziona dietro il WalletSelectModal e non e' visibile
2. **Emoji al posto dei loghi** -- Usa pallini verde/viola anziche' i loghi Google e Phantom
3. **Mode Bar invisibile su mobile senza login** -- Nascosta con `!isMobile`, quindi il tour non puo' illuminarla
4. **Pannello disegno rimane aperto** -- Quando si passa agli step successivi, il tray espanso resta visibile coprendo i bottoni
5. **Copy Google da aggiornare** -- Aggiungere info sul rinnovo con un click
6. **Copy Phantom da aggiornare** -- Chiarire permanenza del disegno e meccanica di protezione
7. **Rimuovere "Start free with Google and upgrade anytime"**

## Modifiche

### 1. `src/hooks/useGuidedTour.ts` -- Aggiornare step e aggiungere cleanup automatico

- **Step "account-types"**: rendere target `__account-types__` (centered dialog, non ancorato al wallet-modal che sta sotto). Aggiungere a `CENTERED_TARGETS`. Rimuovere `position: 'right'`.
- **Aggiornare la description**: Rimuovere emoji. Usare un formato speciale (tipo `{{google}}` e `{{phantom}}`) per indicare dove inserire i loghi nel rendering. Aggiornare i copy:
  - Google: "300,000 free Pixels to draw anywhere. They expire after 72h, but you can renew them all with one click before they disappear."
  - Phantom: "Permanent Paint Energy (PE) from $BIT token. Your pixels stay forever and no one can paint over them unless they stake more PE."
  - Rimuovere "Start free with Google and upgrade anytime."
- **Step "toolbar"**: aggiungere action `bitplace:tour-close-signin` (gia' presente, ok)
- **Aggiungere azioni di cleanup**: Ogni step che segue il tray espanso deve emettere `bitplace:tour-collapse-tray` per chiudere il pannello. In pratica, lo step "menu" (id 6) deve avere `action: 'bitplace:tour-collapse-tray'`.
- Meglio ancora: gestire il cleanup in modo generico nel hook, emettendo un evento `bitplace:tour-cleanup` ad ogni cambio step, e i componenti ascoltano per resettarsi.

### 2. `src/components/map/GuidedTour.tsx` -- Rendering custom per step account-types

- Importare `GoogleLogo` e `phantomLogo`
- Per lo step `account-types` (centered), rendere un dialog custom con i loghi inline anziche' testo puro con emoji
- Lo step sara' in `CENTERED_TARGETS` quindi verra' renderizzato come dialog centrato sopra tutto (z-index 9999), visibile sopra il WalletSelectModal

### 3. `src/components/map/BitplaceMap.tsx` -- Mostrare MapToolbar sempre

- Rimuovere il wrapper `!isMobile` attorno al `HudSlot` con `MapToolbar`. Mostrarlo sempre, sia su mobile che desktop, cosi' il tour puo' illuminarlo.

### 4. `src/components/map/ActionTray.tsx` -- Ascoltare evento di collapse dal tour

- Aggiungere listener per `bitplace:tour-collapse-tray` che chiude il pannello (`setIsExpanded(false)`).

### 5. `src/hooks/useGuidedTour.ts` -- Cleanup generico tra step

- Nel `nextStep`, emettere eventi di cleanup per lo step che si sta lasciando:
  - Se si lascia lo step `action-tray-expanded`, emettere `bitplace:tour-collapse-tray`
  - Se si lascia lo step `account-types`, emettere `bitplace:tour-close-signin`
- Questo assicura che ogni pannello aperto dal tour venga chiuso quando si passa avanti.

## Dettaglio tecnico dei copy aggiornati

**Step account-types (nuovo):**
```
Google (Starter) -- 300,000 free Pixels to draw anywhere. They expire after 72h, but you can renew them all with one click before they disappear.

Phantom Wallet (Pro) -- Permanent Paint Energy (PE) from $BIT token. Your pixels stay forever and no one can paint over them unless they stake more PE.
```

**Rendering:** Lo step `account-types` usa `CENTERED_TARGETS` e viene renderizzato come dialog custom in `GuidedTour.tsx` con `<GoogleLogo>` e `<img src={phantomLogo}>` al posto delle emoji.

## File coinvolti
- `src/hooks/useGuidedTour.ts` -- Aggiornare step definitions, cleanup logic, CENTERED_TARGETS
- `src/components/map/GuidedTour.tsx` -- Rendering custom per account-types con loghi
- `src/components/map/BitplaceMap.tsx` -- Rimuovere `!isMobile` dal MapToolbar
- `src/components/map/ActionTray.tsx` -- Aggiungere listener per collapse-tray

