
# Tour: Account-types step responsive + nuovo step "Sign In" su mobile

## Cosa cambia

### 1. Desktop: account-types ancorato a destra del login modal
Attualmente lo step `account-types` usa `CENTERED_TARGETS` e appare come dialog centrato, coprendo il login modal sottostante. Su desktop, va rimosso da `CENTERED_TARGETS` e reso un tooltip ancorato al `wallet-modal` (data-tour gia' presente sul DialogContent del WalletSelectModal) con `position: 'right'`. Cosi' il login resta visibile a sinistra e la spiegazione appare a destra.

### 2. Mobile: account-types resta centrato + nuovo step "sign-in-modal"
Su mobile lo schermo e' troppo stretto per ancorare a destra. Lo step resta centrato (come ora). Dopo di esso, si aggiunge un nuovo step `sign-in-modal` che mostra il login modal illuminandolo, con un testo breve tipo "This is your Sign In screen. Choose Google or Phantom to create your account." Questo step viene inserito solo su mobile.

### 3. Logica responsive nel hook e nel componente

**`src/hooks/useGuidedTour.ts`**:
- Esportare `TOUR_STEPS` come funzione `getTourSteps(isMobile: boolean)` oppure rendere il hook consapevole di `isMobile`.
- Su desktop: `account-types` ha target `wallet-modal`, position `right`. Nessun step extra.
- Su mobile: `account-types` ha target `__account-types__` (centered). Dopo di esso si inserisce uno step `sign-in-modal` con target `wallet-modal`, position `bottom`, che dice "This is your Sign In screen. Choose Google or Phantom to get started."
- Aggiornare `CENTERED_TARGETS` per NON includere `__account-types__` in modo statico; invece, nel componente GuidedTour, determinare se lo step corrente e' centered basandosi su `isMobile` e `currentStep.target`.
- Aggiornare `STEP_CLEANUP` per gestire anche il nuovo step `sign-in-modal` (emette `bitplace:tour-close-signin` quando lo si lascia).

**`src/components/map/GuidedTour.tsx`**:
- Importare `useIsMobile` da `@/hooks/use-mobile`.
- Passare `isMobile` alla logica che determina se uno step e' centered: lo step e' centered se il target inizia con `__` (come `__welcome__`) OPPURE se e' `account-types` E siamo su mobile.
- Il rendering dell'`AccountTypesContent` per lo step `account-types` funziona sia in modalita' centered (mobile) che ancorata (desktop).

## File coinvolti

### `src/hooks/useGuidedTour.ts`
- Accettare `isMobile` come parametro del hook
- Costruire la lista di step in modo dinamico:
  - Desktop: `account-types` con target `wallet-modal`, position `right`
  - Mobile: `account-types` con target `__account-types__` (centered), seguito da `sign-in-modal` con target `wallet-modal`
- Aggiornare cleanup: `sign-in-modal` emette `bitplace:tour-close-signin`
- `CENTERED_TARGETS` resta con solo `__welcome__` e `__account-types__` (usato solo su mobile)
- Esportare `CENTERED_TARGETS` come Set statico (invariato), la logica responsive e' nel componente

### `src/components/map/GuidedTour.tsx`
- Importare `useIsMobile`
- Passare `useIsMobile()` a `useGuidedTour(isMobile)`
- Determinare `isCentered` come: `currentStep.target.startsWith('__')`
- Per lo step `account-types`, renderizzare `AccountTypesContent` sia in centered che in anchored mode
- Per il nuovo step `sign-in-modal`, renderizzare come tooltip ancorato standard con il suo testo

## Dettaglio step su mobile vs desktop

```text
Desktop (10 step):
  0. welcome (centered)
  1. sign-in (wallet, left)
  2. account-types (wallet-modal, right) -- ancorato accanto al login
  3. toolbar ...
  ...

Mobile (11 step):
  0. welcome (centered)
  1. sign-in (wallet, left)
  2. account-types (__account-types__, centered) -- sopra il login
  3. sign-in-modal (wallet-modal, bottom) -- mostra il login
  4. toolbar ...
  ...
```

### Nuovo step (solo mobile)
```typescript
{
  id: 'sign-in-modal',
  target: 'wallet-modal',
  title: 'Sign In Screen',
  description: 'This is your Sign In screen. Choose Google or Phantom to create your account and start playing.',
  position: 'bottom',
}
```

Cleanup per `sign-in-modal`: emette `bitplace:tour-close-signin` quando lasciato.
