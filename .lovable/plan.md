

# Piano di Ottimizzazione: Ridurre Tempi Validate/Paint

## ✅ IMPLEMENTATO

### Ottimizzazioni Backend (Edge Functions)

| Modifica | Beneficio |
|----------|-----------|
| Client Supabase creato UNA VOLTA prima del PING | Connessione riutilizzata per tutte le operazioni |
| Query parallele (user + pixels) in game-validate | Risparmio ~10-15 secondi su cold start |
| Warmup PING include query DB leggera | Connessione DB già "calda" per richieste successive |

### Ottimizzazioni Frontend

| Modifica | Beneficio |
|----------|-----------|
| Intervallo warmup ridotto a 3 minuti | DB rimane caldo più frequentemente |
| Warmup periodico autenticato | Include riscaldamento DB, non solo funzione |
| Funzione `triggerPredictiveWarmup()` | Può essere chiamata quando l'utente inizia a selezionare pixel |

---

## Prestazioni Attese

| Scenario | Prima | Dopo |
|----------|-------|------|
| Validate 500px (cold) | 48 sec | 15-25 sec |
| Validate 500px (warm) | 10-15 sec | 3-8 sec |
| Commit 500px | 22 sec | 15-20 sec |
| **Totale operazione (warm)** | ~70 sec | ~20-30 sec |

### Nota Importante

Il cold start del database Postgres (30+ secondi) è una limitazione dell'infrastruttura Lovable Cloud che non può essere completamente eliminata. Le ottimizzazioni implementate mirano a:

1. **Prevenire** il cold start con warmup più frequenti (ogni 3 minuti)
2. **Parallelizzare** le query per ridurre il tempo totale
3. **Riutilizzare** la connessione DB già aperta dal PING

---

## Test di Verifica

1. Ricollegare il wallet → verificare nei log che PING mostra `dbMs < 500ms`
2. Attendere 5 minuti (cold start forzato) → disegnare 300 pixel
3. Verificare che validate completi in < 20 secondi
4. Verificare che commit completi in < 25 secondi
5. Testare con 500 pixel per confermare stabilità
