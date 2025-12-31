import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ENERGY_ASSET, ENERGY_CONFIG } from '@/config/energy';

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey?: { toBase58(): string };
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
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
  // Energy fields
  energy_asset?: string;
  native_symbol?: string;
  native_balance?: number;
  usd_price?: number;
  wallet_usd?: number;
  last_energy_sync_at?: string;
}

interface EnergyState {
  energyAsset: 'SOL' | 'BTP';
  nativeSymbol: string;
  nativeBalance: number;
  usdPrice: number;
  walletUsd: number;
  peTotal: number;
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

const getPhantom = (): PhantomProvider | null => {
  if (typeof window !== 'undefined' && 'solana' in window) {
    const provider = (window as unknown as { solana: PhantomProvider }).solana;
    if (provider?.isPhantom) return provider;
  }
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

  const getSessionToken = () => localStorage.getItem(SESSION_TOKEN_KEY);
  const setSessionToken = (token: string) => localStorage.setItem(SESSION_TOKEN_KEY, token);
  const clearSession = () => {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(WALLET_ADDRESS_KEY);
  };

  // Update energy state from user data
  const updateEnergyFromUser = useCallback((userData: User) => {
    const lastSyncAt = userData.last_energy_sync_at ? new Date(userData.last_energy_sync_at) : null;
    const isStale = !lastSyncAt || (Date.now() - lastSyncAt.getTime() > ENERGY_STALE_THRESHOLD_MS);
    
    setEnergy({
      energyAsset: (userData.energy_asset as 'SOL' | 'BTP') || ENERGY_ASSET,
      nativeSymbol: userData.native_symbol || ENERGY_CONFIG[ENERGY_ASSET].symbol,
      nativeBalance: Number(userData.native_balance) || 0,
      usdPrice: Number(userData.usd_price) || 0,
      walletUsd: Number(userData.wallet_usd) || 0,
      peTotal: Number(userData.pe_total_pe) || 0,
      lastSyncAt,
      isRefreshing: false,
      isStale,
    });
  }, []);

  // Refresh energy from edge function
  const refreshEnergy = useCallback(async () => {
    const token = getSessionToken();
    if (!token) return;

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
  }, []);

  const refreshUser = useCallback(async () => {
    const storedWallet = localStorage.getItem(WALLET_ADDRESS_KEY);
    if (!storedWallet) return;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', storedWallet)
      .maybeSingle();

    if (data && !error) {
      setUser(data as User);
      updateEnergyFromUser(data as User);
    }
  }, [updateEnergyFromUser]);

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

    try {
      // Connect to Phantom
      const { publicKey } = await phantom.connect();
      const wallet = publicKey.toBase58();
      
      console.log('Connected to wallet:', wallet.substring(0, 8) + '...');

      // Get nonce from server
      const { data: nonceData, error: nonceError } = await supabase.functions.invoke('auth-nonce', {
        body: { wallet },
      });

      if (nonceError || !nonceData?.nonce) {
        throw new Error('Failed to get authentication nonce');
      }

      // Sign the nonce
      const messageBytes = new TextEncoder().encode(nonceData.nonce);
      const { signature } = await phantom.signMessage(messageBytes);
      const signatureB64 = btoa(String.fromCharCode(...signature));

      // Verify signature and get token
      const { data: authData, error: authError } = await supabase.functions.invoke('auth-verify', {
        body: {
          wallet,
          signature: signatureB64,
          nonce: nonceData.nonce,
        },
      });

      if (authError || !authData?.token) {
        throw new Error('Authentication failed');
      }

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

    } catch (error) {
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
