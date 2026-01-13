import { useState, useEffect, useCallback } from 'react';

export function usePaintCooldown(cooldownUntil: Date | null) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isOnCooldown, setIsOnCooldown] = useState(false);

  useEffect(() => {
    if (!cooldownUntil) {
      setRemainingSeconds(0);
      setIsOnCooldown(false);
      return;
    }

    const updateRemaining = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((cooldownUntil.getTime() - now) / 1000));
      setRemainingSeconds(remaining);
      setIsOnCooldown(remaining > 0);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const formatCooldown = useCallback(() => {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `0:${secs.toString().padStart(2, '0')}`;
  }, [remainingSeconds]);

  return { isOnCooldown, remainingSeconds, formatCooldown };
}
