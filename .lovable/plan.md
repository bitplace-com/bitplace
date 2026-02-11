
# Leaderboard: PE Stakati + Sotto-metriche per tutte le sezioni

## Panoramica

Aggiungere a ogni riga della leaderboard il totale PE stakati e il controvalore in USD, e introdurre un sotto-menu "Pixels Painted" / "PE Staked" che cambia l'ordinamento e la metrica principale visualizzata. Questo si applica a tutte e 3 le macro aree (Players, Countries, Alliances).

## Layout UI

```text
[Players] [Countries] [Alliances]       <-- scope tabs (esistenti)

[Pixels Painted] [PE Staked]             <-- NUOVO toggle metrica
[Today] [Week] [Month] [All time]        <-- filtri tempo (esistenti)

#1  Player Name     1,234 px             <-- metrica principale cambia
                    456 PE ($0.46)        <-- metrica secondaria sotto
```

Quando il toggle e su "Pixels Painted": la lista e ordinata per pixel, il numero grande a destra e i pixel, sotto in piccolo i PE + USD.
Quando il toggle e su "PE Staked": la lista e ordinata per PE stakati, il numero grande e i PE + USD, sotto in piccolo i pixel.

## Modifiche

### 1. Edge function `supabase/functions/leaderboard-get/index.ts`

**Aggiungere `totalPeStaked` a Countries e Alliances:**
- Nella sezione `countries`: fetchare anche `pe_used_pe` dalla tabella `users` e aggregare per paese
- Nella sezione `alliances`: stesso approccio, aggregare `pe_used_pe` per alliance
- Aggiungere nuovo parametro `metric: "pixels" | "pe_staked"` al body della request
- Ordinare i risultati in base alla metrica scelta (totalPixels o totalPeStaked)
- Per i players: `pe_used_pe` e gia fetchato, basta usarlo per l'ordinamento alternativo

**Countries - nuovi campi nel response:**
```text
{
  rank, countryCode, playerCount, totalPixels,
  totalPeStaked  // NUOVO: somma pe_used_pe degli utenti di quel paese
}
```

**Alliances - nuovi campi nel response:**
```text
{
  rank, allianceTag, allianceName, playerCount, totalPixels,
  totalPeStaked  // NUOVO: somma pe_used_pe dei membri dell'alliance
}
```

### 2. Hook `src/hooks/useLeaderboard.ts`

- Aggiungere `metric: "pixels" | "pe_staked"` come parametro (tipo `LeaderboardMetric`)
- Passarlo nel body della request all'edge function
- Aggiungere `totalPeStaked` alle interfacce `CountryEntry` e `AllianceEntry`
- Rinominare `peUsed` in `totalPeStaked` in `PlayerEntry` per consistenza

### 3. UI `src/components/modals/LeaderboardModal.tsx`

- Aggiungere stato `metric` con toggle a 2 opzioni: "Pixels Painted" / "PE Staked"
- Il toggle va posizionato tra i scope tabs e i filtri temporali
- Stile: segmented control simile ai period pills ma leggermente piu grande, con icone (brush per pixels, bolt per PE)
- Passare `metric` a `LeaderboardList` e poi al hook

**PlayerRow:** aggiungere sotto il valore principale una riga secondaria con l'altra metrica + USD
**CountryRow:** aggiungere `totalPeStaked` + USD sotto il valore principale  
**AllianceRow:** aggiungere `totalPeStaked` + USD sotto il valore principale

La conversione USD usa la costante `PE_PER_USD = 1000` (1 PE = $0.001).

### 4. Pagina `src/pages/LeaderboardPage.tsx`

Attualmente mostra "Coming Soon". Va sostituita con il contenuto reale della leaderboard, riutilizzando la stessa logica del modal ma in layout full-page.

## Dettagli Tecnici

### Edge function - Aggregazione PE per Countries

```text
// Fetch users with country + pe_used_pe
const { data: users } = await supabase
  .from("users")
  .select("id, country_code, pe_used_pe")
  .not("country_code", "is", null);

// Nella mappa aggregazione, aggiungere:
current.peStaked += Number(user.pe_used_pe || 0);
```

### Edge function - Ordinamento per metrica

```text
const sortKey = metric === "pe_staked" ? "peStaked" : "pixels";
const sorted = Array.from(totals.entries())
  .sort((a, b) => b[1][sortKey] - a[1][sortKey])
  .slice(0, 50);
```

### Conversione USD nel frontend

```text
import { PE_PER_USD } from "@/config/energy";
const peToUsd = (pe: number) => (pe / PE_PER_USD).toFixed(2);
```

### File modificati
- `supabase/functions/leaderboard-get/index.ts` - aggiungere totalPeStaked + metric sorting
- `src/hooks/useLeaderboard.ts` - aggiungere metric param + totalPeStaked alle interfacce
- `src/components/modals/LeaderboardModal.tsx` - toggle metrica + visualizzazione PE/USD in ogni riga
- `src/pages/LeaderboardPage.tsx` - sostituire "Coming Soon" con leaderboard reale
