

## Ottimizzazione Mobile e WalletButton Collassabile

### Problemi Identificati

1. **WalletButton sovrappone il MapToolbar**: Su mobile, il pulsante "Connect Wallet" (top-right) si sovrappone alla toolbar dei modi (Paint/Defend/Attack/Reinforce) posizionata al centro-top
2. **Menu laterale**: Piccoli problemi di spaziatura (padding top eccessivo nel drawer)
3. **WalletButton non collassabile**: Su mobile occupa troppo spazio orizzontale e non si puo nascondere

### Soluzione

#### 1. WalletButton Collassabile su Mobile
Creare un wrapper `MobileWalletButton` che:
- Quando **collassato**: mostra solo il pallino verde lampeggiante (indicatore wallet connesso) - occupa circa 32x32px
- Quando **espanso**: mostra il WalletButton completo con wallet abbreviato e bilancio
- **Tap sul pallino** per espandere, tap fuori o swipe per collassare
- Quando espanso, il menu Popover (UserMenuPanel) funziona normalmente
- Quando il wallet non e connesso: mostra il pulsante "Connect Wallet" compatto (solo icona wallet)

**File: `src/components/wallet/MobileWalletButton.tsx`** (nuovo)
- Componente wrapper che gestisce lo stato collapsed/expanded
- Collapsed: solo pallino verde animato (pulse) in un piccolo contenitore glass
- Expanded: il WalletButton completo attuale
- Auto-collapse dopo 5 secondi di inattivita (opzionale)

#### 2. Aggiornare BitplaceMap HUD Layout
**File: `src/components/map/BitplaceMap.tsx`** (righe 1684-1686)
- Su mobile: usare `MobileWalletButton` invece di `WalletButton`
- Su desktop: mantenere `WalletButton` invariato

#### 3. Fix Sovrapposizione Top Area
**File: `src/components/map/BitplaceMap.tsx`**
- Su mobile il MapToolbar (top-center) e il WalletButton (top-right) si sovrappongono
- Con il wallet collassato a pallino verde, lo spazio viene liberato
- Aggiungere `max-w-[60%]` al MapToolbar su mobile per evitare overflow

#### 4. Menu Drawer - Fix Spaziatura
**File: `src/components/map/MapMenuDrawer.tsx`**
- Ridurre il `mt-6` della nav a `mt-3` per meno spazio vuoto in alto
- Aggiungere `safe-top` al SheetContent per gestire correttamente il notch iOS

#### 5. ActionTray Mobile - Ottimizzazioni
**File: `src/components/map/ActionTray.tsx`**
- I bottoni tool row sono gia responsivi con classi sm: separate
- Verificare che la palette colori non sborda su schermi piccoli (gia ha `max-w-[calc(100vw-1rem)]`)

#### 6. StatusStrip Mobile - Fix Wrapping
**File: `src/components/map/StatusStrip.tsx`**
- Su schermi stretti, il contenuto wrappa su piu righe causando altezze variabili
- Aggiungere `overflow-x-auto` con `scrollbar-hide` per scroll orizzontale (gia presente)
- Verificare che i chip non si sovrappongano

### Dettagli Tecnici

**Nuovo file: `src/components/wallet/MobileWalletButton.tsx`**

```typescript
// Stato: collapsed (pallino verde) | expanded (WalletButton completo)
// - collapsed: div 32x32 glass con pallino verde animate-pulse
// - expanded: WalletButton originale con animazione slide-in
// - Se wallet non connesso: icona wallet compatta
// - Tap su pallino -> expand
// - Tap fuori -> collapse (useClickOutside)
```

**Modifica in BitplaceMap.tsx (riga 1684-1686):**
```typescript
<HudSlot position="top-right">
  {isMobile ? <MobileWalletButton /> : <WalletButton />}
</HudSlot>
```

**Modifica in MapMenuDrawer.tsx:**
- `mt-6` -> `mt-3` sulla nav
- Aggiungere `safe-top` al contenitore

**Modifica in WalletButton.tsx:**
- Nessuna modifica, resta il componente base riutilizzato

Totale file coinvolti: 4 (1 nuovo + 3 modifiche)

