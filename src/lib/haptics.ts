/**
 * Haptic feedback utilities for mobile devices
 * Uses the Vibration API (supported on Android Chrome, some iOS browsers)
 */

// Check if vibration is supported
const supportsVibration = typeof navigator !== 'undefined' && 'vibrate' in navigator;

// Haptic patterns (duration in ms)
export const HapticPatterns: Record<string, number | number[]> = {
  // Light tap - single pixel paint
  light: 10,
  // Medium tap - selection/brush
  medium: 20,
  // Success - action confirmed
  success: [15, 50, 15],
  // Error - invalid action
  error: [30, 50, 30, 50, 30],
  // Heavy - important action
  heavy: 40,
};

type HapticType = keyof typeof HapticPatterns;

/**
 * Trigger haptic feedback
 * @param type - The type of haptic feedback
 * @returns true if vibration was triggered, false if not supported
 */
export function haptic(type: HapticType = 'light'): boolean {
  if (!supportsVibration) return false;
  
  try {
    const pattern = HapticPatterns[type];
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

/**
 * Stop any ongoing vibration
 */
export function stopHaptic(): void {
  if (supportsVibration) {
    try {
      navigator.vibrate(0);
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Check if haptic feedback is available on this device
 */
export function isHapticSupported(): boolean {
  return supportsVibration;
}
