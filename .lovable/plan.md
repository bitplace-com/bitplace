

# Aggiornamento pagine T&C e Privacy Policy

## Cosa cambia

### 1. Rimuovere sezioni relative a paese/giurisdizione

**TermsPage.tsx:**
- Rimuovere **Section 15 "Governing Law"** (riferimento a Francia/Parigi)
- Rimuovere **Section 16 "Dispute Resolution"** (riferimento a risoluzione dispute con sede legale)
- Rinumerare le sezioni successive (17 -> 15, 18 -> 16, ecc.)

**PrivacyPage.tsx:** Nessun riferimento a paesi, quindi nessuna modifica al contenuto.

### 2. Layout dedicato senza sidebar/menu

Entrambe le pagine attualmente usano `MainLayout` che include la sidebar e il menu completo. Sostituiremo con un layout minimale:

- Un bottone "Back to Map" (con icona freccia) in alto a sinistra
- Nessuna sidebar, nessun wallet button, nessun menu
- Solo il contenuto della pagina

**Modifiche in `App.tsx`:**
- Rimuovere il wrapping `<MainLayout>` dalle route `/terms` e `/privacy`
- Le pagine gestiranno il proprio header minimale internamente

**Modifiche in `TermsPage.tsx` e `PrivacyPage.tsx`:**
- Aggiungere in cima un bottone/link "Back to Map" che naviga a `/`
- Stile: piccolo, discreto, con icona freccia a sinistra

## File coinvolti

| File | Modifica |
|------|----------|
| `src/pages/TermsPage.tsx` | Rimuovere sezioni 15-16, rinumerare, aggiungere bottone back |
| `src/pages/PrivacyPage.tsx` | Aggiungere bottone back |
| `src/App.tsx` | Rimuovere MainLayout wrapper dalle route terms e privacy |

