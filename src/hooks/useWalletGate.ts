import { useState, useCallback } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from 'sonner';

interface UseWalletGateResult {
  isWalletModalOpen: boolean;
  setWalletModalOpen: (open: boolean) => void;
  requireWallet: (action?: string) => boolean;
}

export function useWalletGate(): UseWalletGateResult {
  const { isConnected, user } = useWallet();
  const [isWalletModalOpen, setWalletModalOpen] = useState(false);

  const requireWallet = useCallback((action = 'paint') => {
    if (isConnected && user) return true;
    
    toast.info(`Connect your wallet to ${action}`);
    setWalletModalOpen(true);
    return false;
  }, [isConnected, user]);

  return {
    isWalletModalOpen,
    setWalletModalOpen,
    requireWallet,
  };
}
