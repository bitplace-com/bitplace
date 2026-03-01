
# Aggiornare il logo Google ovunque con il classico "G" multicolore

## Problema
I bottoni "Sign in with Google" nel Pixel Control Panel e nel User Menu usano l'icona pixel-art (`PixelIcon name="google"`), mentre la modale di sign-in (WalletSelectModal) usa il vero logo multicolore di Google. Serve uniformare.

## Modifiche

### 1. Estrarre `GoogleLogo` in un componente condiviso
Creare `src/components/icons/GoogleLogo.tsx` con il classico SVG multicolore "G" attualmente definito dentro `WalletSelectModal.tsx`. Accetta `className` e `size` per adattarsi ai diversi contesti.

### 2. Aggiornare `WalletSelectModal.tsx`
Importare `GoogleLogo` dal nuovo file condiviso e rimuovere la definizione locale.

### 3. Aggiornare `PixelControlPanel.tsx`
Sostituire `<PixelIcon name="google" className="h-3.5 w-3.5" />` con `<GoogleLogo className="h-3.5 w-3.5" />`.

### 4. Aggiornare `UserMenuPanel.tsx`
Sostituire `<PixelIcon name="google" className="h-4 w-4" />` con `<GoogleLogo className="h-4 w-4" />`.

## File coinvolti
- `src/components/icons/GoogleLogo.tsx` (nuovo)
- `src/components/modals/WalletSelectModal.tsx` (import dal nuovo file)
- `src/components/modals/PixelControlPanel.tsx` (sostituzione icona)
- `src/components/modals/UserMenuPanel.tsx` (sostituzione icona)
