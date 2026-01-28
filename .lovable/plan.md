

# Fix: Bilancio PE Mostra Solo 1000 Pixel (Limite Supabase)

## Problema Identificato

L'edge function `energy-refresh` calcola manualmente `owner_used` con:

```typescript
const { data: ownedPixels } = await supabase
  .from("pixels")
  .select("owner_stake_pe")
  .eq("owner_user_id", userId);

const ownerUsed = (ownedPixels || []).reduce(...);
```

**Ma Supabase ha un limite di 1000 righe per query!** Quindi con 3631 pixel, ritorna solo 1000.

| Campo | Database Reale | Edge Function Calcola |
|-------|----------------|----------------------|
| Pixels owned | 3631 | 1000 (limite!) |
| PE used | 3631 | 1000 |

## Soluzione

La tabella `users` ha già un campo `pe_used_pe` mantenuto automaticamente dai trigger del database. L'edge function deve usare questo valore invece di ricalcolare manualmente.

### Modifiche a `supabase/functions/energy-refresh/index.ts`

**1. Aggiungere `pe_used_pe` alla SELECT iniziale dell'utente (riga 238):**

```typescript
// PRIMA
.select("id, wallet_address, native_balance, usd_price, wallet_usd, pe_total_pe, ...")

// DOPO
.select("id, wallet_address, native_balance, usd_price, wallet_usd, pe_total_pe, pe_used_pe, ...")
```

**2. Per il path rate-limited (stale), usare `pe_used_pe` + COUNT per pixelsOwned:**

```typescript
// PRIMA (riga 268-288): Query con limite 1000
const { data: pixelStakes } = await supabase
  .from("pixels")
  .select("owner_stake_pe")
  .eq("owner_user_id", userId);

const pixelStakeTotal = (pixelStakes || []).reduce(...);
const peUsed = pixelStakeTotal + contribTotal;

// DOPO: Usare dati pre-calcolati dal trigger
const peUsed = Number(userData.pe_used_pe) || 0;

// Per pixelsOwned, usare COUNT invece di length
const { count: pixelCount } = await supabase
  .from("pixels")
  .select("*", { count: "exact", head: true })
  .eq("owner_user_id", userId);

const pixelsOwned = pixelCount || 0;
```

**3. Per il path principale (fresh), stessa correzione (riga 348-355):**

```typescript
// PRIMA
const { data: ownedPixels } = await supabase
  .from("pixels")
  .select("owner_stake_pe")
  .eq("owner_user_id", userId);

const ownerUsed = (ownedPixels || []).reduce(...);

// DOPO: Usare pe_used_pe dal record utente + COUNT separato
// (pe_used_pe include già owner stake + contributions da trigger)

const { count: pixelCount } = await supabase
  .from("pixels")
  .select("*", { count: "exact", head: true })
  .eq("owner_user_id", userId);

// Per le contribuzioni, servono ancora perché NON sono in pe_used_pe
const { data: userContribs } = await supabase
  .from("pixel_contributions")
  .select("amount_pe")
  .eq("user_id", userId);

const contribUsed = (userContribs || []).reduce(...);

// Calcolare ownerUsed come differenza
const peUsedFromDb = Number(userData.pe_used_pe) || 0;
const ownerUsed = peUsedFromDb - contribUsed; // owner_stake = pe_used - contributions
```

**4. Aggiornare anche la response con pixelStakeTotal corretto:**

```typescript
// Usare SUM aggregato per pixelStakeTotal
const { data: stakeSum } = await supabase
  .from("pixels")
  .select("owner_stake_pe.sum()")
  .eq("owner_user_id", userId)
  .single();

const pixelStakeTotal = Number(stakeSum?.sum) || 0;
```

## Riepilogo Cambiamenti

| File | Modifica |
|------|----------|
| `supabase/functions/energy-refresh/index.ts` | Usare `pe_used_pe` da users + `COUNT(*)` per pixelsOwned + `SUM()` per pixelStakeTotal |

## Test di Verifica

1. Ricaricare la pagina dopo il deploy
2. Verificare che StatusStrip mostri **3631** pixels owned
3. Verificare che UserMenuPanel mostri gli stessi valori
4. Verificare che PE Available = PE Total - 3631

