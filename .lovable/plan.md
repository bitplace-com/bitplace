

# Fix: Reset `virtual_pe_used` per account admin

## Problema
L'account `Bitplace_Team` (id: `a9d697b2-cd9b-45af-87bf-9aaad57776e2`) mostra 20,237 pixel "usati" nel Pixel Control Center, ma ha 0 pixel sulla mappa. Il cron job di cleanup aveva cancellato i pixel scaduti ma il contatore `virtual_pe_used` non è stato azzerato correttamente. Inoltre l'email nel DB è ancora `team@bitplace.com`.

## Soluzione

### 1. Migrazione database
Un singolo UPDATE per:
- Azzerare `virtual_pe_used` a 0 (i pixel non esistono più, il contatore deve riflettere la realtà)
- Aggiornare l'email da `team@bitplace.com` a `team@bitplace.live`

Target: user id `a9d697b2-cd9b-45af-87bf-9aaad57776e2`

### 2. Pulizia funzione DB residua
La funzione `cleanup_expired_pixels()` esiste ancora nel database ma non è più usata (il cron è stato disabilitato e la scadenza rimossa). Va eliminata per coerenza.

| Azione | Dettaglio |
|--------|-----------|
| `UPDATE users` | `virtual_pe_used = 0, email = 'team@bitplace.live'` per l'account admin |
| `DROP FUNCTION` | `cleanup_expired_pixels()` — non più necessaria |

Nessuna modifica frontend necessaria — il contatore si aggiornerà automaticamente.

