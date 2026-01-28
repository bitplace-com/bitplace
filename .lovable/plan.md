
# Fix: PE Used Returns 0 Instead of 3631

## Problema Identificato

I log mostrano chiaramente il bug:

```
[energy-refresh] User ...: pe_total=15089, owner_used=3631, contrib_used=0
[energy-refresh] Final PE status: total=15089, used=0, available=15089
```

**Causa**: Il codice accede al campo sbagliato nel risultato dell'aggregate Supabase.

```typescript
// SBAGLIATO - Supabase restituisce il valore con il nome della colonna
const finalPixelStakeTotal = Number(finalStakeSum.data?.sum) || 0;  // → 0

// CORRETTO - Il campo si chiama come la colonna
const finalPixelStakeTotal = Number(finalStakeSum.data?.owner_stake_pe) || 0;  // → 3631
```

## Database Verificato ✅

| Campo | Valore |
|-------|--------|
| `users.pe_used_pe` | 3631 |
| `SUM(pixels.owner_stake_pe)` | 3631 |

## Soluzione

Poiché `pe_used_pe` è già calcolato dai trigger del database ed è sempre accurato, la soluzione più semplice è usare quel valore direttamente invece di ricalcolare con aggregate.

### Modifiche a `supabase/functions/energy-refresh/index.ts`

**1. Path rate-limited (righe 280-285):**

```typescript
// PRIMA (sbagliato):
const pixelStakeTotal = Number(stakeSumResult.data?.sum) || 0;
const peUsed = Number(userData.pe_used_pe) || 0;

// DOPO: Usare pe_used_pe come fonte unica di verità
const peUsed = Number(userData.pe_used_pe) || 0;
const pixelStakeTotal = peUsed; // pe_used_pe = owner_stake + contributions
```

**2. Path principale (righe 459-464):**

```typescript
// PRIMA (sbagliato):
const finalPixelStakeTotal = Number(finalStakeSum.data?.sum) || 0;
const finalContribUsed = Number(finalContribSum.data?.sum) || 0;
const peUsed = finalPixelStakeTotal + finalContribUsed;

// DOPO: Riutilizzare pe_used_pe già calcolato + fetched da DB
// Nota: pe_used_pe viene aggiornato atomicamente dai trigger
const { data: freshUserData } = await supabase
  .from("users")
  .select("pe_used_pe")
  .eq("id", userId)
  .single();

const peUsed = Number(freshUserData?.pe_used_pe) || 0;
const peAvailable = Math.max(0, peTotal - peUsed);

// Per pixelStakeTotal, usare owner_stake separato (pe_used - contrib)
// Oppure più semplice: usare il valore già calcolato ownerUsed
const finalPixelStakeTotal = ownerUsed; // già calcolato a riga 359
```

**3. Alternativa più pulita - Correggere l'accesso ai campi aggregate:**

Se vogliamo mantenere le query aggregate, correggere i nomi dei campi:

```typescript
// Riga 281:
const pixelStakeTotal = Number(stakeSumResult.data?.owner_stake_pe) || 0;

// Riga 460:
const finalPixelStakeTotal = Number(finalStakeSum.data?.owner_stake_pe) || 0;

// Riga 461:
const finalContribUsed = Number(finalContribSum.data?.amount_pe) || 0;
```

## Approccio Raccomandato

Usare `pe_used_pe` dalla tabella users come fonte unica di verità:
- È sempre aggiornato atomicamente dai trigger
- Bypassa completamente il problema dei nomi aggregate
- Evita query duplicate al database
- Più semplice da mantenere

## Riepilogo Modifiche

| File | Linee | Modifica |
|------|-------|----------|
| `supabase/functions/energy-refresh/index.ts` | 280-285 | Usare `pe_used_pe` invece di `stakeSumResult.data?.sum` |
| `supabase/functions/energy-refresh/index.ts` | 459-464 | Usare `pe_used_pe` invece di aggregate queries |

## Risultato Atteso

Dopo il fix:
- StatusStrip: `⚡ 11,458` (15,089 - 3,631)
- UserMenuPanel: Total Staked = 3,631, Available = 11,458
- Entrambi sincronizzati con lo stesso valore

## Test di Verifica

1. Ricaricare la pagina dopo il deploy
2. Verificare StatusStrip: PE Available ≈ 11,458 (non 15,089)
3. Verificare UserMenuPanel: Total Staked = 3,631, Available ≈ 11,458
4. Dipingere 10 pixel → verificare che entrambi si aggiornino
