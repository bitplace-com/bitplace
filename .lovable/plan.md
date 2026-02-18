
# Fix: Conteggio Pixel Totali Disegnati

## Il Problema

Ci sono due errori nel calcolo dei "pixel totali disegnati":

### 1. Leaderboard somma TUTTI gli eventi
La funzione `leaderboard-get` somma `pixel_count` da TUTTI i `paint_events` senza distinguere il tipo di azione. Questo significa che REINFORCE, WITHDRAW, ERASE vengono tutti sommati come se fossero pixel disegnati.

Per il tuo account:
- PAINT: 4.413
- ERASE: 2.383
- REINFORCE: 5.598
- WITHDRAW: 5.486
- **Totale mostrato**: ~17.880 (sbagliato)
- **Totale corretto**: 4.413 - 2.383 = **2.030**

### 2. Contatore `pixels_painted_total` nel DB non sincronizzato
Il valore nel database e 3.157, ma dovrebbe essere 2.030 (PAINT - ERASE). Il decremento per ERASE e stato aggiunto dopo che alcune cancellazioni erano gia avvenute, quindi il contatore e sfasato.

## Soluzione

### File 1: `supabase/functions/leaderboard-get/index.ts`

Filtrare i `paint_events` per considerare solo `PAINT` e `ERASE`:
- Sommare `pixel_count` per eventi `PAINT`
- Sottrarre `pixel_count` per eventi `ERASE`
- Usare il risultato netto come metrica "pixels" nella classifica
- Applicare lo stesso filtro per tutti gli scope (players, countries, alliances)

Cambiamento specifico: nella query `paint_events`, aggiungere `.in("action_type", ["PAINT", "ERASE"])`, poi nel loop di aggregazione, sommare per PAINT e sottrarre per ERASE.

### File 2: Ricalcolo dati nel DB

Eseguire una query di aggiornamento per ricalcolare `pixels_painted_total` per TUTTI gli utenti basandosi sui `paint_events` reali (SUM dei PAINT - SUM degli ERASE). Questo corregge i contatori sfasati.

```text
UPDATE users SET pixels_painted_total = subquery.net_pixels
FROM (
  SELECT user_id,
    GREATEST(0,
      COALESCE(SUM(CASE WHEN action_type = 'PAINT' THEN pixel_count ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN action_type = 'ERASE' THEN pixel_count ELSE 0 END), 0)
    ) as net_pixels
  FROM paint_events
  WHERE action_type IN ('PAINT', 'ERASE')
  GROUP BY user_id
) AS subquery
WHERE users.id = subquery.user_id;
```

### Riepilogo

| Cosa | Modifica |
|------|----------|
| `leaderboard-get/index.ts` | Filtrare solo PAINT/ERASE, sottrarre ERASE dal totale |
| DB data fix | Ricalcolare `pixels_painted_total` per tutti gli utenti |

Nessuna modifica necessaria al frontend: il profilo e l'inspector leggono gia `pixels_painted_total` dal DB, e la leaderboard legge dalla edge function. Correggendo queste due sorgenti, tutti i dati saranno consistenti ovunque.
