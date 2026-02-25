import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';
import { ENERGY_ASSET, ENERGY_CONFIG } from '@/config/energy';
import { useBalance } from '@/hooks/useBalance';
import { soundEngine } from '@/lib/soundEngine';
import { TOKEN_EXPIRED_EVENT } from '@/lib/authHelpers';
import { warmupAuthenticatedFunctions } from '@/hooks/useEdgeFunctionWarmup';

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey?: { toBase58(): string };
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toBase58(): string } }>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
  request(args: { method: string; params: Record<string, unknown> }): Promise<{ signature: Uint8Array | string }>;
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
  sol_cluster?: string;
  // Profile fields
  bio?: string | null;
  social_x?: string | null;
  social_instagram?: string | null;
  social_discord?: string | null;
  social_website?: string | null;
  // Google auth fields
  auth_provider?: string;
  email?: string | null;
  google_avatar_url?: string | null;
}

interface EnergyState {
  energyAsset: 'BIT';
  nativeSymbol: string;
  nativeBalance: number;
  usdPrice: number;
  walletUsd: number;
  peTotal: number;
  peUsed: number;
  peAvailable: number;
  // Pixel ownership stats (from server)
  pixelsOwned: number;
  pixelStakeTotal: number;
  cluster: 'mainnet' | null;
  lastSyncAt: Date | null;
  isRefreshing: boolean;
  isStale: boolean;
  // Paint cooldown
  paintCooldownUntil: Date | null;
  // Virtual PE (for Google users)
  isVirtualPe: boolean;
  virtualPeTotal: number;
  virtualPeUsed: number;
  virtualPeAvailable: number;
}

// Wallet State Machine
export type WalletState = 
  | 'DISCONNECTED'      // No wallet connected
  | 'CONNECTING'        // User clicked connect, waiting for Phantom
  | 'CONNECTED'         // Wallet connected via trusted reconnect, checking session
  | 'AUTH_REQUIRED'     // Connected but needs signature to authenticate
  | 'AUTHENTICATING'    // Signature in progress
  | 'AUTHENTICATED'     // Fully connected and authenticated
  | 'ERROR';            // Something failed

interface WalletContextType {
  // FSM state
  walletState: WalletState;
  walletAddress: string | null;
  user: User | null;
  energy: EnergyState;
  
  // Actions
  connect: () => Promise<void>;
  signIn: () => Promise<void>;
  disconnect: () => void;
  updateUser: (updates: Partial<Pick<User, 'display_name' | 'country_code' | 'alliance_tag' | 'avatar_url' | 'bio' | 'social_x' | 'social_instagram' | 'social_website'>>) => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshEnergy: () => Promise<void>;
  refreshPeStatus: () => Promise<void>;
  updatePeStatus: (peStatus: { total: number; used: number; available: number }, cooldownUntil?: string) => void;
  
  // Google auth
  googleSignIn: () => Promise<void>;
  linkWallet: () => Promise<void>;
  isGoogleAuth: boolean;
  isGoogleOnly: boolean;
  
  // Derived helpers for backward compatibility
  isConnected: boolean;
  isConnecting: boolean;
  needsSignature: boolean;
  // NEW: Explicit gameplay gating flags
  isWalletConnected: boolean;
  isAuthenticated: boolean;
  
  // Trial mode
  isTrialMode: boolean;
  activateTrialMode: () => void;
  exitTrialMode: () => void;
  updateTrialPe: (peSpent: number) => void;
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
  
  const phantom = (window as any).phantom?.solana;
  if (phantom?.isPhantom) {
    walletDebug('provider_check', { source: 'phantom.solana', isPhantom: true });
    return phantom;
  }
  
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
const USER_DATA_KEY = 'bitplace_user_data';
const TRIAL_MODE_KEY = 'bitplace_trial_mode';
const ENERGY_STALE_THRESHOLD_MS = 60 * 1000; // 60 seconds
const COOLDOWN_MS = 10000; // 10 second cooldown after failure

const TRIAL_WALLET_ADDRESS = 'TRIAL...MODE';
const TRIAL_PE_TOTAL = 100000;
const TRIAL_BIT_BALANCE = 50000;
const TRIAL_BIT_PRICE = 0.002; // fake price

const trialEnergyState: EnergyState = {
  energyAsset: 'BIT',
  nativeSymbol: 'BIT',
  nativeBalance: TRIAL_BIT_BALANCE,
  usdPrice: TRIAL_BIT_PRICE,
  walletUsd: TRIAL_BIT_BALANCE * TRIAL_BIT_PRICE,
  peTotal: TRIAL_PE_TOTAL,
  peUsed: 0,
  peAvailable: TRIAL_PE_TOTAL,
  pixelsOwned: 0,
  pixelStakeTotal: 0,
  cluster: null,
  lastSyncAt: new Date(),
  isRefreshing: false,
  isStale: false,
  paintCooldownUntil: null,
  isVirtualPe: false,
  virtualPeTotal: 0,
  virtualPeUsed: 0,
  virtualPeAvailable: 0,
};

const defaultEnergyState: EnergyState = {
  energyAsset: ENERGY_ASSET,
  nativeSymbol: ENERGY_CONFIG[ENERGY_ASSET].symbol,
  nativeBalance: 0,
  usdPrice: 0,
  walletUsd: 0,
  peTotal: 0,
  peUsed: 0,
  peAvailable: 0,
  pixelsOwned: 0,
  pixelStakeTotal: 0,
  cluster: null,
  lastSyncAt: null,
  isRefreshing: false,
  isStale: true,
  paintCooldownUntil: null,
  isVirtualPe: false,
  virtualPeTotal: 0,
  virtualPeUsed: 0,
  virtualPeAvailable: 0,
};

// Parse JWT payload safely (handles URL-safe base64)
const parseJwtPayload = (token: string): { wallet: string; userId: string; exp: number; authProvider?: string } | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payloadB64 = parts[1];
    const decoded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(decoded));
    
    return {
      wallet: payload.wallet,
      userId: payload.userId,
      exp: payload.exp,
      authProvider: payload.authProvider,
    };
  } catch {
    return null;
  }
};

export function WalletProvider({ children }: { children: ReactNode }) {
  // FSM state
  const [walletState, setWalletState] = useState<WalletState>('DISCONNECTED');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [energy, setEnergy] = useState<EnergyState>(defaultEnergyState);
  const [lastError, setLastError] = useState<string | null>(null);

  // In-flight guards to prevent concurrent calls
  const connectInFlightRef = useRef(false);
  const signInFlightRef = useRef(false);
  const restoreInFlightRef = useRef(false);
  const googleSignInFlightRef = useRef(false);
  
  // Cooldown timestamps
  const lastConnectAttemptRef = useRef<number>(0);
  const lastSignAttemptRef = useRef<number>(0);

  // Trial mode state
  const [isTrialMode, setIsTrialMode] = useState<boolean>(() => {
    return sessionStorage.getItem(TRIAL_MODE_KEY) === '1';
  });
  
  const isTrialModeRef = useRef(isTrialMode);
  useEffect(() => { isTrialModeRef.current = isTrialMode; }, [isTrialMode]);

  // Derived state
  const isConnected = walletState === 'AUTHENTICATED' || isTrialMode;
  const isConnecting = walletState === 'CONNECTING' || walletState === 'AUTHENTICATING';
  const needsSignature = walletState === 'AUTH_REQUIRED' && !isTrialMode;
  
  const isWalletConnected = isTrialMode || (['CONNECTED', 'AUTH_REQUIRED', 'AUTHENTICATING', 'AUTHENTICATED'].includes(walletState) && !!walletAddress);
  const isAuthenticated = isTrialMode || (walletState === 'AUTHENTICATED' && !!user);

  // Google auth derived state
  const authProvider = user?.auth_provider || (parseJwtPayload(localStorage.getItem(SESSION_TOKEN_KEY) || '')?.authProvider);
  const isGoogleAuth = authProvider === 'google' || authProvider === 'both';
  const isGoogleOnly = authProvider === 'google';

  // Trial mode: activate
  const activateTrialMode = useCallback(() => {
    restoreInFlightRef.current = false;
    isTrialModeRef.current = true;
    
    const trialUser: User = {
      id: crypto.randomUUID(),
      wallet_address: TRIAL_WALLET_ADDRESS,
      display_name: 'Test Player',
      country_code: null,
      alliance_tag: null,
      avatar_url: null,
      pe_total_pe: TRIAL_PE_TOTAL,
      created_at: new Date().toISOString(),
      energy_asset: 'BIT',
      native_symbol: 'BIT',
      native_balance: TRIAL_BIT_BALANCE,
      usd_price: TRIAL_BIT_PRICE,
      wallet_usd: TRIAL_BIT_BALANCE * TRIAL_BIT_PRICE,
    };

    setIsTrialMode(true);
    setWalletState('AUTHENTICATED');
    setWalletAddress(TRIAL_WALLET_ADDRESS);
    setUser(trialUser);
    setEnergy({ ...trialEnergyState });
    sessionStorage.setItem(TRIAL_MODE_KEY, '1');
    toast.success('Test Wallet activated!', { description: '100,000 trial PE ready to use. Nothing is saved.' });
  }, []);

  // Trial mode: exit
  const exitTrialMode = useCallback(() => {
    setIsTrialMode(false);
    setWalletState('DISCONNECTED');
    setWalletAddress(null);
    setUser(null);
    setEnergy(defaultEnergyState);
    sessionStorage.removeItem(TRIAL_MODE_KEY);
    try { localStorage.removeItem('bitplace_trial_pixels'); } catch {}
  }, []);

  // Trial mode: update PE when painting
  const updateTrialPe = useCallback((peSpent: number) => {
    if (!isTrialMode) return;
    setEnergy(prev => ({
      ...prev,
      peUsed: prev.peUsed + peSpent,
      peAvailable: Math.max(0, prev.peAvailable - peSpent),
    }));
  }, [isTrialMode]);

  // Use the new balance hook for immediate balance fetching (no auth required)
  const balance = useBalance({ 
    walletAddress, 
    enabled: walletState === 'AUTHENTICATED' && !isTrialMode && !isGoogleOnly
  });

  const getSessionToken = () => localStorage.getItem(SESSION_TOKEN_KEY);
  const setSessionToken = (token: string) => localStorage.setItem(SESSION_TOKEN_KEY, token);
  const getCachedUser = (): User | null => {
    try {
      const cached = localStorage.getItem(USER_DATA_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  };
  const setCachedUser = (userData: User) => {
    try {
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    } catch {}
  };
  const clearSession = () => {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(WALLET_ADDRESS_KEY);
    localStorage.removeItem(USER_DATA_KEY);
  };

  // Debug state logging
  useEffect(() => {
    walletDebug('state_change', {
      walletState,
      walletAddress: walletAddress?.substring(0, 8),
      hasUser: !!user,
      lastConnectAttempt: lastConnectAttemptRef.current,
      lastSignAttempt: lastSignAttemptRef.current,
      connectInFlight: connectInFlightRef.current,
      signInFlight: signInFlightRef.current,
      lastError,
      isGoogleAuth,
      isGoogleOnly,
    });
  }, [walletState, walletAddress, user, lastError, isGoogleAuth, isGoogleOnly]);

  // Sync balance hook state to energy state (only for wallet users)
  useEffect(() => {
    if (isGoogleOnly) return; // Skip balance sync for Google-only users
    if (balance.bitBalance > 0 || balance.peTotal > 0) {
      setEnergy(prev => ({
        ...prev,
        nativeBalance: balance.bitBalance,
        usdPrice: balance.bitUsdPrice,
        walletUsd: balance.walletUsd,
        peTotal: balance.peTotal,
        lastSyncAt: balance.lastSyncAt,
        isRefreshing: balance.isRefreshing,
        isStale: !balance.lastSyncAt || (Date.now() - balance.lastSyncAt.getTime() > ENERGY_STALE_THRESHOLD_MS),
      }));

      setUser(prev => prev ? { ...prev, pe_total_pe: balance.peTotal } : null);
    }
  }, [balance.bitBalance, balance.bitUsdPrice, balance.walletUsd, balance.peTotal, balance.lastSyncAt, balance.isRefreshing, isGoogleOnly]);

  // Update energy state from user data
  const updateEnergyFromUser = useCallback((userData: User) => {
    const lastSyncAt = userData.last_energy_sync_at ? new Date(userData.last_energy_sync_at) : null;
    const isStale = !lastSyncAt || (Date.now() - lastSyncAt.getTime() > ENERGY_STALE_THRESHOLD_MS);
    
    setEnergy(prev => ({
      energyAsset: 'BIT',
      nativeSymbol: userData.native_symbol || ENERGY_CONFIG[ENERGY_ASSET].symbol,
      nativeBalance: Number(userData.native_balance) || prev.nativeBalance,
      usdPrice: Number(userData.usd_price) || prev.usdPrice,
      walletUsd: Number(userData.wallet_usd) || prev.walletUsd,
      peTotal: Number(userData.pe_total_pe) || prev.peTotal,
      peUsed: prev.peUsed,
      peAvailable: prev.peAvailable,
      pixelsOwned: prev.pixelsOwned,
      pixelStakeTotal: prev.pixelStakeTotal,
      cluster: prev.cluster,
      lastSyncAt,
      isRefreshing: false,
      isStale,
      paintCooldownUntil: prev.paintCooldownUntil,
      isVirtualPe: prev.isVirtualPe,
      virtualPeTotal: prev.virtualPeTotal,
      virtualPeUsed: prev.virtualPeUsed,
      virtualPeAvailable: prev.virtualPeAvailable,
    }));
  }, []);

  // Refresh PE status from pe-status edge function
  const refreshPeStatus = useCallback(async () => {
    const token = getSessionToken();
    if (!token) return;

    try {
      const { data, error } = await supabase.functions.invoke('pe-status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) {
        console.error('[WalletContext] PE status refresh error:', error);
        return;
      }

      if (data?.ok) {
        if (data.isVirtualPe) {
          // Google-only user: use virtual PE
          setEnergy(prev => ({
            ...prev,
            peTotal: data.pe_total || 0,
            peUsed: data.pe_used || 0,
            peAvailable: data.pe_available || 0,
            isVirtualPe: true,
            virtualPeTotal: data.virtual_pe_total || 0,
            virtualPeUsed: data.virtual_pe_used || 0,
            virtualPeAvailable: data.virtual_pe_available || 0,
          }));
        } else {
          setEnergy(prev => ({
            ...prev,
            peUsed: data.pe_used || 0,
            peAvailable: data.pe_available || 0,
            // Include virtual PE for 'both' users
            virtualPeTotal: data.virtual_pe_total ?? prev.virtualPeTotal,
            virtualPeUsed: data.virtual_pe_used ?? prev.virtualPeUsed,
            virtualPeAvailable: data.virtual_pe_available ?? prev.virtualPeAvailable,
          }));
        }
      }
    } catch (err) {
      console.error('[WalletContext] PE status refresh exception:', err);
    }
  }, []);

  // Refresh energy from edge function (authenticated)
  const refreshEnergy = useCallback(async () => {
    const token = getSessionToken();
    if (!token) {
      if (!isGoogleOnly) balance.refresh();
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
      const peUsed = data.peUsed ?? 0;
      const peAvailable = data.peAvailable ?? Math.max(0, (data.peTotal || 0) - peUsed);
      
      console.log('[WalletContext] Energy refresh result:', { 
        peTotal: data.peTotal, 
        peUsed, 
        peAvailable,
        stale: data.stale,
        isVirtualPe: data.isVirtualPe,
      });
      
      const paintCooldownUntil = data.paintCooldownUntil ? new Date(data.paintCooldownUntil) : null;
      
      setEnergy({
        energyAsset: 'BIT',
        nativeSymbol: data.nativeSymbol || ENERGY_CONFIG[ENERGY_ASSET].symbol,
        nativeBalance: data.nativeBalance || 0,
        usdPrice: data.usdPrice || 0,
        walletUsd: data.walletUsd || 0,
        peTotal: data.peTotal || 0,
        peUsed,
        peAvailable,
        pixelsOwned: data.pixelsOwned ?? 0,
        pixelStakeTotal: data.pixelStakeTotal ?? 0,
        cluster: data.cluster || null,
        lastSyncAt,
        isRefreshing: false,
        isStale: data.stale ?? false,
        paintCooldownUntil,
        isVirtualPe: data.isVirtualPe ?? false,
        virtualPeTotal: data.virtualPeTotal ?? 0,
        virtualPeUsed: data.virtualPeUsed ?? 0,
        virtualPeAvailable: data.virtualPeAvailable ?? 0,
      });

      setUser(prev => prev ? { ...prev, pe_total_pe: data.peTotal } : null);

      if (!data.stale && !data.isVirtualPe) {
        toast.success('Balance updated', { 
          description: `${data.nativeBalance.toFixed(4)} ${data.nativeSymbol} = ${data.peTotal.toLocaleString()} PE`
        });
      } else if (!data.stale && data.isVirtualPe) {
        toast.success('Balance updated', { 
          description: `${data.peAvailable.toLocaleString()} PE available`
        });
      }
    } catch (err) {
      console.error('[WalletContext] Energy refresh exception:', err);
      setEnergy(prev => ({ ...prev, isRefreshing: false }));
    }
  }, [balance, isGoogleOnly]);

  const refreshUser = useCallback(async () => {
    const token = getSessionToken();
    if (!token) return;

    try {
      const { data, error } = await supabase.functions.invoke('energy-refresh', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!error && data?.ok) {
        const lastSyncAt = data.lastSyncAt ? new Date(data.lastSyncAt) : null;
        const peUsed = data.peUsed ?? 0;
        const peAvailable = data.peAvailable ?? Math.max(0, (data.peTotal || 0) - peUsed);
        
        const paintCooldownUntil = data.paintCooldownUntil ? new Date(data.paintCooldownUntil) : null;
        
        setEnergy({
          energyAsset: 'BIT',
          nativeSymbol: data.nativeSymbol || ENERGY_CONFIG[ENERGY_ASSET].symbol,
          nativeBalance: data.nativeBalance || 0,
          usdPrice: data.usdPrice || 0,
          walletUsd: data.walletUsd || 0,
          peTotal: data.peTotal || 0,
          peUsed,
          peAvailable,
          pixelsOwned: data.pixelsOwned ?? 0,
          pixelStakeTotal: data.pixelStakeTotal ?? 0,
          cluster: data.cluster || null,
          lastSyncAt,
          isRefreshing: false,
          isStale: data.stale ?? false,
          paintCooldownUntil,
          isVirtualPe: data.isVirtualPe ?? false,
          virtualPeTotal: data.virtualPeTotal ?? 0,
          virtualPeUsed: data.virtualPeUsed ?? 0,
          virtualPeAvailable: data.virtualPeAvailable ?? 0,
        });

        setUser(prev => prev ? { ...prev, pe_total_pe: data.peTotal } : null);
      }
    } catch (err) {
      console.error('[WalletContext] refreshUser error:', err);
    }
  }, []);

  // Update PE status directly (called after game-commit response)
  const updatePeStatus = useCallback((
    peStatus: { total: number; used: number; available: number },
    cooldownUntil?: string
  ) => {
    console.log('[WalletContext] updatePeStatus called:', peStatus, cooldownUntil);
    setEnergy(prev => ({
      ...prev,
      peTotal: peStatus.total,
      peUsed: peStatus.used,
      peAvailable: peStatus.available,
      paintCooldownUntil: cooldownUntil ? new Date(cooldownUntil) : prev.paintCooldownUntil,
    }));
    
    setUser(prev => prev ? { ...prev, pe_total_pe: peStatus.total } : null);
  }, []);

  // ============ GOOGLE SIGN IN ============
  const googleSignIn = useCallback(async () => {
    if (googleSignInFlightRef.current) return;
    googleSignInFlightRef.current = true;
    
    walletDebug('google_signin_start');
    
    try {
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      
      if (error) {
        console.error('[WalletContext] Google sign-in error:', error);
        toast.error('Google sign-in failed', { description: error.message });
      }
      // After this, the page will redirect to Google.
      // On return, supabase.auth.onAuthStateChange will fire SIGNED_IN.
    } catch (err) {
      console.error('[WalletContext] Google sign-in exception:', err);
      toast.error('Google sign-in failed');
    } finally {
      googleSignInFlightRef.current = false;
    }
  }, []);

  // Link wallet for Google-only users
  const linkWallet = useCallback(async () => {
    if (!isGoogleOnly || !user) {
      toast.info('Wallet linking is only for Google-only accounts');
      return;
    }
    // Just trigger the normal connect flow - the wallet auth will handle 
    // transitioning auth_provider to 'both' on the backend
    // For now, open connect flow
    toast.info('Wallet linking coming soon');
  }, [isGoogleOnly, user]);

  // Listen for Supabase Auth state changes (Google OAuth callback)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.access_token) {
        walletDebug('supabase_auth_signed_in', { provider: session.user?.app_metadata?.provider });
        
        // Only process Google auth callbacks
        const provider = session.user?.app_metadata?.provider;
        if (provider !== 'google') return;
        
        // Call auth-google edge function with the Supabase access token
        try {
          setWalletState('AUTHENTICATING');
          
          const { data, error } = await supabase.functions.invoke('auth-google', {
            body: { supabase_access_token: session.access_token },
          });
          
          if (error || !data?.token) {
            console.error('[WalletContext] auth-google error:', error, data);
            toast.error('Google authentication failed');
            setWalletState('DISCONNECTED');
            return;
          }
          
          // Store custom JWT
          setSessionToken(data.token);
          const googleUser = data.user as User;
          setUser(googleUser);
          setCachedUser(googleUser);
          setWalletAddress(googleUser.wallet_address || `google:${googleUser.id.substring(0, 8)}`);
          setWalletState('AUTHENTICATED');
          setLastError(null);
          
          // Set virtual PE energy state
          const virtualPeTotal = Number((googleUser as any).virtual_pe_total) || 300000;
          const virtualPeUsed = Number((googleUser as any).virtual_pe_used) || 0;
          const virtualPeAvailable = Math.max(0, virtualPeTotal - virtualPeUsed);
          
          setEnergy({
            ...defaultEnergyState,
            peTotal: virtualPeTotal,
            peUsed: virtualPeUsed,
            peAvailable: virtualPeAvailable,
            isVirtualPe: true,
            virtualPeTotal,
            virtualPeUsed,
            virtualPeAvailable,
            lastSyncAt: new Date(),
            isRefreshing: false,
            isStale: false,
          });
          
          walletDebug('google_auth_complete', { userId: googleUser.id });
          toast.success('Signed in with Google!', { 
            description: `${virtualPeAvailable.toLocaleString()} Starter PE ready to use` 
          });
          soundEngine.play('wallet_connect');
          
          // Warm up and refresh
          warmupAuthenticatedFunctions(data.token).catch(err => {
            walletDebug('warmup_error', err);
          });
          
          setTimeout(() => {
            refreshEnergy();
            refreshPeStatus();
          }, 500);
          
        } catch (err) {
          console.error('[WalletContext] Google auth callback error:', err);
          toast.error('Google authentication failed');
          setWalletState('DISCONNECTED');
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [refreshEnergy, refreshPeStatus]);

  // Attempt Phantom trusted reconnect (silent, no popup)
  const attemptTrustedReconnect = useCallback(async (): Promise<string | null> => {
    const phantom = getPhantom();
    if (!phantom) return null;
    
    try {
      walletDebug('trusted_reconnect_start');
      const response = await phantom.connect({ onlyIfTrusted: true });
      const wallet = response.publicKey.toBase58();
      walletDebug('trusted_reconnect_success', { wallet: wallet.substring(0, 8) });
      return wallet;
    } catch (err) {
      walletDebug('trusted_reconnect_failed', { error: err });
      return null;
    }
  }, []);

  // Perform authentication with Phantom signature
  const performAuthentication = useCallback(async (wallet: string): Promise<boolean> => {
    const phantom = getPhantom();
    if (!phantom) return false;
    
    const now = Date.now();
    if (now - lastSignAttemptRef.current < COOLDOWN_MS) {
      walletDebug('auth_cooldown', { remaining: COOLDOWN_MS - (now - lastSignAttemptRef.current) });
      toast.info('Please wait before trying again');
      return false;
    }
    
    if (signInFlightRef.current) {
      walletDebug('auth_skip', { reason: 'in_flight' });
      return false;
    }
    
    signInFlightRef.current = true;
    lastSignAttemptRef.current = now;
    setWalletState('AUTHENTICATING');
    
    try {
      walletDebug('auth_nonce_start');
      
      const { data: nonceData, error: nonceError } = await supabase.functions.invoke('auth-nonce', {
        body: { wallet },
      });
      
      if (nonceError || !nonceData?.nonce) {
        walletDebug('auth_nonce_error', { error: nonceError });
        setLastError('nonce_fetch_failed');
        setWalletState('AUTH_REQUIRED');
        toast.error('Authentication failed', { description: 'Could not get authentication nonce' });
        return false;
      }
      
      walletDebug('auth_sign_start');
      let signatureB64: string;
      try {
        const messageBytes = new TextEncoder().encode(nonceData.nonce);
        let signatureBytes: Uint8Array;

        if (typeof phantom.request === 'function') {
          walletDebug('auth_sign_using_request');
          const signResult = await phantom.request({
            method: 'signMessage',
            params: {
              message: messageBytes,
              display: 'utf8',
            },
          });
          
          if (signResult.signature instanceof Uint8Array) {
            signatureBytes = signResult.signature;
          } else if (typeof signResult.signature === 'string') {
            signatureBytes = new Uint8Array(
              atob(signResult.signature).split('').map(c => c.charCodeAt(0))
            );
          } else {
            signatureBytes = new Uint8Array(signResult.signature as ArrayLike<number>);
          }
        } else if (typeof phantom.signMessage === 'function') {
          walletDebug('auth_sign_using_signMessage_fallback');
          const signResult = await phantom.signMessage(messageBytes);
          signatureBytes = signResult.signature;
        } else {
          walletDebug('auth_sign_no_method_available');
          throw new Error('Wallet does not support message signing');
        }
        
        signatureB64 = btoa(String.fromCharCode(...signatureBytes));
        walletDebug('auth_sign_success');
      } catch (signError: any) {
        walletDebug('auth_sign_rejected', { 
          code: signError?.code, 
          message: signError?.message,
          name: signError?.name 
        });
        setLastError('user_rejected_signature');
        setWalletState('AUTH_REQUIRED');
        
        if (signError?.code === 4001 || signError?.message?.includes('User rejected')) {
          toast.error('Signature cancelled', { description: 'You cancelled the signature request' });
        } else {
          toast.error('Signature failed', { description: signError?.message || 'Could not sign message' });
        }
        return false;
      }
      
      walletDebug('auth_verify_start');
      const { data: authData, error: authError } = await supabase.functions.invoke('auth-verify', {
        body: { wallet, signature: signatureB64, nonce: nonceData.nonce },
      });
      
      if (authError || !authData?.token) {
        walletDebug('auth_verify_error', { error: authError });
        setLastError('verify_failed');
        setWalletState('AUTH_REQUIRED');
        toast.error('Authentication failed', { description: 'Server could not verify your signature' });
        return false;
      }
      
      setSessionToken(authData.token);
      localStorage.setItem(WALLET_ADDRESS_KEY, wallet);
      setWalletAddress(wallet);
      setUser(authData.user as User);
      setCachedUser(authData.user as User);
      setWalletState('AUTHENTICATED');
      setLastError(null);
      
      if (authData.user) {
        updateEnergyFromUser(authData.user as User);
      }
      
      walletDebug('auth_complete');
      toast.success('Signed in successfully');
      soundEngine.play('wallet_connect');
      
      warmupAuthenticatedFunctions(authData.token).catch(err => {
        walletDebug('warmup_error', err);
      });
      
      setTimeout(() => {
        refreshEnergy();
        refreshPeStatus();
      }, 500);
      
      return true;
    } catch (err) {
      walletDebug('auth_exception', { error: err });
      setLastError('auth_exception');
      setWalletState('AUTH_REQUIRED');
      return false;
    } finally {
      signInFlightRef.current = false;
    }
  }, [updateEnergyFromUser, refreshEnergy, refreshPeStatus]);

  // Sign in (for AUTH_REQUIRED state)
  const signIn = useCallback(async () => {
    if (walletState !== 'AUTH_REQUIRED' || !walletAddress) {
      walletDebug('signIn_invalid_state', { walletState, hasWallet: !!walletAddress });
      return;
    }
    
    await performAuthentication(walletAddress);
  }, [walletState, walletAddress, performAuthentication]);

  // Session restore on mount (runs ONCE)
  useEffect(() => {
    if (restoreInFlightRef.current) {
      walletDebug('session_restore_skip', { reason: 'already_in_flight' });
      return;
    }
    
    const restoreSession = async () => {
      restoreInFlightRef.current = true;
      
      if (isTrialMode) {
        walletDebug('session_restore_skip', { reason: 'trial_mode_active' });
        activateTrialMode();
        restoreInFlightRef.current = false;
        return;
      }
      
      try {
        const token = getSessionToken();
        const storedWallet = localStorage.getItem(WALLET_ADDRESS_KEY);
        
        walletDebug('session_restore_start', { hasToken: !!token, hasWallet: !!storedWallet });
        
        // Check if this is a Google auth session
        if (token) {
          const payload = parseJwtPayload(token);
          if (payload && payload.exp > Date.now() && (payload.authProvider === 'google' || payload.authProvider === 'both')) {
            walletDebug('session_restore_google', { authProvider: payload.authProvider });
            
            setWalletState('AUTHENTICATED');
            setWalletAddress(storedWallet || `google:${payload.userId.substring(0, 8)}`);
            
            const cachedUser = getCachedUser();
            if (cachedUser) {
              setUser(cachedUser);
              updateEnergyFromUser(cachedUser);
            }
            
            warmupAuthenticatedFunctions(token).catch(err => {
              walletDebug('warmup_error', err);
            });
            
            Promise.all([
              refreshUser(),
              refreshEnergy(),
              refreshPeStatus(),
            ]).catch(err => walletDebug('session_restore_refresh_error', { error: err }));
            
            return;
          }
        }
        
        setWalletState('CONNECTING');
        
        const phantomWallet = await attemptTrustedReconnect();
        
        if (isTrialModeRef.current) {
          walletDebug('session_restore_abort', { reason: 'trial_activated_during_reconnect' });
          restoreInFlightRef.current = false;
          return;
        }
        
        if (!phantomWallet) {
          walletDebug('session_restore_no_phantom');
          clearSession();
          setWalletState('DISCONNECTED');
          return;
        }
        
        setWalletAddress(phantomWallet);
        
        if (token && storedWallet === phantomWallet) {
          const payload = parseJwtPayload(token);
          
          if (payload && payload.exp > Date.now()) {
            walletDebug('session_restore_valid_token', { expiresIn: payload.exp - Date.now() });
            
            setWalletState('AUTHENTICATED');
            
            const cachedUser = getCachedUser();
            if (cachedUser) {
              setUser(cachedUser);
              updateEnergyFromUser(cachedUser);
            }
            
            warmupAuthenticatedFunctions(token).catch(err => {
              walletDebug('warmup_error', err);
            });
            
            Promise.all([
              refreshUser(),
              refreshEnergy(),
              refreshPeStatus(),
            ]).catch(err => walletDebug('session_restore_refresh_error', { error: err }));
            
            return;
          }
        }
        
        walletDebug('session_restore_auth_required', { 
          reason: !token ? 'no_token' : storedWallet !== phantomWallet ? 'wallet_mismatch' : 'token_expired' 
        });
        
        const cachedUser = getCachedUser();
        if (cachedUser && cachedUser.wallet_address === phantomWallet) {
          setUser(cachedUser);
          updateEnergyFromUser(cachedUser);
        }
        
        setWalletState('AUTH_REQUIRED');
        
      } catch (err) {
        walletDebug('session_restore_error', { error: err });
        setWalletState('ERROR');
        setLastError('session_restore_failed');
      }
    };
    
    restoreSession();
  }, []);

  // Listen for Phantom disconnect
  useEffect(() => {
    const phantom = getPhantom();
    if (!phantom) return;

    const handleDisconnect = () => {
      if (isTrialModeRef.current) {
        walletDebug('phantom_disconnect_ignored', { reason: 'trial_mode_active' });
        return;
      }
      // Don't disconnect if this is a Google auth session
      if (isGoogleAuth) {
        walletDebug('phantom_disconnect_ignored', { reason: 'google_auth_session' });
        return;
      }
      setWalletState('DISCONNECTED');
      setWalletAddress(null);
      setUser(null);
      setEnergy(defaultEnergyState);
      clearSession();
    };

    phantom.on('disconnect', handleDisconnect);
    return () => phantom.off('disconnect', handleDisconnect);
  }, [isGoogleAuth]);

  // Listen for token expired events
  useEffect(() => {
    const handleTokenExpired = () => {
      walletDebug('token_expired_event');
      
      if (walletState === 'AUTHENTICATED' && !isTrialMode) {
        setWalletState('AUTH_REQUIRED');
        toast.info('Session expired', { 
          description: 'Please sign in again to continue' 
        });
      }
    };

    window.addEventListener(TOKEN_EXPIRED_EVENT, handleTokenExpired);
    return () => window.removeEventListener(TOKEN_EXPIRED_EVENT, handleTokenExpired);
  }, [walletState, isTrialMode]);

  // Periodically check if energy is stale
  useEffect(() => {
    if (walletState !== 'AUTHENTICATED') return;

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
  }, [walletState]);

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

    const now = Date.now();
    if (now - lastConnectAttemptRef.current < COOLDOWN_MS) {
      walletDebug('connect_cooldown', { remaining: COOLDOWN_MS - (now - lastConnectAttemptRef.current) });
      toast.info('Please wait before trying again');
      return;
    }
    
    if (connectInFlightRef.current) {
      walletDebug('connect_skip', { reason: 'in_flight' });
      return;
    }

    connectInFlightRef.current = true;
    lastConnectAttemptRef.current = now;
    setWalletState('CONNECTING');
    walletDebug('connect_start');

    try {
      let publicKey;
      try {
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
        
        if (connectError?.code === 4001 || connectError?.message?.includes('User rejected')) {
          toast.error('Connection cancelled', {
            description: 'You rejected the connection request',
          });
          setWalletState('DISCONNECTED');
          setLastError('user_rejected_connect');
          return;
        }
        throw connectError;
      }

      const wallet = publicKey.toBase58();
      setWalletAddress(wallet);
      walletDebug('wallet_address', { wallet: wallet.substring(0, 8) + '...' });

      const authSuccess = await performAuthentication(wallet);
      
      if (!authSuccess) {
        walletDebug('connect_auth_failed');
      }

    } catch (error: any) {
      walletDebug('connect_exception', { 
        error: error?.message || error,
        name: error?.name,
        code: error?.code,
        stack: error?.stack?.substring(0, 300)
      });
      console.error('Wallet connection error:', error);
      toast.error('Failed to connect wallet', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
      setWalletState('ERROR');
      setLastError('connect_exception');
    } finally {
      connectInFlightRef.current = false;
    }
  };

  const disconnect = () => {
    if (isTrialMode) {
      exitTrialMode();
      return;
    }
    
    const phantom = getPhantom();
    if (phantom && !isGoogleOnly) {
      phantom.disconnect();
    }
    
    // Sign out of Supabase auth if Google
    if (isGoogleAuth) {
      supabase.auth.signOut().catch(() => {});
    }
    
    setWalletState('DISCONNECTED');
    setWalletAddress(null);
    setUser(null);
    setEnergy(defaultEnergyState);
    setLastError(null);
    clearSession();
    
    toast.success('Disconnected');
  };

  const updateUser = async (updates: Partial<Pick<User, 'display_name' | 'country_code' | 'alliance_tag' | 'avatar_url' | 'bio' | 'social_x' | 'social_instagram' | 'social_website'>>) => {
    const token = getSessionToken();
    if (!token) {
      toast.error('Not authenticated');
      return;
    }

    const { data, error } = await supabase.functions.invoke('user-update', {
      body: updates,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (error || !data?.user) {
      throw new Error(data?.error || 'Failed to update profile');
    }

    setUser(data.user as User);
    setCachedUser(data.user as User);
  };

  return (
    <WalletContext.Provider
      value={{
        walletState,
        walletAddress,
        user,
        energy,
        connect,
        signIn,
        disconnect,
        updateUser,
        refreshUser,
        refreshEnergy,
        refreshPeStatus,
        updatePeStatus,
        googleSignIn,
        linkWallet,
        isGoogleAuth,
        isGoogleOnly,
        isConnected,
        isConnecting,
        needsSignature,
        isWalletConnected,
        isAuthenticated,
        isTrialMode,
        activateTrialMode,
        exitTrialMode,
        updateTrialPe,
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