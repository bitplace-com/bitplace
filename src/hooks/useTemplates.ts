import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import * as templatesStore from '@/lib/templatesStore';
import type { TemplateRecord, TemplateSettings as StoreSettings } from '@/lib/templatesStore';

// Re-export TemplateSettings for consumers
export type TemplateSettings = StoreSettings;

export interface Template {
  id: string;
  name: string;
  objectUrl: string;  // Runtime URL for rendering
  width: number;
  height: number;
  opacity: number;    // 0-100
  scale: number;      // 1-400 (percentage)
  rotation: number;   // 0-360 degrees
  positionX: number;  // Grid coordinates
  positionY: number;
  mode: 'image' | 'pixelGuide';
  
  // Quick settings
  highlightSelectedColor: boolean;
  filterPaletteColors: boolean;
  showAbovePixels: boolean;
  excludeSpecial: boolean;
}

interface UseTemplatesReturn {
  templates: Template[];
  activeTemplateId: string | null;
  activeTemplate: Template | null;
  isLoading: boolean;
  isMoveMode: boolean;
  addTemplate: (file: File, initialPosition?: { x: number; y: number }) => Promise<void>;
  removeTemplate: (id: string) => void;
  selectTemplate: (id: string | null) => void;
  updateTransform: (id: string, transform: { opacity?: number; scale?: number; rotation?: number }) => void;
  updatePosition: (id: string, position: { x: number; y: number }) => void;
  updateSettings: (id: string, settings: Partial<TemplateSettings>) => void;
  setMoveMode: (enabled: boolean) => void;
  toggleMoveMode: () => void;
}

const ACTIVE_TEMPLATE_KEY = (ownerKey: string) => `bitplace_active_template_${ownerKey}`;

// Simple debounce utility
function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function useTemplates(walletAddress: string | null): UseTemplatesReturn {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMoveMode, setIsMoveMode] = useState(false);
  
  // Track object URLs for cleanup
  const objectUrlsRef = useRef<Map<string, string>>(new Map());

  const ownerKey = walletAddress || 'guest';

  const activeTemplate = templates.find(t => t.id === activeTemplateId) || null;

  // Debounced update to IndexedDB
  const debouncedUpdate = useMemo(
    () => debounce((id: string, patch: Partial<TemplateSettings>) => {
      templatesStore.updateTemplate(id, patch).catch(err => {
        console.warn('[useTemplates] Failed to persist update:', err);
      });
    }, 300),
    []
  );

  // Cleanup all object URLs
  const revokeAllUrls = useCallback(() => {
    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }, []);

  // Convert TemplateRecord to runtime Template with objectUrl
  const recordToTemplate = useCallback((record: TemplateRecord): Template => {
    // Check if we already have an objectUrl for this record
    let objectUrl = objectUrlsRef.current.get(record.id);
    if (!objectUrl) {
      objectUrl = URL.createObjectURL(record.blob);
      objectUrlsRef.current.set(record.id, objectUrl);
    }

    return {
      id: record.id,
      name: record.name,
      objectUrl,
      width: record.width,
      height: record.height,
      opacity: record.settings.opacity,
      scale: record.settings.scale,
      rotation: record.settings.rotation,
      positionX: record.settings.x,
      positionY: record.settings.y,
      mode: record.settings.mode,
      highlightSelectedColor: record.settings.highlightSelectedColor,
      filterPaletteColors: record.settings.filterPaletteColors,
      showAbovePixels: record.settings.showAbovePixels,
      excludeSpecial: record.settings.excludeSpecial,
    };
  }, []);

  // Load templates when ownerKey changes
  useEffect(() => {
    let cancelled = false;

    async function loadTemplates() {
      setIsLoading(true);
      
      // Cleanup previous URLs before loading new ones
      revokeAllUrls();
      setTemplates([]);

      try {
        const records = await templatesStore.listTemplates(ownerKey);
        if (cancelled) return;

        const runtimeTemplates = records.map(recordToTemplate);
        setTemplates(runtimeTemplates);

        // Restore active template from localStorage
        const savedActiveId = localStorage.getItem(ACTIVE_TEMPLATE_KEY(ownerKey));
        if (savedActiveId && runtimeTemplates.some(t => t.id === savedActiveId)) {
          setActiveTemplateId(savedActiveId);
        } else {
          setActiveTemplateId(null);
        }
      } catch (err) {
        console.warn('[useTemplates] Failed to load templates:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [ownerKey, recordToTemplate, revokeAllUrls]);

  // Persist active template id to localStorage
  useEffect(() => {
    if (activeTemplateId) {
      localStorage.setItem(ACTIVE_TEMPLATE_KEY(ownerKey), activeTemplateId);
    } else {
      localStorage.removeItem(ACTIVE_TEMPLATE_KEY(ownerKey));
    }
  }, [activeTemplateId, ownerKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      revokeAllUrls();
    };
  }, [revokeAllUrls]);

  // Exit move mode when template is deselected
  useEffect(() => {
    if (!activeTemplateId) {
      setIsMoveMode(false);
    }
  }, [activeTemplateId]);

  const addTemplate = useCallback(async (file: File, initialPosition?: { x: number; y: number }) => {
    const position = initialPosition ?? { x: 0, y: 0 };

    try {
      const record = await templatesStore.addTemplate(ownerKey, file, position);
      const template = recordToTemplate(record);
      
      setTemplates(prev => [template, ...prev]); // Add to beginning (newest first)
      setActiveTemplateId(template.id);
    } catch (err) {
      console.error('[useTemplates] Failed to add template:', err);
      throw err;
    }
  }, [ownerKey, recordToTemplate]);

  const removeTemplate = useCallback((id: string) => {
    // Revoke object URL
    const url = objectUrlsRef.current.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(id);
    }

    // Remove from state
    setTemplates(prev => prev.filter(t => t.id !== id));
    setActiveTemplateId(prev => prev === id ? null : prev);

    // Delete from IndexedDB
    templatesStore.deleteTemplate(id).catch(err => {
      console.warn('[useTemplates] Failed to delete template from DB:', err);
    });
  }, []);

  const selectTemplate = useCallback((id: string | null) => {
    setActiveTemplateId(id);
  }, []);

  const updateTransform = useCallback((id: string, transform: { opacity?: number; scale?: number; rotation?: number }) => {
    setTemplates(prev => prev.map(t => {
      if (t.id !== id) return t;
      return {
        ...t,
        ...(transform.opacity !== undefined && { opacity: transform.opacity }),
        ...(transform.scale !== undefined && { scale: transform.scale }),
        ...(transform.rotation !== undefined && { rotation: transform.rotation }),
      };
    }));

    // Debounced persist to IndexedDB
    debouncedUpdate(id, transform);
  }, [debouncedUpdate]);

  const updatePosition = useCallback((id: string, position: { x: number; y: number }) => {
    setTemplates(prev => prev.map(t => {
      if (t.id !== id) return t;
      return {
        ...t,
        positionX: position.x,
        positionY: position.y,
      };
    }));

    // Debounced persist to IndexedDB
    debouncedUpdate(id, { x: position.x, y: position.y });
  }, [debouncedUpdate]);

  const updateSettings = useCallback((id: string, settings: Partial<TemplateSettings>) => {
    setTemplates(prev => prev.map(t => {
      if (t.id !== id) return t;
      return {
        ...t,
        ...(settings.opacity !== undefined && { opacity: settings.opacity }),
        ...(settings.scale !== undefined && { scale: settings.scale }),
        ...(settings.rotation !== undefined && { rotation: settings.rotation }),
        ...(settings.x !== undefined && { positionX: settings.x }),
        ...(settings.y !== undefined && { positionY: settings.y }),
        ...(settings.mode !== undefined && { mode: settings.mode }),
        ...(settings.highlightSelectedColor !== undefined && { highlightSelectedColor: settings.highlightSelectedColor }),
        ...(settings.filterPaletteColors !== undefined && { filterPaletteColors: settings.filterPaletteColors }),
        ...(settings.showAbovePixels !== undefined && { showAbovePixels: settings.showAbovePixels }),
        ...(settings.excludeSpecial !== undefined && { excludeSpecial: settings.excludeSpecial }),
      };
    }));

    // Debounced persist to IndexedDB
    debouncedUpdate(id, settings);
  }, [debouncedUpdate]);

  const toggleMoveMode = useCallback(() => {
    setIsMoveMode(prev => !prev);
  }, []);

  return {
    templates,
    activeTemplateId,
    activeTemplate,
    isLoading,
    isMoveMode,
    addTemplate,
    removeTemplate,
    selectTemplate,
    updateTransform,
    updatePosition,
    updateSettings,
    setMoveMode: setIsMoveMode,
    toggleMoveMode,
  };
}
