/**
 * IndexedDB store for Templates persistence
 * Stores image blobs client-side, scoped by wallet address (or "guest")
 */

const DB_NAME = 'bitplace';
const DB_VERSION = 2; // Bumped for new settings fields
const STORE_NAME = 'templates';

export interface TemplateSettings {
  visible: boolean;
  x: number;
  y: number;
  scale: number;        // 1-400 (percentage) - absolute scale
  initialScale: number; // Scale at first load (for relative slider)
  opacity: number;      // 0-100
  rotation: number;     // 0-360 degrees
  mode: 'image' | 'pixelGuide';
  
  // Quick settings
  highlightSelectedColor: boolean;
  filterPaletteColors: boolean;
  showAbovePixels: boolean;
}

export interface TemplateRecord {
  id: string;
  ownerKey: string;
  name: string;
  mime: string;
  width: number;
  height: number;
  createdAt: number;
  blob: Blob;
  settings: TemplateSettings;
}

// Default settings for new templates
const DEFAULT_SETTINGS: TemplateSettings = {
  visible: true,
  x: 0,
  y: 0,
  scale: 100,
  initialScale: 100,
  opacity: 70,
  rotation: 0,
  mode: 'image',
  highlightSelectedColor: false,
  filterPaletteColors: false,
  showAbovePixels: false,
};

let dbPromise: Promise<IDBDatabase> | null = null;
let dbAvailable = true;

/**
 * Migrate old settings to new format
 */
function migrateSettings(settings: Partial<TemplateSettings>): TemplateSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
  };
}

/**
 * Opens or creates the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      dbAvailable = false;
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      dbAvailable = false;
      console.warn('[templatesStore] IndexedDB open error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create templates store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('ownerKey', 'ownerKey', { unique: false });
      }
      // Note: existing records will be migrated when read via migrateSettings
    };
  });

  return dbPromise;
}

/**
 * Check if IndexedDB is available
 */
export function isDBAvailable(): boolean {
  return dbAvailable;
}

/**
 * List all templates for a given owner
 */
export async function listTemplates(ownerKey: string): Promise<TemplateRecord[]> {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('ownerKey');
      const request = index.getAll(ownerKey);

      request.onsuccess = () => {
        const records = request.result as TemplateRecord[];
        // Migrate settings for backwards compatibility
        const migratedRecords = records.map(record => ({
          ...record,
          settings: migrateSettings(record.settings),
        }));
        // Sort by createdAt descending (newest first)
        migratedRecords.sort((a, b) => b.createdAt - a.createdAt);
        resolve(migratedRecords);
      };

      request.onerror = () => {
        console.warn('[templatesStore] listTemplates error:', request.error);
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('[templatesStore] listTemplates failed:', err);
    return [];
  }
}

/**
 * Add a new template from a File
 */
export async function addTemplate(
  ownerKey: string,
  file: File,
  initialPosition: { x: number; y: number }
): Promise<TemplateRecord> {
  const db = await openDB();

  // Get image dimensions
  const dimensions = await getImageDimensions(file);

  const record: TemplateRecord = {
    id: crypto.randomUUID(),
    ownerKey,
    name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
    mime: file.type,
    width: dimensions.width,
    height: dimensions.height,
    createdAt: Date.now(),
    blob: file, // File is a Blob subclass
    settings: {
      ...DEFAULT_SETTINGS,
      x: initialPosition.x,
      y: initialPosition.y,
    },
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(record);

    request.onsuccess = () => resolve(record);
    request.onerror = () => {
      console.warn('[templatesStore] addTemplate error:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Update template settings (partial update)
 */
export async function updateTemplate(
  id: string,
  patch: Partial<TemplateSettings>
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const record = getRequest.result as TemplateRecord | undefined;
      if (!record) {
        reject(new Error(`Template ${id} not found`));
        return;
      }

      // Merge settings (ensure migration first)
      record.settings = { ...migrateSettings(record.settings), ...patch };

      const putRequest = store.put(record);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => {
        console.warn('[templatesStore] updateTemplate error:', putRequest.error);
        reject(putRequest.error);
      };
    };

    getRequest.onerror = () => {
      console.warn('[templatesStore] updateTemplate get error:', getRequest.error);
      reject(getRequest.error);
    };
  });
}

/**
 * Delete a template by id
 */
export async function deleteTemplate(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.warn('[templatesStore] deleteTemplate error:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Helper: Get image dimensions from a File
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}
