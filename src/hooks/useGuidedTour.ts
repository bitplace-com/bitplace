import { useState, useCallback, useEffect } from 'react';

const TOUR_SEEN_KEY = 'bitplace_tour_seen';

export interface TourStep {
  id: string;
  target: string; // data-tour attribute value
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: string; // custom event to dispatch before showing step
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: '__welcome__', // No target - centered dialog
    title: 'Welcome to Bitplace!',
    description: 'Paint pixels on a real-world map, claim territory and compete with others. Ready for a quick tour?',
  },
  {
    id: 'toolbar',
    target: 'toolbar',
    title: 'Mode Bar',
    description: 'Switch between Paint, Defend, Attack and Reinforce modes to interact with pixels on the map.',
    position: 'bottom',
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
    title: 'Search & Notifications',
    description: 'Search for any location on the map and check your notifications here.',
    position: 'right',
  },
  {
    id: 'wallet',
    target: 'wallet',
    title: 'Your Wallet',
    description: 'Connect your Phantom wallet to fund your PE (Paint Energy) — the energy you spend to paint, defend and attack on the map. Or try the Test Wallet to paint for free!',
    position: 'left',
  },
];

export function useGuidedTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [shouldShow, setShouldShow] = useState(false);

  // Check if tour should be shown on mount
  useEffect(() => {
    const seen = localStorage.getItem(TOUR_SEEN_KEY);
    if (!seen) {
      // Small delay to let the map render first
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
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Tour complete
      setIsActive(false);
      setCurrentStepIndex(0);
      localStorage.setItem(TOUR_SEEN_KEY, '1');
    }
  }, [currentStepIndex]);

  const currentStep = isActive ? TOUR_STEPS[currentStepIndex] : null;

  return {
    isActive,
    shouldShow, // Show the welcome dialog
    currentStep,
    currentStepIndex,
    totalSteps: TOUR_STEPS.length - 1, // Exclude welcome
    startTour,
    skipTour,
    nextStep,
  };
}
