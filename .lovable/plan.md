

# Fix: Map Snapshot + PE Calcolo Senza Limiti

## Problemi Identificati

### 1. Map snapshot nero/vuoto
Il `preserveDrawingBuffer: true` e stato aggiunto come opzione top-level della mappa, ma in MapLibre v5 questa opzione va dentro `canvasContextAttributes`. Risultato: il buffer viene cancellato dopo ogni render e `toDataURL()` restituisce un'immagine nera.

### 2. PE limitato a 1000
Le edge functions `places-feed` e `places-create` fetchano le righe con `.select("owner_stake_pe")` e poi sommano in JavaScript. Supabase ha un limite di 1000 righe per query, quindi il totale PE e troncato a 1000 pixel massimo. Per un artwork con piu di 1000 pixel del creatore, il valore risulta sottostimato.

---

## Soluzione

### Fix 1: canvasContextAttributes

Spostare `preserveDrawingBuffer: true` dentro `canvasContextAttributes`:

```text
new maplibregl.Map({
  container: ...,
  style: ...,
  canvasContextAttributes: {
    preserveDrawingBuffer: true,
  },
  ...
})
```

Questo e l'unico modo supportato da MapLibre v5 per abilitare il canvas snapshot.

**File: `src/components/map/BitplaceMap.tsx`**
- Rimuovere lo spread `...(({ preserveDrawingBuffer: true }) as Record<string, unknown>)`
- Aggiungere `canvasContextAttributes: { preserveDrawingBuffer: true }` come opzione diretta

### Fix 2: SQL Aggregate SUM() per PE

Sostituire il fetch di righe + reduce in JS con una query SQL aggregate che usa `SUM()`. Questo bypassa il limite di 1000 righe.

Le edge functions useranno `.rpc()` per chiamare una nuova funzione SQL:

```sql
CREATE OR REPLACE FUNCTION sum_owner_stake_in_bbox(
  p_xmin bigint, p_ymin bigint,
  p_xmax bigint, p_ymax bigint,
  p_owner_id uuid
) RETURNS bigint AS $$
  SELECT COALESCE(SUM(owner_stake_pe), 0)
  FROM pixels
  WHERE x >= p_xmin AND x <= p_xmax
    AND y >= p_ymin AND y <= p_ymax
    AND owner_user_id = p_owner_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public';
```

**File: `supabase/functions/places-feed/index.ts`**
- Sostituire il loop che fetcha righe con `.rpc('sum_owner_stake_in_bbox', { ... })`

**File: `supabase/functions/places-create/index.ts`**
- Stessa modifica: usare `.rpc('sum_owner_stake_in_bbox', { ... })`

---

## File Modificati

| File | Modifica |
|------|----------|
| `src/components/map/BitplaceMap.tsx` | Spostare `preserveDrawingBuffer` dentro `canvasContextAttributes` |
| `supabase/functions/places-feed/index.ts` | Usare RPC `sum_owner_stake_in_bbox` invece di fetch + reduce |
| `supabase/functions/places-create/index.ts` | Stessa modifica RPC |
| Migrazione DB | Creare funzione SQL `sum_owner_stake_in_bbox` |

