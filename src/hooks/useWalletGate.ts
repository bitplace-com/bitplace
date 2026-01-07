import { useState, useCallback, useRef } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from 'sonner';

const TOAST_COOLDOWN = 5000;  // 5 seconds between toasts
const MODAL_COOLDOWN = 10000; // 10 seconds between modal opens
const SIGN_COOLDOWN = 10000;  // 10 seconds between sign attempts

interface UseWalletGateResult {
  isWalletModalOpen: boolean;
  setWalletModalOpen: (open: boolean) => void;
  requireWallet: (action?: string) => boolean;
}

export function useWalletGate(): UseWalletGateResult {
  const { walletState, walletAddress, user, signIn, isAuthenticated } = useWallet();
  const [isWalletModalOpen, setWalletModalOpen] = useState(false);
  
  // Cooldown refs to prevent spam
  const lastToastRef = useRef<number>(0);
  const lastModalRef = useRef<number>(0);
  const lastSignAttemptRef = useRef<number>(0);
  const signInFlightRef = useRef(false);

  const requireWallet = useCallback((action = 'paint') => {
    // Case 1: Fully authenticated - allow action
    if (isAuthenticated && user) return true;
    
    const now = Date.now();
    
    // Case 2: AUTH_REQUIRED - wallet connected but needs signature
    if (walletState === 'AUTH_REQUIRED' && walletAddress) {
      // Show toast once per cooldown with sign action
      if (now - lastToastRef.current > TOAST_COOLDOWN) {
        toast.info('Sign in to save your artwork', {
          action: {
            label: 'Sign',
            onClick: () => {
              // Trigger sign-in with guards
              if (!signInFlightRef.current && now - lastSignAttemptRef.current > SIGN_COOLDOWN) {
                signInFlightRef.current = true;
                lastSignAttemptRef.current = Date.now();
                signIn().finally(() => {
                  signInFlightRef.current = false;
                });
              }
            },
          },
        });
        lastToastRef.current = now;
      }
      return false;
    }
    
    // Case 3: Disconnected - show connect modal
    if (now - lastToastRef.current > TOAST_COOLDOWN) {
      toast.info(`Connect your wallet to ${action}`);
      lastToastRef.current = now;
    }
    
    if (now - lastModalRef.current > MODAL_COOLDOWN) {
      setWalletModalOpen(true);
      lastModalRef.current = now;
    }
    
    return false;
  }, [walletState, walletAddress, user, signIn, isAuthenticated]);

  return {
    isWalletModalOpen,
    setWalletModalOpen,
    requireWallet,
  };
}
