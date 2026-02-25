

## Aggiornamento Privacy Policy e T&C per Google Auth

### Contesto
Con l'introduzione di Google Auth come metodo di accesso alternativo al wallet Solana, le pagine legali devono riflettere che raccogliamo dati da Google (email, nome, avatar) e come li utilizziamo. Aggiorniamo anche la data "Last updated" a February 25, 2026.

---

### File 1: `src/pages/PrivacyPage.tsx`

**Sezione 2 - Data We Collect** (aggiunta voce Google):
- Aggiungere: **Google Account Information:** When you sign in with Google, we receive your email address, display name, and profile picture. We do not access your Google contacts, files, or any other Google account data.

**Sezione 3 - How We Use Your Data** (aggiornare Authentication):
- Cambiare "To verify your wallet ownership and secure your account" in: "To verify your identity via wallet signature or Google sign-in, and secure your account."

**Sezione 4 - Data Storage and Security** (aggiungere voce OAuth):
- Aggiungere: "OAuth-based authentication for Google sign-in, with tokens stored securely server-side"

**Sezione 5 - Third-Party Services** (aggiungere Google):
- Aggiungere: **Google OAuth:** Used solely for authentication. We request only your basic profile information (email, name, profile picture). We do not access your Google Drive, contacts, calendar, or any other Google service. You can revoke access at any time from your Google Account settings.

**Data "Last updated":** aggiornata a February 25, 2026.

---

### File 2: `src/pages/TermsPage.tsx`

**Sezione 3 - Account & Wallet Authentication** (rinominare e ampliare):
- Titolo diventa: "3. Account & Authentication"
- Aggiungere paragrafo: "You may also sign in using your Google account. When you do, we receive your email, display name, and profile picture from Google to create and manage your Bitplace account. Google-authenticated accounts receive Virtual Pixel Energy (VPE) for a trial experience; pixels placed with VPE expire after 72 hours unless defended with real PE by a wallet-connected user."
- Aggiungere alle responsabilita: "Securing your Google account credentials if using Google sign-in"

**Data "Last updated":** aggiornata a February 25, 2026.

---

### Dettagli tecnici
- Modifiche solo nei file JSX delle due pagine
- Nessuna dipendenza aggiuntiva
- Nessuna modifica al database

