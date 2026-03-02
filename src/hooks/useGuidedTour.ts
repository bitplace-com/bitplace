import { useState, useCallback, useEffect, useMemo } from 'react';

const TOUR_SEEN_KEY = 'bitplace_tour_seen';

export interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: string;
}

/** Cleanup events to emit when leaving specific steps */
const STEP_CLEANUP: Record<string, string[]> = {
  'account-types': ['bitplace:tour-close-signin'],
  'sign-in-modal': ['bitplace:tour-close-signin'],
  'action-tray-expanded': ['bitplace:tour-collapse-tray'],
  'action-tray-collapsed': ['bitplace:tour-collapse-tray'],
};

/** Targets that render as centered dialogs instead of anchored tooltips */
export const CENTERED_TARGETS = new Set(['__welcome__', '__account-types__']);

function buildTourSteps(isMobile: boolean): TourStep[] {
  const steps: TourStep[] = [
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
      target: isMobile ? '__account-types__' : 'wallet-modal',
      title: 'Two Ways to Play',
      description: '',
      position: isMobile ? undefined : 'right',
      action: 'bitplace:tour-open-signin',
    },
  ];

  if (isMobile) {
    steps.push({
      id: 'sign-in-modal',
      target: 'wallet-modal',
      title: 'Sign In Screen',
      description: 'This is your Sign In screen. Choose Google or Phantom to create your account and start playing.',
      position: 'bottom',
    });
  }

  steps.push(
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
      description: 'Access Alliance, Rules, How It Works, Get $BIT and Settings from this menu.',
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
      title: 'Pixel Art, Pins & Notifications',
      description: 'Toggle pixel art opacity to see the map underneath, save your favorite locations as Pins, and check your notifications for attacks, alliance invites and more.',
      position: 'left',
    },
  );

  return steps;
}

export function useGuidedTour(isMobile: boolean) {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [shouldShow, setShouldShow] = useState(false);

  const tourSteps = useMemo(() => buildTourSteps(isMobile), [isMobile]);

  useEffect(() => {
    const seen = localStorage.getItem(TOUR_SEEN_KEY);
    if (!seen) {
      const timer = setTimeout(() => setShouldShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTour = useCallback(() => {
    setShouldShow(false);
    setCurrentStepIndex(1);
    setIsActive(true);
  }, []);

  const skipTour = useCallback(() => {
    setShouldShow(false);
    setIsActive(false);
    setCurrentStepIndex(0);
    localStorage.setItem(TOUR_SEEN_KEY, '1');
    window.dispatchEvent(new CustomEvent('bitplace:tour-close-signin'));
    window.dispatchEvent(new CustomEvent('bitplace:tour-collapse-tray'));
  }, []);

  const nextStep = useCallback(() => {
    const leavingStep = tourSteps[currentStepIndex];
    if (leavingStep) {
      const cleanups = STEP_CLEANUP[leavingStep.id];
      if (cleanups) {
        cleanups.forEach(evt => window.dispatchEvent(new CustomEvent(evt)));
      }
    }

    if (currentStepIndex < tourSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      setIsActive(false);
      setCurrentStepIndex(0);
      localStorage.setItem(TOUR_SEEN_KEY, '1');
    }
  }, [currentStepIndex, tourSteps]);

  const currentStep = isActive ? tourSteps[currentStepIndex] : null;

  return {
    isActive,
    shouldShow,
    currentStep,
    currentStepIndex,
    totalSteps: tourSteps.length - 1,
    startTour,
    skipTour,
    nextStep,
  };
}
