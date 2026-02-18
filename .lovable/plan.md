

# Leaderboard: 3 Macro-categorie x 4 Sub-categorie + Tracking Takeover

## Panoramica

La leaderboard mantiene le 3 macro-categorie esistenti (Players, Countries, Alliances) e aggiunge 4 sub-categorie per ciascuna:

| Sub-categoria | Icona | Metrica | Fonte dati |
|---------------|-------|---------|------------|
| Top Painters | brush | Pixel netti (PAINT - ERASE) | `paint_events` |
| Top Investors | bolt | PE stakato nei propri pixel | `pixels.owner_stake_pe` |
| Top Defenders | shield | PE difesa live + storico takeover | `pixel_contributions` (DEF) + `users.takeover_def_pe_total` |
| Top Attackers | swords | PE attacco live + storico takeover | `pixel_contributions` (ATK) + `users.takeover_atk_pe_total` |

Il punteggio mostrato per Defenders e Attackers e un **unico numero aggregato**: PE attualmente in stake + PE storici coinvolti in takeover. Nessuna distinzione visiva tra i due.

Il metric toggle viene rimosso. I time period pills restano solo per Top Painters (le altre 3 sub-categorie sono dati live). Countries e Alliances aggregano i dati dei membri per la sub-categoria selezionata.

## UI: Navigazione

```text
+--------------------------------------------------+
| [Players]    [Countries]    [Alliances]           |  <-- macro tab (come oggi)
+--------------------------------------------------+
| [Top Painters] [Top Investors] [Top Def] [Top Atk]|  <-- sub-categoria (al posto del metric toggle)
+--------------------------------------------------+
| [Today] [Week] [Month] [All time]                 |  <-- solo per Top Painters
+--------------------------------------------------+
| 1. Player A ........... 2,030 px                  |
| 2. Player B ........... 1,500 px                  |
+--------------------------------------------------+
```

Per Top Investors, ogni riga mostra il PE totale stakato nei propri pixel.
Per Top Defenders/Attackers, ogni riga mostra un unico totale PE (live + storico takeover aggregati).

## Dettaglio tecnico

### 1. Migration: nuove colonne su `users`

Aggiungere due colonne cumulative:
- `takeover_def_pe_total BIGINT NOT NULL DEFAULT 0`
- `takeover_atk_pe_total BIGINT NOT NULL DEFAULT 0`

Questi contatori vengono incrementati solo al momento di un takeover, prima che le contribuzioni vengano cancellate/flippate. Il conteggio parte da zero (nessuno storico precedente).

### 2. Migration: 3 funzioni RPC per aggregazioni server-side

Necessarie per superare il limite 1000 righe:

- **`leaderboard_top_investors(lim int)`**: `SUM(owner_stake_pe)` da `pixels` GROUP BY `owner_user_id`, con JOIN su `users` per i dati profilo.

- **`leaderboard_top_defenders(lim int)`**: `SUM(amount_pe)` da `pixel_contributions` WHERE `side='DEF'` GROUP BY `user_id`, sommato a `users.takeover_def_pe_total`, con JOIN su `users`.

- **`leaderboard_top_attackers(lim int)`**: Analogo con `side='ATK'` e `users.takeover_atk_pe_total`.

### 3. Edge function `game-commit/index.ts`: tracking takeover

Prima di cancellare/flippare le contribuzioni (righe 538-546), aggiungere:

1. Fetch le contribuzioni DEF e ATK dei pixel coinvolti nel takeover
2. Aggregare per user_id i totali PE per lato
3. Incrementare `users.takeover_def_pe_total` e `users.takeover_atk_pe_total` per ogni utente coinvolto

Questo avviene PRIMA delle righe esistenti che fanno DELETE e UPDATE.

### 4. Edge function `leaderboard-get/index.ts`

- Aggiungere scope `investors`, `defenders`, `attackers`
- Aggiornare la validazione scope
- Per `investors`: chiamata RPC `leaderboard_top_investors`
- Per `defenders`/`attackers`: chiamata RPC corrispondente
- I period pills sono ignorati per questi 3 scope
- Rimuovere il parametro `metric` (ogni sub-categoria ha la sua metrica implicita)
- Fixare il bug nello scope `alliances` (riga 184 usa `users` non definito)
- Per Countries e Alliances: adattare la logica per supportare la sub-categoria selezionata (aggregando investors/defenders/attackers per paese/alleanza)

### 5. Hook `useLeaderboard.ts`

- Estendere `LeaderboardScope` con `"investors" | "defenders" | "attackers"`
- Rimuovere `LeaderboardMetric`
- Aggiornare la chiamata per non passare `metric`
- Aggiungere tipo `PeRankEntry` per le righe PE-based (id, displayName, totalPe, ecc.)

### 6. Frontend `LeaderboardModal.tsx`

- Rimuovere `MetricToggle` e relativo export
- Aggiungere una riga di sub-categoria pills sotto i tab macro (Painters, Investors, Defenders, Attackers)
- Mostrare i period pills solo quando la sub-categoria e "painters"
- Rinominare il label del tab da "Players" a "Painters" nel contesto dei sub-tab
- Adattare le righe per mostrare la metrica corretta in base alla sub-categoria:
  - Painters: mostra pixel count
  - Investors/Defenders/Attackers: mostra PE totale con controvalore USD
- Riutilizzare `PlayerRow` adattato per tutte le sub-categorie
- Per Countries/Alliances: passare la sub-categoria alla query e mostrare la metrica corrispondente

### 7. Frontend `LeaderboardPage.tsx`

- Stesse modifiche della modal: aggiungere sub-categoria, rimuovere metric toggle

### Riepilogo file modificati

| File | Modifica |
|------|----------|
| Migration SQL | 2 colonne su users + 3 funzioni RPC |
| `supabase/functions/game-commit/index.ts` | Tracking PE prima di delete/flip takeover |
| `supabase/functions/leaderboard-get/index.ts` | 3 nuovi scope, fix bug alliances, rimuovere metric |
| `src/hooks/useLeaderboard.ts` | Nuovi scope, rimuovere metric type |
| `src/components/modals/LeaderboardModal.tsx` | Sub-categoria pills, rimuovere MetricToggle, adattare righe |
| `src/pages/LeaderboardPage.tsx` | Stesse modifiche UI |

