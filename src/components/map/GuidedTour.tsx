import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PixelIcon } from '@/components/icons';
import { useGuidedTour, TOUR_STEPS } from '@/hooks/useGuidedTour';
import { cn } from '@/lib/utils';

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getTargetRect(targetAttr: string): TargetRect | null {
  const el = document.querySelector(`[data-tour="${targetAttr}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top - 8,
    left: rect.left - 8,
    width: rect.width + 16,
    height: rect.height + 16,
  };
}

function getTooltipPosition(
  targetRect: TargetRect,
  position: string = 'bottom'
): React.CSSProperties {
  const padding = 12;
  switch (position) {
    case 'top':
      return {
        left: targetRect.left + targetRect.width / 2,
        bottom: window.innerHeight - targetRect.top + padding,
        transform: 'translateX(-50%)',
      };
    case 'bottom':
      return {
        left: targetRect.left + targetRect.width / 2,
        top: targetRect.top + targetRect.height + padding,
        transform: 'translateX(-50%)',
      };
    case 'left':
      return {
        right: window.innerWidth - targetRect.left + padding,
        top: targetRect.top + targetRect.height / 2,
        transform: 'translateY(-50%)',
      };
    case 'right':
      return {
        left: targetRect.left + targetRect.width + padding,
        top: targetRect.top + targetRect.height / 2,
        transform: 'translateY(-50%)',
      };
    default:
      return {
        left: targetRect.left + targetRect.width / 2,
        top: targetRect.top + targetRect.height + padding,
        transform: 'translateX(-50%)',
      };
  }
}

export function GuidedTour() {
  const {
    isActive,
    shouldShow,
    currentStep,
    currentStepIndex,
    totalSteps,
    startTour,
    skipTour,
    nextStep,
  } = useGuidedTour();

  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const rafRef = useRef<number>(0);

  // Dispatch action events before each step
  useEffect(() => {
    if (!currentStep?.action) return;
    window.dispatchEvent(new CustomEvent(currentStep.action));
  }, [currentStep?.action]);

  // Track target element position
  const updateRect = useCallback(() => {
    if (!currentStep || currentStep.target === '__welcome__') {
      setTargetRect(null);
      return;
    }
    const rect = getTargetRect(currentStep.target);
    setTargetRect(rect);
    rafRef.current = requestAnimationFrame(updateRect);
  }, [currentStep]);

  useEffect(() => {
    if (isActive && currentStep) {
      // Small delay to let DOM settle after action events
      const timer = setTimeout(() => {
        updateRect();
      }, 300);
      return () => {
        clearTimeout(timer);
        cancelAnimationFrame(rafRef.current);
      };
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isActive, currentStep, updateRect]);

  // Welcome dialog
  if (shouldShow && !isActive) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-popover/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-6 max-w-sm mx-4 text-center animate-in zoom-in-95 duration-300">
          <div className="mb-4">
            <PixelIcon name="globe" size="lg" className="mx-auto text-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Welcome to Bitplace!
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Paint pixels on a real-world map, claim territory and compete with others. Want a quick tour?
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="ghost" onClick={skipTour}>
              Skip
            </Button>
            <Button onClick={startTour} className="gap-2">
              <PixelIcon name="navigation" size="sm" />
              Take a Tour
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isActive || !currentStep) return null;

  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;
  const stepNumber = currentStepIndex; // 1-indexed since we skip welcome

  // Build clip-path polygon for spotlight effect
  const clipPath = targetRect
    ? `polygon(
        0% 0%, 0% 100%, 
        ${targetRect.left}px 100%, 
        ${targetRect.left}px ${targetRect.top}px, 
        ${targetRect.left + targetRect.width}px ${targetRect.top}px, 
        ${targetRect.left + targetRect.width}px ${targetRect.top + targetRect.height}px, 
        ${targetRect.left}px ${targetRect.top + targetRect.height}px, 
        ${targetRect.left}px 100%, 
        100% 100%, 100% 0%
      )`
    : undefined;

  const tooltipPosition = targetRect
    ? getTooltipPosition(targetRect, currentStep.position)
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-auto">
      {/* Dark overlay with spotlight hole */}
      <div
        className="absolute inset-0 bg-black/60 transition-all duration-300"
        style={{ clipPath }}
        onClick={skipTour}
      />

      {/* Highlighted element border glow */}
      {targetRect && (
        <div
          className="absolute rounded-xl border-2 border-primary/60 shadow-[0_0_20px_rgba(var(--primary),0.3)] pointer-events-none transition-all duration-300"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute max-w-xs w-72 animate-in fade-in slide-in-from-bottom-2 duration-200"
        style={tooltipPosition}
      >
        <div className="bg-popover/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-foreground">
              {currentStep.title}
            </h3>
            <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
              {stepNumber}/{totalSteps}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            {currentStep.description}
          </p>
          <div className="flex items-center justify-between">
            <button
              onClick={skipTour}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip tour
            </button>
            <Button size="sm" onClick={nextStep} className="gap-1.5 h-8">
              {isLastStep ? (
                'Got it!'
              ) : (
                <>
                  Next
                  <PixelIcon name="chevronRight" size="xs" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
