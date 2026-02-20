

## Fix: Token check in useDraftPaint blocca il Trial Mode

### Problema trovato
Il messaggio "Sign in to paint" proviene da `src/components/map/hooks/useDraftPaint.ts` alla riga 52-54. Questo hook controlla `localStorage.getItem('bitplace_session_token')` prima di permettere l'aggiunta di pixel al draft. In trial mode non esiste nessun token, quindi `addToDraft()` ritorna `false` e mostra il toast.

Questa e una **terza** location che controlla il token (le altre due, `usePaintQueue` e `useWalletGate`, sono state gia corrette), ma `useDraftPaint` non e mai stato aggiornato per supportare il trial mode.

### Soluzione

#### File: `src/components/map/hooks/useDraftPaint.ts`

Il fix e semplice: il hook deve bypassare il token check quando il trial mode e attivo. Due opzioni:

**Opzione scelta**: Leggere `isTrialMode` dal `WalletContext` direttamente dentro il hook (il hook gia usa solo React hooks, quindi puo importare `useWallet`).

Modifiche:
1. Aggiungere `import { useWallet } from '@/contexts/WalletContext';` in cima
2. Dentro la funzione `useDraftPaint()`, aggiungere `const { isTrialMode } = useWallet();`
3. Alla riga 52-56, cambiare il check del token:

```text
Prima:
const token = localStorage.getItem('bitplace_session_token');
if (!token) {
  toast.info('Sign in to paint');
  return false;
}

Dopo:
if (!isTrialMode) {
  const token = localStorage.getItem('bitplace_session_token');
  if (!token) {
    toast.info('Sign in to paint');
    return false;
  }
}
```

### Riepilogo

| File | Modifica |
|------|----------|
| `useDraftPaint.ts` | Importare `useWallet`, skip token check se `isTrialMode` |

Nessun altro file deve essere modificato. Le correzioni precedenti a `WalletContext`, `usePaintQueue` e `useWalletGate` restano invariate.
