import { useState, useEffect } from 'react';

/**
 * Returns a timestamp (Date.now()) that updates every second.
 * Components using this will re-render once per second for live countdowns.
 */
export function useLiveTick(): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
