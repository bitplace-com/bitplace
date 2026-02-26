

## PRO badge basato su bilancio $BIT >= 1 (invece di PE stakato)

### Logica attuale
Il badge PRO viene mostrato se l'utente ha un wallet E `peUsedPe > 0` (PE attivamente stakato). Questo esclude utenti che hanno $BIT nel wallet ma non hanno ancora stakato.

### Nuova logica
PRO badge = ha wallet + almeno 1 $BIT nel wallet (`native_balance >= 1`). Il campo `native_balance` e gia tracciato nella tabella `users` e aggiornato periodicamente da `balance-check-all` e `energy-refresh`.

### Modifiche

**1. `supabase/functions/leaderboard-get/index.ts`**
- Aggiungere `native_balance` alla select in `paintersAllTime` (riga 105-110)
- Aggiungere `native_balance` alla select in `fetchUserProfiles` (riga 70-77)
- Aggiungere `nativeBalance` al return di `playerEntry` (riga 84-99)
- Per le RPC PE-based (investors/defenders/attackers): aggiungere `nativeBalance` calcolato dalla tabella users separatamente, oppure usare il fatto che chi ha `totalPe > 0` ha sicuramente $BIT (manteniamo PRO per loro)

**2. `src/hooks/useLeaderboard.ts`**
- Aggiungere `nativeBalance: number` a `PlayerPainterEntry` e `PlayerPeEntry`

**3. `src/components/modals/LeaderboardModal.tsx`**
- Cambiare la condizione del PRO badge (riga 128):
  - Da: `entry.walletAddress && hasActiveStake` (dove hasActiveStake = peUsedPe > 0)
  - A: `entry.walletAddress && (entry.nativeBalance >= 1 || hasActiveStake)`
  - Per le sub-categories PE (investors/defenders/attackers), chi appare ha gia $BIT per definizione, quindi PRO rimane

**4. Nessuna modifica a `balance-check-all`** — gia traccia `native_balance` per tutti gli utenti wallet con stake attivo. Per gli utenti wallet SENZA stake ma con $BIT, il campo `native_balance` viene aggiornato da `energy-refresh` quando sono online. Per la leaderboard, leggiamo direttamente il valore memorizzato nel DB.

### Deploy
Deploy di `leaderboard-get` dopo le modifiche.

### File da modificare

| File | Modifiche |
|------|-----------|
| `supabase/functions/leaderboard-get/index.ts` | Aggiungere `native_balance` ai dati player |
| `src/hooks/useLeaderboard.ts` | Aggiungere `nativeBalance` ai tipi |
| `src/components/modals/LeaderboardModal.tsx` | PRO badge se `nativeBalance >= 1` |
