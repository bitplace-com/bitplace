

## PRO badge basato su PE stakato + Periodic balance check

### Stato attuale

- **VPE in Top Painters**: Gia funzionante. Il contatore `pixels_painted_total` viene incrementato anche per utenti VPE e NON viene decrementato alla scadenza dei pixel VPE. Nessuna modifica necessaria.
- **PRO badge**: Attualmente mostrato per chiunque abbia un `walletAddress`. Va cambiato per mostrarlo solo a chi ha almeno 1 PE effettivamente stakato (`pe_used_pe > 0`).
- **Balance check**: `energy-refresh` controlla la collateralizzazione ma solo quando l'utente e online. `rebalance-tick` lavora con il `pe_total_pe` memorizzato, che diventa stale se l'utente non torna. **Non esiste un job periodico che aggiorna i bilanci wallet da Solana per tutti gli utenti.**

### 1. PRO badge basato su PE stakato

**leaderboard-get/index.ts**: Aggiungere `pe_used_pe` ai dati restituiti per i player:
- In `paintersAllTime`: aggiungere `pe_used_pe` alla select
- In `fetchUserProfiles`: aggiungere `pe_used_pe` alla select  
- In `playerEntry`: includere `peUsedPe` nel return
- Per le RPC PE-based (investors/defenders/attackers): il `totalPe > 0` implica gia staking attivo

**useLeaderboard.ts**: Aggiungere `peUsedPe` a `PlayerPainterEntry` e `PlayerPeEntry`.

**LeaderboardModal.tsx**: Cambiare la logica badge in `PlayerRow`:
- Se `isAdmin` -> AdminBadge
- Se ha wallet E `peUsedPe > 0` (o per PE sub-categories, `totalPe > 0`) -> ProBadge con shine
- Se ha wallet ma 0 PE stakato -> nessun badge speciale (o Starter se preferisci)
- Se NON ha wallet -> StarterBadge

### 2. Periodic wallet balance check (nuova edge function)

Creare `supabase/functions/balance-check-all/index.ts`:
- Funzione cron che viene invocata periodicamente (ogni 6 ore, come rebalance-tick)
- Carica tutti gli utenti wallet-based con `pe_used_pe > 0` (solo quelli con stake attivo)
- Per ciascun utente, fetcha il bilancio $BIT da Solana RPC e ricalcola `pe_total_pe`
- Se sotto-collateralizzato: purga le contributions e avvia rebalance (stessa logica di energy-refresh)
- Rate limiting: processa max ~50 utenti per esecuzione per non sovraccaricare la Solana RPC
- Logging dettagliato per monitorare lo stato

Questo garantisce che anche gli utenti che non tornano sulla piattaforma vengano eventualmente ri-bilanciati.

### 3. Deploy

Deploy delle edge functions `leaderboard-get` e `balance-check-all`.

---

### File da modificare/creare

| File | Modifiche |
|------|-----------|
| `supabase/functions/leaderboard-get/index.ts` | Aggiungere `pe_used_pe` ai dati player |
| `src/hooks/useLeaderboard.ts` | Aggiungere `peUsedPe` ai tipi entry |
| `src/components/modals/LeaderboardModal.tsx` | PRO badge solo se `peUsedPe > 0` |
| `supabase/functions/balance-check-all/index.ts` | **NUOVO** - Cron job per verificare bilanci wallet periodicamente |

