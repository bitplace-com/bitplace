import { useState, useCallback, useEffect } from 'react';
import { hapticsEngine } from '@/lib/hapticsEngine';
import { type HapticType } from '@/lib/haptics';

export function useHaptics() {
  const [enabled, setEnabled] = useState(() => hapticsEngine.isEnabled());
  const isSupported = hapticsEngine.isSupported();

  // Sync with engine on mount
  useEffect(() => {
    setEnabled(hapticsEngine.isEnabled());
  }, []);

  const toggle = useCallback(() => {
    const newValue = !enabled;
    setEnabled(newValue);
    hapticsEngine.setEnabled(newValue);
    // Give immediate feedback when enabling
    if (newValue) {
      hapticsEngine.trigger('medium');
    }
  }, [enabled]);

  const trigger = useCallback((type: HapticType = 'light') => {
    hapticsEngine.trigger(type);
  }, []);

  return { 
    enabled, 
    toggle, 
    trigger,
    isSupported,
  };
}
