
## Nuovo sistema di collateralizzazione: check solo al login

### Cambio di paradigma

Attualmente il sistema esegue chiamate RPC Solana ogni 6 ore per controllare i wallet offline. Questo non scala. Il nuovo approccio:

- **Check solo quando l'utente e online** e connette il wallet (gia gestito da `energy-refresh`)
- **Grace period di 7 giorni** dall'ultimo check valido
- **Decay progressivo in 72h** dopo la scadenza della grace period (tick orari, 72 step)
- **Floor a 1 PE per pixel** (i pixel non vengono cancellati)
- **DEF/ATK restano attive** durante il decay
- **PRO badge permanente** una volta verificato >= 1 $BIT (fino a smentita al prossimo login)

### Dettaglio tecnico

#### 1. Nuova colonna DB: `last_balance_verified_at`

Migrazione per aggiungere un timestamp che traccia l'ultimo check valido del bilancio (distinto da `last_energy_sync_at` che e usato per rate limiting). Questo campo viene aggiornato da `energy-refresh` quando il bilancio viene effettivamente verificato via RPC.

#### 2. Modifica `energy-refresh` (check online)

Quando un utente wallet si logga e il bilancio viene verificato con successo via RPC:
- Aggiornare `last_balance_verified_at = now()`
- Se l'utente era in rebalance ma ora e collateralizzato: fermare il rebalance, ripristinare `owner_health_multiplier = 1`
- La logica di collateralizzazione esistente (purge contribuzioni, start rebalance) resta uguale

#### 3. Riscrittura completa di `rebalance-tick` (cron leggero, zero RPC)

La funzione diventa un job puramente DB-based che gira ogni ora:
- Query SOLO utenti con `rebalance_active = true` (gia in decay) oppure wallet users la cui `last_balance_verified_at` e scaduta (> 7 giorni fa)
- **Per utenti con grace period scaduta**: avviare il rebalance. Il `rebalance_target_multiplier` viene calcolato come il rapporto che porta ogni pixel al floor di 1 PE. Usando la funzione DB `get_user_total_staked_pe(uid)` per ottenere lo stake totale senza caricare tutti i pixel.
- **Per utenti gia in rebalance**: aggiornare il `owner_health_multiplier` con interpolazione lineare. 72h = 72 tick orari.
- **Per utenti il cui decay e completato**: settare il multiplier finale. I pixel restano a 1 PE minimo.
- Zero chiamate Solana RPC, solo operazioni DB.

#### 4. Rimozione di `balance-check-all`

La edge function `balance-check-all` viene eliminata. Il cron job `balance-check-all-cron` (jobid 3) viene rimosso. Non serve piu: il check avviene solo al login.

#### 5. Aggiornamento cron schedule

- **Rimuovere** il cron `balance-check-all-cron` (jobid 3)
- **Aggiungere** un nuovo cron per `rebalance-tick` che gira **ogni ora** (`0 * * * *`)

#### 6. Aggiornamento costanti di decay

- Grace period: 7 giorni (`GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000`)
- Durata decay: 72 ore (`DECAY_DURATION_MS = 72 * 60 * 60 * 1000`)
- Tick: ogni ora (72 step totali)
- Target multiplier: calcolato come `1 / totalStakePerPixelMedio` per portare al floor di 1 PE, oppure piu semplicemente `numPixels / totalStake` (ogni pixel converge a 1 PE)

#### 7. PRO badge

Nessuna modifica necessaria. Il campo `native_balance` viene aggiornato da `energy-refresh` al login. Una volta che `native_balance >= 1`, il badge PRO resta visibile finche l'utente non torna online con un bilancio inferiore.

### Flusso completo

```text
Utente si logga con wallet
        |
        v
  energy-refresh verifica $BIT via RPC
        |
        v
  Aggiorna native_balance, pe_total_pe,
  last_balance_verified_at = now()
        |
        +-- Se collateralizzato: tutto ok, ferma eventuale rebalance
        +-- Se sotto-collateralizzato: avvia rebalance immediato (come ora)
        
        ... utente va offline ...

  Cron ogni ora (rebalance-tick):
        |
        v
  Query utenti con:
    - rebalance_active = true (aggiorna multiplier)
    - last_balance_verified_at < now() - 7 giorni
      E pe_used_pe > 0 (avvia rebalance per grace scaduta)
        |
        v
  Per nuovi rebalance (grace scaduta):
    - target = numPixels / totalStake (floor 1 PE/pixel)
    - rebalance_active = true
    - decay in 72h
        |
        v
  Per rebalance in corso:
    - Interpola multiplier linearly
    - owner_health_multiplier decresce ogni ora
        |
        v
  Utente torna, si logga:
    - energy-refresh ri-verifica
    - Se bilancio ok: rebalance_active = false, multiplier = 1
    - Pixel tornano al valore originale
```

### File coinvolti

| File | Azione |
|------|--------|
| Migrazione DB | Aggiungere `last_balance_verified_at` alla tabella `users` |
| `supabase/functions/energy-refresh/index.ts` | Aggiornare `last_balance_verified_at` al check RPC |
| `supabase/functions/rebalance-tick/index.ts` | Riscrittura: zero RPC, solo DB, grace period 7gg, decay 72h orario |
| `supabase/functions/balance-check-all/index.ts` | Eliminare il file |
| Cron jobs (SQL) | Rimuovere `balance-check-all-cron`, aggiungere `rebalance-tick` ogni ora |
| `supabase/config.toml` | Rimuovere entry `balance-check-all` (automatico) |
