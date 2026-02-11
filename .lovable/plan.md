

# Icona Discord + Feedback Aptico Completo

## Parte 1: Icona Discord nel pannello pixel

### Problema
Il link Discord nel `PixelInfoPanel` e nel `SettingsModal` usa l'icona generica `globe` invece di un'icona Discord dedicata. Il `PlayerProfileModal` non mostra affatto il Discord. La libreria `@hackernoon/pixel-icon-library` non include un'icona Discord, quindi va creata custom.

### Modifiche

**Nuovo file: `src/components/icons/custom/PixelDiscord.tsx`**
- Creare un'icona Discord in stile pixel-art (SVG 24x24 con pixel blocks), coerente con lo stile delle altre icone custom del progetto

**`src/components/icons/iconRegistry.ts`**
- Aggiungere `'discord'` al tipo `IconName` e registrare `PixelDiscord` nella mappa `icons`

**`src/components/map/PixelInfoPanel.tsx` (riga 240)**
- Sostituire `<PixelIcon name="globe" ...>` per il link Discord con `<PixelIcon name="discord" ...>`

**`src/components/modals/SettingsModal.tsx` (riga 334)**
- Sostituire `<PixelIcon name="globe" ...>` nell'etichetta Discord con `<PixelIcon name="discord" ...>`

**`src/hooks/usePlayerProfile.ts`**
- Aggiungere `socialDiscord` alla query `public_pixel_owner_info` (riga 62) e all'interfaccia `PlayerProfile`
- Mappare `profile?.social_discord` nel risultato (riga 117)

**`src/components/modals/PlayerProfileModal.tsx`**
- Aggiungere `socialDiscord` alla condizione `hasSocials` (riga 171)
- Aggiungere il link Discord nella sezione Social Links con `<PixelIcon name="discord" ...>`

---

## Parte 2: Feedback aptico completo

### Stato attuale
- Haptics esistono e funzionano (engine + hook + toggle in settings)
- Sono usati solo in: commit paint (`usePaintQueue`), like/save (`PlacesModal`), toggle settings
- **Mancano**: feedback durante il disegno singolo pixel, errori, validate, progresso continuo durante la barra

### Modifiche

**`src/lib/haptics.ts` - Nuovi pattern**
- Aggiungere pattern `progress_tick`: vibrazione breve crescente per il progresso (es. `[5]` -> `[8]` -> `[12]` man mano che la percentuale sale)
- Nessun nuovo pattern necessario, i pattern esistenti coprono gia i casi (`light`, `medium`, `success`, `error`, `commit`, `validate_success`, `validate_fail`)

**`src/components/map/hooks/useDraftPaint.ts` - Haptic su ogni pixel disegnato**
- Importare `hapticsEngine`
- Nel metodo `addToDraft`, dopo aver aggiunto il pixel al draft, chiamare `hapticsEngine.trigger('light')` - vibrazione leggera per ogni pixel piazzato

**`src/components/map/OperationProgress.tsx` - Vibrazione crescente durante il progresso**
- Importare `hapticsEngine`
- Aggiungere un `useEffect` che monitora `displayPercent`: ogni volta che la percentuale aumenta di almeno 10 punti, triggerare una vibrazione crescente
  - 0-30%: `hapticsEngine.trigger('light')` (10ms)
  - 30-60%: `hapticsEngine.trigger('medium')` (20ms)
  - 60-90%: `hapticsEngine.trigger('heavy')` (40ms)
- Quando `showComplete` diventa true (100%), triggerare `hapticsEngine.trigger('success')` - pattern di conferma [15, 50, 15]

**`src/hooks/useGameActions.ts` - Haptic su errore**
- Importare `hapticsEngine`
- In ogni punto dove viene settato `setLastError(...)`, aggiungere `hapticsEngine.trigger('error')` -- pattern [30, 50, 30, 50, 30]
- Nel commit success (riga 637, `toast.success`), aggiungere `hapticsEngine.trigger('validate_success')` per conferma

**`src/components/map/hooks/usePaintQueue.ts` - Haptic su errore flush**
- Nel catch (riga 158-161), aggiungere `hapticsEngine.trigger('error')`

### Riepilogo feedback aptico

| Evento | Pattern | Sensazione |
|--------|---------|------------|
| Pixel disegnato (draft) | `light` (10ms) | Tap leggero |
| Progresso 0-30% | `light` ogni 10% | Tick sottile |
| Progresso 30-60% | `medium` ogni 10% | Tick medio |
| Progresso 60-90% | `heavy` ogni 10% | Tick forte |
| Completamento (100%) | `success` [15,50,15] | Doppio tap secco |
| Commit success | `validate_success` [15,40,25] | Conferma |
| Errore | `error` [30,50,30,50,30] | Triplo buzz |

### File modificati
- `src/components/icons/custom/PixelDiscord.tsx` (nuovo)
- `src/components/icons/iconRegistry.ts`
- `src/components/map/PixelInfoPanel.tsx`
- `src/components/modals/SettingsModal.tsx`
- `src/hooks/usePlayerProfile.ts`
- `src/components/modals/PlayerProfileModal.tsx`
- `src/components/map/hooks/useDraftPaint.ts`
- `src/components/map/OperationProgress.tsx`
- `src/hooks/useGameActions.ts`
- `src/components/map/hooks/usePaintQueue.ts`

