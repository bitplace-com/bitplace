

## Fix: Rimuovi scritta PRO, Badge PRO in classifica, Icona Google

### 1. Rimuovere la scritta "PRO" dal ProBadge
**File:** `src/components/ui/pro-badge.tsx` (riga 31)

Attualmente quando `shine` e' attivo mostra `<span>PRO</span>` accanto all'icona. Va rimossa la scritta, lasciando solo l'icona PixelPro.

### 2. Creare icona PixelGoogle
**Nuovo file:** `src/components/icons/custom/PixelGoogle.tsx`

Creare un componente pixel icon usando il path SVG dalla libreria HackerNoon (`<polygon points="23 10 23 15 ... 12 10 23 10"/>`), con lo stesso pattern `PixelSVG` usato da tutte le altre icone.

**File:** `src/components/icons/iconRegistry.ts`
- Aggiungere `'google'` al type `IconName`
- Importare e registrare `PixelGoogle` nella mappa `icons`

### 3. Sostituire icona "globe" con "google" per Connect Google
**File:** `src/components/modals/UserMenuPanel.tsx` (riga 377)
- Cambiare `<PixelIcon name="globe" ...>` con `<PixelIcon name="google" ...>` nel bottone "Connect Google"

**File:** `src/components/modals/WalletSelectModal.tsx`
- Sostituire l'icona globe/generica con `<PixelIcon name="google" ...>` nel bottone Google Auth

### 4. Badge PRO in classifica per giocatori con wallet
**File:** `src/components/modals/LeaderboardModal.tsx` (righe 105-131, funzione `PlayerRow`)

Attualmente il badge PRO si mostra solo nelle sotto-categorie PE (investors, defenders, attackers) tramite `getProTier(totalPeForBadge)`. Per i painters, `totalPeForBadge` e' sempre 0.

Fix: aggiungere una condizione che mostra `<ProBadge shine size="sm" />` quando il giocatore ha un `walletAddress` (indica che ha connesso Phantom e quindi possiede $BIT), indipendentemente dalla sotto-categoria. La logica diventa:
- Se `isAdmin(entry.walletAddress)` -> mostra AdminBadge (gia' presente)
- Se `entry.walletAddress` e non e' admin -> mostra ProBadge shine (il wallet implica $BIT)
- Altrimenti se `getProTier(totalPeForBadge)` restituisce un tier -> mostra ProBadge con tier (fallback per chi ha PE alto senza wallet diretto)

### Riepilogo file da modificare
| File | Modifica |
|------|----------|
| `src/components/ui/pro-badge.tsx` | Rimuovere scritta "PRO" (riga 31) |
| `src/components/icons/custom/PixelGoogle.tsx` | Nuovo: icona Google pixel |
| `src/components/icons/iconRegistry.ts` | Registrare icona "google" |
| `src/components/modals/UserMenuPanel.tsx` | Icona google nel bottone Connect Google |
| `src/components/modals/WalletSelectModal.tsx` | Icona google nel pannello Google Auth |
| `src/components/modals/LeaderboardModal.tsx` | Badge PRO per giocatori con wallet |

