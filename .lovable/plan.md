

# Icona Sparkles per Haptic + Fix Sistema Vibrazione

## Problema 1: Icona Haptic Feedback
Attualmente il toggle "Haptic Feedback" nelle Settings usa l'icona `smartphone`. Va sostituita con l'icona `sparkles-solid` di HackerNoon.

## Problema 2: La vibrazione non funziona -- Cause identificate

Ho trovato **due problemi distinti** nel codice:

### A) Doppio sistema di haptics non sincronizzato
Ci sono due modi diversi in cui il codice chiama la vibrazione:

1. **`haptic()` da `@/lib/haptics.ts`** -- usato in `BitplaceMap.tsx` e `MapToolbar.tsx`. Questa funzione chiama `navigator.vibrate()` direttamente, **ignorando completamente** il flag enabled/disabled dell'engine. Non ha alcun controllo on/off.

2. **`hapticsEngine.trigger()` da `@/lib/hapticsEngine.ts`** -- usato in tutti gli altri file (useDraftPaint, OperationProgress, useGameActions, PlacesModal, usePaintQueue). Questo rispetta il toggle delle Settings.

Il risultato: i due file piu importanti per l'interazione utente (la mappa e la toolbar) usano il sistema sbagliato.

### B) Vibration API non supportata nei browser in-app
Il `navigator.vibrate()` API ha supporto molto limitato:
- Funziona su **Android Chrome** (browser standalone)
- **NON funziona** su iOS Safari, iOS WebView, e la maggior parte dei browser in-app (incluso Phantom)

Phantom su iOS usa un WKWebView che **non supporta** `navigator.vibrate()`. Quindi `supportsVibration` risulta `false` e nessuna vibrazione viene mai triggerata.

Per far funzionare la vibrazione dentro Phantom/WebView, bisogna aggiungere un **fallback** che consiste nel triggerare la vibrazione in modo indiretto ma comunque percepibile: brevi suoni a frequenza molto bassa (sub-100Hz) che su dispositivi mobili producono una leggera vibrazione attraverso gli speaker. Tuttavia questa e una soluzione imperfetta.

La soluzione piu pulita e:
1. Unificare tutto su `hapticsEngine` (fix certo, necessario)
2. Rilevare correttamente il supporto e nascondere il toggle se non supportato (gia implementato ma il check fallisce nei WebView)
3. Accettare che nei browser in-app iOS la vibrazione nativa non e disponibile, e mostrarlo chiaramente all'utente

## Piano di implementazione

### 1. Nuova icona PixelSparkles
Creare `src/components/icons/custom/PixelSparkles.tsx` con il path SVG da `sparkles-solid` di HackerNoon. Registrarla nel registry come `sparkles`.

### 2. Aggiornare SettingsModal
Sostituire l'icona `smartphone` con `sparkles` per il toggle Haptic Feedback.

### 3. Unificare haptics su hapticsEngine
- **BitplaceMap.tsx**: Sostituire `import { haptic } from '@/lib/haptics'` con `import { hapticsEngine } from '@/lib/hapticsEngine'`, e cambiare tutte le chiamate `haptic('light')` in `hapticsEngine.trigger('light')`, ecc.
- **MapToolbar.tsx**: Stessa sostituzione.

### 4. Migliorare il rilevamento del supporto
Aggiornare `hapticsEngine.ts` per tentare un `navigator.vibrate(0)` al primo check -- alcuni WebView riportano `'vibrate' in navigator` come `true` ma poi falliscono silenziosamente. Aggiungere un try/catch piu robusto. Inoltre, se il dispositivo non supporta la vibrazione, il toggle nelle Settings viene gia nascosto (`hapticsSupported`), il che e corretto.

## File da modificare

| File | Modifica |
|------|----------|
| `src/components/icons/custom/PixelSparkles.tsx` | Nuovo: icona sparkles-solid |
| `src/components/icons/iconRegistry.ts` | Aggiungere `sparkles` |
| `src/components/modals/SettingsModal.tsx` | Icona `sparkles` per haptics |
| `src/components/map/BitplaceMap.tsx` | Migrare da `haptic()` a `hapticsEngine.trigger()` |
| `src/components/map/MapToolbar.tsx` | Migrare da `haptic()` a `hapticsEngine.trigger()` |
| `src/lib/hapticsEngine.ts` | Rilevamento supporto piu robusto |

## Nota su Phantom/WebView iOS
La Vibration API non e supportata nei browser in-app su iOS. Questo e un limite del sistema operativo, non del codice. Con le modifiche sopra, la vibrazione funzionera correttamente su Android Chrome e altri browser che supportano l'API. Su Phantom iOS, il toggle non apparira nelle Settings (comportamento corretto).

