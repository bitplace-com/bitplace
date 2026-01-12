/**
 * Haptics Engine - Managed haptic feedback with enable/disable
 */

import { HapticPatterns, type HapticType } from './haptics';

const HAPTICS_STORAGE_KEY = 'bitplace_haptics_enabled';

// Check if vibration is supported
const supportsVibration = typeof navigator !== 'undefined' && 'vibrate' in navigator;

class HapticsEngine {
  private enabled: boolean = true;

  constructor() {
    // Load preference from localStorage
    const stored = localStorage.getItem(HAPTICS_STORAGE_KEY);
    // Default to ON if supported, OFF if not supported
    this.enabled = stored === null ? supportsVibration : stored === 'true';
  }

  /**
   * Trigger haptic feedback
   * @param type - The type of haptic feedback
   * @returns true if vibration was triggered, false otherwise
   */
  trigger(type: HapticType = 'light'): boolean {
    if (!this.enabled || !supportsVibration) return false;

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
  stop(): void {
    if (supportsVibration) {
      try {
        navigator.vibrate(0);
      } catch {
        // Ignore errors
      }
    }
  }

  /**
   * Set whether haptics are enabled
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem(HAPTICS_STORAGE_KEY, String(enabled));
  }

  /**
   * Get current enabled state
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Check if haptic feedback is available on this device
   */
  isSupported(): boolean {
    return supportsVibration;
  }
}

// Singleton instance
export const hapticsEngine = new HapticsEngine();
