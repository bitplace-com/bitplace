import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
}

interface WalletContextType {
  isConnected: boolean;
  isConnecting: boolean;
  walletAddress: string | null;
  user: User | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  updateUser: (updates: Partial<Pick<User, 'display_name' | 'country_code' | 'alliance_tag' | 'avatar_url'>>) => Promise<void>;
  refreshUser: () => Promise<void>;
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

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const getSessionToken = () => localStorage.getItem(SESSION_TOKEN_KEY);
  const setSessionToken = (token: string) => localStorage.setItem(SESSION_TOKEN_KEY, token);
  const clearSession = () => {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(WALLET_ADDRESS_KEY);
  };

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
      clearSession();
    };

    phantom.on('disconnect', handleDisconnect);
    return () => phantom.off('disconnect', handleDisconnect);
  }, []);

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

      toast.success('Wallet connected successfully');
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
        connect,
        disconnect,
        updateUser,
        refreshUser,
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
