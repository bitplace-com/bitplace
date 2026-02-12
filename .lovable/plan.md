

# Fix Prezzo Unclaimed + Badge Alleanza con Tooltip

## 1. Fix prezzo "Available to claim"

Il valore hardcoded `~$0.01` e sbagliato. Dato che 1 PE = $0.001, il costo corretto e `~$0.00` con `toFixed(2)` oppure meglio mostrare `$0.001` esplicitamente. Soluzione: usare la funzione `peToUsd(1)` gia presente nel file che calcola correttamente `(1 * 0.001).toFixed(2)` -- ma questo da `$0.00` che non e ideale. Meglio cambiare il formato per valori sotto $0.01 per mostrare 3 decimali: `~$0.001`.

**Modifica alla funzione `peToUsd`**: aggiungere logica per mostrare 3 decimali quando il valore e sotto $0.01.

## 2. Badge Alleanza - proporzioni

Ridurre ulteriormente il padding orizzontale da `px-1.5` a `px-1` per rendere il badge piu compatto e proporzionato al testo `text-[10px]`.

## 3. Tooltip Alleanza con metriche

### Database: nuova RPC function

Creare una funzione SQL `get_alliance_stats_by_tag(tag_input text)` con `SECURITY DEFINER` che restituisce:
- `name` (nome alleanza)
- `tag`
- `member_count`
- `total_pixels` (somma `pixels_painted_total` dei membri)
- `total_pe_staked` (somma `owner_stake_pe` dei pixel posseduti dai membri)

Questo e necessario perche la tabella `alliance_members` ha RLS abilitato senza policy di lettura pubblica.

### Frontend: Tooltip interattivo

Wrappare il badge alleanza in un componente Tooltip (gia presente nel progetto via `@radix-ui/react-tooltip`). Al hover (desktop) o click (mobile), mostrare un pannello con:

```text
+---------------------------+
|  BitplaceTeam [BTP]       |
|---------------------------|
|  Members     1            |
|  Pixels      2,653        |
|  PE Staked   2,412 PE     |
|  Value       ~$2.41       |
+---------------------------+
```

Il tooltip usera lo stesso stile glass/muted del pannello. I dati vengono fetchati on-demand al primo hover/click tramite una query alla RPC e cachati in stato locale.

## File da modificare

| File | Modifica |
|------|----------|
| **Migration SQL** | Nuova RPC `get_alliance_stats_by_tag` |
| `src/components/map/PixelInfoPanel.tsx` | Fix `$0.01` -> `$0.001`, badge padding, tooltip alleanza con fetch dati |

## Dettagli tecnici

### SQL Migration

```sql
CREATE OR REPLACE FUNCTION public.get_alliance_stats_by_tag(tag_input text)
RETURNS TABLE(
  name text, tag text, member_count bigint,
  total_pixels bigint, total_pe_staked bigint
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT a.name, a.tag,
    COUNT(DISTINCT am.user_id),
    COALESCE(SUM(u.pixels_painted_total), 0),
    COALESCE(
      (SELECT SUM(p.owner_stake_pe) FROM pixels p
       WHERE p.owner_user_id IN
         (SELECT user_id FROM alliance_members WHERE alliance_id = a.id)
      ), 0)
  FROM alliances a
  JOIN alliance_members am ON am.alliance_id = a.id
  JOIN users u ON u.id = am.user_id
  WHERE a.tag = tag_input
  GROUP BY a.id;
$$;
```

### PixelInfoPanel changes

- Import `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` da `@/components/ui/tooltip`
- Aggiungere stato `allianceStats` con fetch lazy al primo hover
- Wrappare il badge `[BTP]` in `Tooltip` con contenuto formattato
- Fix `peToUsd`: mostrare 3 decimali per valori < $0.01
