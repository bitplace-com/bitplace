

# Fix del Tour Guidato

## Problemi identificati

1. **Step "Sign In"**: l'azione `bitplace:tour-open-signin` apre il WalletSelectModal, ma il tour cerca di evidenziare il bottone `wallet` con lo spotlight. Il modale si apre dietro l'overlay scuro e non si vede. Inoltre il tour crea un pannello centrato separato ("Two Ways to Play") che duplica informazioni.

2. **Step "Account Types" centrato**: mostra un dialogo custom `__info__` con testo hardcoded, invece di mostrare il vero WalletSelectModal gia' presente nell'app.

3. **Step finale "Search & Notifications"**: errato, i bottoni in alto a sinistra ora sono Search e Leaderboard.

4. **Bottoni in basso a destra**: Notifications e Art Opacity non hanno uno step nel tour.

## Soluzione

### Ristrutturazione degli step del tour

Il flusso diventa (10 step totali, welcome escluso):

| # | ID | Target | Descrizione |
|---|---|--------|-------------|
| 0 | welcome | `__welcome__` | Dialog di benvenuto (invariato) |
| 1 | sign-in | `wallet` | Evidenzia il bottone Sign In, spiega che serve un account |
| 2 | account-types | `__wallet-modal__` | Apre il WalletSelectModal e lo evidenzia con spotlight, spiegando Google vs Phantom |
| 3 | toolbar | `toolbar` | Mode Bar (invariato) |
| 4 | action-tray-collapsed | `action-tray` | Drawing Panel collassato (invariato) |
| 5 | action-tray-expanded | `action-tray` | Colors & Tools espanso (invariato) |
| 6 | menu | `menu` | Menu (invariato) |
| 7 | templates | `templates` | Templates (invariato) |
| 8 | quick-actions | `quick-actions` | Rinominato: "Search & Leaderboard" |
| 9 | bottom-right-controls | `bottom-right-controls` | NUOVO: Notifications e Art Opacity |

### Modifiche ai file

#### 1. `src/hooks/useGuidedTour.ts`

- **Step "sign-in"**: rimuovere l'action `bitplace:tour-open-signin` (il modale si apre nello step successivo, non qui)
- **Step "account-types"**: cambiare da `__info__` a `__wallet-modal__` (nuovo tipo). Aggiungere `action: 'bitplace:tour-open-signin'` qui, cosi' il modale si apre a questo step. Posizione `bottom`.
- **Step "quick-actions"**: aggiornare titolo a "Search & Leaderboard" e descrizione corrispondente
- **Nuovo step "bottom-right-controls"**: target `bottom-right-controls`, titolo "Notifications & Pixel Art", descrizione che spiega toggle opacita' e notifiche, posizione `left`
- Aggiungere `__wallet-modal__` a `CENTERED_TARGETS` (no, in realta' non e' centrato - va trattato come un target ancorato)
- Aggiornare `totalSteps` di conseguenza

#### 2. `src/components/map/GuidedTour.tsx`

- Nello step "account-types", il target `__wallet-modal__` deve trovare il dialog del WalletSelectModal sullo schermo. Useremo un selettore `data-tour="wallet-modal"` che aggiungeremo al DialogContent del modale.
- Quando il tour arriva allo step "account-types", dispatcha `bitplace:tour-open-signin` che apre il WalletSelectModal. Lo spotlight si posiziona sul dialog reale.
- Quando si va allo step successivo (toolbar), dispatcha `bitplace:tour-close-signin` per chiudere il modale.

#### 3. `src/components/modals/WalletSelectModal.tsx`

- Aggiungere `data-tour="wallet-modal"` al `DialogContent` cosi' il tour puo' trovarlo e posizionare lo spotlight.

#### 4. `src/components/map/BitplaceMap.tsx`

- Aggiungere listener per `bitplace:tour-close-signin` che chiude il WalletSelectModal.

#### 5. `src/components/map/ZoomControls.tsx`

- Aggiungere `data-tour="bottom-right-controls"` al div wrapper dei bottoni Notifications + Art Opacity.

### Dettaglio tecnico del flusso

```text
Welcome -> Sign In (spotlight su bottone) 
  -> Account Types (apre WalletSelectModal, spotlight sul modale reale)
  -> Toolbar (chiude WalletSelectModal, spotlight su toolbar)
  -> ... resto invariato ...
  -> Search & Leaderboard (spotlight su quick-actions)
  -> Notifications & Pixel Art (spotlight su bottom-right-controls)
```

Lo step "Account Types" non crea piu' un pannello custom: mostra il vero WalletSelectModal dell'app con lo spotlight sopra, e il tooltip del tour accanto che spiega le differenze tra Google e Phantom.

