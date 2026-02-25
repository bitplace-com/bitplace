

## Diagnosi e Piano d'Azione

### Problema 1: Branding Google (mostra "Lovable" invece di "Bitplace")

**Causa**: Il progetto usa l'OAuth Google gestito da Lovable Cloud. Questo significa che la pagina di consenso Google mostra "Lovable" come nome dell'app, non "Bitplace".

**Soluzione**: Usare le **proprie credenziali Google OAuth** (BYOK - Bring Your Own Key):
1. Creare un progetto nella Google Cloud Console (console.cloud.google.com)
2. Configurare la schermata di consenso OAuth con il branding "Bitplace" (nome, logo, dominio bitplace.com)
3. Creare un OAuth Client ID di tipo "Web application"
4. Aggiungere i redirect URL necessari (dalla configurazione di Lovable Cloud)
5. Inserire Client ID e Client Secret nella sezione Authentication Settings di Lovable Cloud

Questo e' un passaggio manuale nella Google Cloud Console -- non posso farlo io, ma posso guidarti passo dopo passo.

### Problema 2: "Signing in..." resta bloccato

**Causa identificata**: Dopo il redirect da Google, il flusso procede cosi:
1. `lovable.auth.signInWithOAuth` redireziona a Google
2. Google ritorna, `supabase.auth.setSession()` viene chiamato
3. `onAuthStateChange('SIGNED_IN')` scatta
4. Dentro il listener, viene chiamato `supabase.functions.invoke('auth-google')` 
5. **Questa chiamata non completa mai** -- nessun log arriva al backend

Ho verificato che la edge function `auth-google` funziona correttamente quando chiamata direttamente (risponde con token e user). Il problema e' nell'invocazione dal client.

**Causa probabile**: Il `supabase.functions.invoke` dentro `onAuthStateChange` potrebbe avere un problema di timing -- la sessione e' appena stata settata e il client potrebbe non averla ancora pronta per includerla nell'header Authorization. Oppure il listener potrebbe non catturare l'errore correttamente.

**Soluzione proposta**:
- Aggiungere logging esplicito prima e dopo la chiamata `invoke`
- Aggiungere un timeout per la chiamata (fallback dopo 10s)
- Passare esplicitamente il token nell'header invece di affidarsi al client automatico
- Aggiungere error handling piu robusto con try/catch che logga su console

### Modifiche tecniche

**File: `src/contexts/WalletContext.tsx`**

Nel listener `onAuthStateChange` (riga ~648-720):

```text
// PRIMA (problematico):
const { data, error } = await supabase.functions.invoke('auth-google', {
  body: { supabase_access_token: session.access_token },
});

// DOPO (fix):
// 1. Passare il token esplicitamente nell'header
// 2. Aggiungere logging dettagliato  
// 3. Aggiungere timeout di 15 secondi
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15000);

console.log('[WalletContext] Calling auth-google...');
const { data, error } = await supabase.functions.invoke('auth-google', {
  headers: { Authorization: `Bearer ${session.access_token}` },
});
clearTimeout(timeout);
console.log('[WalletContext] auth-google response:', { data, error });
```

Inoltre, aggiungere un `catch` che logga l'errore completo su console e mostra un toast con un'azione "Riprova".

### Riepilogo

| Problema | Soluzione | Chi lo fa |
|----------|-----------|-----------|
| Branding "Lovable" su Google | Configurare OAuth BYOK nella Google Cloud Console | Tu (ti guido) |
| "Signing in..." bloccato | Fix nel codice: header esplicito + logging + timeout | Io (modifica codice) |

