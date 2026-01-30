import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to track the height of the StatusStrip element.
 * Returns the current height (in pixels) that can be used to position elements above it.
 */
export function useStatusStripHeight() {
  const [height, setHeight] = useState(48); // Default min-height of StatusStrip
  const observerRef = useRef<ResizeObserver | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  const measureHeight = useCallback(() => {
    if (elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      // Only update if height actually changed to avoid unnecessary re-renders
      setHeight(prev => {
        const newHeight = Math.ceil(rect.height);
        return prev !== newHeight ? newHeight : prev;
      });
    }
  }, []);

  const setRef = useCallback((element: HTMLElement | null) => {
    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    elementRef.current = element;

    if (element) {
      // Initial measurement
      const rect = element.getBoundingClientRect();
      setHeight(Math.ceil(rect.height));

      // Set up ResizeObserver for dynamic updates
      observerRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const newHeight = Math.ceil(entry.contentRect.height);
          setHeight(prev => prev !== newHeight ? newHeight : prev);
        }
      });
      observerRef.current.observe(element);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { height, setRef };
}
