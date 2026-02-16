

# Terms & Conditions Page + Footer Links

## Panoramica
Creare una pagina dedicata `/terms` con i Terms & Conditions adattati per Bitplace, rimuovere la sezione "Legal" dal SettingsModal, e aggiungere link piccoli a fondo pagina (T&C + Privacy Policy) nello stile tipico dei footer legali.

## Modifiche previste

### 1. Nuova pagina `src/pages/TermsPage.tsx`
Pagina dedicata con tutti i T&C adattati per Bitplace:
- Sostituire "Better Place" con "Bitplace" ovunque
- Sostituire "Chromas" con "$BIT" / "Pixel Energy (PE)" secondo il modello economico di Bitplace
- Rimuovere sezioni non pertinenti (pacchetti Chromas, prezzi USD, color palettes come acquisto)
- Adattare le sezioni su wallet (Solana wallet auth invece di email/Google OAuth)
- Adattare la sezione contenuti utente per pixel art su mappa
- Aggiornare contatti email e riferimenti legali
- Stile coerente con le altre pagine (PageHeader, SectionCard, stesso layout di RulesPage/SpecPage)

### 2. Nuova pagina `src/pages/PrivacyPage.tsx`
Pagina placeholder per la Privacy Policy con struttura base, pronta per essere popolata con contenuto reale in futuro.

### 3. Aggiornare `src/App.tsx`
Aggiungere le due nuove route:
- `/terms` con MainLayout
- `/privacy` con MainLayout

### 4. Modificare `src/components/modals/SettingsModal.tsx`
- Rimuovere l'intera sezione "Legal" (righe 386-417)
- Aggiungere in fondo, sotto il bottone Save, dei link piccoli e discreti per T&C e Privacy Policy (testo muted, font piccolo, stile footer classico con separatore `|`)
- I link apriranno le pagine in una nuova tab (`target="_blank"`)

### 5. Aggiornare il menu laterale `MapMenuDrawer.tsx`
Nessuna modifica al menu principale: i link legali non vanno nel menu di navigazione, restano solo nel footer delle Settings (approccio standard).

## Contenuto T&C adattato per Bitplace
Le principali differenze rispetto al reference di Bplace:
- **Nome**: "Bitplace" invece di "Better Place"
- **Autenticazione**: Wallet Solana (Phantom, Solflare) invece di email/Google
- **Valuta virtuale**: $BIT token e Pixel Energy (PE) invece di Chromas
- **Meccaniche**: Paint, Defend, Attack, Reinforce, staking PE
- **Acquisti**: Rimossi pacchetti prezzo fissi, riferimento generico all'economia on-chain
- **Email contatto**: Placeholder `contact@bitplace.app` (da confermare)
- **Giurisdizione**: Mantenuta generica o aggiornabile successivamente

## File coinvolti

| File | Azione |
|------|--------|
| `src/pages/TermsPage.tsx` | Nuovo |
| `src/pages/PrivacyPage.tsx` | Nuovo |
| `src/App.tsx` | Aggiungere 2 route |
| `src/components/modals/SettingsModal.tsx` | Rimuovere sezione Legal, aggiungere footer links |

