import { useState, useCallback, useEffect } from 'react';
import { soundEngine } from '@/lib/soundEngine';

export function useSound() {
  const [enabled, setEnabled] = useState(() => soundEngine.isEnabled());

  // Warm up audio context on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      soundEngine.warmUp();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };

    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  const toggle = useCallback(() => {
    const newValue = !enabled;
    setEnabled(newValue);
    soundEngine.setEnabled(newValue);
  }, [enabled]);

  const play = useCallback((sound: Parameters<typeof soundEngine.play>[0]) => {
    soundEngine.play(sound);
  }, []);

  return { enabled, toggle, play };
}
