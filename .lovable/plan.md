

# Templates: Persistenza Client-Side con IndexedDB

## Obiettivo
Rendere i Templates persistenti usando IndexedDB, separati per wallet address (o "guest" se non connesso). Nessun upload su backend - tutto client-side.

## Architettura

```text
+-------------------+     +-----------------------+
|   useTemplates    |<--->|   templatesStore.ts   |
| (hook React)      |     | (IndexedDB wrapper)   |
+--------+----------+     +-----------+-----------+
         |                            |
         v                            v
+--------+----------+     +-----------+-----------+
| TemplatesPanel    |     | IndexedDB "bitplace"  |
| TemplateOverlay   |     | store: "templates"    |
+-------------------+     +-----------------------+
```

## Flusso Dati

1. **Add Template**: File → Blob → IndexedDB → objectUrl runtime
2. **Load**: IndexedDB → Blob → objectUrl → render
3. **Update settings**: debounce → IndexedDB patch
4. **Delete**: IndexedDB delete → revoke objectUrl
5. **Cambio wallet**: ricarica lista per nuovo ownerKey

## File da Creare

| File | Descrizione |
|------|-------------|
| `src/lib/templatesStore.ts` | API IndexedDB per CRUD templates con Blob storage |

## File da Modificare

| File | Modifica |
|------|----------|
| `src/hooks/useTemplates.ts` | Integrazione IndexedDB + wallet awareness + objectUrl lifecycle |
| `src/components/map/TemplatesPanel.tsx` | Usa `objectUrl` invece di `dataUrl` |
| `src/components/map/TemplateOverlay.tsx` | Usa `objectUrl` invece di `dataUrl` |

## Dettagli Implementazione

### 1. templatesStore.ts (IndexedDB API)

Schema database:
- **Database**: `bitplace` (version 1)
- **Object Store**: `templates` con keyPath `id`
- **Index**: `ownerKey` per query per wallet

Record Template:
```typescript
interface TemplateRecord {
  id: string;
  ownerKey: string;           // walletAddress || "guest"
  name: string;
  mime: string;
  width: number;
  height: number;
  createdAt: number;
  blob: Blob;                 // Immagine originale
  settings: {
    visible: boolean;
    x: number;
    y: number;                // Posizione grid
    scale: number;            // 1-400%
    opacity: number;          // 0-100
    rotation: number;         // gradi (per futuro)
  };
}
```

API esposte:
```typescript
// Inizializza/apre DB
async function openDB(): Promise<IDBDatabase>

// Lista templates per owner
async function listTemplates(ownerKey: string): Promise<TemplateRecord[]>

// Aggiunge template da File
async function addTemplate(ownerKey: string, file: File, initialPosition: {x: number, y: number}): Promise<TemplateRecord>

// Aggiorna settings (debounce interno)
async function updateTemplate(id: string, patch: Partial<TemplateRecord['settings']>): Promise<void>

// Elimina template
async function deleteTemplate(id: string): Promise<void>
```

### 2. Modifiche a useTemplates.ts

Stato aggiornato:
```typescript
interface RuntimeTemplate {
  id: string;
  name: string;
  objectUrl: string;         // URL.createObjectURL(blob) - solo runtime!
  width: number;
  height: number;
  opacity: number;
  scale: number;
  positionX: number;
  positionY: number;
}
```

Nuove responsabilità:
1. **Riceve `walletAddress`** come prop/context
2. **ownerKey** = walletAddress || "guest"
3. **useEffect su ownerKey** → ricarica `listTemplates(ownerKey)`
4. **addTemplate** → chiama `templatesStore.addTemplate()` → crea objectUrl → aggiunge a state
5. **updateTransform/updatePosition** → chiama `templatesStore.updateTemplate()` con debounce 300ms
6. **removeTemplate** → `URL.revokeObjectURL()` → `templatesStore.deleteTemplate()`
7. **Cleanup su unmount** → revoke tutti gli objectUrl
8. **activeTemplateId** → localStorage key: `active_template_id_${ownerKey}`

### 3. Modifiche a TemplatesPanel.tsx

- Usa `template.objectUrl` invece di `template.dataUrl` per thumbnail
- Nessun'altra modifica logica (il tipo cambia ma l'uso è identico)

### 4. Modifiche a TemplateOverlay.tsx

- Usa `template.objectUrl` invece di `template.dataUrl` per rendering
- Nessun'altra modifica logica

## Gestione Lifecycle ObjectURL

| Evento | Azione |
|--------|--------|
| Template caricato da IndexedDB | `URL.createObjectURL(blob)` → salva in state |
| Template eliminato | `URL.revokeObjectURL(url)` prima di rimuovere da state |
| Cambio wallet (ownerKey) | Revoke tutti gli URL correnti → carica nuova lista |
| Unmount hook | Revoke tutti gli URL |

## Active Template Persistence

```typescript
// Salva active template id in localStorage
const ACTIVE_TEMPLATE_KEY = (ownerKey: string) => `bitplace_active_template_${ownerKey}`;

// Quando cambia ownerKey:
// 1. Carica active_template_id dal localStorage
// 2. Se esiste nella lista caricata → seleziona
// 3. Altrimenti → null

// Quando cambia activeTemplateId:
// Salva in localStorage[ACTIVE_TEMPLATE_KEY(ownerKey)]
```

## Debounce Update Settings

Per evitare troppi write su IndexedDB durante lo slider:
```typescript
const debouncedUpdate = useMemo(
  () => debounce((id: string, patch: object) => {
    templatesStore.updateTemplate(id, patch);
  }, 300),
  []
);
```

## Test di Accettazione

| Test | Comportamento Atteso |
|------|---------------------|
| Add template | Appare in lista e resta dopo refresh |
| Cambio opacity/scale | Valori persistono dopo refresh |
| Cambio wallet | Lista cambia (namespace per wallet) |
| Logout → Guest | Vede templates "guest" |
| Delete | Sparisce e non torna dopo refresh |
| Refresh pagina | Templates tornano, active ripristinato |

## Note Tecniche

### IndexedDB senza libreria esterna
Implementazione minimale vanilla JS (no `idb` o altre librerie) per mantenere bundle leggero. Pattern standard con Promise wrapper.

### Gestione errori
- Se IndexedDB non disponibile (es. private browsing) → fallback a memoria (templates non persistenti)
- Console.warn per debug ma non blocca l'app

### Migrazione
Nessuna migrazione necessaria - è una nuova feature. I templates in-memory attuali andranno persi al primo refresh dopo deploy (comportamento accettato).

