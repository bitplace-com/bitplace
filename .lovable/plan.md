

# Aggiornamento Tour Guidato per Nuovi Utenti

## Cosa cambia e perche

Il tour attuale ha riferimenti obsoleti alla modalita Trial rimossa e non spiega il sistema di account a due livelli (Google Starter / Phantom Pro) ne la distinzione tra Pixel gratuiti e Paint Energy permanente. L'obiettivo e guidare il nuovo utente a capire subito come iniziare a giocare.

## Nuovo flusso del tour (9 step)

```text
1. Welcome         (dialog centrato, nessun target)
2. Sign In         (target: wallet, apre WalletSelectModal)
3. Account Types   (dialog centrato, spiega Starter vs Pro)
4. Mode Bar        (target: toolbar)
5. Drawing Panel   (target: action-tray, collassato)
6. Colors & Tools  (target: action-tray, espanso)
7. Menu            (target: menu)
8. Templates       (target: templates)
9. Search          (target: quick-actions)
```

### Dettaglio step nuovi/modificati

**Step 1 - Welcome** (invariato nel concetto, testo aggiornato)
- "Paint pixels on a real-world map, claim territory and compete. Sign in to start drawing!"

**Step 2 - Sign In** (NUOVO - target: `wallet`, action: `bitplace:tour-open-signin`)
- Evidenzia il bottone Sign In in alto a destra
- "Tap Sign In to create your account. You need an account to paint on the map."
- L'action dispatcha un evento custom che apre la WalletSelectModal
- Il tour si mette in pausa finche l'utente non chiude la modale (o passa allo step successivo)

**Step 3 - Account Types** (NUOVO - dialog centrato, `__info__`)
- Spiega le due opzioni senza puntare a un elemento specifico:
  - Google (Starter): 300,000 free Pixels, expire in 72h
  - Phantom Wallet (Pro): permanent Paint Energy (PE) from $BIT token
- "You can start free with Google and upgrade anytime by connecting a Phantom wallet."

**Step 8 - Wallet** (RIMOSSO come step separato - la spiegazione e gia coperta dagli step 2-3)

### Step invariati (solo testo pulito)
- Mode Bar, Drawing Panel, Colors & Tools, Menu, Templates, Search: rimangono uguali ma il testo dello step "wallet" originale viene eliminato.

## File da modificare

### 1. `src/hooks/useGuidedTour.ts`
- Riscrivere array `TOUR_STEPS` con i 9 step sopra
- Aggiornare `totalSteps` di conseguenza
- Aggiungere supporto per step di tipo "info" (centrato, senza target, come welcome)

### 2. `src/components/map/GuidedTour.tsx`
- Gestire il nuovo target speciale `__info__` come `__welcome__` (dialog centrato)
- Nello step "sign-in", dopo il dispatch dell'action, il tooltip punta al bottone wallet
- Aggiornare il rendering del dialog centrato per supportare step informativi mid-tour (non solo welcome)

### 3. `src/components/map/BitplaceMap.tsx` (o dove viene montato il GuidedTour)
- Aggiungere listener per l'evento `bitplace:tour-open-signin` che apre la WalletSelectModal
- Questo permette al tour di aprire programmaticamente la modale di sign in

## Dettagli tecnici

- Lo step `__info__` usa lo stesso layout centrato del welcome ma con stile tooltip (step counter, next/skip)
- L'action `bitplace:tour-open-signin` e un CustomEvent che il WalletButton/BitplaceMap ascolta per aprire la modale
- Il tour continua normalmente se l'utente clicca "Next" senza fare sign in (non forza il login)
- Nessuna modifica al backend, solo UI

