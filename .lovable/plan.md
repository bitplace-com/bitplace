

## Copy "Paint Energy", badge Starter in classifica, regola 24h repaint

### 1. WhitePaperModal - Sostituire "energy" con "paint energy"

In `src/components/modals/WhitePaperModal.tsx`, aggiornare i copy generici:

| Riga | Da | A |
|------|-----|-----|
| 40 | "Stake energy to paint it" | "Stake paint energy to claim it" |
| 41 | "Add energy to protect any pixel. The more energy staked" | "Add paint energy to protect any pixel. The more PE staked" |
| 42 | "Drain energy from pixels you want to repaint" | "Drain paint energy from pixels you want to repaint" |
| 43 | "Add more energy to pixels you already painted. Strengthens your stake" | "Add more paint energy to pixels you already painted. Strengthens your PE stake" |
| 78 | "Every action costs energy" | "Every action costs paint energy" |
| 88 | "determine your energy. More $BIT means more energy to spend on pixels" | "determine your paint energy. More $BIT means more PE to spend on pixels" |
| 93 | "Get Energy" | "Get Paint Energy" |
| 137 | "Every action on the map requires energy. Energy comes from holding" | "Every action on the map requires paint energy. PE comes from holding" |
| 146 | "stake more energy than was already there" | "stake more paint energy than was already there" |

### 2. Componente StarterBadge

Creare `src/components/ui/starter-badge.tsx`:
- Chip testuale piccolo con scritto "Starter"
- Stile: sfondo `bg-muted`, testo `text-muted-foreground`, bordo arrotondato, font-medium, text-[10px]
- Simile in dimensione al ProBadge, ma con look neutro/semplice

### 3. Leaderboard - Mostrare badge Starter per utenti Google

**leaderboard-get/index.ts**: Aggiungere `auth_provider` ai dati restituiti:
- Nella funzione `paintersAllTime` (scope players): aggiungere `auth_provider` alla select
- Nella funzione `fetchUserProfiles`: aggiungere `auth_provider` alla select
- Nella funzione `playerEntry`: includere `authProvider` nel return
- Nelle query RPC (`leaderboard_top_investors/defenders/attackers`): le RPC gia restituiscono `wallet_address`, per determinare Starter basta che `wallet_address` sia null. Non serve modificare le RPC.

**useLeaderboard.ts**: Aggiungere `authProvider` a `PlayerPainterEntry` e `PlayerPeEntry`.

**LeaderboardModal.tsx**: In `PlayerRow`, mostrare il badge Starter (chip "Starter") per i giocatori senza wallet (`!entry.walletAddress`) al posto del badge PRO. Logica:
- Se `isAdmin` -> AdminBadge
- Se ha wallet -> ProBadge dorato con shine
- Se NON ha wallet -> StarterBadge chip "Starter"

### 4. Regola 24h repaint - Per TUTTI gli utenti

Quando un utente ridipinge un proprio pixel gia esistente, il conteggio `pixels_painted_total` viene incrementato solo se sono trascorse almeno 24h dall'ultimo paint di quel pixel.

**Migrazione DB**: Aggiornare la funzione RPC `fetch_pixels_by_coords` per restituire anche `updated_at`:

```sql
CREATE OR REPLACE FUNCTION public.fetch_pixels_by_coords(coords jsonb)
  RETURNS TABLE(id bigint, x bigint, y bigint, pixel_id bigint, owner_user_id uuid, owner_stake_pe bigint, color text, def_total bigint, atk_total bigint, updated_at timestamptz)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.x, p.y, p.pixel_id, p.owner_user_id, p.owner_stake_pe, p.color, p.def_total, p.atk_total, p.updated_at
  FROM pixels p
  INNER JOIN jsonb_to_recordset(coords) AS c(x bigint, y bigint)
  ON p.x = c.x AND p.y = c.y;
END;
$$;
```

**game-commit/index.ts**:
- Aggiungere `updated_at` al tipo `PixelData`
- Popolare `updated_at` quando si costruiscono i pixelStates
- Nel blocco PAINT (dopo il loop che costruisce upsertData), contare separatamente i pixel che contribuiscono al leaderboard:
  - Pixel vuoto (empty): conta
  - Takeover (pixel di un altro utente): conta
  - Pixel proprio con `updated_at` piu vecchio di 24h: conta
  - Pixel proprio con `updated_at` entro 24h: NON conta
- Usare questo conteggio (`leaderboardPixels`) al posto di `affectedPixels` per aggiornare `pixels_painted_total`

```text
Logica nel loop PAINT:
let leaderboardPixels = 0;
for (const pixel of pixelStates) {
  const isEmpty = !pixel.id;
  const isOwnedByUser = pixel.owner_user_id === userId;
  if (isEmpty || !isOwnedByUser) {
    leaderboardPixels++;
  } else if (isOwnedByUser && pixel.updated_at) {
    const lastPaintTime = new Date(pixel.updated_at).getTime();
    const now = Date.now();
    if (now - lastPaintTime >= 24 * 60 * 60 * 1000) {
      leaderboardPixels++;
    }
  }
}
// Poi: newPixelsPaintedTotal = user.pixels_painted_total + leaderboardPixels
```

### 5. Deploy

Deploy delle edge functions `game-commit` e `leaderboard-get`.

---

### File da modificare

| File | Modifiche |
|------|-----------|
| `src/components/modals/WhitePaperModal.tsx` | Sostituire "energy" con "paint energy" nei copy |
| `src/components/ui/starter-badge.tsx` | **NUOVO** - Chip testuale "Starter" |
| `supabase/functions/leaderboard-get/index.ts` | Aggiungere `auth_provider` ai dati player |
| `src/hooks/useLeaderboard.ts` | Aggiungere `authProvider` ai tipi entry |
| `src/components/modals/LeaderboardModal.tsx` | Mostrare StarterBadge per utenti senza wallet |
| `supabase/functions/game-commit/index.ts` | Regola 24h repaint per `pixels_painted_total`, `updated_at` in PixelData |
| **Migrazione DB** | Aggiornare RPC `fetch_pixels_by_coords` con `updated_at` |

