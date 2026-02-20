

## 4 modifiche richieste

### 1. Rimuovere icona corona dal titolo "Create an Alliance"

**File**: `src/components/modals/AllianceModal.tsx` (righe 181-183)

Rimuovere il componente `<Crown>` dalla riga del titolo "Create an Alliance", lasciando solo il testo.

---

### 2. Leaderboard: Sub-categorie con dropdown invece di toggle orizzontale

**File**: `src/components/modals/LeaderboardModal.tsx` (componente `SubCategoryToggle`, righe 242-261)

Sostituire la barra orizzontale con 4 bottoni con un dropdown/select che mostra solo la sub-categoria selezionata. Cliccando si apre un menu a tendina per scegliere le altre. Questo rende la UI piu pulita mostrando solo una sub-categoria alla volta.

Implementazione: usare un `Select` (Radix) con le 4 opzioni (Top Painters, Top Investors, Top Defenders, Top Attackers), ognuna con la propria icona. Il componente viene usato sia in `LeaderboardModal` che in `LeaderboardPage`, quindi la modifica si propaga automaticamente.

---

### 3. Profilo giocatore: tag alleanza a fianco del nome

**File**: `src/components/modals/PlayerProfileModal.tsx` (righe 228-245)

Attualmente il tag alleanza `[TAG]` e sotto il nome, su una riga separata. Spostarlo nella stessa riga del nome, subito dopo il nome (prima dei badge e della bandiera).

Da:
```
Nome [badge] [bandiera]
[TAG]
```

A:
```
Nome [TAG] [badge] [bandiera]
```

---

### 4. Fix allineamento "Owned by" nel pannello pixel info

**File**: `src/components/map/PixelInfoPanel.tsx` (righe 156-179)

Il problema: quando il pixel e di un altro giocatore e l'utente non ha contribuzioni, ci sono DUE span nella stessa riga flex:
1. Righe 156-174: uno span condizionale con `flex-1` che renderizza `null` (nessun match: non e own, non e DEF, non e ATK) ma occupa comunque spazio come `flex-1`
2. Righe 175-178: lo span "Owned by..." che viene spinto a destra

La fix: aggiungere il caso "owned by someone else without contribution" dentro il primo blocco condizionale (come ultimo ramo), e rimuovere il secondo span separato (righe 175-179). In questo modo c'e un solo span `flex-1` che contiene sempre il testo corretto, allineato a sinistra subito dopo il quadratino colore.

