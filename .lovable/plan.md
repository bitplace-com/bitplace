

# Rimozione Sistema a Livelli e Nuovo Ranking

## Panoramica

Rimuoviamo completamente il sistema a livelli (level, XP, progression titles) e sostituiamo il ranking nella leaderboard con una classifica basata su:
- **Pixels Painted Total** (totale storico, anche se persi/cancellati)
- **PE Used** (PE attualmente impegnati sulla mappa)
- **Value** = combinazione di entrambi per il ranking

## File da Eliminare

- `src/lib/progression.ts` -- tutte le funzioni level/status ora inutili
- `src/components/ui/level-pill.tsx` -- componente LevelPill

## File da Modificare

### 1. Backend: `supabase/functions/game-commit/index.ts`
- Rimuovere `LEVEL_BASE`, `MAX_LEVEL`, `calculateLevel()` (righe 222-227)
- Rimuovere il calcolo di `newLevel` e l'update di `level` nella query UPDATE users (righe 578-594)
- Mantenere l'update di `pixels_painted_total` e `paint_cooldown_until`
- Il campo `level` nel response diventa non necessario, lo rimuoviamo o lo impostiamo a 0

### 2. Backend: `supabase/functions/leaderboard-get/index.ts`
- Rimuovere `level` dalla select dei players
- Aggiungere `pe_used_pe` ai dati utente per calcolare il ranking
- Cambiare la logica di ranking: ordinare per un punteggio composito `totalPixels + peUsed` oppure mostrare entrambi i valori e ordinare per pixel totali (primary) + PE usati (secondary)
- Rimuovere `level` dai dati restituiti

### 3. Frontend: `src/hooks/useLeaderboard.ts`
- Rimuovere `level` da `PlayerEntry`
- Aggiungere `peUsed: number` a `PlayerEntry`

### 4. Frontend: `src/contexts/WalletContext.tsx`
- Rimuovere `xp` e `level` dall'interfaccia `User` (righe 32-33)

### 5. Frontend: `src/components/modals/LeaderboardModal.tsx`
- Rimuovere import di `LevelPill`
- Nella `PlayerRow`: sostituire `LevelPill` con i PE usati e pixels totali
- Nella `HoverCard`: rimuovere `LevelPill`, mostrare pixels + PE usati

### 6. Frontend: `src/components/modals/PlayerProfileModal.tsx`
- Rimuovere import di `getStatusTitle` da progression
- Rimuovere badge "Level X" e statusTitle (righe 239-253)
- Sostituire le StatCard "Level" e "XP" con "Pixels Painted" e "PE Used" (righe 366-376)

### 7. Frontend: `src/pages/ProfilePage.tsx`
- Rimuovere tutti gli import da `progression` (righe 19-27)
- Rimuovere import di `LevelPill` e `Progress`
- Rimuovere le variabili `level`, `progress`, `statusTitle`, `currentLevelThreshold`, `nextLevelThreshold` (righe 122-128)
- Sostituire l'intera sezione "Progression" (righe 277-345) con una sezione "Stats" che mostra pixels painted totali e PE usati, senza livelli ne barre di progressione

### 8. Frontend: `src/components/map/PixelInfoPanel.tsx`
- Rimuovere import di `LevelPill` (riga 10)
- Rimuovere il `LevelPill` nella riga 194 dell'owner info

### 9. Frontend: `src/components/places/PlaceCard.tsx`
- Rimuovere import e uso di `LevelPill`

### 10. Frontend: `src/components/modals/AllianceModal.tsx`
- Rimuovere `level` dall'interfaccia `SearchResult`
- Rimuovere le righe "Lv.{result.level}" e "Lv.{member.level}" nella UI

### 11. Frontend: `src/hooks/usePlayerProfile.ts`
- Rimuovere `level` e `xp` dall'interfaccia `PlayerProfile`
- Aggiungere `peUsed: number` (PE totali usati dal giocatore)

### 12. Frontend: `src/pages/LeaderboardPage.tsx`
- Aggiornare le preview card: sostituire "Top Owners" / "Top Defenders" / ecc. con categorie rilevanti al nuovo sistema (Players, Countries, Alliances -- gia nel modal)

### 13. Database Migration
- Non serve rimuovere le colonne `level` e `xp` dalla tabella `users` (possono restare inutilizzate per ora senza breaking changes)
- Alternativamente, possiamo dropparle se preferisci una pulizia completa

## Logica di Ranking

Il nuovo ranking nella leaderboard ordina i giocatori per:
1. **Primary sort**: `pixels_painted_total` (decrescente)
2. **Secondary sort**: `pe_used_pe` (decrescente, come tiebreaker)

Nella UI mostriamo entrambi i valori per ogni giocatore. Il valore in dollari viene calcolato client-side usando `PE_PER_USD`.

## Note Tecniche
- La colonna `pixels_painted_total` sulla tabella `users` continua ad essere incrementata da `game-commit` ad ogni PAINT -- questo e il contatore storico che non decresce mai
- `pe_used_pe` e mantenuto automaticamente dai trigger DB e rappresenta i PE attualmente impegnati
- Il `level` nel DB rimane come colonna dormiente; se vuoi la rimuoviamo con una migration

