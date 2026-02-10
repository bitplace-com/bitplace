

# Pulizia Mappa e Reset PE

## Stato Attuale
- **8.635 pixel** sulla mappa
- **0 contributi** (nessun DEF/ATK)
- **29 paint events** nel log
- Utente FabCap: `pe_used_pe = 8635`, `pixels_painted_total = 9081`
- Utente 456w...kLby: `pe_used_pe = 0`, `pixels_painted_total = 0`

## Operazioni da Eseguire

Eseguiremo una singola migrazione SQL che:

1. **Elimina tutti i pixel** dalla tabella `pixels` (TRUNCATE per velocita)
2. **Elimina tutti i paint events** dalla tabella `paint_events`
3. **Resetta i contatori utente**: `pe_used_pe = 0` e `pixels_painted_total = 0` per tutti gli utenti

### SQL Migration

```sql
-- 1. Svuota pixel e paint events
TRUNCATE TABLE pixels RESTART IDENTITY CASCADE;
TRUNCATE TABLE paint_events RESTART IDENTITY CASCADE;
TRUNCATE TABLE pixel_contributions RESTART IDENTITY CASCADE;

-- 2. Reset contatori utente
UPDATE users SET
  pe_used_pe = 0,
  pixels_painted_total = 0,
  xp = 0,
  level = 1;
```

Il `CASCADE` su `pixels` gestisce automaticamente eventuali foreign key (come `pixel_contributions`). I trigger `update_pe_used_on_pixel_change` non scattano con TRUNCATE, quindi usiamo l'UPDATE esplicito sui contatori.

## Note
- `pe_total_pe` NON viene toccato: il saldo PE totale dipende dal wallet e rimane invariato
- `xp` e `level` vengono resettati perche derivano da `pixels_painted_total`
- Nessun file frontend da modificare: la mappa si aggiornera automaticamente al prossimo caricamento tile

