import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PixelIcon } from '@/components/icons';
import { BitplaceLogo } from '@/components/icons/BitplaceLogo';
import { GoogleLogo } from '@/components/icons/GoogleLogo';
import phantomLogo from '@/assets/phantom-logo.png';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGuidedTour, CENTERED_TARGETS } from '@/hooks/useGuidedTour';

/* ═══════════════════ Geometry helpers ═══════════════════ */

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
    case 'left': {
      const tooltipH = 160;
      const rawTop = targetRect.top + targetRect.height / 2 - tooltipH / 2;
      const clampedTop = Math.min(Math.max(16, rawTop), window.innerHeight - tooltipH - 16);
      return {
        right: window.innerWidth - targetRect.left + padding,
        top: clampedTop,
      };
    }
    case 'right': {
      const tooltipH = 160;
      const rawTop = targetRect.top + targetRect.height / 2 - tooltipH / 2;
      const clampedTop = Math.min(Math.max(16, rawTop), window.innerHeight - tooltipH - 16);
      return {
        left: targetRect.left + targetRect.width + padding,
        top: clampedTop,
      };
    }
    default:
      return {
        left: targetRect.left + targetRect.width / 2,
        top: targetRect.top + targetRect.height + padding,
        transform: 'translateX(-50%)',
      };
  }
}

/* ═══════════════════ Account Types Content ═══════════════════ */

function AccountTypesContent() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2.5">
        <GoogleLogo className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <span className="text-xs font-semibold text-foreground">Google (Starter)</span>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            300,000 free Pixels to draw anywhere. They expire after 72h, but you can renew them all with one click before they disappear.
          </p>
        </div>
      </div>
      <div className="flex items-start gap-2.5">
        <img src={phantomLogo} alt="Phantom" className="w-5 h-5 shrink-0 mt-0.5 rounded-sm" />
        <div>
          <span className="text-xs font-semibold text-foreground">Phantom Wallet (Pro)</span>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            Permanent Paint Energy (PE) from $BIT token. Your pixels stay forever and no one can paint over them unless they use more PE than you.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ Main Component ═══════════════════ */

export function GuidedTour() {
  const isMobile = useIsMobile();
  const {
    isActive,
    shouldShow,
    currentStep,
    currentStepIndex,
    totalSteps,
    startTour,
    skipTour,
    nextStep,
  } = useGuidedTour(isMobile);

  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const rafRef = useRef<number>(0);

  // Dispatch action events before each step
  useEffect(() => {
    if (!currentStep?.action) return;
    window.dispatchEvent(new CustomEvent(currentStep.action));
  }, [currentStep?.action]);

  // Track target element position
  const isCentered = currentStep ? CENTERED_TARGETS.has(currentStep.target) : false;

  const updateRect = useCallback(() => {
    if (!currentStep || isCentered) {
      setTargetRect(null);
      return;
    }
    const rect = getTargetRect(currentStep.target);
    setTargetRect(rect);
    rafRef.current = requestAnimationFrame(updateRect);
  }, [currentStep, isCentered]);

  useEffect(() => {
    if (isActive && currentStep) {
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

  // ── Welcome dialog ──
  if (shouldShow && !isActive) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-popover/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-6 max-w-sm mx-4 text-center animate-in zoom-in-95 duration-300">
          <div className="mb-4">
            <BitplaceLogo className="w-6 h-6 mx-auto text-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Welcome to Bitplace!
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Paint pixels on a real-world map, claim territory and compete. Want a quick tour?
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="ghost" onClick={skipTour}>
              Skip
            </Button>
            <Button onClick={startTour} className="gap-2">
              <PixelIcon name="startups" size="sm" />
              Take a Tour
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isActive || !currentStep) return null;

  const isLastStep = currentStepIndex === totalSteps;
  const stepNumber = currentStepIndex;
  const isAccountTypes = currentStep.id === 'account-types';

  // ── Centered dialog step (welcome & account-types) ──
  if (isCentered) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-auto">
        <div className="bg-popover/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-5 max-w-sm mx-4 animate-in zoom-in-95 duration-300">
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              {currentStep.title}
            </h3>
            <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
              {stepNumber}/{totalSteps}
            </span>
          </div>

          {isAccountTypes ? (
            <AccountTypesContent />
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed mb-4 whitespace-pre-line">
              {currentStep.description}
            </p>
          )}

          <div className="flex items-center justify-between mt-4">
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
    );
  }

  // ── Anchored tooltip step ──
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
      <div
        className="absolute inset-0 bg-black/60 transition-all duration-300"
        style={{ clipPath }}
        onClick={skipTour}
      />

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
          <p className="text-xs text-muted-foreground leading-relaxed mb-4 whitespace-pre-line">
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
