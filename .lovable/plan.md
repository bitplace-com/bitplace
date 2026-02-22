

## Fix condivisione link: preview social e link profilo

### Problemi identificati

1. **Link profilo non funzionante**: La funzione `shareArtwork` genera link come `/profile/USER_ID`, ma non esiste una rotta `/profile/:id` nell'app. L'unica rotta definita e `/profile` (senza parametri), quindi il link condiviso porta a una pagina 404. Il `PlayerProfileModal` e un componente modale, non una pagina a se stante.

2. **Preview social (OG meta tags)**: I meta tag Open Graph in `index.html` contengono gia il banner social corretto (`Cover_Naming_Bitplace.webp`), ma `og:url` non e impostato. Per una SPA come questa, i meta tag sono statici e non possono cambiare dinamicamente per pixel o profilo senza un server-side rendering layer. Tuttavia possiamo assicurarci che `og:url` sia presente.

### Soluzione

**1. Aggiungere la rotta `/profile/:id` nell'app**

Modificare `src/App.tsx` per aggiungere una rotta che gestisca `/profile/:id` e apra automaticamente il `PlayerProfileModal` per quell'utente. Il modo piu pulito e creare una piccola pagina wrapper che:
- Legge il parametro `:id` dall'URL
- Mostra la mappa come sfondo (reindirizzando a `/` con il modale del profilo aperto)
- Oppure piu semplicemente: reindirizza alla mappa con un parametro query che triggera l'apertura del PlayerProfileModal

Approccio scelto: aggiungere il supporto a `?player=USER_ID` sulla rotta principale `/`, cosi il `MapPage` puo aprire il `PlayerProfileModal` automaticamente. Aggiungere anche un redirect da `/profile/:id` a `/?player=:id`.

**2. Aggiornare `shareArtwork` per usare il formato corretto**

Cambiare `generateProfileShareLink` per generare `/?player=USER_ID` invece di `/profile/USER_ID`.

**3. Aggiungere `og:url` nei meta tag**

Aggiungere `<meta property="og:url">` in `index.html` con l'URL del sito pubblicato.

### Dettagli tecnici

**File: `src/lib/shareLink.ts`**
- Cambiare `generateProfileShareLink` da:
  ```
  return `${baseUrl}/profile/${userId}`;
  ```
  a:
  ```
  return `${baseUrl}/?player=${userId}`;
  ```

**File: `src/App.tsx`**
- Aggiungere rotta di redirect: `/profile/:id` che reindirizza a `/?player=:id`

**File: `src/pages/MapPage.tsx`**
- Leggere il parametro `player` dalla query string
- Se presente, aprire automaticamente il `PlayerProfileModal` con quel `playerId`
- Aggiungere il componente `PlayerProfileModal` al render del MapPage

**File: `index.html`**
- Aggiungere `<meta property="og:url" content="https://bitplace.lovable.app">`

