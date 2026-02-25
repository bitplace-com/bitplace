

## Modifiche alla StatusStrip

### 1. Rimuovere il bottone "Sign in required" (righe 74-83)
Eliminare completamente il blocco `needsSignature` pill dalla barra inferiore. Il bottone Sign In in alto a sinistra (WalletButton) gia copre questa funzione.

### 2. Aggiungere footer legale "© 2026 Bitplace · Privacy Policy · T&C"

**Stato disconnesso** (`!userId`): sostituire il layout centrato con un flex justify-between:
- Sinistra: `© 2026 Bitplace · Privacy Policy · T&C` con link a `/privacy` e `/terms`
- Destra: "Connect your wallet to paint"

**Stato connesso** (`userId` presente): aggiungere i link legali come primo elemento nel lato sinistro, prima del draft counter e BIT balance:
- Testo `text-[10px]` muted, separato da `·`
- Visibile solo su desktop (`hidden sm:flex`) per non rubare spazio su mobile
- Link con hover underline

### File da modificare
- `src/components/map/StatusStrip.tsx`
  - Aggiungere import di `Link` da `react-router-dom`
  - Rimuovere righe 74-83 (blocco "Sign in required")
  - Modificare il return dello stato disconnesso (righe 50-58) per mostrare il footer legale
  - Aggiungere footer legale nel lato sinistro dello stato connesso

