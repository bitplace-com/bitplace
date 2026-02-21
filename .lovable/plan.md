

## Migrazione da $SOL a $BIT Token

Il piano che hai ricevuto da Claude e' sostanzialmente allineato con quello che avevamo gia' progettato. Ci sono alcune differenze minori da considerare:

### Differenze rispetto al prompt di Claude

1. **API DexScreener**: Claude suggerisce `/token-pairs/v1/solana/{CA}` con `pairs[0].priceUsd`. Il nostro piano usava `/tokens/v1/solana/{CA}`. Entrambi funzionano, ma il path `/token-pairs/` e' piu' affidabile perche' restituisce direttamente le coppie di trading con il prezzo. Useremo quello.

2. **Environment variables**: Claude suggerisce `BIT_TOKEN_MINT` e `DEXSCREENER_API_URL` come env vars. Non servono come secrets nel backend: il mint address e' una costante pubblica (non un segreto) e puo' essere hardcoded sia nel config frontend che nelle edge functions. Nessun secret aggiuntivo necessario.

3. **Rinomina `sol-balance`**: Claude suggerisce rinominare in `bit-balance` o `token-balance`. Rinomineremo in `token-balance` per essere piu' generici e future-proof.

### Piano di implementazione

**1. Configurazione frontend (`src/config/energy.ts`)**
- `ENERGY_ASSET` da `'SOL'` a `'BIT'`
- Aggiunge config `BIT` con symbol `'BIT'`, decimals `6`, mint address, e endpoint DexScreener
- Rimuove la vecchia config `BTP` placeholder

**2. Nuova edge function `token-balance` (sostituisce `sol-balance`)**
- Legge saldo SPL token con `getTokenAccountsByOwner` filtrato per mint `6az8wE4Gmns7bPLwfeR9Ed9pnGjqN5Cv9FJ3vs4Cpump`
- Prezzo da DexScreener `/token-pairs/v1/solana/{CA}` con cache 30s
- Solo mainnet (niente devnet fallback - i token SPL sono solo su mainnet)
- Gestisce il caso "0 BIT" (nessun token account = saldo 0)
- Response con campi `bitBalance`, `usdPrice`, `walletUsd`, `peTotal`

**3. Aggiorna `energy-refresh` edge function**
- Sostituisce `fetchSolBalanceFromRpc` / `fetchSolBalanceWithFallback` con `fetchBitBalance` (SPL token query)
- Sostituisce `fetchSolPrice` (Coinbase) con `fetchBitPrice` (DexScreener)
- Rimuove logica devnet/mainnet fallback
- Aggiorna tutti i valori response da `"SOL"` a `"BIT"`
- Aggiorna log da `[energy-refresh] SOL` a `[energy-refresh] BIT`

**4. Aggiorna `pe-status` edge function**
- Nessun cambiamento di logica (non dipende dal tipo di asset)
- Solo aggiornamento commenti/log per chiarezza

**5. Frontend: `useBalance.ts`**
- Chiama `token-balance` invece di `sol-balance`
- Rinomina `solBalance` -> `bitBalance`, `solUsdPrice` -> `bitUsdPrice`
- Rimuove logica cluster mainnet/devnet

**6. Frontend: `WalletContext.tsx`**
- Aggiorna tipo `EnergyState.energyAsset` da `'SOL' | 'BTP'` a `'SOL' | 'BIT'`
- Trial mode: cambia `'SOL'` -> `'BIT'` nei dati fittizi, simula saldo BIT
- Sync balance: aggiorna nomi campi da `solBalance` a `bitBalance`
- Aggiorna `updateEnergyFromUser` e `refreshEnergy` per usare `'BIT'`

**7. Frontend: `useEnergy.ts`**
- Aggiorna tipo union da `'SOL' | 'BTP'` a `'SOL' | 'BIT'`

**8. Frontend: `usePeBalance.ts`**
- Aggiorna tipo union da `'SOL' | 'BTP'` a `'SOL' | 'BIT'`

**9. Frontend: `ShopModal.tsx`**
- Aggiorna label da `'SOL'` a `'BIT'`/`'$BIT'`
- Aggiorna descrizione: "add $BIT to your wallet"

**10. Config: `supabase/config.toml`**
- Aggiunge entry `[functions.token-balance]` con `verify_jwt = false`

**11. Database: colonne users**
- Aggiorna default di `energy_asset` da `'SOL'` a `'BIT'`
- Aggiorna default di `native_symbol` da `'SOL'` a `'BIT'`
- Rimuove colonna `sol_cluster` (non piu' necessaria) o la rinomina -- valuteremo se tenerla per retrocompatibilita'

**12. Elimina vecchia edge function `sol-balance`**
- Rimossa dal codice e dal deploy

### Cosa NON cambia
- Formula PE: `PE = floor(walletUsd * 1000)` resta identica
- Collateralizzazione, rebalance, validate-then-commit: invariati
- Database triggers per `pe_used_pe`: invariati
- Autenticazione Phantom: invariata (stessa firma)
- Schema tabelle `pixels`, `pixel_contributions`: invariato

### Rischi
- **Basso**: DexScreener potrebbe avere downtime. Mitigato con cache 30s e fallback a ultimo prezzo noto
- **Basso**: Utente senza token account $BIT riceve PE = 0. Comportamento corretto e previsto
- **Nessuno**: La logica di gioco (paint, defend, attack) non cambia, solo la fonte dei dati di input

### Sequenza di implementazione
1. Config frontend + tipi TypeScript
2. Nuova edge function `token-balance`
3. Aggiorna `energy-refresh`
4. Aggiorna hooks frontend (`useBalance`, `WalletContext`, `useEnergy`, `usePeBalance`)
5. Aggiorna UI (`ShopModal`)
6. Migration DB (defaults colonne)
7. Deploy + elimina `sol-balance`
8. Test end-to-end

