import { useState, useCallback } from 'react';

export interface Template {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  opacity: number;   // 0-100
  scale: number;     // 1-400 (percentage)
  positionX: number; // Grid coordinates
  positionY: number;
}

interface UseTemplatesReturn {
  templates: Template[];
  activeTemplateId: string | null;
  activeTemplate: Template | null;
  addTemplate: (file: File, initialPosition?: { x: number; y: number }) => Promise<void>;
  removeTemplate: (id: string) => void;
  selectTemplate: (id: string | null) => void;
  updateTransform: (id: string, transform: { opacity?: number; scale?: number }) => void;
  updatePosition: (id: string, position: { x: number; y: number }) => void;
}

export function useTemplates(): UseTemplatesReturn {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  const activeTemplate = templates.find(t => t.id === activeTemplateId) || null;

  const addTemplate = useCallback(async (file: File, initialPosition?: { x: number; y: number }) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        
        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          const newTemplate: Template = {
            id: crypto.randomUUID(),
            name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
            dataUrl,
            width: img.width,
            height: img.height,
            opacity: 70, // Default 70%
            scale: 100,  // Default 100%
            positionX: initialPosition?.x ?? 0,
            positionY: initialPosition?.y ?? 0,
          };
          
          setTemplates(prev => [...prev, newTemplate]);
          setActiveTemplateId(newTemplate.id);
          resolve();
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = dataUrl;
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  const removeTemplate = useCallback((id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    setActiveTemplateId(prev => prev === id ? null : prev);
  }, []);

  const selectTemplate = useCallback((id: string | null) => {
    setActiveTemplateId(id);
  }, []);

  const updateTransform = useCallback((id: string, transform: { opacity?: number; scale?: number }) => {
    setTemplates(prev => prev.map(t => {
      if (t.id !== id) return t;
      return {
        ...t,
        ...(transform.opacity !== undefined && { opacity: transform.opacity }),
        ...(transform.scale !== undefined && { scale: transform.scale }),
      };
    }));
  }, []);

  const updatePosition = useCallback((id: string, position: { x: number; y: number }) => {
    setTemplates(prev => prev.map(t => {
      if (t.id !== id) return t;
      return {
        ...t,
        positionX: position.x,
        positionY: position.y,
      };
    }));
  }, []);

  return {
    templates,
    activeTemplateId,
    activeTemplate,
    addTemplate,
    removeTemplate,
    selectTemplate,
    updateTransform,
    updatePosition,
  };
}
