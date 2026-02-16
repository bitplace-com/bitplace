

# Aggiornamento Privacy Policy per Bitplace

## Panoramica
Aggiornare la pagina `/privacy` (attualmente placeholder) con una Privacy Policy completa, adattata dal reference di Bplace al contesto Bitplace.

## Adattamenti rispetto al reference Bplace
- **"Better Place"** diventa **"Bitplace"**
- **Account Information**: Wallet Solana invece di email/username, niente Google OAuth
- **Third-Party Services**: Rimuovere Google OAuth, mantenere riferimento generico ai servizi backend
- **Authentication Data**: Wallet signature e nonce invece di token OAuth
- **Email contatto**: `contact@bitplace.app`
- **Stessa struttura**: PageHeader + SectionCard, identica alla TermsPage

## Contenuto delle sezioni

1. **Introduction** -- Benvenuto su Bitplace, impegno per la privacy
2. **Data We Collect** -- Wallet address, profile info volontario, pixel placements, usage data, device info
3. **How We Use Your Data** -- Service delivery, auth, sync, analytics, comunicazioni
4. **Data Storage and Security** -- SSL/TLS, secure auth, audit, access controls
5. **Third-Party Services** -- Servizi backend per database e storage (senza menzionare Supabase direttamente), blockchain Solana
6. **Cookies and Tracking** -- Session, preferenze, analytics
7. **Your Rights** -- Access, correction, deletion, export, opt-out
8. **Data Retention** -- Attivo finche account attivo, cancellazione entro 30 giorni
9. **Children's Privacy** -- Non per minori di 13 anni
10. **Changes to This Policy** -- Notifica aggiornamenti
11. **Contact Us** -- contact@bitplace.app

## File da modificare

| File | Modifica |
|------|----------|
| `src/pages/PrivacyPage.tsx` | Riscrittura completa con contenuto adattato |

Nessuna modifica a routing o altri file necessaria (route `/privacy` gia presente in App.tsx).
