
## Fix: "Sign In" deve sempre aprire il pannello di selezione

### Problema
Quando Phantom e installato e il token e scaduto, la pagina si carica in stato `AUTH_REQUIRED` (wallet gia connesso ma serve firma). In questo stato, il bottone "Sign In" chiama direttamente `signIn()` che apre il popup di Phantom senza mostrare il pannello di selezione Google/Phantom/Trial.

### Soluzione
Cambiare il flusso: il bottone "Sign In" apre **sempre** il `WalletSelectModal`, indipendentemente dallo stato. Il modal mostrera le opzioni contestuali:
- Se Phantom e gia connesso (AUTH_REQUIRED): mostra "Continue with Phantom" + Google come alternativa
- Se disconnesso: mostra Google + Phantom + Trial come adesso

### Modifiche

**1. `src/components/wallet/WalletButton.tsx`**
- Rimuovere il branch separato per `AUTH_REQUIRED` (righe 57-69) che bypassa il modal
- Unificare: lo stato `AUTH_REQUIRED` usa lo stesso bottone "Sign In" che apre il modal
- Aggiungere `onActivateTrial={activateTrialMode}` al `WalletSelectModal` (mancante sul desktop)
- Passare `needsSignature` e `walletAddress` al modal cosi sa mostrare il contesto giusto

**2. `src/components/modals/WalletSelectModal.tsx`**
- Aggiungere props opzionali: `needsSignature?: boolean`, `connectedWalletAddress?: string`
- Quando `needsSignature` e true: mostrare una sezione Phantom speciale "Continue with connected wallet (4J2k...vqRR)" con un bottone per firmare
- Mostrare sempre Google come alternativa (l'utente puo scollegare Phantom e usare Google)
- Aggiungere prop `onSignIn?: () => void` per il caso AUTH_REQUIRED

**3. `src/components/wallet/MobileWalletButton.tsx`**
- Stesso fix: quando in `AUTH_REQUIRED`, aprire il modal invece di un bottone diretto

### Dettagli tecnici

```text
WalletButton.tsx:
  // PRIMA (AUTH_REQUIRED aveva un branch separato):
  if (needsSignature && walletAddress) {
    return <Button onClick={handleSignIn}>Sign In</Button>; // bypass modal!
  }

  // DOPO (AUTH_REQUIRED usa lo stesso flusso del disconnected):
  if (!isConnected || needsSignature) {
    return (
      <Button onClick={() => setModalOpen(true)}>Sign In</Button>
      <WalletSelectModal
        needsSignature={needsSignature}
        connectedWalletAddress={walletAddress}
        onSignIn={handleSignIn}
        onActivateTrial={activateTrialMode}
        ...
      />
    );
  }
```

```text
WalletSelectModal.tsx:
  // Se Phantom e gia connesso e serve firma:
  {needsSignature && connectedWalletAddress && (
    <button onClick={onSignIn}>
      <PhantomLogo />
      "Continue with Phantom (4J2k...vqRR)"
      "Sign message to authenticate"
    </button>
  )}
  
  // Google sempre visibile come alternativa
  <button onClick={googleSignIn}>
    <GoogleLogo />
    "Sign in with Google"
  </button>
  
  // Phantom "nuova connessione" (solo se NON gia connesso)
  {!needsSignature && (
    <button onClick={onSelectPhantom}>
      <PhantomLogo />
      "Phantom - Solana wallet"
    </button>
  )}
```

### File da modificare
- `src/components/wallet/WalletButton.tsx` -- unificare branch disconnected + AUTH_REQUIRED
- `src/components/modals/WalletSelectModal.tsx` -- aggiungere contesto AUTH_REQUIRED
- `src/components/wallet/MobileWalletButton.tsx` -- stesso fix per mobile
