import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ENERGY_ASSET, ENERGY_CONFIG } from '@/config/energy';
import { useBalance } from '@/hooks/useBalance';

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey?: { toBase58(): string };
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toBase58(): string } }>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
  on(event: string, callback: () => void): void;
  off(event: string, callback: () => void): void;
}

interface User {
  id: string;
  wallet_address: string;
  display_name: string | null;
  country_code: string | null;
  alliance_tag: string | null;
  avatar_url: string | null;
  pe_total_pe: number;
  created_at: string;
  // Progression fields
  xp: number;
  level: number;
  // Energy fields
  energy_asset?: string;
  native_symbol?: string;
  native_balance?: number;
  usd_price?: number;
  wallet_usd?: number;
  last_energy_sync_at?: string;
  sol_cluster?: string;
}

interface EnergyState {
  energyAsset: 'SOL' | 'BTP';
  nativeSymbol: string;
  nativeBalance: number;
  usdPrice: number;
  walletUsd: number;
  peTotal: number;
  cluster: 'mainnet' | 'devnet' | null;
  lastSyncAt: Date | null;
  isRefreshing: boolean;
  isStale: boolean;
}

interface WalletContextType {
  isConnected: boolean;
  isConnecting: boolean;
  walletAddress: string | null;
  user: User | null;
  energy: EnergyState;
  connect: () => Promise<void>;
  disconnect: () => void;
  updateUser: (updates: Partial<Pick<User, 'display_name' | 'country_code' | 'alliance_tag' | 'avatar_url'>>) => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshEnergy: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

// Debug logger - enabled with ?debug=1 or localStorage
const walletDebug = (stage: string, data?: unknown) => {
  const isDebug = 
    typeof window !== 'undefined' && (
      localStorage.getItem('bitplace_debug') === '1' ||
      window.location.search.includes('debug=1') ||
      import.meta.env.DEV
    );
  if (isDebug) {
    console.log(`[Wallet:${stage}]`, data ?? '');
  }
};

const getPhantom = (): PhantomProvider | null => {
  if (typeof window === 'undefined') return null;
  
  // Recommended Phantom detection (phantom.solana)
  const phantom = (window as any).phantom?.solana;
  if (phantom?.isPhantom) {
    walletDebug('provider_check', { source: 'phantom.solana', isPhantom: true });
    return phantom;
  }
  
  // Fallback for older versions (window.solana)
  const solana = (window as any).solana;
  if (solana?.isPhantom) {
    walletDebug('provider_check', { source: 'window.solana', isPhantom: true });
    return solana;
  }
  
  walletDebug('provider_check', { detected: false });
  return null;
};

const SESSION_TOKEN_KEY = 'bitplace_session_token';
const WALLET_ADDRESS_KEY = 'bitplace_wallet_address';
const ENERGY_STALE_THRESHOLD_MS = 60 * 1000; // 60 seconds

const defaultEnergyState: EnergyState = {
  energyAsset: ENERGY_ASSET,
  nativeSymbol: ENERGY_CONFIG[ENERGY_ASSET].symbol,
  nativeBalance: 0,
  usdPrice: 0,
  walletUsd: 0,
  peTotal: 0,
  cluster: null,
  lastSyncAt: null,
  isRefreshing: false,
  isStale: true,
};

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [energy, setEnergy] = useState<EnergyState>(defaultEnergyState);

  // Use the new balance hook for immediate balance fetching (no auth required)
  const balance = useBalance({ 
    walletAddress, 
    enabled: isConnected 
  });

  const getSessionToken = () => localStorage.getItem(SESSION_TOKEN_KEY);
  const setSessionToken = (token: string) => localStorage.setItem(SESSION_TOKEN_KEY, token);
  const clearSession = () => {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(WALLET_ADDRESS_KEY);
  };

  // Sync balance hook state to energy state
  useEffect(() => {
    if (balance.solBalance > 0 || balance.peTotal > 0) {
      setEnergy(prev => ({
        ...prev,
        nativeBalance: balance.solBalance,
        usdPrice: balance.solUsdPrice,
        walletUsd: balance.walletUsd,
        peTotal: balance.peTotal,
        cluster: balance.cluster,
        lastSyncAt: balance.lastSyncAt,
        isRefreshing: balance.isRefreshing,
        isStale: !balance.lastSyncAt || (Date.now() - balance.lastSyncAt.getTime() > ENERGY_STALE_THRESHOLD_MS),
      }));

      // Also update user's pe_total_pe
      setUser(prev => prev ? { ...prev, pe_total_pe: balance.peTotal } : null);
    }
  }, [balance.solBalance, balance.solUsdPrice, balance.walletUsd, balance.peTotal, balance.cluster, balance.lastSyncAt, balance.isRefreshing]);

  // Update energy state from user data
  const updateEnergyFromUser = useCallback((userData: User) => {
    const lastSyncAt = userData.last_energy_sync_at ? new Date(userData.last_energy_sync_at) : null;
    const isStale = !lastSyncAt || (Date.now() - lastSyncAt.getTime() > ENERGY_STALE_THRESHOLD_MS);
    
    setEnergy(prev => ({
      energyAsset: (userData.energy_asset as 'SOL' | 'BTP') || ENERGY_ASSET,
      nativeSymbol: userData.native_symbol || ENERGY_CONFIG[ENERGY_ASSET].symbol,
      nativeBalance: Number(userData.native_balance) || prev.nativeBalance,
      usdPrice: Number(userData.usd_price) || prev.usdPrice,
      walletUsd: Number(userData.wallet_usd) || prev.walletUsd,
      peTotal: Number(userData.pe_total_pe) || prev.peTotal,
      cluster: (userData.sol_cluster as 'mainnet' | 'devnet') || prev.cluster,
      lastSyncAt,
      isRefreshing: false,
      isStale,
    }));
  }, []);

  // Refresh energy from edge function (authenticated)
  const refreshEnergy = useCallback(async () => {
    const token = getSessionToken();
    if (!token) {
      // If no token, use the balance hook's refresh
      balance.refresh();
      return;
    }

    setEnergy(prev => ({ ...prev, isRefreshing: true }));

    try {
      const { data, error } = await supabase.functions.invoke('energy-refresh', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) {
        console.error('[WalletContext] Energy refresh error:', error);
        setEnergy(prev => ({ ...prev, isRefreshing: false }));
        return;
      }

      if (!data?.ok) {
        console.error('[WalletContext] Energy refresh failed:', data?.message);
        setEnergy(prev => ({ ...prev, isRefreshing: false }));
        return;
      }

      const lastSyncAt = data.lastSyncAt ? new Date(data.lastSyncAt) : null;
      
      setEnergy({
        energyAsset: (data.energyAsset as 'SOL' | 'BTP') || ENERGY_ASSET,
        nativeSymbol: data.nativeSymbol || ENERGY_CONFIG[ENERGY_ASSET].symbol,
        nativeBalance: data.nativeBalance || 0,
        usdPrice: data.usdPrice || 0,
        walletUsd: data.walletUsd || 0,
        peTotal: data.peTotal || 0,
        cluster: data.cluster || null,
        lastSyncAt,
        isRefreshing: false,
        isStale: data.stale ?? false,
      });

      // Also update user's pe_total_pe
      setUser(prev => prev ? { ...prev, pe_total_pe: data.peTotal } : null);

      if (!data.stale) {
        toast.success('Balance updated', { 
          description: `${data.nativeBalance.toFixed(4)} ${data.nativeSymbol} = ${data.peTotal.toLocaleString()} PE`
        });
      }
    } catch (err) {
      console.error('[WalletContext] Energy refresh exception:', err);
      setEnergy(prev => ({ ...prev, isRefreshing: false }));
    }
  }, [balance]);

  const refreshUser = useCallback(async () => {
    const token = getSessionToken();
    if (!token) return;

    // Use energy-refresh edge function to get fresh user data (authenticated)
    try {
      const { data, error } = await supabase.functions.invoke('energy-refresh', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!error && data?.ok) {
        // Energy refresh returns user data, update energy state
        const lastSyncAt = data.lastSyncAt ? new Date(data.lastSyncAt) : null;
        
        setEnergy({
          energyAsset: (data.energyAsset as 'SOL' | 'BTP') || ENERGY_ASSET,
          nativeSymbol: data.nativeSymbol || ENERGY_CONFIG[ENERGY_ASSET].symbol,
          nativeBalance: data.nativeBalance || 0,
          usdPrice: data.usdPrice || 0,
          walletUsd: data.walletUsd || 0,
          peTotal: data.peTotal || 0,
          cluster: data.cluster || null,
          lastSyncAt,
          isRefreshing: false,
          isStale: data.stale ?? false,
        });

        // Update user's pe_total_pe
        setUser(prev => prev ? { ...prev, pe_total_pe: data.peTotal } : null);
      }
    } catch (err) {
      console.error('[WalletContext] refreshUser error:', err);
    }
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const token = getSessionToken();
    const storedWallet = localStorage.getItem(WALLET_ADDRESS_KEY);
    
    if (token && storedWallet) {
      // Validate token by checking expiry
      try {
        const [payloadB64] = token.split('.');
        const payload = JSON.parse(atob(payloadB64));
        
        if (payload.exp > Date.now()) {
          setWalletAddress(storedWallet);
          setIsConnected(true);
          refreshUser();
        } else {
          clearSession();
        }
      } catch {
        clearSession();
      }
    }
  }, [refreshUser]);

  // Listen for Phantom disconnect
  useEffect(() => {
    const phantom = getPhantom();
    if (!phantom) return;

    const handleDisconnect = () => {
      setIsConnected(false);
      setWalletAddress(null);
      setUser(null);
      setEnergy(defaultEnergyState);
      clearSession();
    };

    phantom.on('disconnect', handleDisconnect);
    return () => phantom.off('disconnect', handleDisconnect);
  }, []);

  // Periodically check if energy is stale
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      setEnergy(prev => {
        if (!prev.lastSyncAt) return prev;
        const isStale = Date.now() - prev.lastSyncAt.getTime() > ENERGY_STALE_THRESHOLD_MS;
        if (isStale !== prev.isStale) {
          return { ...prev, isStale };
        }
        return prev;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const connect = async () => {
    const phantom = getPhantom();
    
    if (!phantom) {
      walletDebug('connect_error', { reason: 'provider_not_found' });
      toast.error('Phantom wallet not found', {
        description: 'Please install Phantom wallet extension',
        action: {
          label: 'Install',
          onClick: () => window.open('https://phantom.app/', '_blank'),
        },
      });
      return;
    }

    setIsConnecting(true);
    walletDebug('connect_start');

    try {
      // Connect to Phantom
      let publicKey;
      try {
        // Check if already connected
        if (phantom.publicKey) {
          publicKey = phantom.publicKey;
          walletDebug('connect_reuse', { publicKey: publicKey.toBase58().substring(0, 8) });
        } else {
          const response = await phantom.connect({ onlyIfTrusted: false });
          publicKey = response.publicKey;
          walletDebug('connect_success', { publicKey: publicKey.toBase58().substring(0, 8) });
        }
      } catch (connectError: any) {
        walletDebug('connect_error', { code: connectError?.code, message: connectError?.message });
        
        // User rejected connection
        if (connectError?.code === 4001 || connectError?.message?.includes('User rejected')) {
          toast.error('Connection cancelled', {
            description: 'You rejected the connection request',
          });
          return;
        }
        throw connectError;
      }

      const wallet = publicKey.toBase58();
      walletDebug('wallet_address', { wallet: wallet.substring(0, 8) + '...' });

      // Get nonce from server
      walletDebug('nonce_fetch_start');
      const { data: nonceData, error: nonceError } = await supabase.functions.invoke('auth-nonce', {
        body: { wallet },
      });

      if (nonceError || !nonceData?.nonce) {
        walletDebug('nonce_fetch_error', { error: nonceError, data: nonceData });
        toast.error('Could not start authentication', {
          description: 'Failed to get authentication nonce from server',
        });
        return;
      }
      walletDebug('nonce_fetch_success', { nonceLength: nonceData.nonce.length });

      // Sign the nonce
      walletDebug('sign_start');
      let signature: Uint8Array;
      try {
        const messageBytes = new TextEncoder().encode(nonceData.nonce);
        const signResult = await phantom.signMessage(messageBytes);
        signature = signResult.signature;
        walletDebug('sign_success', { signatureLength: signature.length });
      } catch (signError: any) {
        walletDebug('sign_error', { code: signError?.code, message: signError?.message });
        
        // User rejected signature
        if (signError?.code === 4001 || signError?.message?.includes('User rejected')) {
          toast.error('Signature cancelled', {
            description: 'You cancelled the signature request',
          });
          return;
        }
        throw signError;
      }

      const signatureB64 = btoa(String.fromCharCode(...signature));

      // Verify signature and get token
      walletDebug('verify_start');
      const { data: authData, error: authError } = await supabase.functions.invoke('auth-verify', {
        body: {
          wallet,
          signature: signatureB64,
          nonce: nonceData.nonce,
        },
      });

      if (authError) {
        walletDebug('verify_error', { error: authError });
        toast.error('Authentication failed', {
          description: 'Server could not verify your signature. Please try again.',
        });
        return;
      }

      if (!authData?.token) {
        walletDebug('verify_error', { reason: 'no_token', data: authData });
        toast.error('Authentication failed', {
          description: authData?.error || 'No session token received',
        });
        return;
      }

      walletDebug('verify_success', { userId: authData.user?.id });

      // Store session
      setSessionToken(authData.token);
      localStorage.setItem(WALLET_ADDRESS_KEY, wallet);
      
      setWalletAddress(wallet);
      setUser(authData.user as User);
      setIsConnected(true);
      
      // Update energy state from auth response
      if (authData.user) {
        updateEnergyFromUser(authData.user as User);
      }

      toast.success('Wallet connected successfully');

      // Trigger energy refresh after connection (don't await)
      setTimeout(() => {
        refreshEnergy();
      }, 500);

    } catch (error: any) {
      walletDebug('connect_exception', { error: error?.message || error });
      console.error('Wallet connection error:', error);
      toast.error('Failed to connect wallet', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    const phantom = getPhantom();
    if (phantom) {
      phantom.disconnect();
    }
    
    setIsConnected(false);
    setWalletAddress(null);
    setUser(null);
    setEnergy(defaultEnergyState);
    clearSession();
    
    toast.success('Wallet disconnected');
  };

  const updateUser = async (updates: Partial<Pick<User, 'display_name' | 'country_code' | 'alliance_tag' | 'avatar_url'>>) => {
    const token = getSessionToken();
    if (!token) {
      toast.error('Not authenticated');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('user-update', {
        body: updates,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error || !data?.user) {
        throw new Error('Failed to update profile');
      }

      setUser(data.user as User);
      toast.success('Profile updated');
    } catch (error) {
      console.error('Update user error:', error);
      toast.error('Failed to update profile', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        isConnecting,
        walletAddress,
        user,
        energy,
        connect,
        disconnect,
        updateUser,
        refreshUser,
        refreshEnergy,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
