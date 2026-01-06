import { useState, useCallback, useRef } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from 'sonner';

const TOAST_COOLDOWN = 5000;  // 5 seconds between toasts
const MODAL_COOLDOWN = 10000; // 10 seconds between modal opens

interface UseWalletGateResult {
  isWalletModalOpen: boolean;
  setWalletModalOpen: (open: boolean) => void;
  requireWallet: (action?: string) => boolean;
}

export function useWalletGate(): UseWalletGateResult {
  const { isConnected, user } = useWallet();
  const [isWalletModalOpen, setWalletModalOpen] = useState(false);
  
  // Cooldown refs to prevent spam
  const lastToastRef = useRef<number>(0);
  const lastModalRef = useRef<number>(0);

  const requireWallet = useCallback((action = 'paint') => {
    if (isConnected && user) return true;
    
    const now = Date.now();
    
    // Show toast max once per 5 seconds
    if (now - lastToastRef.current > TOAST_COOLDOWN) {
      toast.info(`Connect your wallet to ${action}`);
      lastToastRef.current = now;
    }
    
    // Open modal max once per 10 seconds
    if (now - lastModalRef.current > MODAL_COOLDOWN) {
      setWalletModalOpen(true);
      lastModalRef.current = now;
    }
    
    return false;
  }, [isConnected, user]);

  return {
    isWalletModalOpen,
    setWalletModalOpen,
    requireWallet,
  };
}
