import { useState, useCallback, useEffect } from 'react';

const TOUR_SEEN_KEY = 'bitplace_tour_seen';

export interface TourStep {
  id: string;
  target: string; // data-tour attribute value, '__welcome__' for welcome, '__wallet-modal__' for real modal
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: string; // custom event to dispatch before showing step
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: '__welcome__',
    title: 'Welcome to Bitplace!',
    description: 'Paint pixels on a real-world map, claim territory and compete. Sign in to start drawing!',
  },
  {
    id: 'sign-in',
    target: 'wallet',
    title: 'Sign In',
    description: 'Tap Sign In to create your account. You need an account to paint on the map.',
    position: 'left',
  },
  {
    id: 'account-types',
    target: 'wallet-modal',
    title: 'Two Ways to Play',
    description: '🟢 Google (Starter) — 300,000 free Pixels to draw anywhere. They expire after 72h unless renewed.\n\n🟣 Phantom Wallet (Pro) — Permanent Paint Energy (PE) powered by $BIT token. Full pixel ownership.\n\nStart free with Google and upgrade anytime.',
    position: 'right',
    action: 'bitplace:tour-open-signin',
  },
  {
    id: 'toolbar',
    target: 'toolbar',
    title: 'Mode Bar',
    description: 'Switch between Paint, Defend, Attack and Reinforce modes to interact with pixels on the map.',
    position: 'bottom',
    action: 'bitplace:tour-close-signin',
  },
  {
    id: 'action-tray-collapsed',
    target: 'action-tray',
    title: 'Drawing Panel',
    description: 'This is your main tool panel. Tap the arrow to expand it and access colors, brushes and tools.',
    position: 'top',
    action: 'bitplace:tour-collapse-tray',
  },
  {
    id: 'action-tray-expanded',
    target: 'action-tray',
    title: 'Colors & Tools',
    description: 'Pick a color, choose your brush size, and start painting on the map! Use the eraser to remove pixels.',
    position: 'top',
    action: 'bitplace:tour-expand-tray',
  },
  {
    id: 'menu',
    target: 'menu',
    title: 'Menu',
    description: 'Access Rules, Leaderboard, Alliance, Settings and more from this menu.',
    position: 'right',
  },
  {
    id: 'templates',
    target: 'templates',
    title: 'Templates',
    description: 'Upload an image as a guide overlay on the map. Use it to trace pixel art or plan large designs before painting.',
    position: 'right',
  },
  {
    id: 'quick-actions',
    target: 'quick-actions',
    title: 'Search & Leaderboard',
    description: 'Search for any location on the map and check the leaderboard to see the top players.',
    position: 'right',
  },
  {
    id: 'bottom-right-controls',
    target: 'bottom-right-controls',
    title: 'Notifications & Pixel Art',
    description: 'Toggle pixel art opacity to see the map underneath, and check your notifications for attacks, alliance invites and more.',
    position: 'left',
  },
];

/** Targets that render as centered dialogs instead of anchored tooltips */
export const CENTERED_TARGETS = new Set(['__welcome__']);

export function useGuidedTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [shouldShow, setShouldShow] = useState(false);

  // Check if tour should be shown on mount
  useEffect(() => {
    const seen = localStorage.getItem(TOUR_SEEN_KEY);
    if (!seen) {
      const timer = setTimeout(() => setShouldShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTour = useCallback(() => {
    setShouldShow(false);
    setCurrentStepIndex(1); // Skip welcome, go to first real step
    setIsActive(true);
  }, []);

  const skipTour = useCallback(() => {
    setShouldShow(false);
    setIsActive(false);
    setCurrentStepIndex(0);
    localStorage.setItem(TOUR_SEEN_KEY, '1');
    // Close wallet modal if open during tour
    window.dispatchEvent(new CustomEvent('bitplace:tour-close-signin'));
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      setIsActive(false);
      setCurrentStepIndex(0);
      localStorage.setItem(TOUR_SEEN_KEY, '1');
    }
  }, [currentStepIndex]);

  const currentStep = isActive ? TOUR_STEPS[currentStepIndex] : null;

  return {
    isActive,
    shouldShow,
    currentStep,
    currentStepIndex,
    totalSteps: TOUR_STEPS.length - 1, // Exclude welcome
    startTour,
    skipTour,
    nextStep,
  };
}
