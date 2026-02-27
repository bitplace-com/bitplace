

# Fix: Wallet Linking - Unique Constraint Violation

## Problema

Quando un utente Google (team@bitplace.com) tenta di collegare il wallet, il merge fallisce con:

```
duplicate key value violates unique constraint "users_wallet_address_key"
Key (wallet_address)=(4J2kvqRR...) already exists.
```

Il codice attuale (riga 226-241) aggiorna l'utente Google con `wallet_address = wallet` mentre l'utente wallet-only ha ancora quel `wallet_address`, violando la constraint UNIQUE.

## Soluzione

Aggiungere una singola riga in `supabase/functions/auth-verify/index.ts` dopo i trasferimenti dati (dopo riga 215) e prima dell'update di merge (riga 226):

```typescript
// Clear wallet_address on old user to avoid unique constraint violation
await supabase.from('users').update({ wallet_address: null }).eq('id', walletUserId);
```

Sequenza corretta:
1. Trasferire pixel, contribuzioni, notifiche, pin, luoghi, follows, alleanze (invariato)
2. **Azzerare `wallet_address` sull'utente wallet-only** (NUOVO)
3. Aggiornare l'utente Google con `wallet_address` e `auth_provider: 'both'` (invariato)
4. Eliminare l'utente wallet-only (invariato)

## File modificato

1 solo file: `supabase/functions/auth-verify/index.ts` - aggiunta di 2 righe dopo riga 215.

